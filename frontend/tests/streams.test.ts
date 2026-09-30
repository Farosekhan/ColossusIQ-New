import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { MODULES } from "@/config/modules";
import { RESOURCES, emptyValues, recordSchema, streamRuleErrors } from "@/config/resources";
import { COLLEGE_TYPES, STREAM_DEFS, STREAMS, streamOfType } from "@/config/streams";
import { dispatch } from "@/lib/api/mock/router";
import { collegeStream, listColleges } from "@/lib/api/mock/records";
import type { SessionPayload } from "@/lib/auth/session";

const as = (role: SessionPayload["role"], college: string): SessionPayload => ({ sub: `${role}-${college}`, role, name: "Tester", tenant: "uni-tntu", college, mfa: true, exp: 9e9 });
const q = new URLSearchParams();
const MEDICAL = "COL-1006";
const NURSING = "COL-1007";
const ARTS = "COL-1002";
const ENGG = "COL-1001";

const admission = (program: string, entranceScore: number | null) => ({
  ...emptyValues(RESOURCES.admissions!),
  fullName: "Stream Test",
  dob: "2008-05-14",
  gender: "Female",
  email: `s${Math.random().toString(36).slice(2, 8)}@example.com`,
  phone: "9876543210",
  state: "Tamil Nadu",
  board: "State Board",
  hscPercent: 92,
  entranceScore,
  program,
  quota: "Government",
  category: "BC",
  guardianName: "Parent",
  guardianPhone: "9123456780",
  status: "Applied",
});

describe("stream configuration", () => {
  it("every college type maps to a defined stream", async () => {
    for (const t of COLLEGE_TYPES) expect(STREAM_DEFS[streamOfType(t)]).toBeDefined();
  });
  it("covers engineering, medical and arts & science colleges in the seed data", async () => {
    const streams = new Set((await listColleges()).map((c) => streamOfType(c.type)));
    for (const s of ["engineering", "medical", "artsScience"] as const) expect(streams.has(s)).toBe(true);
    expect((await collegeStream(MEDICAL))).toBe("medical");
    expect((await collegeStream(NURSING))).toBe("medical");
    expect((await collegeStream(ARTS))).toBe("artsScience");
  });
  it("every stream-specific module names valid streams", async () => {
    for (const m of MODULES.filter((x) => x.streams)) for (const s of m.streams!) expect(STREAMS).toContain(s);
  });
  it("seeded scoped records all satisfy their college's stream rules", async () => {
    for (const key of ["admissions", "staff", "users", "courses", "rotations"]) {
      const res = RESOURCES[key]!;
      const store = (await dispatch("GET", ["records", key], undefined, as("admin", "all"), new URLSearchParams({ pageSize: "50" })));
      expect(store.status).toBe(200);
      for (const rec of (store.body as { items: Array<Record<string, unknown>> }).items) {
        const stream = (await collegeStream(String(rec.collegeId)));
        const data = Object.fromEntries(res.fields.map((f) => [f.name, rec[f.name] ?? null]));
        expect(recordSchema(res).safeParse(data).success, `${key} ${String(rec.id)}`).toBe(true);
        expect(streamRuleErrors(res, data as never, stream!), `${key} ${String(rec.id)}`).toEqual({});
      }
    }
  });
});

describe("stream rules are enforced by the API", () => {
  it("a medical college accepts MBBS with a NEET score out of 720", async () => {
    const r = (await dispatch("POST", ["records", "admissions"], { data: admission("MBBS", 655) }, as("institution", MEDICAL), q));
    expect(r.status).toBe(201);
  });
  it("a medical college rejects an engineering programme", async () => {
    const r = (await dispatch("POST", ["records", "admissions"], { data: admission("B.E. Civil Engineering", 150) }, as("institution", MEDICAL), q));
    expect(r.status).toBe(409);
    expect((r.body as { error: { fields: Record<string, string> } }).error.fields.program).toMatch(/Medical/);
  });
  it("an engineering college caps the entrance score at its 200-point cut-off", async () => {
    const r = (await dispatch("POST", ["records", "admissions"], { data: admission("B.E. Computer Science & Engineering", 650) }, as("institution", ENGG), q));
    expect(r.status).toBe(409);
    expect((r.body as { error: { fields: Record<string, string> } }).error.fields.entranceScore).toMatch(/200/);
  });
  it("an arts & science college accepts B.Com but not MBBS", async () => {
    expect((await dispatch("POST", ["records", "admissions"], { data: admission("B.Com", 88) }, as("institution", ARTS), q)).status).toBe(201);
    expect((await dispatch("POST", ["records", "admissions"], { data: admission("MBBS", 88) }, as("institution", ARTS), q)).status).toBe(409);
  });
  it("staff departments must belong to the college's stream", async () => {
    const staff = {
      ...emptyValues(RESOURCES.staff!),
      fullName: "Dr. Stream",
      email: `st${Math.random().toString(36).slice(2, 8)}@x.in`,
      phone: "9876543210",
      designation: "Senior Resident",
      staffType: "Teaching",
      employment: "Permanent",
      joiningDate: "2020-01-01",
      status: "Active",
    };
    expect((await dispatch("POST", ["records", "staff"], { data: { ...staff, department: "Anatomy" } }, as("institution", MEDICAL), q)).status).toBe(201);
    expect((await dispatch("POST", ["records", "staff"], { data: { ...staff, department: "Anatomy" } }, as("institution", ENGG), q)).status).toBe(409);
  });
});

describe("stream-only modules", () => {
  it("clinical rotations exist only for medical colleges", async () => {
    expect((await dispatch("GET", ["records", "rotations"], undefined, as("institution", MEDICAL), q)).status).toBe(200);
    expect((await dispatch("GET", ["records", "rotations"], undefined, as("institution", ENGG), q)).status).toBe(403);
    expect((await dispatch("GET", ["records", "rotations"], undefined, as("institution", ARTS), q)).status).toBe(403);
  });
  it("a rotation cannot end before it starts", async () => {
    const rot = {
      ...emptyValues(RESOURCES.rotations!),
      student: "Intern One",
      regNo: "MB2112345",
      phase: "Internship (CRMI)",
      department: "General Surgery",
      unit: "Unit I · Ward 3",
      startDate: "2026-11-01",
      endDate: "2026-10-01",
      supervisor: "Dr. Surgeon",
      status: "Scheduled",
    };
    expect((await dispatch("POST", ["records", "rotations"], { data: rot }, as("faculty", MEDICAL), q)).status).toBe(409);
    expect((await dispatch("POST", ["records", "rotations"], { data: { ...rot, endDate: "2026-11-30" } }, as("faculty", MEDICAL), q)).status).toBe(201);
  });
  it("CBCS electives are for arts & science, NMC compliance for medical, AICTE for engineering", async () => {
    expect((await dispatch("GET", ["modules", "cbcs-electives"], undefined, as("institution", ARTS), q)).status).toBe(200);
    expect((await dispatch("GET", ["modules", "cbcs-electives"], undefined, as("institution", ENGG), q)).status).toBe(403);
    expect((await dispatch("GET", ["modules", "nmc-compliance"], undefined, as("institution", MEDICAL), q)).status).toBe(200);
    expect((await dispatch("GET", ["modules", "nmc-compliance"], undefined, as("institution", ARTS), q)).status).toBe(403);
    expect((await dispatch("GET", ["modules", "aicte-compliance"], undefined, as("institution", ENGG), q)).status).toBe(200);
    expect((await dispatch("GET", ["modules", "aicte-compliance"], undefined, as("institution", MEDICAL), q)).status).toBe(403);
  });
  it("students see their own stream's courses and dashboard", async () => {
    type C = Array<{ title: string }>;
    const med = (await dispatch("GET", ["courses"], undefined, as("student", MEDICAL), q)).body as C;
    const arts = (await dispatch("GET", ["courses"], undefined, as("student", ARTS), q)).body as C;
    const engg = (await dispatch("GET", ["courses"], undefined, as("student", ENGG), q)).body as C;
    expect(med.map((c) => c.title)).toContain("Pathology");
    expect(arts.map((c) => c.title)).toContain("Financial Accounting");
    expect(engg.map((c) => c.title)).toContain("Database Management Systems");
    const dash = (await dispatch("GET", ["students", "me", "dashboard"], undefined, as("student", MEDICAL), q)).body as { examCountdown: { exam: string } };
    expect(dash.examCountdown.exam).toMatch(/Pathology/);
  });
});

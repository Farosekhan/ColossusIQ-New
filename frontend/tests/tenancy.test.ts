import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RESOURCES, emptyValues } from "@/config/resources";
import { dispatch } from "@/lib/api/mock/router";
import { getCollege, isCollegeActive } from "@/lib/api/mock/records";
import type { SessionPayload } from "@/lib/auth/session";

const as = (role: SessionPayload["role"], college: string): SessionPayload => ({ sub: `${role}-${college}`, role, name: "Tester", tenant: "uni-tntu", college, mfa: true, exp: 9e9 });
const q = new URLSearchParams();
type Listing = { items: Array<{ id: string; collegeId: string }>; total: number };

const course = (code: string, department = "Computer Science & Engineering") => ({
  ...emptyValues(RESOURCES.courses!),
  code,
  title: "Tenancy Test Course",
  department,
  semester: "3",
  credits: 3,
  courseType: "Theory",
  faculty: "Dr. Test",
  status: "Active",
});

describe("multi-college isolation", () => {
  const principalA = as("institution", "COL-1001");
  const principalB = as("institution", "COL-1002");
  const superAdmin = as("admin", "all");

  it("principals only list their own college's records", async () => {
    const a = (await dispatch("GET", ["records", "admissions"], undefined, principalA, new URLSearchParams({ pageSize: "50" }))).body as Listing;
    const b = (await dispatch("GET", ["records", "admissions"], undefined, principalB, new URLSearchParams({ pageSize: "50" }))).body as Listing;
    expect(a.items.length).toBeGreaterThan(0);
    expect(b.items.length).toBeGreaterThan(0);
    expect(a.items.every((r) => r.collegeId === "COL-1001")).toBe(true);
    expect(b.items.every((r) => r.collegeId === "COL-1002")).toBe(true);
  });

  it("records from another college are invisible (404), not forbidden", async () => {
    const a = (await dispatch("GET", ["records", "admissions"], undefined, principalA, q)).body as Listing;
    const id = a.items[0]!.id;
    expect((await dispatch("GET", ["records", "admissions", id], undefined, principalB, q)).status).toBe(404);
    expect((await dispatch("DELETE", ["records", "admissions", id], undefined, principalB, q)).status).toBe(404);
  });

  it("the Super Admin sees every college and can filter by one", async () => {
    const all = (await dispatch("GET", ["records", "admissions"], undefined, superAdmin, new URLSearchParams({ pageSize: "50" }))).body as Listing;
    expect(new Set(all.items.map((r) => r.collegeId)).size).toBeGreaterThan(1);
    const one = (await dispatch("GET", ["records", "admissions"], undefined, superAdmin, new URLSearchParams({ pageSize: "50", college: "COL-1003" }))).body as Listing;
    expect(one.items.every((r) => r.collegeId === "COL-1003")).toBe(true);
  });

  it("college dashboards only aggregate that college's data", async () => {
    type Dash = { kpis: Array<{ label: string; value: string }> };
    const count = async (s: SessionPayload) => Number(((await dispatch("GET", ["modules", "admission-insights"], undefined, s, q)).body as Dash).kpis[0]!.value);
    const own = ((await dispatch("GET", ["records", "admissions"], undefined, principalB, q)).body as Listing).total;
    expect(await count(principalB)).toBe(own);
    expect(await count(superAdmin)).toBeGreaterThan(own);
  });

  it("new records land in the caller's college even if another college is requested", async () => {
    const r = (await dispatch("POST", ["records", "courses"], { data: course("TT1001", "Commerce"), collegeId: "COL-1003" }, principalB, q));
    expect(r.status).toBe(201);
    expect((r.body as { collegeId: string }).collegeId).toBe("COL-1002");
  });

  it("at university scope the Super Admin must choose a college", async () => {
    expect((await dispatch("POST", ["records", "courses"], { data: course("TT2002") }, superAdmin, q)).status).toBe(422);
    const r = (await dispatch("POST", ["records", "courses"], { data: course("TT2002", "Finance"), collegeId: "COL-1004" }, superAdmin, q));
    expect(r.status).toBe(201);
    expect((r.body as { collegeId: string }).collegeId).toBe("COL-1004");
  });

  it("course codes are unique per college, not across the university", async () => {
    expect((await dispatch("POST", ["records", "courses"], { data: course("TT3003") }, principalA, q)).status).toBe(201);
    expect((await dispatch("POST", ["records", "courses"], { data: course("TT3003") }, principalA, q)).status).toBe(409);
    expect((await dispatch("POST", ["records", "courses"], { data: course("TT3003", "Commerce") }, principalB, q)).status).toBe(201);
  });

  it("records cannot be moved between colleges by editing", async () => {
    const created = (await dispatch("POST", ["records", "courses"], { data: course("TT4004") }, principalA, q)).body as { id: string; version: number };
    const r = (await dispatch("PUT", ["records", "courses", created.id], { data: { ...course("TT4004"), collegeId: "COL-1002" }, version: created.version }, principalA, q));
    expect(r.status).toBe(422); // collegeId is not an editable field
  });
});

describe("college management (Super Admin control)", () => {
  const superAdmin = as("admin", "all");
  const college = {
    ...emptyValues(RESOURCES.colleges!),
    name: "Test College of Science",
    code: "9901",
    type: "Arts & Science",
    city: "Salem",
    studentCapacity: 600,
    principal: "Dr. Test",
    email: "office@test.edu.in",
    phone: "9876543210",
    plan: "Campus Starter",
    status: "Onboarding",
  };

  it("only the Super Admin can manage colleges", async () => {
    expect((await dispatch("GET", ["records", "colleges"], undefined, as("institution", "COL-1001"), q)).status).toBe(403);
    expect((await dispatch("POST", ["records", "colleges"], { data: college }, as("institution", "COL-1001"), q)).status).toBe(403);
    expect((await dispatch("GET", ["records", "colleges"], undefined, superAdmin, q)).status).toBe(200);
  });

  it("creates, suspends, reactivates and deletes an empty college", async () => {
    const created = (await dispatch("POST", ["records", "colleges"], { data: college }, superAdmin, q));
    expect(created.status).toBe(201);
    const rec = created.body as { id: string; version: number };
    expect(rec.id).toMatch(/^COL-\d{4}$/);

    const suspended = (await dispatch("PUT", ["records", "colleges", rec.id], { data: { ...college, status: "Suspended" }, version: rec.version }, superAdmin, q));
    expect(suspended.status).toBe(200);
    expect((await isCollegeActive(rec.id))).toBe(false);
    const active = (await dispatch("PUT", ["records", "colleges", rec.id], { data: { ...college, status: "Active" }, version: 2 }, superAdmin, q));
    expect(active.status).toBe(200);
    expect((await isCollegeActive(rec.id))).toBe(true);

    expect((await dispatch("DELETE", ["records", "colleges", rec.id], undefined, superAdmin, q)).status).toBe(200);
  });

  it("refuses to delete a college that still has records", async () => {
    const r = (await dispatch("DELETE", ["records", "colleges", "COL-1001"], undefined, superAdmin, q));
    expect(r.status).toBe(409);
    expect(await getCollege("COL-1001")).toBeDefined();
  });

  it("rejects duplicate affiliation codes", async () => {
    expect((await dispatch("POST", ["records", "colleges"], { data: { ...college, name: "Other", code: "1101" } }, superAdmin, q)).status).toBe(409);
  });

  it("module areas switched off for a college are blocked", async () => {
    // Kaveri College (COL-1002) does not have Incubation or Project & Innovation enabled.
    expect((await dispatch("GET", ["modules", "startups"], undefined, as("incubation", "COL-1002"), q)).status).toBe(403);
    expect((await dispatch("GET", ["modules", "startups"], undefined, as("incubation", "COL-1001"), q)).status).toBe(200);
  });

  it("only the Super Admin gets the university overview", async () => {
    expect((await dispatch("GET", ["university", "overview"], undefined, as("institution", "COL-1001"), q)).status).toBe(403);
    const o = (await dispatch("GET", ["university", "overview"], undefined, superAdmin, q));
    expect(o.status).toBe(200);
    expect((o.body as { colleges: unknown[] }).colleges.length).toBeGreaterThanOrEqual(5);
  });

  it("principals only see their own college in the options list", async () => {
    const r = (await dispatch("GET", ["colleges", "options"], undefined, as("institution", "COL-1002"), q)).body as { colleges: Array<{ id: string }> };
    expect(r.colleges.map((c) => c.id)).toEqual(["COL-1002"]);
  });
});

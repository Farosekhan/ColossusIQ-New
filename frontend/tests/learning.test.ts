import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { dispatch } from "@/lib/api/mock/router";
import { _learningTest, gradeFor, publicCertificate, verifyCertificate } from "@/lib/api/mock/learning";
import { csvCell, toCsv } from "@/lib/csv";
import type { SessionPayload } from "@/lib/auth/session";

const as = (role: SessionPayload["role"], college: string, sub = `${role}-${college}`): SessionPayload => ({ sub, role, name: `Test ${role}`, tenant: "uni-tntu", college, mfa: true, exp: 9e9 });
const q = new URLSearchParams();
const call = (method: string, path: string, s: SessionPayload, body?: unknown) => dispatch(method, path.split("/"), body, s, q);

async function firstQuiz(collegeId: string) {
  (await _learningTest.ensureSeed());
  return [..._learningTest.quizzes.values()].find((x) => x.collegeId === collegeId && x.status === "Published" && x.certificateEnabled)!;
}

describe("grades", () => {
  it("maps marks to bands and respects the pass mark", async () => {
    expect(gradeFor(95, 50).grade).toBe("O");
    expect(gradeFor(85, 50).grade).toBe("A+");
    expect(gradeFor(72, 50).grade).toBe("A");
    expect(gradeFor(60, 50).grade).toBe("B");
    expect(gradeFor(55, 50)).toMatchObject({ grade: "C", passed: true });
    expect(gradeFor(55, 60)).toMatchObject({ grade: "RA", passed: false });
  });
});

describe("quizzes & certificates", () => {
  it("never sends the answer key to students", async () => {
    const quiz = (await firstQuiz("COL-1001"));
    const r = (await call("GET", `quizzes/${quiz.id}`, as("student", "COL-1001")));
    expect(r.status).toBe(200);
    expect(JSON.stringify(r.body)).not.toMatch(/"answer"|"explanation"/);
  });
  it("hides quizzes of other colleges", async () => {
    const quiz = (await firstQuiz("COL-1001"));
    expect((await call("GET", `quizzes/${quiz.id}`, as("student", "COL-1006"))).status).toBe(404);
    expect((await call("POST", `quizzes/${quiz.id}/submit`, as("student", "COL-1006"), { answers: {} })).status).toBe(404);
  });
  it("scores on the server, issues a signed certificate and limits attempts", async () => {
    const quiz = (await firstQuiz("COL-1002"));
    const student = as("student", "COL-1002", "stu-cert-test");
    const wrong = Object.fromEntries(quiz.questions.map((x, i) => [`q${i + 1}`, (x.answer + 1) % 4]));
    const fail = (await call("POST", `quizzes/${quiz.id}/submit`, student, { answers: wrong }));
    expect(fail.body).toMatchObject({ passed: false, grade: "RA", certificateId: null });

    const right = Object.fromEntries(quiz.questions.map((x, i) => [`q${i + 1}`, x.answer]));
    const pass = (await call("POST", `quizzes/${quiz.id}/submit`, student, { answers: right }));
    const body = pass.body as { passed: boolean; grade: string; percentage: number; certificateId: string };
    expect(body).toMatchObject({ passed: true, grade: "O", percentage: 100 });
    expect(body.certificateId).toMatch(/^CIQ-\d{4}-[A-F0-9]{8}$/);
    expect((await verifyCertificate(body.certificateId)).valid).toBe(true);

    const pub = (await publicCertificate(body.certificateId));
    expect(pub).toMatchObject({ valid: true, grade: "O" });
    expect(JSON.stringify(pub)).not.toMatch(/signature|studentSub/);

    expect((await call("POST", `quizzes/${quiz.id}/submit`, student, { answers: right })).status).toBe(200);
    expect((await call("POST", `quizzes/${quiz.id}/submit`, student, { answers: right })).status).toBe(409);

    const mine = (await call("GET", "certificates", student)).body as Array<{ id: string }>;
    expect(mine.map((c) => c.id)).toContain(body.certificateId);
    expect(((await call("GET", "certificates", as("student", "COL-1002", "someone-else"))).body as unknown[]).length).toBe(0);
  });
  it("detects a tampered certificate", async () => {
    const [id, cert] = [..._learningTest.certificates.entries()][0]!;
    const original = cert.percentage;
    cert.percentage = 99;
    expect((await verifyCertificate(id))).toMatchObject({ valid: false, tampered: true });
    cert.percentage = original;
    expect((await verifyCertificate(id)).valid).toBe(true);
    expect((await publicCertificate("CIQ-2026-00000000")).valid).toBe(false);
    expect((await publicCertificate("<script>")).valid).toBe(false);
  });
  it("validates quiz creation and blocks students", async () => {
    const good = {
      title: "Unit test",
      department: "Computer Science & Engineering",
      course: "DBMS",
      passMark: 50,
      durationMin: 10,
      certificateEnabled: true,
      status: "Published",
      questions: Array.from({ length: 3 }, (_, i) => ({ prompt: `Question number ${i}`, options: ["a", "b", "c", "d"], answer: 1, explanation: "" })),
    };
    expect((await call("POST", "quizzes", as("faculty", "COL-1001"), good)).status).toBe(201);
    expect((await call("POST", "quizzes", as("student", "COL-1001"), good)).status).toBe(403);
    expect((await call("POST", "quizzes", as("faculty", "COL-1001"), { ...good, questions: good.questions.slice(0, 2) })).status).toBe(422);
    expect((await call("POST", "quizzes", as("faculty", "COL-1001"), { ...good, department: "Anatomy" })).status).toBe(422);
  });
  it("won't delete a quiz that students attempted", async () => {
    const quiz = (await firstQuiz("COL-1002"));
    expect((await call("DELETE", `quizzes/${quiz.id}`, as("faculty", "COL-1002"))).status).toBe(409);
  });
});

describe("placement readiness", () => {
  it("computes a student's total from real quiz marks and certificates", async () => {
    const r = (await call("GET", "placement/me", as("student", "COL-1002", "stu-cert-test")));
    expect(r.status).toBe(200);
    const rd = (r.body as { readiness: { quizAverage: number; certificates: number; total: number } }).readiness;
    expect(rd.quizAverage).toBe(100);
    expect(rd.certificates).toBeGreaterThanOrEqual(1);
    expect(rd.total).toBeGreaterThan(0);
    expect(rd.total).toBeLessThanOrEqual(100);
  });
  it("board is for placement / leadership, scoped and masked", async () => {
    expect((await call("GET", "placement/board", as("student", "COL-1001"))).status).toBe(403);
    expect((await call("GET", "placement/board", as("recruiter", "COL-1001"))).status).toBe(403);
    const b = (await call("GET", "placement/board", as("placement", "COL-1002"))).body as { rows: Array<{ collegeId: string; rollNo: string; status: string; total: number; quizAverage: number; certificates: number; interview: number }> };
    expect(b.rows.length).toBeGreaterThan(5);
    expect(b.rows.every((r) => r.collegeId === "COL-1002")).toBe(true);
    expect(b.rows.every((r) => r.rollNo.includes("•") || r.rollNo.includes("*"))).toBe(true);
    for (const r of b.rows.filter((x) => x.status === "Placement ready")) {
      expect(r.total).toBeGreaterThanOrEqual(70);
      expect(r.quizAverage).toBeGreaterThanOrEqual(60);
      expect(r.certificates).toBeGreaterThanOrEqual(2);
      expect(r.interview).toBeGreaterThanOrEqual(50);
    }
  });
  it("respects the college's Placement switch", async () => {
    // COL-1004 (management) has Campus Life off but Placement on; the Super Admin sees every college
    const all = (await call("GET", "placement/board", as("admin", "all"))).body as { rows: Array<{ collegeId: string }> };
    expect(new Set(all.rows.map((r) => r.collegeId)).size).toBeGreaterThan(3);
  });
});

describe("CSV export", () => {
  it("neutralises spreadsheet formulas and quotes separators", async () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+91 98")).toBe("'+91 98");
    expect(csvCell("-5")).toBe("'-5");
    expect(csvCell("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell(42)).toBe("42");
    expect(toCsv([["a", "b"], [1, 2]])).toBe("﻿a,b\r\n1,2");
  });
});

describe("option shuffling", () => {
  it("keeps the answer pointing at the same text", async () => {
    const { shuffleOptions } = await import("@/lib/api/mock/learning");
    const q = { prompt: "p?", options: ["w", "RIGHT", "x", "y"] as [string, string, string, string], answer: 1, explanation: "" };
    const positions = new Set<number>();
    for (let i = 0; i < 40; i++) {
      const s = shuffleOptions(q);
      expect(s.options[s.answer]).toBe("RIGHT");
      expect([...s.options].sort()).toEqual([...q.options].sort());
      positions.add(s.answer);
    }
    expect(positions.size).toBeGreaterThan(1);
  });
});

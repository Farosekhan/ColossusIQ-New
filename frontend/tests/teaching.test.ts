import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { dispatch } from "@/lib/api/mock/router";
import type { SessionPayload } from "@/lib/auth/session";

const as = (role: SessionPayload["role"], college: string, sub = `${role}-${college}`): SessionPayload => ({ sub, role, name: `Test ${role}`, tenant: "uni-tntu", college, mfa: true, exp: 9e9 });
const q = new URLSearchParams();
const call = (method: string, path: string, s: SessionPayload, body?: unknown) => dispatch(method, path.split("/"), body, s, q);

type Sources = { courses: Array<{ id: string; title: string; chapters: Array<{ index: number; title: string }> }>; departments: string[] };
type Pack = {
  topic: string;
  draft: boolean;
  terms: unknown[];
  practice: unknown[];
  keyPoints: string[];
  illustration: string;
  outline: { minutes: number; blocks: Array<{ start: number; minutes: number }> };
  roadmap: { weeks: Array<{ title: string; current?: boolean; kind: string }> };
};

const faculty = as("faculty", "COL-1001", "fac-teach");

async function dbmsChapter() {
  const src = (await call("GET", "teaching/sources", faculty)).body as Sources;
  const course = src.courses.find((c) => c.title === "Database Management Systems")!;
  return { src, course, chapter: course.chapters.find((c) => c.title === "Normalization (1NF–BCNF)")! };
}

describe("teaching packs", () => {
  it("lists only the college's courses and real chapters", async () => {
    const { src, course } = (await dbmsChapter());
    expect(course.chapters.map((c) => c.title)).not.toContain("Getting started");
    expect(course.chapters.map((c) => c.title)).not.toContain("Course revision");
    expect(src.departments).toContain("Computer Science & Engineering");
  });

  it("builds a full pack from a course chapter", async () => {
    const { course, chapter } = (await dbmsChapter());
    const r = (await call("POST", "teaching/pack", faculty, { courseId: course.id, chapterIndex: chapter.index, minutes: 60 }));
    expect(r.status).toBe(200);
    const p = r.body as Pack;
    expect(p.topic).toBe("Normalization (1NF–BCNF)");
    expect(p.draft).toBe(false);
    expect(p.terms).toHaveLength(3);
    expect(p.practice).toHaveLength(2);
    expect(p.outline.blocks.reduce((s, b) => s + b.minutes, 0)).toBe(60);
    expect(p.outline.blocks.every((b, i, a) => i === 0 || b.start === a[i - 1]!.start + a[i - 1]!.minutes)).toBe(true);
    expect(p.roadmap.weeks.find((w) => w.current)?.title).toBe("Normalization (1NF–BCNF)");
    expect(p.roadmap.weeks.at(-1)!.kind).toBe("final");
  });

  it("finds library material for a typed topic and drafts the rest", async () => {
    const known = (await call("POST", "teaching/pack", faculty, { topic: "deadlock", minutes: 50 })).body as Pack;
    expect(known.topic).toBe("Deadlocks");
    expect(known.draft).toBe(false);
    const unknown = (await call("POST", "teaching/pack", faculty, { topic: "Compiler optimisation", minutes: 50 })).body as Pack;
    expect(unknown.draft).toBe(true);
    expect(unknown.keyPoints.length).toBeGreaterThan(0);
  });

  it("is for staff only and validates input", async () => {
    expect((await call("POST", "teaching/pack", as("student", "COL-1001"), { topic: "deadlock", minutes: 50 })).status).toBe(403);
    expect((await call("POST", "teaching/pack", faculty, { minutes: 50 })).status).toBe(422);
    expect((await call("POST", "teaching/pack", faculty, { topic: "deadlock", minutes: 5 })).status).toBe(422);
    expect((await call("POST", "teaching/pack", faculty, { topic: "deadlock", minutes: 50, extra: 1 })).status).toBe(422);
    const other = (await call("GET", "teaching/sources", as("faculty", "COL-1006"))).body as Sources;
    expect(other.courses.some((c) => c.title === "Database Management Systems")).toBe(false);
  });
});

describe("class summaries", () => {
  const body = {
    title: "Class summary — Normalization",
    topic: "Normalization (1NF–BCNF)",
    department: "Computer Science & Engineering",
    courseTitle: "Database Management Systems",
    date: "2026-09-24",
    points: ["2NF removes partial dependencies.", "3NF removes transitive dependencies."],
    homework: "Normalise the ENROL table to 3NF.",
    nextClass: "Transactions & ACID",
    resources: [{ label: "NPTEL lecture", url: "https://youtu.be/dQw4w9WgXcQ" }],
    infographic: { what: "Splitting tables to remove redundancy.", keyPoints: ["2NF removes partial dependencies."], terms: [], mistakes: [], illustration: "layers", question: null },
  };

  it("shares with students of the same college and tracks reads", async () => {
    const r = (await call("POST", "teaching/summaries", faculty, body));
    expect(r.status).toBe(201);
    const id = (r.body as { id: string }).id;

    const student = as("student", "COL-1001", "stu-notes");
    const notes = (await call("GET", "teaching/summaries", student)).body as Array<{ id: string; read: boolean; authorSub?: string; readers?: unknown }>;
    const note = notes.find((n) => n.id === id)!;
    expect(note.read).toBe(false);
    expect(note.authorSub).toBeUndefined();
    expect(note.readers).toBeUndefined();
    expect(((await call("GET", "teaching/summaries", as("student", "COL-1006"))).body as Array<{ id: string }>).some((n) => n.id === id)).toBe(false);

    expect((await call("POST", `teaching/summaries/${id}/read`, student)).status).toBe(200);
    expect(((await call("GET", "teaching/summaries", student)).body as Array<{ id: string; read: boolean }>).find((n) => n.id === id)!.read).toBe(true);
    expect(((await call("GET", "teaching/summaries", faculty)).body as Array<{ id: string; readCount: number }>).find((n) => n.id === id)!.readCount).toBe(1);
  });

  it("rejects unsafe links, wrong departments and non-staff authors", async () => {
    expect((await call("POST", "teaching/summaries", faculty, { ...body, resources: [{ label: "x", url: "https://evil.example/a" }] })).status).toBe(422);
    expect((await call("POST", "teaching/summaries", faculty, { ...body, resources: [{ label: "x", url: "javascript:alert(1)" }] })).status).toBe(422);
    expect((await call("POST", "teaching/summaries", faculty, { ...body, department: "Anatomy" })).status).toBe(422);
    expect((await call("POST", "teaching/summaries", as("student", "COL-1001"), body)).status).toBe(403);
  });

  it("only the author or the HOD can withdraw", async () => {
    const id = ((await call("POST", "teaching/summaries", faculty, body)).body as { id: string }).id;
    expect((await call("DELETE", `teaching/summaries/${id}`, as("faculty", "COL-1001", "someone-else"))).status).toBe(403);
    expect((await call("DELETE", `teaching/summaries/${id}`, as("hod", "COL-1001"))).status).toBe(200);
  });
});

describe("skill booster", () => {
  it("completes tasks from real activity and awards points", async () => {
    const me = as("faculty", "COL-1002", "fac-booster");
    const before = (await call("GET", "teaching/booster", me)).body as { points: number; tasks: Array<{ id: string; complete: boolean }> };
    expect(before.points).toBe(0);
    expect((await call("POST", "teaching/events", me, { kind: "smartboard_session" })).status).toBe(200);
    expect((await call("POST", "teaching/events", me, { kind: "summary_shared" })).status).toBe(422); // cannot self-report shares
    const after = (await call("GET", "teaching/booster", me)).body as { points: number; tasks: Array<{ id: string; complete: boolean }> };
    expect(after.tasks.find((t) => t.id === "smartboard")!.complete).toBe(true);
    expect(after.points).toBe(20);
    const stepped = (await call("POST", "teaching/booster/steps", me, { track: "active-learning", step: "a1", done: true })).body as { points: number };
    expect(stepped.points).toBe(25);
    expect((await call("POST", "teaching/booster/steps", me, { track: "active-learning", step: "zz", done: true })).status).toBe(404);
    expect((await call("GET", "teaching/booster", as("student", "COL-1002"))).status).toBe(403);
  });
});

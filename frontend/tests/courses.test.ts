import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { dispatch } from "@/lib/api/mock/router";
import { courseQuestions, parseSyllabus } from "@/lib/api/mock/course-builder";
import { learningCourses } from "@/lib/api/mock/course-state";
import { publicCertificate, quizzes } from "@/lib/api/mock/learning";
import type { SessionPayload } from "@/lib/auth/session";

const as = (role: SessionPayload["role"], college: string, sub = `${role}-${college}`): SessionPayload => ({ sub, role, name: `Test ${role}`, tenant: "uni-tntu", college, mfa: true, exp: 9e9 });
const q = new URLSearchParams();
const call = (method: string, path: string, s: SessionPayload, body?: unknown) => dispatch(method, path.split("/"), body, s, q);

type StudentSummary = { id: string; title: string; lessons: number; final: { quizId: string; questions: number; unlocked: boolean } };
type StaffDetail = {
  id: string;
  status: string;
  version: number;
  flagged: number;
  units: Array<{ title: string; lessons: Array<{ id: string; title: string; minutes: number; objectives: string[]; body: string; keyPoints: string[] }> }>;
  quiz: { id: string; passMark: number; durationMin: number; questions: Array<{ prompt: string; options: string[]; answer: number; explanation: string; review: boolean }> };
  courseRecordId: string | null;
  title: string;
  faculty: string;
  summary: string;
};

const brief = { department: "Computer Science & Engineering", title: "Database Management Systems", level: "Intermediate (UG Year 2–3)", semester: "4", credits: 4, faculty: "Dr. Test", mode: "title" };

describe("syllabus parsing", () => {
  it("reads university-style syllabi and ignores text books", async () => {
    const units = parseSyllabus("UNIT I INTRODUCTION 9\nPurpose – Views of data – Data models\nUNIT II: DESIGN\nER model; Normalization\nTEXT BOOKS:\n1. Silberschatz");
    expect(units.map((u) => u.title)).toEqual(["INTRODUCTION", "DESIGN"]);
    expect(units[0]!.lessons).toEqual(["Purpose", "Views of data", "Data models"]);
    expect(units.flatMap((u) => u.lessons)).not.toContain("Silberschatz");
  });
});

describe("course generation (HOD)", () => {
  it("builds lessons and a 30-question assessment from what students read", async () => {
    const r = (await call("POST", "learning-courses/generate", as("hod", "COL-1001"), brief));
    expect(r.status).toBe(201);
    const c = r.body as StaffDetail;
    expect(c.status).toBe("Draft");
    // 10 topic chapters × (concepts, worked example, practice) + orientation + revision
    expect(c.units).toHaveLength(12);
    expect(c.units[0]!.title).toBe("Getting started");
    expect(c.units.at(-1)!.title).toBe("Course revision");
    expect(c.units.flatMap((u) => u.lessons)).toHaveLength(32);
    expect(c.quiz.questions).toHaveLength(30);
    expect(c.flagged).toBe(0);
    // every "which chapter teaches …" question points at the chapter whose lessons contain the statement
    for (const qq of c.quiz.questions.filter((x) => x.prompt.startsWith("Which chapter of this course teaches"))) {
      const chapter = c.units.find((u) => u.title === qq.options[qq.answer])!;
      expect(chapter.lessons.some((l) => l.keyPoints.some((k) => qq.prompt.includes(k)))).toBe(true);
    }
    // every "which key term means …" question has the right term as its answer
    const terms = c.units.flatMap((u) => u.lessons.flatMap((l) => (l as { terms?: Array<{ term: string; meaning: string }> }).terms ?? []));
    const termQs = c.quiz.questions.filter((x) => x.prompt.startsWith("Which key term"));
    expect(termQs.length).toBeGreaterThan(5);
    for (const qq of termQs) expect(terms.find((t) => qq.prompt.includes(t.meaning))?.term).toBe(qq.options[qq.answer]);
  });
  it("builds lessons from a pasted syllabus and flags placeholder questions", async () => {
    const r = (await call("POST", "learning-courses/generate", as("hod", "COL-1001"), { ...brief, title: "Compiler Design", mode: "syllabus", syllabus: "Unit I: Lexical analysis\nTokens – Regular expressions – Finite automata\nUnit II: Parsing\nTop-down parsing – LR parsing" }));
    expect(r.status).toBe(201);
    const c = r.body as StaffDetail;
    expect(c.units.map((u) => u.title)).toEqual(["Getting started", "Lexical analysis", "Parsing", "Course revision"]);
    expect(c.quiz.questions).toHaveLength(30);
    expect(c.flagged).toBeGreaterThan(0);
    // cannot publish until reviewed; faculty cannot publish at all
    expect((await call("POST", `learning-courses/${c.id}/publish`, as("faculty", "COL-1001"))).status).toBe(403);
    expect((await call("POST", `learning-courses/${c.id}/publish`, as("hod", "COL-1001"))).status).toBe(409);
    const reviewed = c.quiz.questions.map((x) => ({ ...x, review: false }));
    const saved = (await call("PUT", `learning-courses/${c.id}/quiz`, as("hod", "COL-1001"), { version: c.version, passMark: 60, durationMin: 40, questions: reviewed }));
    expect(saved.status).toBe(200);
    const pub = (await call("POST", `learning-courses/${c.id}/publish`, as("hod", "COL-1001")));
    expect(pub.status).toBe(200);
    const recId = (pub.body as StaffDetail).courseRecordId!;
    expect(recId).toMatch(/^CRS-/);
    expect(((await call("GET", `records/courses/${recId}`, as("hod", "COL-1001"))).body as { record: { status: string } }).record.status).toBe("Active");
    // published courses are read-only
    expect((await call("PUT", `learning-courses/${c.id}/quiz`, as("hod", "COL-1001"), { version: 99, passMark: 60, durationMin: 40, questions: reviewed })).status).toBe(409);
  });
  it("validates input and blocks the wrong people", async () => {
    expect((await call("POST", "learning-courses/generate", as("student", "COL-1001"), brief)).status).toBe(403);
    expect((await call("POST", "learning-courses/generate", as("recruiter", "COL-1001"), brief)).status).toBe(403);
    expect((await call("POST", "learning-courses/generate", as("hod", "COL-1006"), brief)).status).toBe(422); // not a medical department
    expect((await call("POST", "learning-courses/generate", as("hod", "COL-1001"), { ...brief, extra: true })).status).toBe(422);
    expect((await call("POST", "learning-courses/generate", as("hod", "COL-1001"), { ...brief, mode: "syllabus", syllabus: "one" })).status).toBe(422);
  });
  it("edits lessons with optimistic concurrency and rejects bad content", async () => {
    const c = (await call("POST", "learning-courses/generate", as("faculty", "COL-1001"), { ...brief, title: "Operating Systems" })).body as StaffDetail;
    const units = c.units.map((u) => ({ ...u, lessons: u.lessons.map((l) => ({ ...l })) }));
    units[0]!.lessons[0]!.title = "Processes, threads & the PCB";
    units[0]!.lessons.push({ title: "Extra lesson", minutes: 20, objectives: [], body: "## Overview\nA new lesson body with enough text.", keyPoints: ["A key point students should remember"] } as never);
    const body = { version: c.version, title: c.title, faculty: c.faculty, summary: c.summary, units };
    const r = (await call("PUT", `learning-courses/${c.id}`, as("faculty", "COL-1001"), body));
    expect(r.status).toBe(200);
    const updated = r.body as StaffDetail;
    expect(updated.units[0]!.lessons[0]!.title).toBe("Processes, threads & the PCB");
    expect(updated.units[0]!.lessons.at(-1)!.id).toMatch(/^L\d+$/);
    expect((await call("PUT", `learning-courses/${c.id}`, as("faculty", "COL-1001"), body)).status).toBe(409); // stale version
    const bad = { ...body, version: updated.version, units: [{ title: "U", lessons: [{ title: "x", minutes: 1, objectives: [], body: "", keyPoints: [] }] }] };
    expect((await call("PUT", `learning-courses/${c.id}`, as("faculty", "COL-1001"), bad)).status).toBe(422);
    // faculty can't delete; HOD can delete an untouched draft
    expect((await call("DELETE", `learning-courses/${c.id}`, as("faculty", "COL-1001"))).status).toBe(403);
    expect((await call("DELETE", `learning-courses/${c.id}`, as("hod", "COL-1001"))).status).toBe(200);
    expect(learningCourses.has(c.id)).toBe(false);
  });
  it("assessment questions come only from the course when enough content exists", async () => {
    const units = [
      { title: "U1", lessons: [{ id: "L1", title: "Alpha", minutes: 20, objectives: [], body: "b".repeat(30), keyPoints: ["The first statement taught only here.", "Another fact about the topic area.", "Third fact that is long enough."] }] },
      { title: "U2", lessons: [{ id: "L2", title: "Beta", minutes: 20, objectives: [], body: "b".repeat(30), keyPoints: ["Second lesson statement number one.", "Second lesson statement number two.", "Second lesson statement three."] }] },
      { title: "U3", lessons: [{ id: "L3", title: "Gamma", minutes: 20, objectives: [], body: "b".repeat(30), keyPoints: ["The third lesson teaches this idea.", "Yet another unique third point.", "Final third point for the quiz."] }] },
      { title: "U4", lessons: [{ id: "L4", title: "Delta", minutes: 20, objectives: [], body: "b".repeat(30), keyPoints: ["The last lesson covers this concept.", "It also has a second concept.", "And a third concept statement."] }] },
    ];
    const qs = courseQuestions(units, "Unknown Department", 16);
    expect(qs).toHaveLength(16);
    expect(qs.every((x) => !x.review)).toBe(true);
    expect(new Set(qs.map((x) => x.answer)).size).toBeGreaterThan(1); // answers are not always in the same slot
  });
});

describe("rich lessons", () => {
  it("each library chapter has concepts, a worked example and practice with media links", async () => {
    const c = (await call("POST", "learning-courses/generate", as("hod", "COL-1006"), { ...brief, department: "Pathology", title: "General Pathology", semester: "Phase II" })).body as unknown as {
      units: Array<{ title: string; part?: string; lessons: Array<{ layout?: string; terms?: unknown[]; practice?: unknown[]; links?: Array<{ url: string }> }> }>;
    };
    const chapter = c.units[1]!;
    expect(chapter.part).toMatch(/^Part I/);
    expect(chapter.lessons.map((l) => l.layout)).toEqual(["concepts", "example", "practice"]);
    expect(chapter.lessons[0]!.terms!.length).toBe(3);
    expect(chapter.lessons[2]!.practice!.length).toBe(2);
    expect(chapter.lessons[0]!.links!.every((l) => l.url.startsWith("https://"))).toBe(true);
  });
  it("accepts YouTube / NPTEL videos and uploaded images, rejects anything else", async () => {
    const c = (await call("POST", "learning-courses/generate", as("hod", "COL-1001"), { ...brief, title: "Python Programming" })).body as StaffDetail;
    const withMedia = (videos: unknown, images: unknown = []) => ({
      version: c.version,
      title: c.title,
      faculty: c.faculty,
      summary: c.summary,
      units: c.units.map((u, ui) => ({ ...u, lessons: u.lessons.map((l, li) => (ui === 1 && li === 0 ? { ...l, videos, images } : l)) })),
    });
    const ok = (await call("PUT", `learning-courses/${c.id}`, as("hod", "COL-1001"), withMedia([{ title: "Lecture 1", url: "https://youtu.be/dQw4w9WgXcQ" }, { title: "NPTEL", url: "https://nptel.ac.in/courses/106106145" }], [{ ref: "/campus/lab.svg", caption: "Lab" }])));
    expect(ok.status).toBe(200);
    const saved = (ok.body as StaffDetail & { units: Array<{ lessons: Array<{ videos?: Array<{ url: string }> }> }> }).units[1]!.lessons[0]!.videos!;
    expect(saved[0]!.url).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    const v = (ok.body as StaffDetail).version;
    for (const bad of ["javascript:alert(1)", "http://youtube.com/watch?v=dQw4w9WgXcQ", "https://evil.example/video", "https://www.youtube.com/watch?v=short"]) {
      expect((await call("PUT", `learning-courses/${c.id}`, as("hod", "COL-1001"), { ...withMedia([{ title: "x", url: bad }]), version: v })).status).toBe(422);
    }
    expect((await call("PUT", `learning-courses/${c.id}`, as("hod", "COL-1001"), { ...withMedia([], [{ ref: "https://evil.example/x.png", caption: "" }]), version: v })).status).toBe(422);
  });
});

describe("student course flow", () => {
  const student = as("student", "COL-1001", "stu-course-flow");

  it("lists only published courses of the student's own college", async () => {
    const list = (await call("GET", "learning-courses", student)).body as StudentSummary[];
    expect(list.some((c) => c.title === "Database Management Systems")).toBe(true);
    const all = [...learningCourses.values()];
    const draft = all.find((c) => c.collegeId === "COL-1001" && c.status === "Draft");
    if (draft) expect((await call("GET", `learning-courses/${draft.id}`, student)).status).toBe(404);
    const other = all.find((c) => c.collegeId === "COL-1006")!;
    expect((await call("GET", `learning-courses/${other.id}`, student)).status).toBe(404);
  });

  it("reads lessons in order, unlocks the final assessment and issues a course certificate", async () => {
    const list = (await call("GET", "learning-courses", student)).body as StudentSummary[];
    const summary = list.find((c) => c.title === "Database Management Systems" && c.final.questions === 30)!;
    const detail = (await call("GET", `learning-courses/${summary.id}`, student)).body as { units: Array<{ lessons: Array<{ id: string }> }> };
    const ids = detail.units.flatMap((u) => u.lessons.map((l) => l.id));

    // final assessment is locked and hidden until every lesson is read
    expect((await call("GET", `quizzes/${summary.final.quizId}`, student)).status).toBe(403);
    expect((await call("POST", `quizzes/${summary.final.quizId}/submit`, student, { answers: {} })).status).toBe(403);
    // cannot skip ahead
    expect((await call("POST", `learning-courses/${summary.id}/lessons/${ids[2]}/complete`, student)).status).toBe(409);
    for (const lid of ids) expect((await call("POST", `learning-courses/${summary.id}/lessons/${lid}/complete`, student)).status).toBe(200);

    const quiz = (await call("GET", `quizzes/${summary.final.quizId}`, student));
    expect(quiz.status).toBe(200);
    expect((quiz.body as { questions: unknown[] }).questions).toHaveLength(30);
    expect(JSON.stringify(quiz.body)).not.toMatch(/"answer"/);

    const key = quizzes.get(summary.final.quizId)!.questions;
    const answers = Object.fromEntries(key.map((x, i) => [`q${i + 1}`, x.answer]));
    const res = (await call("POST", `quizzes/${summary.final.quizId}/submit`, student, { answers })).body as { passed: boolean; grade: string; certificateId: string };
    expect(res).toMatchObject({ passed: true, grade: "O" });
    const cert = (await publicCertificate(res.certificateId));
    expect(cert).toMatchObject({ valid: true, kind: "course", course: "Database Management Systems" });
  });

  it("keeps course assessments out of the generic quiz screens", async () => {
    const staffList = (await call("GET", "quizzes", as("faculty", "COL-1001"))).body as Array<{ id: string }>;
    const finals = [...learningCourses.values()].map((c) => c.finalQuizId);
    expect(staffList.some((x) => finals.includes(x.id))).toBe(false);
    const c = [...learningCourses.values()].find((x) => x.collegeId === "COL-1001" && x.status === "Published")!;
    expect((await call("POST", `quizzes/${c.finalQuizId}/status`, as("faculty", "COL-1001"), { status: "Closed" })).status).toBe(409);
  });

  it("won't delete a course students have started", async () => {
    const c = [...learningCourses.values()].find((x) => x.collegeId === "COL-1001" && x.title === "Database Management Systems" && x.status === "Published" && x.createdBy.includes("sample"))!;
    expect((await call("POST", `learning-courses/${c.id}/unpublish`, as("hod", "COL-1001"))).status).toBe(200);
    expect((await call("DELETE", `learning-courses/${c.id}`, as("hod", "COL-1001"))).status).toBe(409);
  });
});

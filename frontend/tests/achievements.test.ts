import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { badgesFor, computeStreak, istDay, levelOf, learningFor, XP } from "@/lib/api/mock/achievements";
import { dispatch } from "@/lib/api/mock/router";
import { _learningTest } from "@/lib/api/mock/learning";
import { getStore } from "@/lib/data";
import type { LearningCourse } from "@/lib/api/mock/course-state";
import type { AchievementsOverview } from "@/lib/api/achievements-schemas";
import type { SessionPayload } from "@/lib/auth/session";

const base: SessionPayload = { sub: "x", role: "student", name: "X", tenant: "uni-tntu", college: "COL-1001", mfa: true, exp: 9e9 };
const who = (sub: string, role: SessionPayload["role"] = "student", name = sub): SessionPayload => ({ ...base, sub, role, name });
const q = new URLSearchParams();
const call = (s: SessionPayload, method: string, path: string, body?: unknown) => dispatch(method, path.split("/"), body, s, q);
const mine = async (s: SessionPayload) => (await call(s, "GET", "achievements")).body as AchievementsOverview;

describe("levels and streaks", () => {
  it("starts level 1 and grows quadratically", () => {
    expect(levelOf(0)).toMatchObject({ level: 1, title: "Newcomer", from: 0, next: 50 });
    expect(levelOf(49).level).toBe(1);
    expect(levelOf(50)).toMatchObject({ level: 2, from: 50, next: 200 });
    expect(levelOf(450).level).toBe(4);
  });
  it("counts consecutive days and keeps yesterday's streak alive", () => {
    expect(computeStreak([], "2026-10-06")).toEqual({ current: 0, longest: 0, activeToday: false });
    expect(computeStreak(["2026-10-04", "2026-10-05", "2026-10-06"], "2026-10-06")).toEqual({ current: 3, longest: 3, activeToday: true });
    expect(computeStreak(["2026-10-04", "2026-10-05"], "2026-10-06")).toMatchObject({ current: 2, activeToday: false });
    expect(computeStreak(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05"], "2026-10-07")).toMatchObject({ current: 0, longest: 3 });
  });
  it("uses India time for the day", () => {
    expect(istDay("2026-10-05T19:00:00Z")).toBe("2026-10-06");
  });
});

describe("XP rules", () => {
  const quizOf = () => ({ title: "Unit test", passMark: 50 });
  const at = (n: number) => `2026-10-0${n}T10:00:00Z`;
  const att = (p: number, n: number) => ({ quizId: "Q1", studentSub: "s", studentName: "S", collegeId: "COL-1001", score: p, total: 100, percentage: p, at: at(n) });
  it("pays for attempts, the first pass and 90%+ once per quiz", () => {
    const l = learningFor([att(30, 1), att(95, 2), att(100, 3)], [], 0, 0, quizOf);
    expect(l.xp).toBe(3 * XP.attempt + XP.firstPass + XP.excellence);
    expect(l.passed).toBe(1);
    expect(l.perfect).toBe(true);
  });
  it("adds certificates, lessons and finished courses", () => {
    const cert = { title: "C", issuedAt: at(1) } as never;
    expect(learningFor([], [cert], 4, 1, quizOf).xp).toBe(XP.certificate + 4 * XP.lesson + XP.course);
  });
  it("earns badges from the facts", () => {
    const f = { attempts: 10, perfect: false, passed: 1, certs: 0, lessons: 0, coursesDone: 0, onTime: 0, strong: 0, longestStreak: 3, level: 2 };
    const done = badgesFor(f).filter((b) => b.earned).map((b) => b.id);
    expect(done).toEqual(expect.arrayContaining(["first-attempt", "quiz-regular", "first-pass", "streak-3"]));
    expect(done).not.toContain("quiz-marathon");
    expect(badgesFor(f).find((b) => b.id === "quiz-marathon")).toMatchObject({ value: 10, target: 25 });
  });
});

describe("GET achievements", () => {
  it("starts at zero for a new student", async () => {
    const o = await mine(who("ach-new"));
    expect(o).toMatchObject({ xp: 0, level: 1, streak: { current: 0, longest: 0 } });
    expect(o.badges.every((b) => !b.earned)).toBe(true);
    expect(o.recent).toEqual([]);
  });

  it("reflects real quiz attempts and certificates, per student", async () => {
    await _learningTest.ensureSeed();
    const quiz = [..._learningTest.quizzes.values()].find((x) => x.collegeId === "COL-1001" && x.status === "Published" && x.certificateEnabled)!;
    const right = Object.fromEntries(quiz.questions.map((x, i) => [`q${i + 1}`, x.answer]));
    const a = who("ach-a");
    const b = who("ach-b");
    await call(a, "POST", `quizzes/${quiz.id}/submit`, { answers: right });
    const oa = await mine(a);
    expect(oa.xp).toBe(XP.attempt + XP.firstPass + XP.excellence + XP.certificate);
    expect(oa.streak).toMatchObject({ current: 1, activeToday: true });
    expect(oa.stats).toMatchObject({ quizAttempts: 1, quizzesPassed: 1, certificates: 1 });
    expect(oa.badges.filter((x) => x.earned).map((x) => x.id)).toEqual(expect.arrayContaining(["first-attempt", "first-pass", "perfect-score", "first-certificate"]));
    expect(oa.recent.length).toBeGreaterThan(0);
    expect((await mine(b)).xp).toBe(0);
  });

  it("ranks the class without naming anyone", async () => {
    const o = await mine(who("ach-a"));
    expect(o.board.rank).toBe(1);
    expect(o.board.top.find((t) => t.you)?.xp).toBe(o.board.myXp);
    expect(JSON.stringify(o.board)).not.toMatch(/ach-|Name|name/);
    const nobody = await mine(who("ach-b"));
    expect(nobody.board.rank).toBeNull();
    expect(nobody.board.top.every((t) => !t.you)).toBe(true);
  });

  it("counts lessons read and finished courses", async () => {
    const course = {
      id: "CRS-ACH1",
      collegeId: "COL-1001",
      department: "X",
      title: "T",
      code: "T1",
      level: "UG",
      semester: "1",
      credits: 3,
      faculty: "F",
      source: "title",
      syllabus: "",
      summary: "",
      units: [{ title: "U", lessons: [{ id: "l1", title: "L1", minutes: 5, objectives: [], body: "", keyPoints: [] }, { id: "l2", title: "L2", minutes: 5, objectives: [], body: "", keyPoints: [] }] }],
      outcomes: [],
      finalQuizId: "none",
      status: "Published",
      createdBy: "F",
      createdAt: new Date().toISOString(),
      publishedAt: new Date().toISOString(),
      courseRecordId: null,
      version: 1,
    } as LearningCourse;
    await getStore().courses.save(course);
    const s = who("ach-reader");
    await getStore().progress.set(s.sub, course.id, ["l1"]);
    expect((await mine(s)).stats).toMatchObject({ lessons: 1, coursesDone: 0 });
    await getStore().progress.set(s.sub, course.id, ["l1", "l2"]);
    const o = await mine(s);
    expect(o.stats).toMatchObject({ lessons: 2, coursesDone: 1 });
    expect(o.xp).toBe(2 * XP.lesson + XP.course);
  });

  it("counts assignments handed in and scored well", async () => {
    const fac = who("ach-fac", "faculty", "Dr F");
    const mk = await call(fac, "POST", "assignments", { title: "Lab record", course: "CS101", maxMarks: 10, dueAt: new Date(Date.now() + 86_400_000).toISOString(), status: "Open" });
    expect(mk.status).toBe(201);
    const id = (mk.body as { id: string }).id;
    const s = who("ach-asg", "student", "Asha Rao");
    expect((await call(s, "PUT", `assignments/${id}/submission`, { text: "done" })).status).toBe(201);
    expect((await mine(s)).xp).toBe(XP.onTime);
    const subs = (await call(fac, "GET", `assignments/${id}/submissions`)).body as Array<{ id: string }>;
    await call(fac, "PATCH", `assignments/${id}/submissions/${subs[0]!.id}`, { marks: 9, feedback: "Good" });
    const o = await mine(s);
    expect(o.xp).toBe(XP.onTime + XP.strong);
    expect(o.badges.find((b) => b.id === "assignment-ace")?.earned).toBe(true);
  });

  it("is for students only", async () => {
    expect((await call(who("f1", "faculty"), "GET", "achievements")).status).toBe(403);
    expect((await call(who("s1"), "POST", "achievements", {})).status).toBe(404);
  });
});

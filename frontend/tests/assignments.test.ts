import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { dispatch } from "@/lib/api/mock/router";
import { assignmentNotifications } from "@/lib/api/mock/assignments";
import { resetAssignmentsMemory } from "@/lib/api/mock/assignment-store";
import type { AssignmentItem, Submission } from "@/lib/api/assignments-schemas";
import type { SessionPayload } from "@/lib/auth/session";

const base: SessionPayload = { sub: "x", role: "student", name: "X", tenant: "uni-tntu", college: "COL-1001", mfa: true, exp: 9e9 };
const who = (sub: string, role: SessionPayload["role"], name: string, college = "COL-1001"): SessionPayload => ({ ...base, sub, role, name, college });
const meena = who("faculty-meena", "faculty", "Dr. Meena");
const balaji = who("faculty-balaji", "faculty", "Prof. Balaji");
const admin = who("admin-1", "admin", "Admin");
const asha = who("student-asha", "student", "Asha Rao");
const ravi = who("student-ravi", "student", "Ravi Kumar");
const outsider = who("student-out", "student", "Out Sider", "COL-2002");

const q = new URLSearchParams();
const call = (s: SessionPayload, method: string, path: string, body?: unknown) => dispatch(method, path.split("/"), body, s, q);
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();
const make = (s: SessionPayload, o: Record<string, unknown> = {}) => call(s, "POST", "assignments", { title: "Process Scheduling Simulation", course: "OS", description: "Simulate FCFS and SJF.", maxMarks: 20, dueAt: inHours(48), ...o });
const created = async (s = meena, o: Record<string, unknown> = {}) => (await make(s, o)).body as AssignmentItem;
const list = async (s: SessionPayload) => (await call(s, "GET", "assignments")).body as AssignmentItem[];
const hand = (s: SessionPayload, id: string, body: unknown = { text: "My answer" }) => call(s, "PUT", `assignments/${id}/submission`, body);

beforeEach(() => resetAssignmentsMemory());
afterEach(() => vi.useRealTimers());

describe("Assignments: faculty side", () => {
  it("publishes an assignment with a real deadline", async () => {
    const r = await make(meena);
    expect(r.status).toBe(201);
    const a = r.body as AssignmentItem;
    expect(a).toMatchObject({ title: "Process Scheduling Simulation", course: "OS", maxMarks: 20, status: "Open", canManage: true, authorName: "Dr. Meena", mine: null });
    expect(a.stats).toEqual({ submitted: 0, graded: 0, enrolled: null });
    expect(a.due).toMatch(/\d/);
    expect((await list(meena)).map((x) => x.id)).toEqual([a.id]);
  });

  it("validates what the faculty type", async () => {
    expect((await make(meena, { title: "a" })).status).toBe(422);
    expect((await make(meena, { course: "" })).status).toBe(422);
    expect((await make(meena, { maxMarks: 0 })).status).toBe(422);
    expect((await make(meena, { maxMarks: 2.5 })).status).toBe(422);
    expect((await make(meena, { dueAt: "next friday" })).status).toBe(422);
    expect((await make(meena, { extra: 1 })).status).toBe(422);
    const past = await make(meena, { dueAt: inHours(-3) });
    expect(past.status).toBe(422);
    expect((past.body as { error: { fields: Record<string, string> } }).error.fields.dueAt).toBeTruthy();
    expect((await make(meena, { dueAt: inHours(-3), status: "Draft" })).status).toBe(201); // a draft may wait
    expect((await make(asha)).status).toBe(403);
  });

  it("keeps drafts from students until they are published", async () => {
    const d = await created(meena, { status: "Draft" });
    expect(await list(asha)).toEqual([]);
    expect((await list(meena)).map((x) => x.id)).toContain(d.id);
    expect((await hand(asha, d.id)).status).toBe(404);

    const pub = await call(meena, "PUT", `assignments/${d.id}`, { status: "Open", dueAt: inHours(24) });
    expect(pub.status).toBe(200);
    const seen = await list(asha);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ id: d.id, stats: null, mine: null, canManage: false });
  });

  it("refuses to publish with a deadline that has passed", async () => {
    const d = await created(meena, { status: "Draft", dueAt: inHours(-5) });
    expect((await call(meena, "PUT", `assignments/${d.id}`, { status: "Open" })).status).toBe(422);
    expect((await call(meena, "PUT", `assignments/${d.id}`, { status: "Open", dueAt: inHours(5) })).status).toBe(200);
  });

  it("lets only the author (or an admin) edit, see submissions, mark and delete", async () => {
    const a = await created(meena);
    await hand(asha, a.id);
    const sub = ((await call(meena, "GET", `assignments/${a.id}/submissions`)).body as Submission[])[0]!;

    expect((await call(balaji, "PUT", `assignments/${a.id}`, { title: "Hijacked" })).status).toBe(403);
    expect((await call(balaji, "GET", `assignments/${a.id}/submissions`)).status).toBe(403);
    expect((await call(balaji, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: 1 })).status).toBe(403);
    expect((await call(balaji, "DELETE", `assignments/${a.id}`)).status).toBe(403);
    expect((await list(balaji))[0]!.canManage).toBe(false);

    expect((await call(admin, "GET", `assignments/${a.id}/submissions`)).status).toBe(200);
    expect((await call(admin, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: 7 })).status).toBe(200);

    expect((await call(asha, "PUT", `assignments/${a.id}`, { title: "Mine now" })).status).toBe(403);
    expect((await call(asha, "DELETE", `assignments/${a.id}`)).status).toBe(403);
    expect((await call(asha, "GET", `assignments/${a.id}/submissions`)).status).toBe(403);
  });

  it("deletes an assignment together with its submissions", async () => {
    const a = await created();
    await hand(asha, a.id);
    expect((await call(meena, "DELETE", `assignments/${a.id}`)).status).toBe(200);
    expect(await list(meena)).toEqual([]);
    expect(await list(asha)).toEqual([]);
    expect((await call(meena, "GET", `assignments/${a.id}/submissions`)).status).toBe(404);
    expect((await call(meena, "DELETE", `assignments/${a.id}`)).status).toBe(404);
  });

  it("will not lower the total below marks already given", async () => {
    const a = await created();
    await hand(asha, a.id);
    const sub = ((await call(meena, "GET", `assignments/${a.id}/submissions`)).body as Submission[])[0]!;
    await call(meena, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: 18 });
    expect((await call(meena, "PUT", `assignments/${a.id}`, { maxMarks: 10 })).status).toBe(422);
    expect((await call(meena, "PUT", `assignments/${a.id}`, { maxMarks: 25 })).status).toBe(200);
  });
});

describe("Assignments: student side", () => {
  it("hands in work and can replace it until it is marked", async () => {
    const a = await created();
    const first = await hand(asha, a.id, { text: "First try", link: "https://github.com/asha/os-sim" });
    expect(first.status).toBe(201);
    expect(first.body).toMatchObject({ studentName: "Asha Rao", text: "First try", late: false, marks: null });

    const again = await hand(asha, a.id, { text: "Second try" });
    expect(again.status).toBe(200);
    const mine = (await list(asha))[0]!.mine!;
    expect(mine.text).toBe("Second try");
    expect(mine.link).toBe("");
    expect(((await call(meena, "GET", `assignments/${a.id}/submissions`)).body as Submission[])).toHaveLength(1);
  });

  it("needs an answer or a proper link", async () => {
    const a = await created();
    expect((await hand(asha, a.id, { text: "  " })).status).toBe(422);
    expect((await hand(asha, a.id, { link: "javascript:alert(1)" })).status).toBe(422);
    expect((await hand(asha, a.id, { link: "not a url" })).status).toBe(422);
    expect((await hand(asha, a.id, { text: "x".repeat(8001) })).status).toBe(422);
    expect((await hand(asha, a.id, { text: "ok", extra: 1 })).status).toBe(422);
    expect((await hand(asha, a.id, { link: "https://example.com/work" })).status).toBe(201);
    expect((await hand(meena, a.id)).status).toBe(403);
  });

  it("marks work handed in after the deadline as late", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const a = await created(meena, { dueAt: inHours(1) });
    vi.setSystemTime(Date.now() + 2 * 3_600_000);
    const r = await hand(asha, a.id);
    expect(r.status).toBe(201);
    expect((r.body as Submission).late).toBe(true);
  });

  it("stops taking work once an assignment is closed", async () => {
    const a = await created();
    await call(meena, "PUT", `assignments/${a.id}`, { status: "Closed" });
    expect((await hand(asha, a.id)).status).toBe(409);
    expect((await list(asha))[0]!.status).toBe("Closed");
  });

  it("shows marks and feedback once marked, and then locks the work", async () => {
    const a = await created();
    await hand(asha, a.id);
    const sub = ((await call(meena, "GET", `assignments/${a.id}/submissions`)).body as Submission[])[0]!;

    expect((await call(meena, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: 21 })).status).toBe(422); // out of 20
    expect((await call(meena, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: -1 })).status).toBe(422);
    expect((await call(meena, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: 16.5 })).status).toBe(422);
    expect((await call(meena, "PATCH", `assignments/${a.id}/submissions/nope`, { marks: 5 })).status).toBe(404);
    expect((await call(asha, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: 20 })).status).toBe(403);

    expect((await call(meena, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: 17, feedback: "Good use of queues." })).status).toBe(200);
    const mine = (await list(asha))[0]!.mine!;
    expect(mine).toMatchObject({ marks: 17, feedback: "Good use of queues." });
    expect(mine.gradedAt).toBeTruthy();
    expect((await hand(asha, a.id, { text: "Sneaky edit" })).status).toBe(409);

    const staff = (await list(meena))[0]!;
    expect(staff.stats).toMatchObject({ submitted: 1, graded: 1 });
  });
});

describe("Assignments: who sees what", () => {
  it("counts each student's submission separately and hides it from other students", async () => {
    const a = await created();
    await hand(asha, a.id, { text: "Asha's work" });
    expect((await list(ravi))[0]!.mine).toBeNull();
    await hand(ravi, a.id, { text: "Ravi's work" });
    expect((await list(ravi))[0]!.mine!.text).toBe("Ravi's work");
    expect((await list(asha))[0]!.mine!.text).toBe("Asha's work");
    const subs = (await call(meena, "GET", `assignments/${a.id}/submissions`)).body as Submission[];
    expect(subs.map((s) => s.studentName).sort()).toEqual(["Asha Rao", "Ravi Kumar"]);
    expect((await list(meena))[0]!.stats!.submitted).toBe(2);
  });

  it("keeps one college's assignments away from another", async () => {
    const a = await created();
    expect(await list(outsider)).toEqual([]);
    expect((await hand(outsider, a.id)).status).toBe(404);
    expect((await call(who("faculty-out", "faculty", "Other", "COL-2002"), "PUT", `assignments/${a.id}`, { title: "Nope" })).status).toBe(404);
  });

  it("only serves students and faculty", async () => {
    expect((await call(who("r1", "recruiter", "Recruiter"), "GET", "assignments")).status).toBe(403);
  });
});

describe("Assignment notifications", () => {
  it("tells a student about new work until it is handed in, then about the marks", async () => {
    const a = await created();
    const n1 = await assignmentNotifications(asha);
    expect(n1).toHaveLength(1);
    expect(n1[0]).toMatchObject({ title: `New assignment: ${a.title}`, unread: true });

    await hand(asha, a.id);
    expect(await assignmentNotifications(asha)).toEqual([]);
    expect(await assignmentNotifications(ravi)).toHaveLength(1);

    const sub = ((await call(meena, "GET", `assignments/${a.id}/submissions`)).body as Submission[])[0]!;
    await call(meena, "PATCH", `assignments/${a.id}/submissions/${sub.id}`, { marks: 15 });
    const n2 = await assignmentNotifications(asha);
    expect(n2).toHaveLength(1);
    expect(n2[0]).toMatchObject({ title: `Marked: ${a.title}`, body: "You scored 15 / 20", tone: "teal" });
  });

  it("is quiet for drafts and for faculty", async () => {
    await created(meena, { status: "Draft" });
    expect(await assignmentNotifications(asha)).toEqual([]);
    expect(await assignmentNotifications(meena)).toEqual([]);
  });
});

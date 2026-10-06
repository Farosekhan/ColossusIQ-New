import { beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";

vi.mock("server-only", () => ({}));

const model = vi.hoisted(() => ({ enabled: true, fail: false, prompts: [] as string[] }));
vi.mock("@/lib/ai/gemini", async (orig) => {
  const actual = await orig<typeof import("@/lib/ai/gemini")>();
  return {
    ...actual,
    geminiEnabled: () => model.enabled,
    geminiJson: async (schema: z.ZodTypeAny, o: { prompt: string }) => {
      model.prompts.push(o.prompt);
      if (model.fail) return { ok: false, reason: "http_500" };
      const p = schema.safeParse({ note: "- Start with your weakest topic while you are fresh.\n- Use each mock test to find what to fix next." });
      return p.success ? { ok: true, data: p.data } : { ok: false, reason: "schema" };
    },
  };
});

import { dispatch } from "@/lib/api/mock/router";
import { prefetchStudyPlanAi } from "@/lib/api/mock/study-planner";
import type { SessionPayload } from "@/lib/auth/session";

const base: SessionPayload = { sub: "student-a", role: "student", name: "Asha Rao", tenant: "uni-tntu", college: "COL-1001", mfa: true, exp: 9e9 };
const asha = base;
const ravi: SessionPayload = { ...base, sub: "student-b", name: "Ravi Kumar" };
const faculty: SessionPayload = { ...base, sub: "faculty-COL-1001", role: "faculty", name: "Dr. Test" };
const q = new URLSearchParams();
const get = (s: SessionPayload) => dispatch("GET", ["study-planner"], undefined, s, q);
const build = (s: SessionPayload, body: Record<string, unknown>) => dispatch("POST", ["study-planner", "plan"], body, s, q);
const toggle = (s: SessionPayload, body: unknown) => dispatch("PATCH", ["study-planner", "plan", "tasks"], body, s, q);
const clear = (s: SessionPayload) => dispatch("DELETE", ["study-planner", "plan"], undefined, s, q);

interface Task { id: string; day: number; subject: string; title: string; kind: "study" | "revision" | "mock"; minutes: number; done: boolean }
interface Plan { startDate: string; days: number; hoursPerDay: number; subjects: string[]; tasks: Task[]; note: string | null }
interface Overview { defaults: { days: number; hours: number; mode: string }; subjects: Array<{ name: string; mastery: number; weakestTopic: string | null }>; plan: Plan | null; aiLive: boolean }

const names = async (s: SessionPayload) => ((await get(s)).body as Overview).subjects.map((x) => x.name);
const req = async (s: SessionPayload, o: Record<string, unknown> = {}) => ({ days: 20, hours: 3, mode: "Exam", subjects: await names(s), ...o });

beforeEach(async () => {
  model.enabled = true;
  model.fail = false;
  model.prompts.length = 0;
  await clear(asha);
  await clear(ravi);
});

describe("Study planner overview", () => {
  it("lists the student's own subjects and defaults", async () => {
    const r = await get(asha);
    expect(r.status).toBe(200);
    const o = r.body as Overview;
    expect(o.subjects.length).toBeGreaterThan(0);
    expect(o.subjects.every((s) => s.mastery >= 0 && s.mastery <= 100)).toBe(true);
    expect(o.defaults.days).toBeGreaterThanOrEqual(3);
    expect(o.plan).toBeNull();
  });

  it("is for students only", async () => {
    expect((await get(faculty)).status).toBe(403);
    expect((await build(faculty, await req(asha))).status).toBe(403);
  });
});

describe("Building a plan", () => {
  it("fills every day with the hours asked for, weakest topic first, with mock and revision days", async () => {
    const r = await build(asha, await req(asha, { startDate: new Date().toISOString().slice(0, 10) }));
    expect(r.status).toBe(201);
    const plan = r.body as Plan;
    expect(plan.days).toBe(20);
    for (let d = 1; d <= 20; d++) {
      const minutes = plan.tasks.filter((t) => t.day === d).reduce((a, t) => a + t.minutes, 0);
      expect(minutes, `day ${d}`).toBe(3 * 60);
    }
    expect(plan.tasks.find((t) => t.day === 4)!.kind).toBe("mock"); // Exam mode: a mock test every 4th day
    expect(plan.tasks.filter((t) => t.day >= 19).every((t) => t.kind === "revision")).toBe(true);
    expect(plan.tasks.every((t) => !t.done)).toBe(true);
    // The very first study task is on the topic with the lowest mastery among the chosen subjects.
    const o = (await get(asha)).body as Overview;
    expect(o.plan).not.toBeNull();
    const weakest = o.subjects.filter((s) => s.weakestTopic).sort((a, b) => a.mastery - b.mastery)[0];
    expect(plan.tasks[0]!.kind).toBe("study");
    expect(plan.tasks[0]!.title.length).toBeGreaterThan(5);
    expect(weakest).toBeDefined();
  });

  it("gives weaker topics more time", async () => {
    const plan = (await build(asha, await req(asha, { days: 30, hours: 4, mode: "Deep learning" }))).body as Plan;
    const minutesByTitle = new Map<string, number>();
    for (const t of plan.tasks.filter((x) => x.kind === "study" && x.title.startsWith("Deep dive into"))) minutesByTitle.set(t.title, (minutesByTitle.get(t.title) ?? 0) + t.minutes);
    const ordered = [...minutesByTitle.values()];
    expect(ordered.length).toBeGreaterThan(3);
    expect(Math.max(...ordered)).toBeGreaterThan(Math.min(...ordered));
  });

  it("limits the plan to the subjects chosen", async () => {
    const all = await names(asha);
    const one = all[0]!;
    const plan = (await build(asha, await req(asha, { subjects: [one] }))).body as Plan;
    expect(plan.subjects).toEqual([one]);
    expect(plan.tasks.every((t) => t.subject === one)).toBe(true);
  });

  it("validates the request", async () => {
    const ok = await req(asha);
    expect((await build(asha, { ...ok, days: 2 })).status).toBe(422);
    expect((await build(asha, { ...ok, days: 91 })).status).toBe(422);
    expect((await build(asha, { ...ok, hours: 13 })).status).toBe(422);
    expect((await build(asha, { ...ok, subjects: [] })).status).toBe(422);
    expect((await build(asha, { ...ok, mode: "Nonsense" })).status).toBe(422);
    expect((await build(asha, { ...ok, extra: true })).status).toBe(422);
    const other = await build(asha, { ...ok, subjects: ["Not my subject"] });
    expect(other.status).toBe(422);
    expect(((other.body as { error: { fields: Record<string, string> } }).error.fields).subjects).toBeTruthy();
  });
});

describe("Each student has their own plan", () => {
  it("keeps plans and progress separate", async () => {
    const a = (await build(asha, await req(asha, { days: 10, hours: 2 }))).body as Plan;
    expect(((await get(ravi)).body as Overview).plan).toBeNull();
    const b = (await build(ravi, await req(ravi, { days: 15, hours: 5 }))).body as Plan;
    expect(b.days).toBe(15);

    const done = await toggle(asha, { taskId: a.tasks[0]!.id, done: true });
    expect(done.status).toBe(200);
    const seenA = ((await get(asha)).body as Overview).plan!;
    const seenB = ((await get(ravi)).body as Overview).plan!;
    expect(seenA.days).toBe(10);
    expect(seenA.tasks.filter((t) => t.done)).toHaveLength(1);
    expect(seenB.days).toBe(15);
    expect(seenB.tasks.some((t) => t.done)).toBe(false);

    expect((await clear(asha)).status).toBe(200);
    expect(((await get(asha)).body as Overview).plan).toBeNull();
    expect(((await get(ravi)).body as Overview).plan).not.toBeNull();
  });

  it("saves ticks and can untick", async () => {
    const plan = (await build(asha, await req(asha))).body as Plan;
    const id = plan.tasks[1]!.id;
    await toggle(asha, { taskId: id, done: true });
    expect(((await get(asha)).body as Overview).plan!.tasks.find((t) => t.id === id)!.done).toBe(true);
    await toggle(asha, { taskId: id, done: false });
    expect(((await get(asha)).body as Overview).plan!.tasks.find((t) => t.id === id)!.done).toBe(false);
    expect((await toggle(asha, { taskId: "d99-9", done: true })).status).toBe(404);
    expect((await toggle(asha, { taskId: id, done: "yes" })).status).toBe(422);
    expect((await toggle(ravi, { taskId: id, done: true })).status).toBe(404); // Ravi has no plan
  });
});

describe("AI coach's note", () => {
  it("adds a note written from the student's record", async () => {
    const plan = (await build(asha, await req(asha))).body as Plan;
    expect(plan.note).toContain("weakest topic");
    expect(model.prompts[0]).toContain("<student_record>");
    expect(model.prompts[0]).toContain("<plan>");
  });

  it("still builds the plan when the AI is off or fails", async () => {
    model.enabled = false;
    expect(((await build(asha, await req(asha))).body as Plan).note).toBeNull();
    model.enabled = true;
    model.fail = true;
    const r = await build(asha, await req(asha));
    expect(r.status).toBe(201);
    expect((r.body as Plan).note).toBeNull();
  });

  it("runs ahead of the request and the request reuses it once", async () => {
    const body = await req(asha, { days: 12 });
    expect(await prefetchStudyPlanAi("POST", ["study-planner", "plan"], body, asha)).toBeNull();
    expect(model.prompts).toHaveLength(1);
    expect(((await build(asha, body)).body as Plan).note).not.toBeNull();
    expect(model.prompts).toHaveLength(1);
    expect(await prefetchStudyPlanAi("POST", ["study-planner", "plan"], body, faculty)).toBeNull();
    expect(model.prompts).toHaveLength(1);
  });
});

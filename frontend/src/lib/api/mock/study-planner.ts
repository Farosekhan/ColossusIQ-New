import "server-only";
import { createHash } from "node:crypto";
import { z } from "zod";
import { geminiEnabled, geminiJson } from "@/lib/ai/gemini";
import type { SessionPayload } from "@/lib/auth/session";
import { withRequestContext } from "@/lib/data";
import { cleanText } from "@/lib/security/sanitize";
import { MAX_DAYS, MIN_DAYS, PlanRequest, TaskToggle, type PlannerOverview, type StudyPlan, type StudyTask } from "@/lib/api/study-planner-schemas";
import { stillActive } from "./ai-guard";
import { loadMentorContext, recordText, type MentorContext } from "./mentor";
import { rateLimit } from "./rate-limit";
import { studyPlanStore } from "./study-plan-store";
import type { MockResult } from "./router";

/*
 * AI Study Planner. Each student's plan is built from their own record (the subjects they are enrolled in and how well
 * they know each topic): weaker topics get more time and come first, with mock-test days and final revision days. The
 * plan is saved per student and the student ticks tasks off. With Gemini on, a short personalised strategy note is added.
 */

const ok = (body: unknown, status = 200): MockResult => ({ status, body });
const err = (status: number, code: string, message: string, fields?: Record<string, string>): MockResult => ({
  status,
  body: { error: { code, message, ...(fields ? { fields } : {}) } },
});
const isProd = process.env.NODE_ENV === "production";
const mean = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0);

/* ───────────────────────────── the schedule (no AI needed) ─────────────────────────── */

interface Topic {
  subject: string;
  title: string;
  mastery: number;
}

/** Splits `total` whole blocks across the weights (largest remainder), so the counts always add up. */
function allocate(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const out = raw.map((r) => Math.floor(r));
  let left = total - out.reduce((a, b) => a + b, 0);
  const order = raw.map((r, i) => ({ frac: r - Math.floor(r), i })).sort((a, b) => b.frac - a.frac);
  for (const { i } of order) {
    if (left <= 0) break;
    out[i] = (out[i] ?? 0) + 1;
    left -= 1;
  }
  return out;
}

const VERB: Record<string, string> = {
  Beginner: "Learn the basics of",
  Exam: "Study and practise",
  "Deep learning": "Deep dive into",
  "Quick revision": "Revise",
  "Last-minute preparation": "Revise",
  Interview: "Interview prep on",
  Practical: "Hands-on practice with",
  Project: "Build and review",
};

const dateOf = (start: Date, offset: number) => {
  const d = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + offset));
  return d.toISOString().slice(0, 10);
};

type Schedule = Pick<StudyPlan, "startDate" | "days" | "hoursPerDay" | "mode" | "subjects" | "tasks">;

export function buildSchedule(ctx: MentorContext, req: PlanRequest, now = new Date()): Schedule {
  const wanted = new Set(req.subjects.map((s) => s.toLowerCase()));
  const chosen = ctx.profile.enrolledSubjects.filter((s) => wanted.has(s.shortName.toLowerCase()));
  const topics: Topic[] = chosen.flatMap((s) => (s.units.length ? s.units.map((u) => ({ subject: s.shortName, title: u.title, mastery: u.mastery })) : [{ subject: s.shortName, title: "Core concepts", mastery: 50 }]));
  const byWeakness = [...topics].sort((a, b) => a.mastery - b.mastery);
  const subjectsWeakFirst = chosen
    .map((s) => ({ name: s.shortName, avg: mean(topics.filter((t) => t.subject === s.shortName).map((t) => t.mastery)) }))
    .sort((a, b) => a.avg - b.avg)
    .map((s) => s.name);

  const N = req.days;
  const H = req.hours;
  const quick = req.mode === "Quick revision" || req.mode === "Last-minute preparation";
  const mockEvery = req.mode === "Exam" || req.mode === "Last-minute preparation" ? 4 : 5;
  const kindOf = (d: number): "study" | "revision" | "mock" => {
    if (N >= 7 && d >= N - 1) return "revision";
    if (N >= 7 && d % mockEvery === 0) return "mock";
    if (quick && d > N / 2) return "revision";
    return "study";
  };
  const kinds = Array.from({ length: N }, (_, i) => kindOf(i + 1));
  const studyDays = kinds.filter((k) => k === "study").length;

  // Time per topic follows how weak it is (+10 so well-known topics still get a look).
  const counts = allocate(studyDays * H, byWeakness.map((t) => 110 - t.mastery));
  const queue: Topic[] = byWeakness.flatMap((t, i) => Array.from({ length: counts[i] ?? 0 }, () => t));
  let qi = 0;
  let mockN = 0;
  const verb = VERB[req.mode] ?? "Study";

  const tasks: StudyTask[] = [];
  const add = (day: number, subject: string, title: string, kind: StudyTask["kind"], minutes: number) =>
    tasks.push({ id: `d${day}-${tasks.filter((t) => t.day === day).length + 1}`, day, subject, title: title.slice(0, 200), kind, minutes: Math.max(5, Math.min(720, minutes)), done: false });

  for (let day = 1; day <= N; day++) {
    const kind = kinds[day - 1]!;
    if (kind === "mock") {
      const subject = subjectsWeakFirst[mockN % subjectsWeakFirst.length] ?? "All subjects";
      mockN += 1;
      const mockMin = Math.min(H * 60, 120);
      add(day, subject, `Timed mock test: ${subject}`, "mock", mockMin);
      const rest = H * 60 - mockMin;
      const weakest = byWeakness.find((t) => t.subject === subject);
      if (rest >= 30 && weakest) add(day, subject, `Review mistakes and fix: ${weakest.title}`, "study", rest);
    } else if (kind === "revision") {
      const per = new Map<string, number>();
      for (let b = 0; b < H; b++) {
        const s = subjectsWeakFirst[b % subjectsWeakFirst.length] ?? "All subjects";
        per.set(s, (per.get(s) ?? 0) + 60);
      }
      for (const [subject, minutes] of per) {
        const weakest = byWeakness.filter((t) => t.subject === subject).slice(0, 2).map((t) => t.title);
        add(day, subject, `Quick revision of ${subject}${weakest.length ? `: ${weakest.join(", ")}` : ""}`, "revision", minutes);
      }
    } else {
      const blocks: Topic[] = [];
      for (let b = 0; b < H; b++) {
        const t = queue[qi] ?? byWeakness[b % Math.max(1, byWeakness.length)];
        qi += 1;
        if (t) blocks.push(t);
      }
      const merged: Array<{ t: Topic; blocks: number }> = [];
      for (const t of blocks) {
        const last = merged[merged.length - 1];
        if (last && last.t === t) last.blocks += 1;
        else merged.push({ t, blocks: 1 });
      }
      for (const m of merged) add(day, m.t.subject, `${verb} ${m.t.title}`, "study", m.blocks * 60);
    }
  }

  // Trust the student's own date only when it is within a day or two of the server's (timezones), never an arbitrary date.
  const claimed = req.startDate ? new Date(`${req.startDate}T00:00:00Z`) : null;
  const useClaimed = claimed && !Number.isNaN(claimed.getTime()) && Math.abs(claimed.getTime() - now.getTime()) <= 2 * 86_400_000;
  return { startDate: dateOf(useClaimed && claimed ? claimed : now, 0), days: N, hoursPerDay: H, mode: req.mode, subjects: chosen.map((s) => s.shortName), tasks };
}

/* ───────────────────────────── the AI note ─────────────────────────── */

const SYSTEM = [
  "You are a study coach inside ColossusIQ, a college learning platform in India. You write a short strategy note for one student's study plan, using only the facts in <student_record> and <plan>.",
  "Never invent marks, dates or topics. Do not repeat the day-by-day schedule; give 3 to 5 specific tips about how to study these topics, what to do first and how to use the mock tests. Under 180 words.",
  "Plain Markdown bullets only: no HTML, no links.",
  'Reply with a single JSON object: {"note": "<markdown>"}.',
].join(" ");
const NoteOut = z.object({ note: z.string().trim().min(20).max(1500) });

function planSummary(s: Schedule): string {
  const first = s.tasks.filter((t) => t.day <= 3).map((t) => `day ${t.day}: ${t.title} (${t.minutes} min)`);
  const mocks = s.tasks.filter((t) => t.kind === "mock").map((t) => `day ${t.day}`);
  return [`Days: ${s.days}, hours per day: ${s.hoursPerDay}, mode: ${s.mode}`, `Subjects: ${s.subjects.join(", ")}`, `First days: ${first.join("; ")}`, `Mock-test days: ${mocks.join(", ") || "none"}`].join("\n");
}

async function askNote(ctx: MentorContext, s: Schedule): Promise<string | null> {
  const r = await geminiJson(NoteOut, {
    system: SYSTEM,
    prompt: `<student_record>\n${recordText(ctx)}\n</student_record>\n\n<plan>\n${planSummary(s)}\n</plan>\n\nWrite the strategy note.`,
    temperature: 0.5,
    maxOutputTokens: 1024,
    timeoutMs: 25_000,
  });
  if (!r.ok) return null;
  const note = cleanText(r.data.note.replace(/https?:\/\/\S+/gi, "").replace(/<\/?[a-z][^>]*>/gi, ""), 1500);
  return note.length >= 20 ? note : null;
}

/* ───────────────────────────── before the transaction ─────────────────────────── */

type Parked = { at: number; note: string | null };
const parked = new Map<string, Parked>();
const TTL_MS = 5 * 60_000;
const keyOf = (who: string, req: PlanRequest) => `plan:${who}:${createHash("sha256").update(JSON.stringify(req)).digest("hex")}`;
function park(key: string, note: string | null) {
  const now = Date.now();
  for (const [k, v] of parked) if (now - v.at >= TTL_MS) parked.delete(k);
  parked.set(key, { at: now, note });
}
function take(key: string): Parked | undefined {
  const p = parked.get(key);
  parked.delete(key);
  return p && Date.now() - p.at < TTL_MS ? p : undefined;
}
/** Over the hourly allowance the plan is still built, just without the AI note. */
const noteAllowed = (who: string) => rateLimit(`study-plan-ai:${who}`, isProd ? 20 : 200, 3_600_000).ok;

const isGenerate = (method: string, segs: string[]) => method === "POST" && segs[0] === "study-planner" && segs[1] === "plan" && segs.length === 2;

/** Runs the model call ahead of the request's database transaction (30 s limit in postgres mode). Always returns null. */
export async function prefetchStudyPlanAi(method: string, segs: string[], rawBody: unknown, session: SessionPayload): Promise<MockResult | null> {
  if (!isGenerate(method, segs) || !geminiEnabled() || session.role !== "student") return null;
  const p = PlanRequest.safeParse(rawBody);
  if (!p.success || !(await stillActive(session))) return null;
  const who = session.sub ?? session.name;
  if (!noteAllowed(who)) {
    park(keyOf(who, p.data), null);
    return null;
  }
  const ctx = await withRequestContext({ scope: session.college, sub: session.sub, readOnly: true }, () => loadMentorContext(session));
  park(keyOf(who, p.data), await askNote(ctx, buildSchedule(ctx, p.data)));
  return null;
}

/* ───────────────────────────── handlers ─────────────────────────── */

async function overview(session: SessionPayload): Promise<PlannerOverview> {
  const ctx = await loadMentorContext(session);
  const plan = (await studyPlanStore().get(session.sub)) ?? null;
  const subjects = ctx.profile.enrolledSubjects.map((s) => {
    const weakest = [...s.units].sort((a, b) => a.mastery - b.mastery)[0];
    return { name: s.shortName, title: s.title, mastery: mean(s.units.map((u) => u.mastery)), attendance: s.attendancePercent, weakestTopic: weakest?.title ?? null };
  });
  return {
    defaults: { days: Math.min(MAX_DAYS, Math.max(MIN_DAYS, ctx.dash.examCountdown.days)), hours: plan?.hoursPerDay ?? 3, mode: plan?.mode ?? "Exam", examName: ctx.dash.examCountdown.exam },
    subjects,
    plan,
    aiLive: geminiEnabled(),
  };
}

export async function dispatchStudyPlanner(method: string, segs: string[], rawBody: unknown, session: SessionPayload): Promise<MockResult> {
  if (session.role !== "student") return err(403, "forbidden", "The study planner is for students.");
  const store = studyPlanStore();

  if (method === "GET" && segs.length === 1) return ok(await overview(session));

  if (isGenerate(method, segs)) {
    const p = PlanRequest.safeParse(rawBody);
    if (!p.success) {
      const fields: Record<string, string> = {};
      for (const i of p.error.issues) fields[String(i.path[0] ?? "_")] ??= i.message;
      return err(422, "validation", "Please correct the highlighted fields.", fields);
    }
    const ctx = await loadMentorContext(session);
    const known = new Set(ctx.profile.enrolledSubjects.map((s) => s.shortName.toLowerCase()));
    if (!p.data.subjects.every((s) => known.has(s.toLowerCase()))) return err(422, "validation", "Pick subjects you are enrolled in.", { subjects: "Pick subjects you are enrolled in" });
    const schedule = buildSchedule(ctx, p.data);
    const who = session.sub ?? session.name;
    const prepared = take(keyOf(who, p.data));
    const note = prepared ? prepared.note : geminiEnabled() && noteAllowed(who) ? await askNote(ctx, schedule) : null;
    const now = new Date().toISOString();
    const plan: StudyPlan = { ...schedule, note, createdAt: now, updatedAt: now };
    await store.save(session.college, session.sub, plan);
    return ok(plan, 201);
  }

  if (method === "PATCH" && segs[1] === "plan" && segs[2] === "tasks" && segs.length === 3) {
    const t = TaskToggle.safeParse(rawBody);
    if (!t.success) return err(422, "validation", "Invalid task update.");
    const plan = await store.get(session.sub);
    const task = plan?.tasks.find((x) => x.id === t.data.taskId);
    if (!plan || !task) return err(404, "not_found", "That task is not in your plan.");
    task.done = t.data.done;
    plan.updatedAt = new Date().toISOString();
    await store.save(session.college, session.sub, plan);
    return ok(plan);
  }

  if (method === "DELETE" && segs[1] === "plan" && segs.length === 2) {
    await store.remove(session.sub);
    return ok({ ok: true });
  }

  return err(404, "not_found", "Resource not found.");
}

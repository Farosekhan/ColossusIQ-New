import "server-only";
import { Prisma } from "@prisma/client";
import type { FacultyEvent } from "@/lib/api/mock/faculty-activity";
import type { ClassSummary, SavedOutline } from "@/lib/api/mock/teaching";
import type { EvaluationQueueItem, Notification } from "@/lib/api/schemas";
import type { BoosterStore, EvaluationStore, FacultyEventStore, InterviewStore, NotificationStore, OutlineStore, ResumeStore, SummaryStore } from "../store";
import { db, isUuid } from "./db";
import { enumValue, label } from "./enums";
import { collegeByPublic, collegePublic, day, lookupId, studentOf, toDay } from "./lookups";

/* Teaching tools (class summaries, outlines, Skill Booster) and career data (evaluations, interviews, resumes, notifications). */

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n) : s);
const json = <T,>(v: Prisma.JsonValue): T => v as unknown as T;

/* ── class summaries ─────────────────────────────── */
const SUMMARY_INCLUDE = {
  department: { select: { name: true } },
  classSummaryReads: { select: { student: { select: { userId: true } } } },
} satisfies Prisma.ClassSummaryInclude;
type SummaryRow = Prisma.ClassSummaryGetPayload<{ include: typeof SUMMARY_INCLUDE }>;

async function toSummary(r: SummaryRow): Promise<ClassSummary> {
  return {
    id: r.publicId,
    collegeId: await collegePublic(r.collegeId),
    authorSub: r.authorId ?? "",
    authorName: r.authorName,
    department: r.department.name,
    courseTitle: r.courseTitle,
    topic: r.topic,
    title: r.title,
    date: day(r.classDate),
    points: json<string[]>(r.points),
    homework: r.homework,
    nextClass: r.nextClass,
    resources: json<ClassSummary["resources"]>(r.resources),
    infographic: r.infographic ? json<ClassSummary["infographic"]>(r.infographic) : null,
    sharedAt: r.sharedAt.toISOString(),
    readers: r.classSummaryReads.map((x) => x.student.userId),
  };
}

export const pgSummaries: SummaryStore = {
  async list(scope) {
    const college = scope === "all" ? undefined : await collegeByPublic(scope);
    const rows = await db().classSummary.findMany({ where: { withdrawnAt: null, ...(scope === "all" ? {} : { collegeId: college?.id ?? "00000000-0000-0000-0000-000000000000" }) }, include: SUMMARY_INCLUDE });
    return Promise.all(rows.map(toSummary));
  },
  async get(id) {
    const r = await db().classSummary.findFirst({ where: { publicId: id, withdrawnAt: null }, include: SUMMARY_INCLUDE });
    return r ? toSummary(r) : undefined;
  },
  async add(s) {
    const college = await collegeByPublic(s.collegeId);
    if (!college) throw new Error(`Unknown college ${s.collegeId}`);
    await db().classSummary.create({
      data: {
        publicId: s.id,
        collegeId: college.id,
        authorId: isUuid(s.authorSub) ? s.authorSub : null,
        authorName: s.authorName,
        departmentId: await lookupId("departments", college.stream, s.department),
        courseTitle: s.courseTitle,
        topic: s.topic,
        title: s.title,
        classDate: toDay(s.date),
        points: s.points,
        homework: s.homework,
        nextClass: s.nextClass,
        resources: s.resources,
        infographic: s.infographic ?? Prisma.DbNull,
        sharedAt: new Date(s.sharedAt),
      },
    });
  },
  async markRead(id, sub) {
    const st = await studentOf(sub);
    if (!st) return;
    const s = await db().classSummary.findUnique({ where: { publicId: id }, select: { id: true } });
    if (s) await db().classSummaryRead.createMany({ data: [{ summaryId: s.id, studentId: st.id }], skipDuplicates: true });
  },
  async withdraw(id) {
    // Kept for the record; students no longer see it.
    await db().classSummary.updateMany({ where: { publicId: id, withdrawnAt: null }, data: { withdrawnAt: new Date() } });
  },
};

/* ── lesson outlines ─────────────────────────────── */
export const pgOutlines: OutlineStore = {
  async list(sub) {
    if (!isUuid(sub)) return [];
    const rows = await db().lessonOutline.findMany({ where: { authorId: sub } });
    return Promise.all(rows.map(toOutline));
  },
  async get(id) {
    const r = await db().lessonOutline.findUnique({ where: { publicId: id } });
    return r ? toOutline(r) : undefined;
  },
  async add(o) {
    if (!isUuid(o.sub)) throw new Error("Outlines are saved for signed-in staff accounts only.");
    const college = await collegeByPublic(o.collegeId);
    if (!college) throw new Error("Switch into a college to save outlines.");
    await db().lessonOutline.create({
      data: { publicId: o.id, collegeId: college.id, authorId: o.sub, topic: o.topic, courseTitle: o.courseTitle, minutes: o.minutes, blocks: o.blocks, createdAt: new Date(o.createdAt) },
    });
  },
  async delete(id) {
    await db().lessonOutline.deleteMany({ where: { publicId: id } });
  },
};
async function toOutline(r: { publicId: string; authorId: string; collegeId: string; topic: string; courseTitle: string | null; minutes: number; blocks: Prisma.JsonValue; createdAt: Date }): Promise<SavedOutline> {
  return {
    id: r.publicId,
    sub: r.authorId,
    collegeId: await collegePublic(r.collegeId),
    topic: r.topic,
    courseTitle: r.courseTitle,
    minutes: r.minutes,
    blocks: json<SavedOutline["blocks"]>(r.blocks),
    createdAt: r.createdAt.toISOString(),
  };
}

/* ── Skill Booster ───────────────────────────────── */
export const pgBooster: BoosterStore = {
  async steps(sub) {
    if (!isUuid(sub)) return new Set();
    const rows = await db().boosterStepCompletion.findMany({ where: { userId: sub }, select: { track: true, step: true } });
    return new Set(rows.map((r) => `${r.track}:${r.step}`));
  },
  async setStep(sub, key, done) {
    if (!isUuid(sub)) return;
    const [track, step] = key.split(":") as [string, string];
    if (done) await db().boosterStepCompletion.createMany({ data: [{ userId: sub, track, step }], skipDuplicates: true });
    else await db().boosterStepCompletion.deleteMany({ where: { userId: sub, track, step } });
  },
};

export const pgFacultyEvents: FacultyEventStore = {
  async record(sub, kind, count = 1, collegeId = null) {
    if (!isUuid(sub)) return;
    const college = collegeId ? await collegeByPublic(collegeId) : undefined;
    await db().facultyActivityEvent.createMany({
      data: Array.from({ length: Math.min(count, 50) }, () => ({ userId: sub, collegeId: college?.id ?? null, kind: kind as never })),
    });
  },
  async counts(sub) {
    if (!isUuid(sub)) return {};
    const rows = await db().facultyActivityEvent.groupBy({ by: ["kind"], where: { userId: sub }, _count: { _all: true } });
    return Object.fromEntries(rows.map((r) => [r.kind as FacultyEvent, r._count._all]));
  },
};

/* ── evaluation review queue ─────────────────────── */
const EVAL_INCLUDE = { student: { select: { rollNo: true, user: { select: { fullName: true } } } } } satisfies Prisma.EvaluationItemInclude;
type EvalRow = Prisma.EvaluationItemGetPayload<{ include: typeof EVAL_INCLUDE }>;

function toItem(r: EvalRow): EvaluationQueueItem {
  const ai = json<Partial<EvaluationQueueItem["result"]>>(r.aiResult);
  return {
    id: r.id,
    student: r.student.user.fullName,
    rollNo: r.student.rollNo,
    assessment: r.assessment,
    question: r.question,
    answer: r.answer,
    result: {
      score: Number(r.aiScore),
      max: Number(r.maxScore),
      confidence: Number(r.confidence),
      rubric: ai.rubric ?? [],
      evidence: ai.evidence ?? [],
      missing: ai.missing ?? [],
      feedback: ai.feedback ?? "",
      reviewRequired: true,
    },
    status: label("EvaluationStatus", r.status) as EvaluationQueueItem["status"],
    finalScore: r.finalScore === null ? null : Number(r.finalScore),
  };
}

export const pgEvaluations: EvaluationStore = {
  async queue(session) {
    if (!isUuid(session.sub)) return [];
    const rows = await db().evaluationItem.findMany({ where: { assignedTo: session.sub }, include: EVAL_INCLUDE, orderBy: { createdAt: "asc" } });
    return rows.map(toItem);
  },
  async decide(session, id, decision) {
    const t = db();
    const item = await t.evaluationItem.findFirst({ where: { id, assignedTo: session.sub }, include: EVAL_INCLUDE });
    if (!item) return undefined;
    const overridden = decision.reason !== undefined;
    await t.evaluationItem.update({
      where: { id },
      data: { status: enumValue("EvaluationStatus", overridden ? "overridden" : "approved") as never, finalScore: decision.finalScore, reviewedBy: session.sub, reviewedAt: new Date() },
    });
    if (overridden) {
      await t.evaluationOverride.create({
        data: { itemId: id, overriddenBy: session.sub, previousScore: item.finalScore ?? item.aiScore, finalScore: decision.finalScore, reason: clip(decision.reason!, 500) },
      });
    }
    const updated = await t.evaluationItem.findUniqueOrThrow({ where: { id }, include: EVAL_INCLUDE });
    return toItem(updated);
  },
};

/* ── mock interviews and resume analyses ─────────── */
export const pgInterviews: InterviewStore = {
  async start(session, mode) {
    const st = await studentOf(session.sub);
    if (!st) throw new Error("Mock interviews are for student accounts.");
    const row = await db().interviewSession.create({ data: { studentId: st.id, collegeId: st.collegeId, mode: mode as never }, select: { id: true } });
    return row.id;
  },
  async get(id) {
    if (!isUuid(id)) return undefined;
    const r = await db().interviewSession.findUnique({ where: { id }, include: { student: { select: { userId: true } } } });
    if (!r || r.completedAt) return undefined;
    return { id: r.id, owner: r.student.userId, mode: r.mode as "technical" | "hr" | "behavioral", index: json<unknown[]>(r.turns).length };
  },
  async advance(id, answer, turn) {
    const t = db();
    const r = await t.interviewSession.findUniqueOrThrow({ where: { id }, select: { turns: true } });
    const turns = [...json<unknown[]>(r.turns), { answer, feedback: turn.feedback, next: turn.done ? null : turn.question }];
    await t.interviewSession.update({
      where: { id },
      data: {
        turns: turns as Prisma.InputJsonValue,
        ...(turn.done && turn.scorecard
          ? { completedAt: new Date(), overallScore: Math.round(turn.scorecard.overall), scorecard: turn.scorecard as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });
  },
};

export const pgResumes: ResumeStore = {
  async save(session, role, result) {
    const st = await studentOf(session.sub);
    if (!st) return;
    const { atsScore, ...rest } = result;
    await db().resumeAnalysis.create({ data: { studentId: st.id, collegeId: st.collegeId, targetRole: clip(role, 60), atsScore: Math.round(atsScore), result: rest as Prisma.InputJsonValue } });
  },
};

/* ── notifications ───────────────────────────────── */
function when(d: Date): string {
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

export const pgNotifications: NotificationStore = {
  async forUser(session) {
    if (!isUuid(session.sub)) return [];
    const rows = await db().notification.findMany({ where: { userId: session.sub }, orderBy: { createdAt: "desc" }, take: 20 });
    return rows.map((r): Notification => ({ id: r.id, title: r.title, body: r.body, when: when(r.createdAt), unread: r.readAt === null, tone: label("UiTone", r.tone) as Notification["tone"] }));
  },
};

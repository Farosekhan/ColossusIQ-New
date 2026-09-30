import "server-only";
import { RESOURCES, emptyValues, type RecordValue, type ResourceDef, type ResourceRecord } from "@/config/resources";
import { STREAM_DEFS, streamOfType } from "@/config/streams";
import { ALL_COLLEGES } from "@/config/tenancy";
import type { EvaluationQueueItem } from "@/lib/api/schemas";
import type { LearningCourse } from "@/lib/api/mock/course-state";
import type { FacultyEvent } from "@/lib/api/mock/faculty-activity";
import { evaluationQueue, notificationsFor, personName, seeded } from "@/lib/api/mock/fixtures";
import { sharedState } from "@/lib/api/mock/global-state";
import type { Certificate, Quiz, ReadinessBase } from "@/lib/api/mock/learning";
import type { ClassSummary, SavedOutline } from "@/lib/api/mock/teaching";
import type { Attempt, AuditEntry, DataStore, InterviewSession, MediaItem, RecordListQuery, Site } from "../store";
import { COLLEGE_SEEDS, collegeRows, scopedRows, stamp } from "./seed-records";

/*
 * In-memory store: the demo backend. State lives on one process-wide object (see global-state.ts)
 * and resets when the server restarts.
 */

/* ── state ─────────────────────────────────────────── */
const stores = sharedState("records.stores", () => new Map<string, Map<string, ResourceRecord>>());
const counters = sharedState("records.counters", () => new Map<string, number>());
const sites = sharedState("website.store", () => new Map<string, Site>());
const media = sharedState("media.store", () => new Map<string, MediaItem>());
const auditTrail = sharedState("audit.trail", () => [] as Array<AuditEntry & { collegeId?: string | null }>);
const learningCourses = sharedState("courses.store", () => new Map<string, LearningCourse>());
/** key `${studentSub}|${courseId}` → completed lesson ids */
const lessonProgress = sharedState("courses.progress", () => new Map<string, string[]>());
const quizzes = sharedState("learning.quizzes", () => new Map<string, Quiz>());
const attempts = sharedState("learning.attempts", () => [] as Attempt[]);
const certificates = sharedState("learning.certificates", () => new Map<string, Certificate>());
const outlines = sharedState("teaching.outlines", () => new Map<string, SavedOutline>());
const summaries = sharedState("teaching.summaries", () => new Map<string, ClassSummary>());
const boosterSteps = sharedState("teaching.booster", () => new Map<string, Set<string>>());
const facultyEvents = sharedState("faculty.events", () => [] as Array<{ sub: string; kind: FacultyEvent; at: string }>);
const evalQueues = sharedState("router.evalQueues", () => new Map<string, EvaluationQueueItem[]>());
const interviews = sharedState("router.interviews", () => new Map<string, InterviewSession>());

/** Raw state, for tests and memory-only seeders. */
export const memoryState = { learningCourses, lessonProgress, quizzes, attempts, certificates, outlines, summaries, auditTrail };

const progressKey = (sub: string, courseId: string) => `${sub}|${courseId}`;

/* ── records ───────────────────────────────────────── */
function nextId(res: ResourceDef): string {
  const n = (counters.get(res.key) ?? 1000) + 1;
  counters.set(res.key, n);
  return `${res.idPrefix}${n}`;
}

function storeFor(res: ResourceDef): Map<string, ResourceRecord> {
  let s = stores.get(res.key);
  if (!s) {
    s = new Map();
    stores.set(res.key, s);
    const put = (row: Record<string, RecordValue>, collegeId: string | null, i: number) => {
      const id = nextId(res);
      s!.set(id, { ...emptyValues(res), ...row, id, collegeId, createdAt: stamp(60 - (i % 60)), updatedAt: stamp(30 - (i % 30)), version: 1 });
    };
    if (res.key === "colleges") collegeRows().forEach((row, i) => put(row, null, i));
    else if (res.scoped) {
      // Each college gets seed data that matches its academic stream.
      let i = 0;
      // Only the built-in seed colleges get sample data — colleges added at runtime start empty.
      const seedIds = new Set(COLLEGE_SEEDS.map((_, n) => `COL-${1001 + n}`));
      [...storeFor(RESOURCES.colleges!).values()]
        .filter((college) => seedIds.has(college.id))
        .forEach((college, ci) => {
          for (const row of scopedRows(res.key, college, ci + 1)) put(row, college.id, i++);
        });
    }
  }
  return s;
}

const inScope = (res: ResourceDef, rec: ResourceRecord, scope: string) => !res.scoped || scope === ALL_COLLEGES || rec.collegeId === scope;
const COLLEGE_ID = /^COL-\d{4}$/;

function listRecords(res: ResourceDef, query: RecordListQuery) {
  const q = (query.q ?? "").toLowerCase();
  const searchable = res.fields.filter((f) => !f.sensitive && ["text", "select", "email"].includes(f.type));
  const scoped = [...storeFor(res).values()]
    .filter((r) => inScope(res, r, query.scope))
    .filter((r) => !res.scoped || !COLLEGE_ID.test(query.college ?? "") || r.collegeId === query.college)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const counts: Record<string, number> = {};
  if (res.statusField) for (const r of scoped) counts[String(r[res.statusField])] = (counts[String(r[res.statusField])] ?? 0) + 1;
  const filtered = scoped.filter(
    (r) =>
      (!query.status || !res.statusField || r[res.statusField] === query.status) &&
      (!q || r.id.toLowerCase().includes(q) || searchable.some((f) => String(r[f.name] ?? "").toLowerCase().includes(q))),
  );
  return { items: filtered.slice((query.page - 1) * query.pageSize, query.page * query.pageSize), total: filtered.length, counts };
}

/* ── readiness (demo: live quiz data plus a deterministic cohort per college) ── */
function collegeRec(id: string) {
  return storeFor(RESOURCES.colleges!).get(id);
}
function studentReadiness(sub: string, name: string, collegeId: string): ReadinessBase {
  const mine = attempts.filter((a) => a.studentSub === sub);
  const bestByQuiz = new Map<string, number>();
  for (const a of mine) bestByQuiz.set(a.quizId, Math.max(bestByQuiz.get(a.quizId) ?? 0, a.percentage));
  const quizAverage = bestByQuiz.size ? Math.round([...bestByQuiz.values()].reduce((x, y) => x + y, 0) / bestByQuiz.size) : 0;
  const certs = [...certificates.values()].filter((c) => c.studentSub === sub).length;
  const c = collegeRec(collegeId);
  const stream = c ? streamOfType(c.type) : "engineering";
  return { studentSub: sub, name, rollNo: "21XX1001", department: STREAM_DEFS[stream].departments[0] ?? "", collegeId, quizAverage, certificates: certs, aptitude: 64, interview: 48, resume: 82 };
}

/* ── the store ─────────────────────────────────────── */
export const memoryStore: DataStore = {
  kind: "memory",

  records: {
    async list(res, query) {
      return listRecords(res, query);
    },
    async all(res, scope) {
      return [...storeFor(res).values()].filter((r) => inScope(res, r, scope));
    },
    async get(res, id) {
      return storeFor(res).get(id);
    },
    async create(res, data, collegeId) {
      const now = new Date().toISOString();
      const rec: ResourceRecord = { ...emptyValues(res), ...data, id: nextId(res), collegeId: res.scoped ? collegeId : null, createdAt: now, updatedAt: now, version: 1 };
      storeFor(res).set(rec.id, rec);
      return rec;
    },
    async update(res, id, data, version) {
      const existing = storeFor(res).get(id);
      if (!existing) return undefined;
      if (existing.version !== version) return "stale";
      const updated: ResourceRecord = { ...existing, ...data, id, collegeId: existing.collegeId ?? null, createdAt: existing.createdAt, updatedAt: new Date().toISOString(), version: existing.version + 1 };
      storeFor(res).set(id, updated);
      return updated;
    },
    async delete(res, id) {
      return storeFor(res).delete(id);
    },
    async taken(res, field, value, collegeId, excludeId) {
      const v = value.toLowerCase();
      return [...storeFor(res).values()].some((r) => r.id !== excludeId && (collegeId === null || r.collegeId === collegeId) && String(r[field] ?? "").toLowerCase() === v);
    },
    async count(res, collegeId, where = {}) {
      return [...storeFor(res).values()].filter((r) => r.collegeId === collegeId && Object.entries(where).every(([k, v]) => r[k] === v)).length;
    },
    async countInCollege(collegeId) {
      let n = 0;
      for (const r of Object.values(RESOURCES)) if (r.scoped) for (const rec of storeFor(r).values()) if (rec.collegeId === collegeId) n++;
      return n;
    },
    async stats(res, records) {
      const out = new Map<string, Record<string, number>>();
      if (res.key !== "departments") return out;
      // Faculty come from the demo staff records; the demo has no student accounts, so enrolment
      // and readiness figures are illustrative (the PostgreSQL store computes them from real data).
      const staff = [...storeFor(RESOURCES.staff!).values()];
      for (const r of records) {
        const seed = [...String(r.department)].reduce((a, ch) => a + ch.charCodeAt(0), 0);
        out.set(r.id, {
          programmes: 1 + (seed % 3),
          students: r.status === "Active" ? 120 + (seed % 480) : 0,
          faculty: staff.filter((s) => s.collegeId === r.collegeId && s.department === r.department && s.staffType === "Teaching" && s.status === "Active").length,
          readiness: 40 + (seed % 45),
        });
      }
      return out;
    },
  },

  sites: {
    async get(collegeId) {
      return sites.get(collegeId);
    },
    async save(collegeId, site) {
      sites.set(collegeId, site);
      return site;
    },
  },

  media: {
    async save(item) {
      if (media.size > 500) {
        // Keep memory bounded by evicting the oldest upload.
        const oldest = media.keys().next().value;
        if (oldest) media.delete(oldest);
      }
      const a = new Uint8Array(12);
      crypto.getRandomValues(a);
      const id = `MED-${[...a].map((b) => b.toString(16).padStart(2, "0")).join("")}`;
      media.set(id, { ...item, id, createdAt: new Date().toISOString() });
      return id;
    },
    async get(id) {
      return media.get(id);
    },
  },

  audit: {
    async add({ actor, action, target, collegeId }) {
      auditTrail.unshift({ at: new Date().toISOString(), actor, action, target, collegeId: collegeId ?? null });
      if (auditTrail.length > 500) auditTrail.length = 500;
    },
    async recent(limit) {
      return auditTrail.slice(0, limit).map(({ at, actor, action, target }) => ({ at, actor, action, target }));
    },
  },

  courses: {
    async list(scope) {
      return [...learningCourses.values()].filter((c) => scope === ALL_COLLEGES || c.collegeId === scope);
    },
    async get(id) {
      return learningCourses.get(id);
    },
    async save(course) {
      learningCourses.set(course.id, course);
    },
    async delete(id) {
      learningCourses.delete(id);
    },
  },

  progress: {
    async get(sub, courseId) {
      return lessonProgress.get(progressKey(sub, courseId)) ?? [];
    },
    async set(sub, courseId, lessonIds) {
      lessonProgress.set(progressKey(sub, courseId), lessonIds);
    },
    async learners(courseId) {
      return [...lessonProgress.keys()].filter((k) => k.endsWith(`|${courseId}`)).map((k) => k.split("|")[0]!);
    },
  },

  quizzes: {
    async list(scope, opts) {
      return [...quizzes.values()].filter((q) => (opts?.includeCourseFinals || !q.courseId) && (scope === ALL_COLLEGES || q.collegeId === scope));
    },
    async get(id) {
      return quizzes.get(id);
    },
    async save(quiz) {
      quizzes.set(quiz.id, quiz);
    },
    async delete(id) {
      quizzes.delete(id);
    },
  },

  attempts: {
    async list({ quizId, studentSub, collegeId }) {
      return attempts.filter((a) => (!quizId || a.quizId === quizId) && (!studentSub || a.studentSub === studentSub) && (!collegeId || a.collegeId === collegeId));
    },
    async add(attempt) {
      attempts.push(attempt);
    },
  },

  certificates: {
    async list({ quizId, studentSub, scope }) {
      return [...certificates.values()].filter(
        (c) => (!quizId || c.quizId === quizId) && (!studentSub || c.studentSub === studentSub) && (!scope || scope === ALL_COLLEGES || c.collegeId === scope),
      );
    },
    async get(id) {
      return certificates.get(id);
    },
    async issue(cert, replaces) {
      if (replaces) certificates.delete(replaces);
      certificates.set(cert.id, cert);
    },
  },

  readiness: {
    async forStudent(session) {
      return studentReadiness(session.sub, session.name, session.college);
    },
    async board(collegeId) {
      const college = collegeRec(collegeId);
      if (!college || college.status !== "Active") return [];
      const stream = streamOfType(college.type);
      const r = seeded(Number(collegeId.slice(4)) * 131);
      const cohort: ReadinessBase[] = Array.from({ length: 14 }, (_, i) => ({
        studentSub: `cohort-${collegeId}-${i}`,
        name: personName(Number(collegeId.slice(4)) + i * 3),
        rollNo: `${String(college.code)}${String(21000 + i * 7)}`,
        department: STREAM_DEFS[stream].departments[i % Math.max(1, STREAM_DEFS[stream].departments.length - 1)] ?? "",
        collegeId,
        quizAverage: Math.round(45 + r() * 50),
        certificates: Math.floor(r() * 5),
        aptitude: Math.round(40 + r() * 55),
        interview: Math.round(35 + r() * 60),
        resume: Math.round(50 + r() * 50),
      }));
      const liveSubs = new Set(attempts.filter((a) => a.collegeId === collegeId).map((a) => a.studentSub));
      const live = [...liveSubs].map((sub) => studentReadiness(sub, attempts.find((a) => a.studentSub === sub)?.studentName ?? "Student", collegeId));
      return [...live, ...cohort];
    },
  },

  summaries: {
    async list(scope) {
      return [...summaries.values()].filter((s) => scope === ALL_COLLEGES || s.collegeId === scope);
    },
    async get(id) {
      return summaries.get(id);
    },
    async add(summary) {
      summaries.set(summary.id, summary);
    },
    async markRead(id, sub) {
      const s = summaries.get(id);
      if (s && !s.readers.includes(sub)) s.readers.push(sub);
    },
    async withdraw(id) {
      summaries.delete(id);
    },
  },

  outlines: {
    async list(sub) {
      return [...outlines.values()].filter((o) => o.sub === sub);
    },
    async get(id) {
      return outlines.get(id);
    },
    async add(outline) {
      outlines.set(outline.id, outline);
    },
    async delete(id) {
      outlines.delete(id);
    },
  },

  booster: {
    async steps(sub) {
      return new Set(boosterSteps.get(sub) ?? []);
    },
    async setStep(sub, key, done) {
      const set = boosterSteps.get(sub) ?? new Set<string>();
      if (done) set.add(key);
      else set.delete(key);
      boosterSteps.set(sub, set);
    },
  },

  facultyEvents: {
    async record(sub, kind, count = 1) {
      const at = new Date().toISOString();
      for (let i = 0; i < count; i++) facultyEvents.push({ sub, kind, at });
      if (facultyEvents.length > 20_000) facultyEvents.splice(0, facultyEvents.length - 20_000);
    },
    async counts(sub) {
      const out: Partial<Record<FacultyEvent, number>> = {};
      for (const e of facultyEvents) if (e.sub === sub) out[e.kind] = (out[e.kind] ?? 0) + 1;
      return out;
    },
  },

  evaluations: {
    async queue(session) {
      let q = evalQueues.get(session.sub);
      if (!q) {
        q = evaluationQueue();
        evalQueues.set(session.sub, q);
      }
      return q;
    },
    async decide(session, id, decision) {
      const item = (await this.queue(session)).find((i) => i.id === id);
      if (!item) return undefined;
      item.status = decision.reason === undefined ? "approved" : "overridden";
      item.finalScore = decision.finalScore;
      return item;
    },
  },

  interviews: {
    async start(session, mode) {
      const id = crypto.randomUUID();
      interviews.set(id, { id, owner: session.sub, mode, index: 0 });
      return id;
    },
    async get(id) {
      return interviews.get(id);
    },
    async advance(id, _answer, turn) {
      const s = interviews.get(id);
      if (!s) return;
      s.index = turn.index;
      if (turn.done) interviews.delete(id);
    },
  },

  resumes: {
    async save() {
      // The demo backend does not keep resume analyses.
    },
  },

  notifications: {
    async forUser(session) {
      return notificationsFor(session.role);
    },
  },
};

/** Test helper: the live record Map of a resource (seeded on first use). */
export function _memoryRecords(res: ResourceDef): Map<string, ResourceRecord> {
  return storeFor(res);
}

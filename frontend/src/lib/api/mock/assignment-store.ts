import "server-only";
import { dataBackend } from "@/lib/data";
import type { SessionPayload } from "@/lib/auth/session";
import type { AssignmentStatus, Submission } from "@/lib/api/assignments-schemas";
import { postgresAssignments } from "@/lib/data/postgres/assignments";
import { sharedState } from "./global-state";

/*
 * Assignments and the work students hand in: in memory for the demo backend, PostgreSQL otherwise
 * (data/postgres/assignments.ts). Every method takes the signed-in session first; the PostgreSQL store reads the
 * college and the user from the request instead, and row-level security keeps each college to its own rows.
 */

export interface AssignmentRow {
  /** Public id (e.g. "ASN-1004"). */
  id: string;
  title: string;
  course: string;
  description: string;
  maxMarks: number;
  dueAt: string | null;
  /** Display text for the deadline. */
  due: string;
  status: AssignmentStatus;
  authorName: string;
  createdAt: string;
  /** Written by the signed-in user (or by nobody in particular, for rows from before authors were recorded). */
  owned: boolean;
}

export interface NewAssignment {
  title: string;
  course: string;
  description: string;
  maxMarks: number;
  dueAt: string;
  due: string;
  status: AssignmentStatus;
}

export interface NewSubmission {
  studentName: string;
  rollNo: string;
  text: string;
  link: string;
  late: boolean;
}

export interface AssignmentCounts {
  submitted: number;
  graded: number;
}

export interface AssignmentStore {
  /** Staff see everything in their college; students (`published`) only what is Open or Closed. */
  list(s: SessionPayload, published: boolean): Promise<AssignmentRow[]>;
  get(s: SessionPayload, id: string): Promise<AssignmentRow | undefined>;
  create(s: SessionPayload, a: NewAssignment): Promise<AssignmentRow>;
  update(s: SessionPayload, id: string, patch: Partial<NewAssignment>): Promise<AssignmentRow | undefined>;
  remove(s: SessionPayload, id: string): Promise<boolean>;
  counts(s: SessionPayload, ids: string[]): Promise<Map<string, AssignmentCounts>>;
  /** Active students in the college, or null when that is not known. */
  enrolled(s: SessionPayload): Promise<number | null>;
  submissions(s: SessionPayload, id: string): Promise<Submission[]>;
  /** The signed-in student's own submissions, by assignment id. */
  mine(s: SessionPayload, ids: string[]): Promise<Map<string, Submission>>;
  submit(s: SessionPayload, id: string, n: NewSubmission): Promise<Submission>;
  grade(s: SessionPayload, id: string, submissionId: string, marks: number, feedback: string): Promise<Submission | undefined>;
}

/* ───────────────────────────── memory ───────────────────────────── */

interface MemAssignment extends Omit<AssignmentRow, "owned"> {
  college: string;
  authorKey: string | null;
}
interface MemSubmission extends Submission {
  userKey: string;
}

const assignments = sharedState("assignments.rows", () => new Map<string, MemAssignment>());
const submissions = sharedState("assignments.submissions", () => new Map<string, MemSubmission>());
const seq = sharedState("assignments.seq", () => ({ n: 1000 }));

const subKey = (assignmentId: string, userKey: string) => `${assignmentId}\u0000${userKey}`;
const publicSub = (x: MemSubmission): Submission => ({
  id: x.id,
  assignmentId: x.assignmentId,
  studentName: x.studentName,
  rollNo: x.rollNo,
  text: x.text,
  link: x.link,
  submittedAt: x.submittedAt,
  late: x.late,
  marks: x.marks,
  feedback: x.feedback,
  gradedAt: x.gradedAt,
});

function row(a: MemAssignment, s: SessionPayload): AssignmentRow {
  return {
    id: a.id,
    title: a.title,
    course: a.course,
    description: a.description,
    maxMarks: a.maxMarks,
    dueAt: a.dueAt,
    due: a.due,
    status: a.status,
    authorName: a.authorName,
    createdAt: a.createdAt,
    owned: a.authorKey === null || a.authorKey === s.sub,
  };
}
const visible = (a: MemAssignment, s: SessionPayload) => a.college === s.college;

const memoryAssignments: AssignmentStore = {
  async list(s, published) {
    return [...assignments.values()]
      .filter((a) => visible(a, s) && (!published || a.status !== "Draft"))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))
      .map((a) => row(a, s));
  },
  async get(s, id) {
    const a = assignments.get(id);
    return a && visible(a, s) ? row(a, s) : undefined;
  },
  async create(s, n) {
    seq.n += 1;
    const a: MemAssignment = { ...n, id: `ASN-${seq.n}`, authorName: s.name, authorKey: s.sub, college: s.college, createdAt: new Date().toISOString() };
    assignments.set(a.id, a);
    return row(a, s);
  },
  async update(s, id, patch) {
    const a = assignments.get(id);
    if (!a || !visible(a, s)) return undefined;
    Object.assign(a, patch);
    return row(a, s);
  },
  async remove(s, id) {
    const a = assignments.get(id);
    if (!a || !visible(a, s)) return false;
    assignments.delete(id);
    for (const k of [...submissions.keys()]) if (k.startsWith(`${id}\u0000`)) submissions.delete(k);
    return true;
  },
  async counts(s, ids) {
    const out = new Map<string, AssignmentCounts>();
    for (const id of ids) out.set(id, { submitted: 0, graded: 0 });
    for (const sub of submissions.values()) {
      const c = out.get(sub.assignmentId);
      if (!c) continue;
      c.submitted += 1;
      if (sub.marks !== null) c.graded += 1;
    }
    return out;
  },
  async enrolled() {
    return null;
  },
  async submissions(s, id) {
    const a = assignments.get(id);
    if (!a || !visible(a, s)) return [];
    return [...submissions.values()].filter((x) => x.assignmentId === id).sort((a1, b1) => b1.submittedAt.localeCompare(a1.submittedAt)).map(publicSub);
  },
  async mine(s, ids) {
    const out = new Map<string, Submission>();
    for (const id of ids) {
      const x = submissions.get(subKey(id, s.sub));
      if (x) out.set(id, publicSub(x));
    }
    return out;
  },
  async submit(s, id, n) {
    const key = subKey(id, s.sub);
    const old = submissions.get(key);
    const x: MemSubmission = {
      id: old?.id ?? `sub-${id}-${s.sub}`,
      assignmentId: id,
      userKey: s.sub,
      studentName: n.studentName,
      rollNo: n.rollNo,
      text: n.text,
      link: n.link,
      submittedAt: new Date().toISOString(),
      late: n.late,
      marks: null,
      feedback: "",
      gradedAt: null,
    };
    submissions.set(key, x);
    return publicSub(x);
  },
  async grade(s, id, submissionId, marks, feedback) {
    const a = assignments.get(id);
    if (!a || !visible(a, s)) return undefined;
    const x = [...submissions.values()].find((v) => v.assignmentId === id && v.id === submissionId);
    if (!x) return undefined;
    x.marks = marks;
    x.feedback = feedback;
    x.gradedAt = new Date().toISOString();
    return publicSub(x);
  },
};

/** Test helper: forgets everything (memory backend only). */
export function resetAssignmentsMemory() {
  assignments.clear();
  submissions.clear();
}

export function assignmentStore(): AssignmentStore {
  return dataBackend() === "postgres" ? postgresAssignments : memoryAssignments;
}

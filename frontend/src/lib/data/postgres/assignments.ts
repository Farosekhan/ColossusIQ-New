import "server-only";
import type { Assignment, AssignmentSubmission } from "@prisma/client";
import type { AssignmentCounts, AssignmentRow, AssignmentStore } from "@/lib/api/mock/assignment-store";
import type { Submission } from "@/lib/api/assignments-schemas";
import { db, isUuid, requestUser } from "./db";
import { collegeUuid } from "./lookups";

/*
 * Assignments on PostgreSQL: `assignments` (what faculty publish) and `assignment_submissions` (what students hand in,
 * one row per student and assignment). Row-level security (db/migrations/0008_assignment_submissions.sql) limits every
 * query to the signed-in college. Student reads and writes also filter on the signed-in user, so a student can only
 * ever see or change their own submission.
 */

function me(): string {
  const id = requestUser();
  if (!id) throw new Error("A signed-in user is required");
  return id;
}

function toRow(r: Assignment): AssignmentRow {
  const user = requestUser();
  return {
    id: r.publicId,
    title: r.title,
    course: r.course,
    description: r.description,
    maxMarks: r.maxMarks,
    dueAt: r.dueAt ? r.dueAt.toISOString() : null,
    due: r.due,
    status: r.status,
    authorName: r.authorName,
    createdAt: r.createdAt.toISOString(),
    owned: r.authorId === null || r.authorId === user,
  };
}

function toSubmission(r: AssignmentSubmission, assignmentId: string): Submission {
  return {
    id: r.id,
    assignmentId,
    studentName: r.studentName,
    rollNo: r.rollNo,
    text: r.text,
    link: r.link,
    submittedAt: r.submittedAt.toISOString(),
    late: r.late,
    marks: r.marks,
    feedback: r.feedback,
    gradedAt: r.gradedAt ? r.gradedAt.toISOString() : null,
  };
}

const byPublic = (id: string) => db().assignment.findUnique({ where: { publicId: id } });

export const postgresAssignments: AssignmentStore = {
  async list(_s, published) {
    const rows = await db().assignment.findMany({
      where: published ? { status: { in: ["Open", "Closed"] } } : {},
      orderBy: { createdAt: "desc" },
    });
    return rows.map(toRow);
  },
  async get(_s, id) {
    const r = await byPublic(id);
    return r ? toRow(r) : undefined;
  },
  async create(s, a) {
    const r = await db().assignment.create({
      data: {
        collegeId: await collegeUuid(s.college),
        authorId: requestUser(),
        authorName: s.name,
        title: a.title,
        course: a.course,
        description: a.description,
        maxMarks: a.maxMarks,
        dueAt: new Date(a.dueAt),
        due: a.due,
        status: a.status,
      },
    });
    return toRow(r);
  },
  async update(_s, id, patch) {
    const old = await byPublic(id);
    if (!old) return undefined;
    const r = await db().assignment.update({
      where: { id: old.id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.course !== undefined ? { course: patch.course } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.maxMarks !== undefined ? { maxMarks: patch.maxMarks } : {}),
        ...(patch.dueAt !== undefined ? { dueAt: new Date(patch.dueAt) } : {}),
        ...(patch.due !== undefined ? { due: patch.due } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return toRow(r);
  },
  async remove(_s, id) {
    const r = await db().assignment.deleteMany({ where: { publicId: id } }); // submissions go with it (ON DELETE CASCADE)
    return r.count > 0;
  },
  async counts(_s, ids) {
    const out = new Map<string, AssignmentCounts>(ids.map((id) => [id, { submitted: 0, graded: 0 }]));
    if (ids.length === 0) return out;
    const rows = await db().assignmentSubmission.findMany({
      where: { assignment: { publicId: { in: ids } } },
      select: { marks: true, assignment: { select: { publicId: true } } },
    });
    for (const r of rows) {
      const c = out.get(r.assignment.publicId);
      if (!c) continue;
      c.submitted += 1;
      if (r.marks !== null) c.graded += 1;
    }
    return out;
  },
  async enrolled() {
    try {
      return await db().student.count({ where: { status: "Active" } });
    } catch {
      return null;
    }
  },
  async submissions(_s, id) {
    const rows = await db().assignmentSubmission.findMany({ where: { assignment: { publicId: id } }, orderBy: { submittedAt: "desc" } });
    return rows.map((r) => toSubmission(r, id));
  },
  async mine(_s, ids) {
    const out = new Map<string, Submission>();
    if (ids.length === 0) return out;
    const rows = await db().assignmentSubmission.findMany({
      where: { userId: me(), assignment: { publicId: { in: ids } } },
      include: { assignment: { select: { publicId: true } } },
    });
    for (const r of rows) out.set(r.assignment.publicId, toSubmission(r, r.assignment.publicId));
    return out;
  },
  async submit(_s, id, n) {
    const a = await byPublic(id);
    if (!a) throw new Error("Assignment not found");
    const userId = me();
    const now = new Date();
    const r = await db().assignmentSubmission.upsert({
      where: { assignmentId_userId: { assignmentId: a.id, userId } },
      create: { collegeId: a.collegeId, assignmentId: a.id, userId, studentName: n.studentName, rollNo: n.rollNo, text: n.text, link: n.link, late: n.late, submittedAt: now },
      update: { studentName: n.studentName, rollNo: n.rollNo, text: n.text, link: n.link, late: n.late, submittedAt: now, updatedAt: now },
    });
    return toSubmission(r, id);
  },
  async grade(_s, id, submissionId, marks, feedback) {
    if (!isUuid(submissionId)) return undefined;
    const old = await db().assignmentSubmission.findFirst({ where: { id: submissionId, assignment: { publicId: id } } });
    if (!old) return undefined;
    const r = await db().assignmentSubmission.update({ where: { id: old.id }, data: { marks, feedback, gradedAt: new Date(), updatedAt: new Date() } });
    return toSubmission(r, id);
  },
};

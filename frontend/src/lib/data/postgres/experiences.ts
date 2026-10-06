import "server-only";
import type { StudentExperience } from "@prisma/client";
import type { ExperienceCategory, ExperienceStatus } from "@/lib/api/experience-schemas";
import type { ExperienceRow, ExperienceStore } from "@/lib/api/mock/experience-store";
import { db, isUuid, requestUser } from "./db";
import { collegeUuid } from "./lookups";

/*
 * Experience Passport on PostgreSQL: `student_experiences` (db/migrations/0009_student_experiences.sql). Row-level
 * security limits every query to the signed-in college; reads and writes by a student also filter on the signed-in
 * user, so nobody can see or change another student's entries from here.
 */

function me(): string {
  const id = requestUser();
  if (!id) throw new Error("A signed-in user is required");
  return id;
}

function toRow(r: StudentExperience): ExperienceRow {
  return {
    id: r.id,
    title: r.title,
    category: r.category as ExperienceCategory,
    organisation: r.organisation,
    role: r.roleTitle,
    startMonth: r.startMonth,
    endMonth: r.endMonth,
    description: r.description,
    link: r.link,
    status: r.status as ExperienceStatus,
    reviewNote: r.reviewNote,
    reviewerName: r.reviewerName,
    reviewerRole: r.reviewerRole,
    reviewedAt: r.reviewedAt ? r.reviewedAt.toISOString() : null,
    studentName: r.studentName,
    rollNo: r.rollNo,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    mine: r.userId === requestUser(),
  };
}

export const postgresExperiences: ExperienceStore = {
  async list(_s, scope) {
    const rows = await db().studentExperience.findMany({
      where: scope === "mine" ? { userId: me() } : {},
      orderBy: [{ startMonth: "desc" }, { createdAt: "desc" }],
    });
    return rows.map(toRow);
  },
  async get(_s, id) {
    if (!isUuid(id)) return undefined;
    const r = await db().studentExperience.findUnique({ where: { id } });
    return r ? toRow(r) : undefined;
  },
  async create(s, n) {
    const r = await db().studentExperience.create({
      data: {
        collegeId: await collegeUuid(s.college),
        userId: me(),
        studentName: n.studentName,
        rollNo: n.rollNo,
        title: n.title,
        category: n.category,
        organisation: n.organisation,
        roleTitle: n.role,
        startMonth: n.startMonth,
        endMonth: n.endMonth,
        description: n.description,
        link: n.link,
      },
    });
    return toRow(r);
  },
  async update(_s, id, patch, resetReview) {
    if (!isUuid(id)) return undefined;
    const old = await db().studentExperience.findUnique({ where: { id } });
    if (!old) return undefined;
    const r = await db().studentExperience.update({
      where: { id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.category !== undefined ? { category: patch.category } : {}),
        ...(patch.organisation !== undefined ? { organisation: patch.organisation } : {}),
        ...(patch.role !== undefined ? { roleTitle: patch.role } : {}),
        ...(patch.startMonth !== undefined ? { startMonth: patch.startMonth } : {}),
        ...(patch.endMonth !== undefined ? { endMonth: patch.endMonth } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.link !== undefined ? { link: patch.link } : {}),
        ...(resetReview ? { status: "Pending", reviewNote: "", reviewerName: "", reviewerRole: "", reviewedAt: null } : {}),
        updatedAt: new Date(),
      },
    });
    return toRow(r);
  },
  async remove(_s, id) {
    if (!isUuid(id)) return false;
    const r = await db().studentExperience.deleteMany({ where: { id } });
    return r.count > 0;
  },
  async review(_s, id, r) {
    if (!isUuid(id)) return undefined;
    const old = await db().studentExperience.findUnique({ where: { id } });
    if (!old) return undefined;
    const x = await db().studentExperience.update({
      where: { id },
      data: { status: r.status, reviewNote: r.note, reviewerName: r.reviewerName, reviewerRole: r.reviewerRole, reviewedAt: new Date(), updatedAt: new Date() },
    });
    return toRow(x);
  },
};

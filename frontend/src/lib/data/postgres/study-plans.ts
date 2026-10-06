import "server-only";
import type { Prisma } from "@prisma/client";
import { StudyPlan } from "@/lib/api/study-planner-schemas";
import type { StudyPlanStore } from "@/lib/api/mock/study-plan-store";
import { db, requestUser } from "./db";
import { collegeUuid } from "./lookups";

/*
 * Study plans on PostgreSQL: one row per student (unique user_id), the plan stored as JSON. Row-level security
 * (db/migrations/0006_study_planner.sql) limits queries to the signed-in college; every query here also filters
 * on the signed-in user, so a student can only ever read or change their own plan.
 */

function me(): string {
  const id = requestUser();
  if (!id) throw new Error("A signed-in student is required");
  return id;
}

export const postgresStudyPlans: StudyPlanStore = {
  async get() {
    const r = await db().studyPlan.findUnique({ where: { userId: me() } });
    const p = r ? StudyPlan.safeParse(r.plan) : null;
    return p?.success ? p.data : undefined; // a row that no longer matches the schema is treated as no plan
  },
  async save(collegeId, _userKey, plan) {
    const data = plan as unknown as Prisma.InputJsonValue;
    await db().studyPlan.upsert({
      where: { userId: me() },
      create: { userId: me(), collegeId: await collegeUuid(collegeId), plan: data },
      update: { plan: data, updatedAt: new Date() },
    });
  },
  async remove() {
    const r = await db().studyPlan.deleteMany({ where: { userId: me() } });
    return r.count > 0;
  },
};

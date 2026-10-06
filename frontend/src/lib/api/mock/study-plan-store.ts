import "server-only";
import { dataBackend } from "@/lib/data";
import type { StudyPlan } from "@/lib/api/study-planner-schemas";
import { postgresStudyPlans } from "@/lib/data/postgres/study-plans";
import { sharedState } from "./global-state";

/* One saved study plan per student: in memory for the demo backend, PostgreSQL otherwise (data/postgres/study-plans.ts). */

export interface StudyPlanStore {
  /** `userKey` is the signed-in student (session.sub); the PostgreSQL store reads it from the request instead. */
  get(userKey: string): Promise<StudyPlan | undefined>;
  save(collegeId: string, userKey: string, plan: StudyPlan): Promise<void>;
  remove(userKey: string): Promise<boolean>;
}

const mem = sharedState("study-planner.plans", () => new Map<string, StudyPlan>());

const memoryStudyPlans: StudyPlanStore = {
  async get(userKey) {
    const p = mem.get(userKey);
    return p ? structuredClone(p) : undefined;
  },
  async save(_collegeId, userKey, plan) {
    mem.set(userKey, structuredClone(plan));
  },
  async remove(userKey) {
    return mem.delete(userKey);
  },
};

export function studyPlanStore(): StudyPlanStore {
  return dataBackend() === "postgres" ? postgresStudyPlans : memoryStudyPlans;
}

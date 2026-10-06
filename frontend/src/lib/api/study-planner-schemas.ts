import { z } from "zod";

/** Shared by the browser and the server: the AI Study Planner. */

export const PLANNER_MODES = ["Beginner", "Exam", "Deep learning", "Quick revision", "Last-minute preparation", "Interview", "Practical", "Project"] as const;
export const MIN_DAYS = 3;
export const MAX_DAYS = 90;

export const PlanRequest = z
  .object({
    days: z.number().int().min(MIN_DAYS, `At least ${MIN_DAYS} days`).max(MAX_DAYS, `At most ${MAX_DAYS} days`),
    hours: z.number().int().min(1, "At least 1 hour").max(12, "Keep it realistic: 12 hours at most"),
    subjects: z.array(z.string().trim().min(1).max(40)).min(1, "Pick at least one subject").max(12),
    mode: z.enum(PLANNER_MODES),
    /** The student's own "today" (yyyy-mm-dd), so day 1 matches their calendar whatever the server's timezone. */
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  })
  .strict();
export type PlanRequest = z.infer<typeof PlanRequest>;

export const TaskKind = z.enum(["study", "revision", "mock"]);
export const StudyTask = z.object({
  id: z.string().max(20),
  day: z.number().int().min(1).max(MAX_DAYS),
  subject: z.string().max(40),
  title: z.string().max(200),
  kind: TaskKind,
  minutes: z.number().int().min(5).max(720),
  done: z.boolean(),
});
export type StudyTask = z.infer<typeof StudyTask>;

export const StudyPlan = z.object({
  startDate: z.string(), // yyyy-mm-dd, day 1
  days: z.number().int(),
  hoursPerDay: z.number().int(),
  mode: z.string(),
  subjects: z.array(z.string()),
  tasks: z.array(StudyTask).max(2000),
  /** Short personalised advice written by the AI; null when the AI is off. */
  note: z.string().max(3000).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type StudyPlan = z.infer<typeof StudyPlan>;

export const PlannerSubject = z.object({
  name: z.string(),
  title: z.string(),
  mastery: z.number(),
  attendance: z.number(),
  weakestTopic: z.string().nullable(),
});

export const PlannerOverview = z.object({
  defaults: z.object({ days: z.number().int(), hours: z.number().int(), mode: z.string(), examName: z.string() }),
  subjects: z.array(PlannerSubject),
  plan: StudyPlan.nullable(),
  aiLive: z.boolean(),
});
export type PlannerOverview = z.infer<typeof PlannerOverview>;

export const TaskToggle = z.object({ taskId: z.string().min(1).max(20), done: z.boolean() }).strict();

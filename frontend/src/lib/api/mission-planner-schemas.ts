import { z } from "zod";

/** Shared by the browser and the server: the Mission Planner. */

export const MissionRequest = z
  .object({
    role: z.string().trim().min(3, "Say where you want to be (at least 3 characters)").max(80, "Keep it under 80 characters"),
    hoursPerWeek: z.number().int().min(1, "At least 1 hour a week").max(40, "40 hours a week at most"),
    vision: z.string().trim().max(300, "Keep it under 300 characters").optional(),
  })
  .strict();
export type MissionRequest = z.infer<typeof MissionRequest>;

export const Milestone = z.object({ id: z.string().max(12), text: z.string().max(200), done: z.boolean() });
export const Phase = z.object({
  id: z.string().max(8),
  title: z.string().max(100),
  period: z.string().max(50),
  description: z.string().max(300),
  milestones: z.array(Milestone).min(1).max(8),
});
export type Phase = z.infer<typeof Phase>;

export const MissionPlan = z.object({
  role: z.string(),
  hoursPerWeek: z.number().int(),
  vision: z.string(),
  semester: z.number().int(),
  totalSemesters: z.number().int(),
  phases: z.array(Phase).min(2).max(8),
  /** Short strategy written by the AI; null when the AI is off. */
  note: z.string().max(1000).nullable(),
  source: z.enum(["ai", "built-in"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type MissionPlan = z.infer<typeof MissionPlan>;

export const MissionOverview = z.object({
  plan: MissionPlan.nullable(),
  defaults: z.object({
    role: z.string(),
    hoursPerWeek: z.number().int(),
    roleSuggestions: z.array(z.string()),
    semester: z.number().int(),
    totalSemesters: z.number().int(),
    program: z.string(),
  }),
  aiLive: z.boolean(),
});
export type MissionOverview = z.infer<typeof MissionOverview>;

export const MilestoneToggle = z.object({ id: z.string().min(1).max(12), done: z.boolean() }).strict();

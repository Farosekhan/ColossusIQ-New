import { z } from "zod";

/** Shared by the browser and the server: the body of POST /ai/chat and the Mentor page's profile. */

export const CHAT_HISTORY_TURNS = 6;

export const ChatBodySchema = z.object({
  agent: z.string().max(40).regex(/^[a-z-]+$/),
  message: z.string().min(1).max(2000),
  /** The last few turns, oldest first, so the mentor can follow the conversation. */
  history: z
    .array(z.object({ from: z.enum(["user", "ai"]), text: z.string().max(4000) }))
    .max(CHAT_HISTORY_TURNS)
    .optional(),
});
export type ChatBodyInput = z.infer<typeof ChatBodySchema>;

export const MentorMetricSchema = z.object({ label: z.string(), value: z.number().min(0).max(100), hint: z.string().optional() });

export const MentorProfileSchema = z.object({
  name: z.string(),
  intro: z.string(),
  suggestions: z.array(z.string()).max(8),
  context: z.array(z.string()).max(8),
  metrics: z.array(MentorMetricSchema).max(10),
  /** The lowest-mastery topics the mentor will steer the student toward. */
  focus: z.array(z.object({ subject: z.string(), topic: z.string(), mastery: z.number() })).max(5),
  /** True when answers come from the live AI model; false when the built-in, data-driven replies are used. */
  aiLive: z.boolean(),
});
export type MentorProfile = z.infer<typeof MentorProfileSchema>;

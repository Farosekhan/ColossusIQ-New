import { z } from "zod";
import { BLOOM_LEVELS, COURSE_OUTCOMES, DIFFICULTY_OPTIONS } from "@/config/resources";

/* Shared (browser + server) contract for AI question generation in the Question Bank. */

export const QUESTION_STYLES = ["Mixed", "Short answer", "Descriptive", "Problem solving"] as const;
export const MAX_GENERATED = 20;
export const MAX_TOPICS = 8;

export const QuestionGenBody = z
  .object({
    subject: z.string().trim().max(100).default(""),
    topics: z.array(z.string().trim().min(2, "Each topic needs at least 2 characters").max(100)).min(1, "Enter at least one topic").max(MAX_TOPICS, `Use at most ${MAX_TOPICS} topics`),
    count: z.number().int().min(1).max(MAX_GENERATED),
    difficulty: z.enum(["Mixed", ...DIFFICULTY_OPTIONS] as const),
    bloom: z.enum(["Mixed", ...BLOOM_LEVELS] as const),
    /** Fixed marks for every question, or null to let the AI choose by question type. */
    marks: z.number().int().min(1).max(50).nullable(),
    style: z.enum(QUESTION_STYLES),
    co: z.enum(COURSE_OUTCOMES),
    /** Optional reference text (syllabus, notes) the questions should stay within. */
    notes: z.string().trim().max(3000).default(""),
  })
  .strict();
export type QuestionGenInput = z.infer<typeof QuestionGenBody>;

export const GeneratedQuestionSchema = z.object({
  question: z.string(),
  topic: z.string(),
  difficulty: z.enum(DIFFICULTY_OPTIONS),
  bloom: z.enum(BLOOM_LEVELS),
  marks: z.number(),
  explanation: z.string(),
});
export type GeneratedQuestion = z.infer<typeof GeneratedQuestionSchema>;
export const QuestionGenResult = z.object({ questions: z.array(GeneratedQuestionSchema) });

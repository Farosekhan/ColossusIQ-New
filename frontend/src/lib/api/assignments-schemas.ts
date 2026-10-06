import { z } from "zod";

/** Shared by the browser and the server: assignments published by faculty and submitted by students. */

export const ASSIGNMENT_STATUSES = ["Open", "Closed", "Draft"] as const;
export const AssignmentStatus = z.enum(ASSIGNMENT_STATUSES);
export type AssignmentStatus = z.infer<typeof AssignmentStatus>;

export const MAX_ANSWER = 8000;

const shape = {
  title: z.string().trim().min(2, "Give the assignment a title").max(120),
  course: z.string().trim().min(1, "Pick a course").max(40),
  description: z.string().trim().max(3000),
  maxMarks: z.number().int("Whole marks only").min(1, "At least 1 mark").max(1000),
  /** ISO timestamp of the deadline. */
  dueAt: z.string().datetime({ offset: true, message: "Pick a due date and time" }),
  status: AssignmentStatus,
};

export const AssignmentInput = z
  .object({ ...shape, description: shape.description.default(""), maxMarks: shape.maxMarks.default(10), status: shape.status.default("Open") })
  .strict();
export type AssignmentInput = z.infer<typeof AssignmentInput>;

export const AssignmentPatch = z.object(shape).partial().strict();
export type AssignmentPatch = z.infer<typeof AssignmentPatch>;

export const SubmitBody = z
  .object({
    text: z.string().trim().max(MAX_ANSWER, `Keep the answer under ${MAX_ANSWER} characters`).default(""),
    link: z
      .string()
      .trim()
      .max(500)
      .default("")
      .refine((v) => v === "" || /^https?:\/\/\S+$/i.test(v), "Use a full link starting with http:// or https://"),
  })
  .strict()
  .refine((v) => v.text !== "" || v.link !== "", { message: "Write your answer or add a link", path: ["text"] });
export type SubmitBody = z.infer<typeof SubmitBody>;

export const GradeBody = z
  .object({
    marks: z.number().int("Whole marks only").min(0, "Marks cannot be negative"),
    feedback: z.string().trim().max(1000).default(""),
  })
  .strict();
export type GradeBody = z.infer<typeof GradeBody>;

export const Submission = z.object({
  id: z.string(),
  assignmentId: z.string(),
  studentName: z.string(),
  rollNo: z.string(),
  text: z.string(),
  link: z.string(),
  submittedAt: z.string(),
  late: z.boolean(),
  marks: z.number().nullable(),
  feedback: z.string(),
  gradedAt: z.string().nullable(),
});
export type Submission = z.infer<typeof Submission>;

export const AssignmentItem = z.object({
  id: z.string(),
  title: z.string(),
  course: z.string(),
  description: z.string(),
  maxMarks: z.number(),
  /** ISO deadline; null for assignments created before deadlines were real dates. */
  dueAt: z.string().nullable(),
  /** The deadline as text for display (IST), or the old free-text date. */
  due: z.string(),
  status: AssignmentStatus,
  authorName: z.string(),
  createdAt: z.string(),
  /** Whether the signed-in staff member may edit, grade or delete it. */
  canManage: z.boolean(),
  /** Staff only: how many students have handed it in. `enrolled` is the active student count, when known. */
  stats: z.object({ submitted: z.number(), graded: z.number(), enrolled: z.number().nullable() }).nullable(),
  /** Students only: this student's own submission, if any. */
  mine: Submission.nullable(),
});
export type AssignmentItem = z.infer<typeof AssignmentItem>;

export const AssignmentList = z.array(AssignmentItem);

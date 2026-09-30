import { z } from "zod";

/* Teaching Studio, class summaries and Skill Booster response schemas. */

export const ILLUSTRATIONS = ["flow", "layers", "cycle"] as const;
export type Illustration = (typeof ILLUSTRATIONS)[number];

const Term = z.object({ term: z.string(), meaning: z.string() });
const QA = z.object({ q: z.string(), a: z.string() });
const LinkS = z.object({ label: z.string(), url: z.string() });

export const TeachingSources = z.object({
  stream: z.string().nullable(),
  departments: z.array(z.string()),
  courses: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      code: z.string(),
      department: z.string(),
      status: z.string(),
      chapters: z.array(z.object({ index: z.number(), title: z.string(), part: z.string().nullable() })),
    }),
  ),
});
export type TeachingSources = z.infer<typeof TeachingSources>;

export const OutlineBlock = z.object({ start: z.number(), minutes: z.number(), title: z.string(), teacher: z.string(), students: z.string(), icon: z.string() });
export type OutlineBlock = z.infer<typeof OutlineBlock>;

export const TeachingPack = z.object({
  source: z.object({ kind: z.enum(["course", "topic"]), courseId: z.string().optional(), courseTitle: z.string().optional(), code: z.string().optional(), chapterIndex: z.number().optional() }),
  topic: z.string(),
  department: z.string(),
  draft: z.boolean(),
  basics: z.object({ what: z.string(), why: z.string(), before: z.array(z.string()), bigIdea: z.array(z.string()) }),
  keyPoints: z.array(z.string()),
  terms: z.array(Term),
  mistakes: z.array(z.string()),
  example: z.string(),
  practice: z.array(QA),
  links: z.array(LinkS),
  videos: z.array(z.object({ title: z.string(), url: z.string() })),
  illustration: z.enum(ILLUSTRATIONS),
  nextTopic: z.string().nullable(),
  outline: z.object({ minutes: z.number(), blocks: z.array(OutlineBlock), materials: z.array(z.string()), exitTicket: z.array(z.string()) }),
  roadmap: z.object({
    title: z.string(),
    weeks: z.array(z.object({ week: z.number(), title: z.string(), items: z.array(z.string()), kind: z.enum(["orientation", "teach", "assessment", "revision", "final"]), current: z.boolean().optional() })),
  }),
});
export type TeachingPack = z.infer<typeof TeachingPack>;

export const SavedOutline = z.object({ id: z.string(), topic: z.string(), courseTitle: z.string().nullable(), minutes: z.number(), blocks: z.array(OutlineBlock), createdAt: z.string() });

export const Infographic = z.object({
  what: z.string(),
  keyPoints: z.array(z.string()),
  terms: z.array(Term),
  mistakes: z.array(z.string()),
  illustration: z.enum(ILLUSTRATIONS),
  question: QA.nullable(),
});
export type Infographic = z.infer<typeof Infographic>;

const SummaryBase = z.object({
  id: z.string(),
  authorName: z.string(),
  department: z.string(),
  courseTitle: z.string().nullable(),
  topic: z.string(),
  title: z.string(),
  date: z.string(),
  points: z.array(z.string()),
  homework: z.string(),
  nextClass: z.string(),
  resources: z.array(LinkS),
  infographic: Infographic.nullable(),
  sharedAt: z.string(),
});
export const StaffSummary = SummaryBase.extend({ readCount: z.number(), collegeName: z.string() });
export type StaffSummary = z.infer<typeof StaffSummary>;
export const StudentSummary = SummaryBase.extend({ read: z.boolean() });
export type StudentSummary = z.infer<typeof StudentSummary>;

export const Booster = z.object({
  points: z.number(),
  level: z.string(),
  levels: z.array(z.object({ name: z.string(), min: z.number(), reached: z.boolean() })),
  nextLevel: z.object({ name: z.string(), needs: z.number() }).nullable(),
  tasks: z.array(z.object({ id: z.string(), title: z.string(), detail: z.string(), target: z.number(), points: z.number(), module: z.string(), count: z.number(), complete: z.boolean(), earned: z.number() })),
  tracks: z.array(z.object({ id: z.string(), title: z.string(), minutes: z.number(), steps: z.array(z.object({ id: z.string(), title: z.string(), body: z.string(), done: z.boolean() })) })),
  badges: z.array(z.object({ id: z.string(), title: z.string(), earned: z.boolean(), icon: z.string() })),
});
export type Booster = z.infer<typeof Booster>;

import { z } from "zod";
import { ROLES } from "@/lib/auth/roles";

/* Every API response is validated against these schemas before it reaches the UI. */

export const Tone = z.enum(["brand", "gold", "teal", "rose", "amber", "sky", "neutral"]);
export type Tone = z.infer<typeof Tone>;

export const SessionInfo = z.object({
  role: z.enum(ROLES),
  name: z.string(),
  tenant: z.string(),
  tenantName: z.string(),
  expiresAt: z.number(),
});
export type SessionInfo = z.infer<typeof SessionInfo>;

export const Kpi = z.object({
  label: z.string(),
  value: z.string(),
  delta: z.string().optional(),
  tone: Tone.default("brand"),
  hint: z.string().optional(),
});
export type Kpi = z.infer<typeof Kpi>;

export const ChartSpec = z.object({
  type: z.enum(["bar", "line", "area", "donut", "radar"]),
  title: z.string(),
  data: z.array(z.record(z.string(), z.union([z.string(), z.number()]))),
  series: z.array(z.string()),
  xKey: z.string().default("name"),
});
export type ChartSpec = z.infer<typeof ChartSpec>;

export const Insight = z.object({
  title: z.string(),
  body: z.string(),
  evidence: z.string(),
  tone: Tone.default("brand"),
});
export type Insight = z.infer<typeof Insight>;

export const Column = z.object({
  key: z.string(),
  label: z.string(),
  kind: z.enum(["text", "badge", "progress", "masked", "number"]).default("text"),
});
export type Column = z.infer<typeof Column>;

const Cell = z.union([z.string(), z.number()]);

export const DashboardData = z.object({
  template: z.literal("dashboard"),
  kpis: z.array(Kpi),
  charts: z.array(ChartSpec),
  insights: z.array(Insight),
});
export const ListData = z.object({
  template: z.literal("list"),
  columns: z.array(Column),
  rows: z.array(z.record(z.string(), Cell)),
  filterKey: z.string().optional(),
  primaryAction: z.string().optional(),
});
export const WorkflowData = z.object({
  template: z.literal("workflow"),
  title: z.string(),
  stages: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      status: z.enum(["done", "active", "todo"]),
      items: z.array(z.string()).default([]),
    }),
  ),
});
export const ScorecardData = z.object({
  template: z.literal("scorecard"),
  headline: z.string(),
  overall: z.number(),
  dimensions: z.array(z.object({ name: z.string(), score: z.number(), target: z.number() })),
  strengths: z.array(z.string()),
  gaps: z.array(z.string()),
  plan: z.array(z.string()),
});
export const CalendarData = z.object({
  template: z.literal("calendar"),
  days: z.array(
    z.object({
      day: z.string(),
      items: z.array(z.object({ time: z.string(), title: z.string(), tag: z.string(), tone: Tone.default("brand") })),
    }),
  ),
  tips: z.array(z.string()).default([]),
});
export const SettingsData = z.object({
  template: z.literal("settings"),
  sections: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      fields: z.array(
        z.object({
          id: z.string(),
          label: z.string(),
          type: z.enum(["toggle", "text", "select", "color"]),
          value: z.union([z.string(), z.boolean()]),
          options: z.array(z.string()).optional(),
          help: z.string().optional(),
        }),
      ),
    }),
  ),
});
export const GalleryData = z.object({
  template: z.literal("gallery"),
  items: z.array(
    z.object({
      title: z.string(),
      description: z.string(),
      tag: z.string(),
      meta: z.string(),
      tone: Tone.default("brand"),
      progress: z.number().optional(),
    }),
  ),
});
export const ChatData = z.object({
  template: z.literal("chat"),
  intro: z.string(),
  suggestions: z.array(z.string()),
  context: z.array(z.string()),
});
export const GeneratorData = z.object({
  template: z.literal("generator"),
  fields: z.array(
    z.object({
      name: z.string(),
      label: z.string(),
      type: z.enum(["text", "select", "number", "textarea"]),
      options: z.array(z.string()).optional(),
      placeholder: z.string().optional(),
      defaultValue: z.string().optional(),
    }),
  ),
  cta: z.string(),
});

export const ModuleData = z.discriminatedUnion("template", [
  DashboardData,
  ListData,
  WorkflowData,
  ScorecardData,
  CalendarData,
  SettingsData,
  GalleryData,
  ChatData,
  GeneratorData,
]);
export type ModuleData = z.infer<typeof ModuleData>;
export type DashboardData = z.infer<typeof DashboardData>;
export type ListData = z.infer<typeof ListData>;
export type WorkflowData = z.infer<typeof WorkflowData>;
export type ScorecardData = z.infer<typeof ScorecardData>;
export type CalendarData = z.infer<typeof CalendarData>;
export type SettingsData = z.infer<typeof SettingsData>;
export type GalleryData = z.infer<typeof GalleryData>;
export type ChatData = z.infer<typeof ChatData>;
export type GeneratorData = z.infer<typeof GeneratorData>;

export const UpdateSettingsReply = z.object({
  ok: z.boolean(),
  values: z.record(z.union([z.string(), z.boolean()])).optional(),
});
export type UpdateSettingsReply = z.infer<typeof UpdateSettingsReply>;

/* ── AI ─────────────────────────────────────────── */
export const Source = z.object({ title: z.string(), kind: z.enum(["institution", "general"]) });
export const ChatReply = z.object({
  agent: z.string(),
  message: z.string(),
  sources: z.array(Source),
  confidence: z.number().min(0).max(1),
});
export type ChatReply = z.infer<typeof ChatReply>;

export const GenerateReply = z.object({ markdown: z.string(), agent: z.string() });
export type GenerateReply = z.infer<typeof GenerateReply>;

export const EvaluationResult = z.object({
  score: z.number(),
  max: z.number(),
  confidence: z.number().min(0).max(1),
  rubric: z.array(z.object({ criterion: z.string(), awarded: z.number(), max: z.number() })),
  evidence: z.array(z.string()),
  missing: z.array(z.string()),
  feedback: z.string(),
  reviewRequired: z.boolean(),
});
export type EvaluationResult = z.infer<typeof EvaluationResult>;

/* ── Student ─────────────────────────────────────── */
export const StudentDashboard = z.object({
  name: z.string(),
  priorities: z.number(),
  academic: z.object({ semesterProgress: z.number(), examReadiness: z.number() }),
  skills: z.object({ technical: z.number(), communication: z.number(), interview: z.number() }),
  careerReadiness: z.number(),
  today: z.array(z.object({ time: z.string(), title: z.string(), kind: z.string() })),
  recommendation: z.string(),
  project: z.object({ name: z.string(), progress: z.number() }),
  upcoming: z.array(z.object({ title: z.string(), when: z.string() })),
  streak: z.number(),
  xp: z.number(),
  weakTopics: z.array(z.object({ subject: z.string(), topic: z.string(), mastery: z.number() })),
  examCountdown: z.object({ exam: z.string(), days: z.number(), syllabusCovered: z.number() }),
});
export type StudentDashboard = z.infer<typeof StudentDashboard>;

export const Course = z.object({
  id: z.string(),
  code: z.string(),
  title: z.string(),
  faculty: z.string(),
  progress: z.number(),
  mastery: z.number(),
  units: z.number(),
  nextTopic: z.string(),
});
export type Course = z.infer<typeof Course>;

export const Topic = z.object({
  id: z.string(),
  unit: z.string(),
  title: z.string(),
  mastery: z.number(),
  status: z.enum(["done", "in-progress", "todo", "weak"]),
});
export const CourseDetail = Course.extend({ topics: z.array(Topic) });
export type CourseDetail = z.infer<typeof CourseDetail>;

export const Question = z.object({
  id: z.string(),
  type: z.enum(["mcq", "descriptive"]),
  prompt: z.string(),
  options: z.array(z.string()).optional(),
  marks: z.number(),
});
export const MockTest = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  durationMin: z.number(),
  questions: z.array(Question),
});
export type MockTest = z.infer<typeof MockTest>;

export const MockTestSummary = z.object({
  id: z.string(),
  title: z.string(),
  subject: z.string(),
  questions: z.number(),
  durationMin: z.number(),
  difficulty: z.string(),
  lastScore: z.number().nullable(),
});
export type MockTestSummary = z.infer<typeof MockTestSummary>;

export const TestResult = z.object({
  attemptId: z.string(),
  mcqScore: z.number(),
  mcqMax: z.number(),
  answers: z.array(z.object({ questionId: z.string(), correct: z.boolean().nullable(), explanation: z.string() })),
  descriptive: z.array(EvaluationResult.extend({ questionId: z.string() })),
  nextActions: z.array(z.string()),
});
export type TestResult = z.infer<typeof TestResult>;

export const InterviewTurn = z.object({
  sessionId: z.string(),
  question: z.string(),
  index: z.number(),
  total: z.number(),
  feedback: z.string().nullable(),
  done: z.boolean(),
  scorecard: z
    .object({
      overall: z.number(),
      dimensions: z.array(z.object({ name: z.string(), score: z.number() })),
      strengths: z.array(z.string()),
      improvements: z.array(z.string()),
    })
    .nullable(),
});
export type InterviewTurn = z.infer<typeof InterviewTurn>;

export const ResumeAnalysis = z.object({
  atsScore: z.number(),
  keywordsFound: z.array(z.string()),
  keywordsMissing: z.array(z.string()),
  sections: z.array(z.object({ name: z.string(), status: z.enum(["good", "improve", "missing"]), note: z.string() })),
  suggestions: z.array(z.string()),
});
export type ResumeAnalysis = z.infer<typeof ResumeAnalysis>;

export const Project = z.object({
  id: z.string(),
  title: z.string(),
  domain: z.string(),
  team: z.array(z.string()),
  mentor: z.string(),
  stage: z.string(),
  progress: z.number(),
  stages: z.array(z.object({ title: z.string(), status: z.enum(["done", "active", "todo"]) })),
  review: z.object({ architecture: z.number(), documentation: z.number(), codeQuality: z.number(), testing: z.number(), innovation: z.number() }),
});
export type Project = z.infer<typeof Project>;

export const Notification = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  when: z.string(),
  unread: z.boolean(),
  tone: Tone,
});
export type Notification = z.infer<typeof Notification>;

export const SearchResult = z.object({
  title: z.string(),
  kind: z.string(),
  href: z.string(),
});
export type SearchResult = z.infer<typeof SearchResult>;

export const RoleHome = z.object({
  greeting: z.string(),
  kpis: z.array(Kpi),
  charts: z.array(ChartSpec),
  insights: z.array(Insight),
  queue: z.array(z.object({ title: z.string(), meta: z.string(), href: z.string(), tone: Tone })),
  college: z
    .object({
      id: z.string(),
      name: z.string(),
      code: z.string().optional(),
      type: z.string().optional(),
      city: z.string().optional(),
      principal: z.string().optional(),
      capacity: z.number().optional(),
      status: z.string().optional(),
    })
    .optional(),
  departments: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        head: z.string().optional(),
        faculty: z.number(),
        students: z.number(),
        readiness: z.number(),
        programmes: z.number().optional(),
        status: z.string().optional(),
      }),
    )
    .optional(),
});
export type RoleHome = z.infer<typeof RoleHome>;

export const EvaluationQueueItem = z.object({
  id: z.string(),
  student: z.string(),
  rollNo: z.string(),
  assessment: z.string(),
  question: z.string(),
  answer: z.string(),
  result: EvaluationResult,
  status: z.enum(["pending", "approved", "overridden"]),
  finalScore: z.number().nullable(),
});
export type EvaluationQueueItem = z.infer<typeof EvaluationQueueItem>;

export const Ok = z.object({ ok: z.literal(true) });

/* ── CRUD records ─────────────────────────────────── */
const RecordValueSchema = z.union([z.string(), z.number(), z.boolean(), z.array(z.string()), z.null()]);
export const ResourceRecordSchema = z
  .object({ id: z.string(), createdAt: z.string(), updatedAt: z.string(), version: z.number() })
  .catchall(RecordValueSchema);
export const RecordList = z.object({
  items: z.array(ResourceRecordSchema),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  counts: z.record(z.string(), z.number()),
  canManage: z.boolean(),
});
export type RecordList = z.infer<typeof RecordList>;
export const RecordEnvelope = z.object({ record: ResourceRecordSchema, canManage: z.boolean() });

/* ── Multi-college tenancy ────────────────────────── */
export const CollegeOptions = z.object({
  scope: z.string(),
  colleges: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), city: z.string(), type: z.string() })),
});
export const FacultyOptions = z.object({
  faculty: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      department: z.string().optional(),
      designation: z.string().optional(),
    }),
  ),
});
export type FacultyOptions = z.infer<typeof FacultyOptions>;
export const PublicColleges = z.object({
  university: z.string(),
  colleges: z.array(z.object({ id: z.string(), name: z.string(), city: z.string(), type: z.string(), admissionsOpen: z.boolean() })),
  /** True on the in-memory demo backend (sign-in accepts the prefilled demo account). */
  demo: z.boolean().optional(),
});
export type PublicColleges = z.infer<typeof PublicColleges>;
const CollegeCounts = z.object({ applications: z.number(), enrolled: z.number(), staff: z.number(), users: z.number(), courses: z.number(), events: z.number(), departments: z.number().optional() });
export const UniversityOverview = z.object({
  university: z.string(),
  totals: z.object({
    colleges: z.number(),
    active: z.number(),
    onboarding: z.number(),
    suspended: z.number(),
    capacity: z.number(),
    applications: z.number(),
    enrolled: z.number(),
    staff: z.number(),
    users: z.number(),
    courses: z.number(),
    departments: z.number().optional(),
  }),
  colleges: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      city: z.string(),
      type: z.string(),
      status: z.string(),
      plan: z.string(),
      principal: z.string(),
      capacity: z.number(),
      modules: z.array(z.string()),
      counts: CollegeCounts,
    }),
  ),
  recentAudit: z.array(z.object({ at: z.string(), actor: z.string(), action: z.string(), target: z.string() })),
});
export type UniversityOverview = z.infer<typeof UniversityOverview>;

/* ── BI Analytics ──────────────────────────────────── */
export const BiAnalyticsData = z.object({
  college: z.object({
    id: z.string(),
    name: z.string(),
    code: z.string().optional(),
    city: z.string().optional(),
    type: z.string().optional(),
    stream: z.string(),
    capacity: z.number(),
    principal: z.string().optional(),
  }),
  kpis: z.array(Kpi),
  executive: z.object({
    enrolledStudents: z.number(),
    capacityUtilization: z.number(),
    teachingFaculty: z.number(),
    totalStaff: z.number(),
    studentFacultyRatio: z.number(),
    activeCourses: z.number(),
    totalCourses: z.number(),
    applicationsTotal: z.number(),
    conversionRate: z.number(),
    healthScore: z.number(),
  }),
  funnel: z.array(
    z.object({
      stage: z.string(),
      count: z.number(),
      rate: z.number(),
    }),
  ),
  courseDistribution: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
    }),
  ),
  facultyDesignations: z.array(
    z.object({
      name: z.string(),
      value: z.number(),
    }),
  ),
  departmentMetrics: z.array(
    z.object({
      name: z.string(),
      courses: z.number(),
      faculty: z.number(),
      applications: z.number(),
      studentCount: z.number(),
    }),
  ),
  charts: z.array(ChartSpec),
  insights: z.array(Insight),
});
export type BiAnalyticsData = z.infer<typeof BiAnalyticsData>;

/* ── Campus Clubs ───────────────────────────────── */
export const ClubItem = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(["Technical", "Cultural", "Social", "Innovation", "Arts", "Sports", "Academic"]),
  description: z.string().default(""),
  lead: z.string(),
  facultyAdvisor: z.string().default("Faculty Coordinator"),
  membersCount: z.number().int().nonnegative(),
  meetingSchedule: z.string(),
  venue: z.string().default("Campus Center"),
  status: z.enum(["Active", "Recruiting", "Inactive"]).default("Active"),
  isJoined: z.boolean().default(false),
  createdAt: z.string(),
});
export type ClubItem = z.infer<typeof ClubItem>;

export const ClubsOverview = z.object({
  collegeId: z.string(),
  kpis: z.object({
    totalClubs: z.number(),
    totalMembers: z.number(),
    activeCategories: z.number(),
    upcomingActivities: z.number(),
  }),
  clubs: z.array(ClubItem),
});
export type ClubsOverview = z.infer<typeof ClubsOverview>;

export const CreateClubInput = z.object({
  name: z.string().min(2, "Club name is required").max(100),
  category: z.enum(["Technical", "Cultural", "Social", "Innovation", "Arts", "Sports", "Academic"]),
  description: z.string().max(1000).default(""),
  lead: z.string().min(2, "Student lead is required").max(100),
  facultyAdvisor: z.string().max(100).default("Faculty Coordinator"),
  meetingSchedule: z.string().min(2, "Meeting schedule is required").max(100),
  venue: z.string().max(100).default("Campus Center"),
  membersCount: z.number().int().min(1).max(5000).default(10),
});
export type CreateClubInput = z.infer<typeof CreateClubInput>;

/* ── Campus Sports ───────────────────────────────── */
export const SportItem = z.object({
  id: z.string(),
  sport: z.string(),
  team: z.string(),
  coach: z.string(),
  captain: z.string().default("Team Captain"),
  event: z.string(),
  venue: z.string().default("Campus Sports Complex"),
  squadSize: z.number().int().nonnegative().default(15),
  status: z.enum(["Trials open", "Active", "Off-season"]).default("Active"),
  isRegistered: z.boolean().default(false),
  createdAt: z.string(),
});
export type SportItem = z.infer<typeof SportItem>;

export const SportsOverview = z.object({
  collegeId: z.string(),
  kpis: z.object({
    totalTeams: z.number(),
    totalAthletes: z.number(),
    openTrials: z.number(),
    upcomingMeets: z.number(),
  }),
  sports: z.array(SportItem),
});
export type SportsOverview = z.infer<typeof SportsOverview>;

export const CreateSportInput = z.object({
  sport: z.string().min(2, "Sport name is required").max(80),
  team: z.string().min(2, "Team name is required").max(80),
  coach: z.string().min(2, "Coach name is required").max(80),
  captain: z.string().max(80).default("Team Captain"),
  event: z.string().min(2, "Upcoming event is required").max(100),
  venue: z.string().max(100).default("Campus Sports Complex"),
  squadSize: z.number().int().min(1).max(200).default(15),
  status: z.enum(["Trials open", "Active", "Off-season"]).default("Trials open"),
});
export type CreateSportInput = z.infer<typeof CreateSportInput>;

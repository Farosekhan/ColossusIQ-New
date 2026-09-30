import "server-only";
import type { DataStore } from "../store";
import { pgAudit, pgMedia, pgSites } from "./basics";
import { pgAttempts, pgCertificates, pgCourses, pgProgress, pgQuizzes, pgReadiness } from "./learning";
import { pgRecords } from "./records";
import { pgBooster, pgEvaluations, pgFacultyEvents, pgInterviews, pgNotifications, pgOutlines, pgResumes, pgSummaries } from "./teaching";

/** The PostgreSQL store (DATA_BACKEND=postgres). Calls must run inside withRequestContext(). */
export const postgresStore: DataStore = {
  kind: "postgres",
  records: pgRecords,
  sites: pgSites,
  media: pgMedia,
  audit: pgAudit,
  courses: pgCourses,
  progress: pgProgress,
  quizzes: pgQuizzes,
  attempts: pgAttempts,
  certificates: pgCertificates,
  readiness: pgReadiness,
  summaries: pgSummaries,
  outlines: pgOutlines,
  booster: pgBooster,
  facultyEvents: pgFacultyEvents,
  evaluations: pgEvaluations,
  interviews: pgInterviews,
  resumes: pgResumes,
  notifications: pgNotifications,
};

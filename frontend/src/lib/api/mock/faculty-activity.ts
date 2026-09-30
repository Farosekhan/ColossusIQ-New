import "server-only";
import { getStore } from "@/lib/data";

/*
 * What faculty actually did, recorded by the server where it happens (sharing a summary, publishing a quiz…).
 * The Skill Booster reads this log, so its tasks complete from real teaching activity rather than self-reporting.
 */

export type FacultyEvent =
  | "smartboard_session"
  | "outline_saved"
  | "summary_shared"
  | "infographic_shared"
  | "video_added"
  | "quiz_published"
  | "course_published";

export async function recordFacultyEvent(sub: string, kind: FacultyEvent, count = 1, collegeId: string | null = null) {
  await getStore().facultyEvents.record(sub, kind, count, collegeId);
}

export async function eventCounts(sub: string) {
  return getStore().facultyEvents.counts(sub);
}

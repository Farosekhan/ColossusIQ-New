import "server-only";
import { sharedState } from "./global-state";
import type { SessionPayload } from "@/lib/auth/session";
import type {
  AcademicCalendarItem,
  AcademicCalendarOverview,
  CreateCalendarItemInput,
} from "@/lib/api/schemas";
import { getStore, dataBackend } from "@/lib/data";
import { RESOURCES } from "@/config/resources";

const calendarStore = sharedState("campus.academic-calendar.map", () => new Map<string, AcademicCalendarItem[]>());

function tagToTone(tag: string): AcademicCalendarItem["tone"] {
  switch (tag) {
    case "Assessment":
      return "rose";
    case "Holiday":
      return "teal";
    case "Exam cell":
      return "brand";
    case "Milestone":
      return "sky";
    case "Event":
    default:
      return "gold";
  }
}

function defaultCalendarItems(_collegeId: string): AcademicCalendarItem[] {
  if (dataBackend() === "memory") {
    return [
      { id: "cal-ia2-timetable", title: "IA-II Timetable Published", date: "2026-09-29", time: "10:00 AM", tag: "Exam cell", tone: "brand", department: "All Departments", venue: "Central Exam Cell / Portal", description: "Official schedule for Internal Assessment II released for all UG and PG programs.", audience: "All", source: "academic", createdAt: "2026-09-20T09:00:00Z" },
      { id: "cal-gandhi-jayanti", title: "Gandhi Jayanti", date: "2026-10-02", time: "Full day", tag: "Holiday", tone: "teal", department: "All Departments", venue: "Campus Closed", description: "National Holiday on account of Mahatma Gandhi Jayanti.", audience: "All", source: "academic", createdAt: "2026-08-01T00:00:00Z" },
      { id: "cal-genai-workshop", title: "Workshop: GenAI for Engineers", date: "2026-10-04", time: "09:30 AM - 04:30 PM", tag: "Event", tone: "gold", department: "Computer Science", venue: "Seminar Hall 2 & AI Lab", description: "Hands-on session on LLM application engineering, prompt design, and retrieval systems.", audience: "Students", source: "academic", createdAt: "2026-09-15T11:00:00Z" },
      { id: "cal-dbms-ia2", title: "DBMS Internal Assessment II", date: "2026-10-09", time: "10:00 AM - 12:00 PM", tag: "Assessment", tone: "rose", department: "Computer Science", venue: "Exam Hall A & B", description: "Assessment covering indexing, query optimization, concurrency control, and transactions.", audience: "Students", source: "academic", createdAt: "2026-09-22T08:30:00Z" },
      { id: "cal-techno-fest", title: "Techno Fest 2026", date: "2026-10-10", endDate: "2026-10-11", time: "09:00 AM - 06:00 PM", tag: "Event", tone: "gold", department: "All Departments", venue: "Main Auditorium & Tech Expo Quad", description: "Annual national tech symposium featuring 24-hr hackathon, robotics arena, and paper presentations.", audience: "All", source: "academic", createdAt: "2026-09-01T10:00:00Z" },
      { id: "cal-diwali-break", title: "Diwali Vacation", date: "2026-10-20", endDate: "2026-10-25", time: "Full day", tag: "Holiday", tone: "teal", department: "All Departments", venue: "Campus Closed", description: "College closed for Diwali break. Administrative offices and classes resume on Monday 26 Oct.", audience: "All", source: "academic", createdAt: "2026-08-01T00:00:00Z" },
      { id: "cal-model-exams", title: "Model Examinations Commencement", date: "2026-11-03", endDate: "2026-11-10", time: "09:30 AM - 12:30 PM", tag: "Assessment", tone: "rose", department: "All Departments", venue: "Assigned Exam Halls", description: "Comprehensive model theory examinations covering complete university syllabi.", audience: "Students", source: "academic", createdAt: "2026-09-10T10:00:00Z" },
      { id: "cal-last-working-day", title: "Last Working Day (Odd Semester)", date: "2026-11-20", time: "Full day", tag: "Milestone", tone: "sky", department: "All Departments", venue: "All Departments", description: "Official conclusion of instruction, practical logbook verification, and attendance consolidation.", audience: "All", source: "academic", createdAt: "2026-08-01T00:00:00Z" },
      { id: "cal-univ-exams", title: "University End-Semester Theory Exams", date: "2026-11-30", endDate: "2026-12-18", time: "10:00 AM - 01:00 PM", tag: "Assessment", tone: "rose", department: "All Departments", venue: "Designated University Exam Centers", description: "Controller of Examinations centralized university semester examinations.", audience: "Students", source: "academic", createdAt: "2026-08-01T00:00:00Z" },
    ];
  }
  return [];
}

export function getCollegeCalendar(collegeId: string): AcademicCalendarItem[] {
  const effectiveCollege = collegeId === "all" ? "COL-1001" : collegeId;
  if (!calendarStore.has(effectiveCollege)) {
    if (dataBackend() === "memory") {
      calendarStore.set(effectiveCollege, defaultCalendarItems(effectiveCollege));
    } else {
      calendarStore.set(effectiveCollege, []);
    }
  }
  return calendarStore.get(effectiveCollege)!;
}

export async function getCalendarOverview(session: SessionPayload): Promise<AcademicCalendarOverview> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;

  if (dataBackend() === "postgres") {
    const rawEvents = await getStore().records.all(RESOURCES.events!, collegeId);
    const mapped: AcademicCalendarItem[] = rawEvents.map((evt) => {
      const typeStr = String(evt.type || "");
      const tag: AcademicCalendarItem["tag"] =
        typeStr === "Workshop" || typeStr === "Hackathon"
          ? "Event"
          : typeStr === "Seminar"
          ? "Milestone"
          : "Event";
      return {
        id: evt.id,
        title: String(evt.title || "Campus Event"),
        date: String(evt.date || ""),
        time: String(evt.startTime || "Full day"),
        tag,
        tone: tagToTone(tag),
        department: "All Departments",
        venue: evt.venue ? String(evt.venue) : undefined,
        description: evt.description ? String(evt.description) : undefined,
        audience: "All",
        source: "campus_event",
        createdAt: evt.createdAt || new Date().toISOString(),
      };
    });

    const items = mapped;
    items.sort((a, b) => a.date.localeCompare(b.date));

    const assessmentsCount = items.filter((i) => i.tag === "Assessment").length;
    const holidaysCount = items.filter((i) => i.tag === "Holiday").length;
    const eventsCount = items.filter((i) => i.tag === "Event").length;
    const milestonesCount = items.filter((i) => i.tag === "Milestone" || i.tag === "Exam cell").length;

    const canManage =
      session.role === "institution" ||
      session.role === "admin" ||
      session.role === "hod" ||
      session.role === "faculty";

    return {
      collegeId,
      semester: {
        name: "Odd Semester 2026–27",
        startDate: "2026-08-01",
        endDate: "2026-12-20",
        currentWeek: 9,
        totalWeeks: 18,
      },
      kpis: {
        totalEvents: items.length,
        assessmentsCount,
        holidaysCount,
        eventsCount,
        milestonesCount,
      },
      items,
      canManage,
    };
  }

  const items = getCollegeCalendar(collegeId);

  // Sort items chronologically by date
  items.sort((a, b) => a.date.localeCompare(b.date));

  const assessmentsCount = items.filter((i) => i.tag === "Assessment").length;
  const holidaysCount = items.filter((i) => i.tag === "Holiday").length;
  const eventsCount = items.filter((i) => i.tag === "Event").length;
  const milestonesCount = items.filter((i) => i.tag === "Milestone" || i.tag === "Exam cell").length;

  const canManage =
    session.role === "institution" ||
    session.role === "admin" ||
    session.role === "hod" ||
    session.role === "faculty";

  return {
    collegeId,
    semester: {
      name: "Odd Semester 2026–27",
      startDate: "2026-08-01",
      endDate: "2026-12-20",
      currentWeek: 9,
      totalWeeks: 18,
    },
    kpis: {
      totalEvents: items.length,
      assessmentsCount,
      holidaysCount,
      eventsCount,
      milestonesCount,
    },
    items,
    canManage,
  };
}

export async function createCalendarItem(
  session: SessionPayload,
  input: CreateCalendarItemInput,
): Promise<AcademicCalendarItem> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;

  if (dataBackend() === "postgres") {
    const rawType = input.tag === "Assessment" ? "Workshop" : input.tag === "Milestone" ? "Seminar" : "Cultural";
    const rec = await getStore().records.create(
      RESOURCES.events!,
      {
        title: input.title.trim(),
        type: rawType,
        date: input.date,
        startTime: input.time?.trim() && input.time.includes(":") ? input.time.trim().slice(0, 5) : "10:00",
        venue: input.venue?.trim() || "Main Auditorium",
        organiser: "Academic Affairs",
        capacity: 250,
        registrationOpen: true,
        status: "Published",
        description: input.description?.trim() || `${input.tag} scheduled on ${input.date}`,
      },
      collegeId
    );

    const newItem: AcademicCalendarItem = {
      id: rec.id,
      title: String(rec.title),
      date: String(rec.date),
      time: String(rec.startTime || "Full day"),
      tag: input.tag,
      tone: tagToTone(input.tag),
      department: input.department.trim() || "All Departments",
      venue: rec.venue ? String(rec.venue) : undefined,
      description: rec.description ? String(rec.description) : undefined,
      audience: input.audience || "All",
      source: "academic",
      createdAt: rec.createdAt || new Date().toISOString(),
    };

    await getStore().audit.add({
      actor: session.name,
      action: `Added calendar entry "${newItem.title}" (${newItem.tag})`,
      target: newItem.id,
      collegeId: session.college === "all" ? null : session.college,
      actorSub: session.sub,
    });

    return newItem;
  }

  const items = getCollegeCalendar(collegeId);

  const newItem: AcademicCalendarItem = {
    id: `cal-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    title: input.title.trim(),
    date: input.date,
    endDate: input.endDate?.trim() ? input.endDate.trim() : undefined,
    time: input.time.trim() || "Full day",
    tag: input.tag,
    tone: tagToTone(input.tag),
    department: input.department.trim() || "All Departments",
    venue: input.venue?.trim() || undefined,
    description: input.description?.trim() || undefined,
    audience: input.audience || "All",
    source: "academic",
    createdAt: new Date().toISOString(),
  };

  items.push(newItem);
  items.sort((a, b) => a.date.localeCompare(b.date));
  calendarStore.set(collegeId, items);

  await getStore().audit.add({
    actor: session.name,
    action: `Added calendar entry "${newItem.title}" (${newItem.tag})`,
    target: newItem.id,
    collegeId: session.college === "all" ? null : session.college,
    actorSub: session.sub,
  });

  return newItem;
}

export async function updateCalendarItem(
  session: SessionPayload,
  id: string,
  patch: Partial<CreateCalendarItemInput>,
): Promise<AcademicCalendarItem | undefined> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;

  if (dataBackend() === "postgres") {
    const existing = await getStore().records.get(RESOURCES.events!, id);
    if (existing) {
      const patchObj: Record<string, any> = {};
      if (patch.title) patchObj.title = patch.title.trim();
      if (patch.date) patchObj.date = patch.date;
      if (patch.time && patch.time.includes(":")) patchObj.startTime = patch.time.trim().slice(0, 5);
      if (patch.venue !== undefined) patchObj.venue = patch.venue.trim();
      if (patch.description !== undefined) patchObj.description = patch.description.trim();

      const updatedRec = await getStore().records.update(RESOURCES.events!, id, patchObj, existing.version);
      if (!updatedRec || updatedRec === "stale") return undefined;
      const nextTag = patch.tag || "Event";
      return {
        id: updatedRec.id,
        title: String(updatedRec.title),
        date: String(updatedRec.date),
        time: String(updatedRec.startTime || "Full day"),
        tag: nextTag,
        tone: tagToTone(nextTag),
        department: patch.department?.trim() || "All Departments",
        venue: updatedRec.venue ? String(updatedRec.venue) : undefined,
        description: updatedRec.description ? String(updatedRec.description) : undefined,
        audience: patch.audience || "All",
        source: "academic",
        createdAt: updatedRec.createdAt || new Date().toISOString(),
      };
    }
  }

  const items = getCollegeCalendar(collegeId);
  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return undefined;

  const current = items[index]!;
  const nextTag = patch.tag ?? current.tag;
  const updated: AcademicCalendarItem = {
    ...current,
    title: patch.title?.trim() ?? current.title,
    date: patch.date ?? current.date,
    endDate: patch.endDate !== undefined ? (patch.endDate.trim() ? patch.endDate.trim() : undefined) : current.endDate,
    time: patch.time?.trim() ?? current.time,
    tag: nextTag,
    tone: tagToTone(nextTag),
    department: patch.department?.trim() ?? current.department,
    venue: patch.venue !== undefined ? (patch.venue.trim() ? patch.venue.trim() : undefined) : current.venue,
    description: patch.description !== undefined ? (patch.description.trim() ? patch.description.trim() : undefined) : current.description,
    audience: patch.audience ?? current.audience,
  };

  items[index] = updated;
  items.sort((a, b) => a.date.localeCompare(b.date));
  calendarStore.set(collegeId, items);

  await getStore().audit.add({
    actor: session.name,
    action: `Updated calendar entry "${updated.title}"`,
    target: updated.id,
    collegeId: session.college === "all" ? null : session.college,
    actorSub: session.sub,
  });

  return updated;
}

export async function deleteCalendarItem(session: SessionPayload, id: string): Promise<boolean> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;

  if (dataBackend() === "postgres") {
    try {
      await getStore().records.delete(RESOURCES.events!, id);
      await getStore().audit.add({
        actor: session.name,
        action: `Deleted calendar entry "${id}"`,
        target: id,
        collegeId: session.college === "all" ? null : session.college,
        actorSub: session.sub,
      });
      return true;
    } catch {
      // Might be a memory-only item
    }
  }

  const items = getCollegeCalendar(collegeId);
  const target = items.find((i) => i.id === id);
  if (!target) return false;

  const filtered = items.filter((i) => i.id !== id);
  calendarStore.set(collegeId, filtered);

  await getStore().audit.add({
    actor: session.name,
    action: `Deleted calendar entry "${target.title}"`,
    target: id,
    collegeId: session.college === "all" ? null : session.college,
    actorSub: session.sub,
  });

  return true;
}

export async function syncCampusEvents(session: SessionPayload): Promise<{ syncedCount: number }> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;
  const items = getCollegeCalendar(collegeId);

  // Fetch campus events from the events resource store
  const campusEvents = await getStore().records.all(RESOURCES.events!, collegeId);
  let syncedCount = 0;

  for (const evt of campusEvents) {
    const title = String(evt.title || "").trim();
    const date = String(evt.date || "").trim();
    if (!title || !date) continue;

    // Check if already in calendar
    const exists = items.some(
      (item) => item.id === `cal-evt-${evt.id}` || (item.title.toLowerCase() === title.toLowerCase() && item.date === date),
    );

    if (!exists) {
      const newItem: AcademicCalendarItem = {
        id: `cal-evt-${evt.id}`,
        title,
        date,
        time: String(evt.startTime || "Full day"),
        tag: "Event",
        tone: "gold",
        department: "Campus Wide",
        venue: evt.venue ? String(evt.venue) : undefined,
        description: evt.description ? String(evt.description) : undefined,
        audience: "All",
        source: "campus_event",
        createdAt: new Date().toISOString(),
      };
      items.push(newItem);
      syncedCount++;
    }
  }

  if (syncedCount > 0) {
    items.sort((a, b) => a.date.localeCompare(b.date));
    calendarStore.set(collegeId, items);

    await getStore().audit.add({
      actor: session.name,
      action: `Synced ${syncedCount} campus event(s) into Academic Calendar`,
      target: "academic-calendar",
      collegeId: session.college === "all" ? null : session.college,
      actorSub: session.sub,
    });
  }

  return { syncedCount };
}

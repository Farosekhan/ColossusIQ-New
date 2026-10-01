import "server-only";
import { sharedState } from "./global-state";
import type { SessionPayload } from "@/lib/auth/session";
import type { ClubItem, ClubsOverview, CreateClubInput } from "@/lib/api/schemas";
import { getStore } from "@/lib/data";

const clubsStore = sharedState("campus.clubs.map", () => new Map<string, ClubItem[]>());

function defaultClubs(collegeId: string): ClubItem[] {
  return [
    {
      id: "club-coding",
      name: "Coding Club",
      category: "Technical",
      description: "Competitive programming, open-source projects, and technical interview workshops.",
      lead: "Arjun Varma",
      facultyAdvisor: "Dr. Meena Raghavan",
      membersCount: 40,
      meetingSchedule: "Weekly contest — Sat",
      venue: "CSE Lab 3",
      status: "Active",
      isJoined: false,
      createdAt: "2026-08-01T10:00:00Z",
    },
    {
      id: "club-robotics",
      name: "Robotics Society",
      category: "Technical",
      description: "Autonomous rovers, drone design, IoT integration, and university robotic combat competitions.",
      lead: "Meera Nair",
      facultyAdvisor: "Prof. S. Venkatesh",
      membersCount: 77,
      meetingSchedule: "Weekly contest — Sat",
      venue: "Robotics Lab, Mech Block",
      status: "Active",
      isJoined: false,
      createdAt: "2026-08-05T10:00:00Z",
    },
    {
      id: "club-aids",
      name: "AI & Data Science Circle",
      category: "Technical",
      description: "LLM experimentation, computer vision challenges, and research paper discussions.",
      lead: "Harish Patel",
      facultyAdvisor: "Dr. R. Chandrasekar",
      membersCount: 114,
      meetingSchedule: "Weekly contest — Sat",
      venue: "AI Research Lab",
      status: "Active",
      isJoined: false,
      createdAt: "2026-08-10T10:00:00Z",
    },
    {
      id: "club-tamil",
      name: "Tamil Mandram",
      category: "Cultural",
      description: "Literature, poetry, debate competitions, cultural heritage, and traditional arts.",
      lead: "Kavya Gupta",
      facultyAdvisor: "Dr. Lakshmi Sundaram",
      membersCount: 151,
      meetingSchedule: "Weekly contest — Sat",
      venue: "Auditorium Annex",
      status: "Active",
      isJoined: false,
      createdAt: "2026-08-12T10:00:00Z",
    },
    {
      id: "club-music",
      name: "Music Club",
      category: "Cultural",
      description: "Campus band rehearsals, classical concerts, and sound engineering sessions.",
      lead: "Nikhil Sharma",
      facultyAdvisor: "Prof. Arjun Iyer",
      membersCount: 188,
      meetingSchedule: "Weekly contest — Sat",
      venue: "Acoustic Hall",
      status: "Active",
      isJoined: false,
      createdAt: "2026-08-15T10:00:00Z",
    },
    {
      id: "club-nss",
      name: "NSS Unit",
      category: "Social",
      description: "Community outreach, blood donation drives, village literacy campaigns, and environmental drives.",
      lead: "Pooja Das",
      facultyAdvisor: "Dr. K. Swaminathan",
      membersCount: 65,
      meetingSchedule: "Weekly contest — Sat",
      venue: "Student Welfare Office",
      status: "Active",
      isJoined: false,
      createdAt: "2026-08-18T10:00:00Z",
    },
    {
      id: "club-ecell",
      name: "Entrepreneurship Cell",
      category: "Innovation",
      description: "Startup mentoring, pitch competitions, angel network connects, and prototype funding.",
      lead: "Sanjay Balaji",
      facultyAdvisor: "Mr. Arjun Iyer",
      membersCount: 102,
      meetingSchedule: "Weekly contest — Sat",
      venue: "Incubation Hub",
      status: "Active",
      isJoined: false,
      createdAt: "2026-08-20T10:00:00Z",
    },
    {
      id: "club-photo",
      name: "Photography Club",
      category: "Cultural",
      description: "Photo-walks, digital darkroom workshops, campus event documentation, and visual storytelling.",
      lead: "Priya Raman",
      facultyAdvisor: "Ms. Priya Nair",
      membersCount: 58,
      meetingSchedule: "Build night — Thu",
      venue: "Media Studio",
      status: "Active",
      isJoined: false,
      createdAt: "2026-08-22T10:00:00Z",
    },
  ];
}

const joinedClubsByUser = sharedState("campus.clubs.userMemberships", () => new Map<string, Set<string>>());

export function getCollegeClubs(collegeId: string): ClubItem[] {
  const effectiveCollege = collegeId === "all" ? "COL-1001" : collegeId;
  if (!clubsStore.has(effectiveCollege)) {
    clubsStore.set(effectiveCollege, defaultClubs(effectiveCollege));
  }
  return clubsStore.get(effectiveCollege)!;
}

export async function getClubsOverview(session: SessionPayload): Promise<ClubsOverview> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;
  const items = getCollegeClubs(collegeId);
  const userJoined = joinedClubsByUser.get(session.sub) ?? new Set<string>();

  const clubsWithUserStatus = items.map((c) => ({
    ...c,
    isJoined: userJoined.has(c.id),
  }));

  const totalMembers = items.reduce((sum, c) => sum + c.membersCount, 0);
  const categories = new Set(items.map((c) => c.category));
  const upcomingActivities = items.filter((c) => c.status === "Active" && Boolean(c.meetingSchedule)).length;

  return {
    collegeId,
    kpis: {
      totalClubs: items.length,
      totalMembers,
      activeCategories: categories.size,
      upcomingActivities,
    },
    clubs: clubsWithUserStatus,
  };
}

export async function createClub(session: SessionPayload, input: CreateClubInput): Promise<ClubItem> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;
  const items = getCollegeClubs(collegeId);

  const newClub: ClubItem = {
    id: `club-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
    name: input.name.trim(),
    category: input.category,
    description: input.description.trim(),
    lead: input.lead.trim(),
    facultyAdvisor: input.facultyAdvisor?.trim() || "Faculty Coordinator",
    membersCount: input.membersCount || 10,
    meetingSchedule: input.meetingSchedule.trim(),
    venue: input.venue?.trim() || "Campus Center",
    status: "Active",
    isJoined: false,
    createdAt: new Date().toISOString(),
  };

  items.unshift(newClub);
  clubsStore.set(collegeId, items);

  await getStore().audit.add({
    actor: session.name,
    action: `Created campus club "${newClub.name}" (${newClub.category})`,
    target: newClub.id,
    collegeId: session.college === "all" ? null : session.college,
    actorSub: session.sub,
  });

  return newClub;
}

export async function updateClub(
  session: SessionPayload,
  clubId: string,
  patch: Partial<CreateClubInput & { status: ClubItem["status"] }>,
): Promise<ClubItem | undefined> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;
  const items = getCollegeClubs(collegeId);
  const idx = items.findIndex((c) => c.id === clubId);
  if (idx === -1) return undefined;

  const current = items[idx]!;
  const updated: ClubItem = {
    ...current,
    name: patch.name !== undefined ? patch.name.trim() : current.name,
    category: patch.category ?? current.category,
    description: patch.description !== undefined ? patch.description.trim() : current.description,
    lead: patch.lead !== undefined ? patch.lead.trim() : current.lead,
    facultyAdvisor: patch.facultyAdvisor !== undefined ? patch.facultyAdvisor.trim() : current.facultyAdvisor,
    meetingSchedule: patch.meetingSchedule !== undefined ? patch.meetingSchedule.trim() : current.meetingSchedule,
    venue: patch.venue !== undefined ? patch.venue.trim() : current.venue,
    status: patch.status ?? current.status,
  };

  items[idx] = updated;
  clubsStore.set(collegeId, items);

  await getStore().audit.add({
    actor: session.name,
    action: `Updated campus club "${updated.name}"`,
    target: updated.id,
    collegeId: session.college === "all" ? null : session.college,
    actorSub: session.sub,
  });

  return updated;
}

export async function deleteClub(session: SessionPayload, clubId: string): Promise<boolean> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;
  const items = getCollegeClubs(collegeId);
  const target = items.find((c) => c.id === clubId);
  if (!target) return false;

  const remaining = items.filter((c) => c.id !== clubId);
  clubsStore.set(collegeId, remaining);

  await getStore().audit.add({
    actor: session.name,
    action: `Disbanded campus club "${target.name}"`,
    target: target.id,
    collegeId: session.college === "all" ? null : session.college,
    actorSub: session.sub,
  });

  return true;
}

export async function toggleJoinClub(
  session: SessionPayload,
  clubId: string,
): Promise<{ isJoined: boolean; membersCount: number } | undefined> {
  const collegeId = session.college === "all" ? "COL-1001" : session.college;
  const items = getCollegeClubs(collegeId);
  const target = items.find((c) => c.id === clubId);
  if (!target) return undefined;

  let userJoined = joinedClubsByUser.get(session.sub);
  if (!userJoined) {
    userJoined = new Set<string>();
    joinedClubsByUser.set(session.sub, userJoined);
  }

  const isCurrentlyJoined = userJoined.has(clubId);
  let newJoinedStatus: boolean;

  if (isCurrentlyJoined) {
    userJoined.delete(clubId);
    target.membersCount = Math.max(1, target.membersCount - 1);
    newJoinedStatus = false;
  } else {
    userJoined.add(clubId);
    target.membersCount += 1;
    newJoinedStatus = true;
  }

  return { isJoined: newJoinedStatus, membersCount: target.membersCount };
}

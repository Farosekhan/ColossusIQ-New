import { cleanText } from "@/lib/security/sanitize";

export interface FacultyRecord {
  id: string;
  name: string;
  designation: "Professor" | "Associate Professor" | "Assistant Professor";
  department: string;
  email?: string;
  phone?: string;
  load: number;
  development: number;
  ai: "High" | "Medium" | "Starting";
  collegeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface FacultyInput {
  name: string;
  designation: "Professor" | "Associate Professor" | "Assistant Professor";
  department?: string;
  email?: string;
  phone?: string;
  load: number;
  development: number;
  ai?: "High" | "Medium" | "Starting";
}

const INITIAL_FACULTY: FacultyRecord[] = [
  { id: "fac-1", name: "Dr. Joseph Kumar",       designation: "Professor",           department: "CSE", load: 18, development: 95, ai: "Medium",   email: "joseph.k@campus.edu",  createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "fac-2", name: "Mr. Ananya Menon",        designation: "Professor",           department: "CSE", load: 14, development: 62, ai: "Starting", email: "ananya.m@campus.edu",  createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "fac-3", name: "Mr. Manoj Khan",          designation: "Professor",           department: "CSE", load: 13, development: 40, ai: "Starting", email: "manoj.k@campus.edu",   createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "fac-4", name: "Mr. Deepika Raman",       designation: "Assistant Professor", department: "CSE", load: 14, development: 28, ai: "High",     email: "deepika.r@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "fac-5", name: "Prof. Imran Pillai",      designation: "Professor",           department: "CSE", load: 12, development: 45, ai: "Medium",   email: "imran.p@campus.edu",   createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "fac-6", name: "Dr. Revathi Srinivasan",  designation: "Assistant Professor", department: "CSE", load: 19, development: 94, ai: "Starting", email: "revathi.s@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "fac-7", name: "Dr. Gokul Iyer",          designation: "Assistant Professor", department: "CSE", load: 14, development: 64, ai: "Medium",   email: "gokul.i@campus.edu",   createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "fac-8", name: "Dr. Shreya Krishnan",     designation: "Professor",           department: "CSE", load: 18, development: 63, ai: "Medium",   email: "shreya.k@campus.edu",  createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "fac-9", name: "Prof. Varun Varma",       designation: "Assistant Professor", department: "CSE", load: 19, development: 88, ai: "Starting", email: "varun.v@campus.edu",   createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
];

let facultyStore: FacultyRecord[] = [...INITIAL_FACULTY];
let nextFacultySeq = 10;

export async function getFacultyList(opts?: {
  collegeId?: string | null;
  q?: string;
  designation?: string;
  ai?: string;
}): Promise<FacultyRecord[]> {
  let list = [...facultyStore];
  if (opts?.collegeId && opts.collegeId !== "all") {
    list = list.filter((f) => !f.collegeId || f.collegeId === opts.collegeId);
  }
  if (opts?.designation && opts.designation !== "all") {
    list = list.filter((f) => f.designation.toLowerCase() === opts.designation!.toLowerCase());
  }
  if (opts?.ai && opts.ai !== "all") {
    list = list.filter((f) => f.ai.toLowerCase() === opts.ai!.toLowerCase());
  }
  if (opts?.q) {
    const needle = opts.q.trim().toLowerCase();
    list = list.filter(
      (f) =>
        f.name.toLowerCase().includes(needle) ||
        f.designation.toLowerCase().includes(needle) ||
        (f.department ?? "").toLowerCase().includes(needle) ||
        (f.email ?? "").toLowerCase().includes(needle)
    );
  }
  return list;
}

export async function getFacultyById(id: string): Promise<FacultyRecord | null> {
  const found = facultyStore.find((f) => f.id === id);
  return found ? { ...found } : null;
}

export async function createFaculty(
  input: FacultyInput,
  collegeId?: string | null
): Promise<FacultyRecord> {
  const now = new Date().toISOString();
  const id = `fac-${Date.now()}-${nextFacultySeq++}`;
  const validDesignations = ["Professor", "Associate Professor", "Assistant Professor"] as const;
  const designation = validDesignations.includes(input.designation as any)
    ? (input.designation as FacultyRecord["designation"])
    : "Assistant Professor";
  const validAi = ["High", "Medium", "Starting"] as const;
  const ai = validAi.includes((input.ai ?? "") as any)
    ? (input.ai as FacultyRecord["ai"])
    : "Starting";

  const record: FacultyRecord = {
    id,
    name: cleanText(input.name, 120).trim(),
    designation,
    department: cleanText(input.department || "CSE", 80).trim(),
    email: input.email ? cleanText(input.email, 120).trim() : undefined,
    phone: input.phone ? cleanText(input.phone, 20).trim() : undefined,
    load: Math.min(40, Math.max(0, Math.round(Number(input.load || 12)))),
    development: Math.min(100, Math.max(0, Math.round(Number(input.development || 50)))),
    ai,
    collegeId: collegeId || null,
    createdAt: now,
    updatedAt: now,
  };

  facultyStore.unshift(record);
  return { ...record };
}

export async function updateFaculty(
  id: string,
  data: Partial<FacultyInput>
): Promise<FacultyRecord | null> {
  const index = facultyStore.findIndex((f) => f.id === id);
  if (index === -1) return null;

  const current = facultyStore[index]!;
  const validDesignations = ["Professor", "Associate Professor", "Assistant Professor"] as const;
  const validAi = ["High", "Medium", "Starting"] as const;

  const updated: FacultyRecord = {
    ...current,
    name: data.name !== undefined ? cleanText(data.name, 120).trim() : current.name,
    designation:
      data.designation !== undefined && validDesignations.includes(data.designation as any)
        ? (data.designation as FacultyRecord["designation"])
        : current.designation,
    department:
      data.department !== undefined ? cleanText(data.department, 80).trim() : current.department,
    email: data.email !== undefined ? cleanText(data.email, 120).trim() : current.email,
    phone: data.phone !== undefined ? cleanText(data.phone, 20).trim() : current.phone,
    load:
      data.load !== undefined
        ? Math.min(40, Math.max(0, Math.round(Number(data.load))))
        : current.load,
    development:
      data.development !== undefined
        ? Math.min(100, Math.max(0, Math.round(Number(data.development))))
        : current.development,
    ai:
      data.ai !== undefined && validAi.includes(data.ai as any)
        ? (data.ai as FacultyRecord["ai"])
        : current.ai,
    updatedAt: new Date().toISOString(),
  };

  facultyStore[index] = updated;
  return { ...updated };
}

export async function deleteFaculty(id: string): Promise<boolean> {
  const index = facultyStore.findIndex((f) => f.id === id);
  if (index === -1) return false;
  facultyStore.splice(index, 1);
  return true;
}

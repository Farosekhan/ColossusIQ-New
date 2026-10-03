import { cleanText } from "@/lib/security/sanitize";

export interface StudentRecord {
  id: string;
  name: string;
  roll: string;
  section: string;
  cgpa: number;
  readiness: number;
  signal: "None" | "Review suggested" | "At risk" | "High performer";
  email?: string;
  phone?: string;
  collegeId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StudentInput {
  name: string;
  roll: string;
  section: string;
  cgpa: number;
  readiness: number;
  signal?: "None" | "Review suggested" | "At risk" | "High performer";
  email?: string;
  phone?: string;
}

// Initial 12 students matching the exact institutional portal records
const INITIAL_STUDENTS: StudentRecord[] = [
  { id: "stu-1", name: "Anand Kumar", roll: "21CS1001", section: "CSE-A", cgpa: 6.44, readiness: 77, signal: "None", email: "anand.k@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-2", name: "Divya Menon", roll: "21CS1014", section: "CSE-A", cgpa: 9.13, readiness: 41, signal: "Review suggested", email: "divya.m@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-3", name: "Karthik Khan", roll: "21CS1027", section: "CSE-B", cgpa: 7.25, readiness: 44, signal: "None", email: "karthik.k@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-4", name: "Priya Raman", roll: "21CS1040", section: "AI&DS", cgpa: 7.76, readiness: 71, signal: "None", email: "priya.r@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-5", name: "Rahul Pillai", roll: "21CS1053", section: "CSE-A", cgpa: 6.81, readiness: 65, signal: "Review suggested", email: "rahul.p@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-6", name: "Sneha Srinivasan", roll: "21CS1066", section: "CSE-B", cgpa: 8.82, readiness: 38, signal: "Review suggested", email: "sneha.s@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-7", name: "Vignesh Iyer", roll: "21CS1079", section: "AI&DS", cgpa: 9.14, readiness: 52, signal: "None", email: "vignesh.i@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-8", name: "Aishwarya Krishnan", roll: "21CS1092", section: "CSE-B", cgpa: 8.66, readiness: 91, signal: "None", email: "aishwarya.k@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-9", name: "Arjun Varma", roll: "21CS1105", section: "CSE-B", cgpa: 6.66, readiness: 57, signal: "Review suggested", email: "arjun.v@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-10", name: "Meera Nair", roll: "21CS1118", section: "CSE-B", cgpa: 9.29, readiness: 85, signal: "None", email: "meera.n@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-11", name: "Harish Patel", roll: "21CS1131", section: "CSE-A", cgpa: 9.38, readiness: 42, signal: "Review suggested", email: "harish.p@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
  { id: "stu-12", name: "Kavya Gupta", roll: "21CS1144", section: "CSE-B", cgpa: 8.93, readiness: 53, signal: "None", email: "kavya.g@campus.edu", createdAt: "2026-08-01T09:00:00Z", updatedAt: "2026-08-01T09:00:00Z" },
];

let studentsStore: StudentRecord[] = [...INITIAL_STUDENTS];

let nextStudentSeq = 13;

export async function getStudentsList(opts?: {
  collegeId?: string | null;
  q?: string;
  section?: string;
  signal?: string;
}): Promise<StudentRecord[]> {
  let list = [...studentsStore];
  if (opts?.collegeId && opts.collegeId !== "all") {
    list = list.filter((s) => !s.collegeId || s.collegeId === opts.collegeId);
  }
  if (opts?.section && opts.section !== "all") {
    list = list.filter((s) => s.section.toLowerCase() === opts.section!.toLowerCase());
  }
  if (opts?.signal && opts.signal !== "all") {
    list = list.filter((s) => s.signal.toLowerCase() === opts.signal!.toLowerCase());
  }
  if (opts?.q) {
    const needle = opts.q.trim().toLowerCase();
    list = list.filter(
      (s) =>
        s.name.toLowerCase().includes(needle) ||
        s.roll.toLowerCase().includes(needle) ||
        s.section.toLowerCase().includes(needle)
    );
  }
  return list;
}

export async function getStudentById(id: string): Promise<StudentRecord | null> {
  const found = studentsStore.find((s) => s.id === id);
  return found ? { ...found } : null;
}

export async function createStudent(
  input: StudentInput,
  collegeId?: string | null
): Promise<StudentRecord> {
  const now = new Date().toISOString();
  const id = `stu-${Date.now()}-${nextStudentSeq++}`;
  const newStudent: StudentRecord = {
    id,
    name: cleanText(input.name, 100).trim(),
    roll: cleanText(input.roll, 30).trim().toUpperCase(),
    section: cleanText(input.section || "CSE-A", 30).trim().toUpperCase(),
    cgpa: Math.round(Number(input.cgpa || 0) * 100) / 100,
    readiness: Math.min(100, Math.max(0, Math.round(Number(input.readiness || 0)))),
    signal: input.signal || "None",
    email: input.email ? cleanText(input.email, 120).trim() : undefined,
    phone: input.phone ? cleanText(input.phone, 20).trim() : undefined,
    collegeId: collegeId || null,
    createdAt: now,
    updatedAt: now,
  };

  studentsStore.unshift(newStudent);
  return { ...newStudent };
}

export async function importStudents(
  items: StudentInput[],
  collegeId?: string | null
): Promise<{ imported: number; students: StudentRecord[] }> {
  const created: StudentRecord[] = [];
  const now = new Date().toISOString();

  for (const item of items) {
    if (!item.name || !item.roll) continue;
    const id = `stu-${Date.now()}-${nextStudentSeq++}`;
    const student: StudentRecord = {
      id,
      name: cleanText(item.name, 100).trim(),
      roll: cleanText(item.roll, 30).trim().toUpperCase(),
      section: cleanText(item.section || "CSE-A", 30).trim().toUpperCase(),
      cgpa: Math.round(Number(item.cgpa || 7.0) * 100) / 100,
      readiness: Math.min(100, Math.max(0, Math.round(Number(item.readiness || 50)))),
      signal: item.signal || (item.cgpa && item.cgpa < 7.0 ? "Review suggested" : "None"),
      email: item.email ? cleanText(item.email, 120).trim() : undefined,
      phone: item.phone ? cleanText(item.phone, 20).trim() : undefined,
      collegeId: collegeId || null,
      createdAt: now,
      updatedAt: now,
    };
    created.push(student);
  }

  // Prepend new imported students
  studentsStore = [...created, ...studentsStore];
  return { imported: created.length, students: created };
}

export async function updateStudent(
  id: string,
  data: Partial<StudentInput>
): Promise<StudentRecord | null> {
  const index = studentsStore.findIndex((s) => s.id === id);
  if (index === -1) return null;

  const current = studentsStore[index]!;
  const updated: StudentRecord = {
    ...current,
    name: data.name !== undefined ? cleanText(data.name, 100).trim() : current.name,
    roll: data.roll !== undefined ? cleanText(data.roll, 30).trim().toUpperCase() : current.roll,
    section: data.section !== undefined ? cleanText(data.section, 30).trim().toUpperCase() : current.section,
    cgpa: data.cgpa !== undefined ? Math.round(Number(data.cgpa) * 100) / 100 : current.cgpa,
    readiness: data.readiness !== undefined ? Math.min(100, Math.max(0, Math.round(Number(data.readiness)))) : current.readiness,
    signal: data.signal !== undefined ? data.signal : current.signal,
    email: data.email !== undefined ? cleanText(data.email, 120).trim() : current.email,
    phone: data.phone !== undefined ? cleanText(data.phone, 20).trim() : current.phone,
    updatedAt: new Date().toISOString(),
  };

  studentsStore[index] = updated;
  return { ...updated };
}

export async function deleteStudent(id: string): Promise<boolean> {
  const index = studentsStore.findIndex((s) => s.id === id);
  if (index === -1) return false;
  studentsStore.splice(index, 1);
  return true;
}

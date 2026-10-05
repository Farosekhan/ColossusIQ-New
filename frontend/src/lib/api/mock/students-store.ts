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

// Student store starts empty and is populated through user actions (forms, Excel import)
let studentsStore: StudentRecord[] = [];

let nextStudentSeq = 1;

export function resetStudentsStore(initial: StudentRecord[] = []) {
  studentsStore = [...initial];
  nextStudentSeq = initial.length + 1;
}

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

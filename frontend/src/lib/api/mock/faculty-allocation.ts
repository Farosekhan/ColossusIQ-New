import "server-only";
import type { Stream } from "@/config/streams";
import type { SessionPayload } from "@/lib/auth/session";
import { collegeStream } from "./records";

export interface AllocatedClassSection {
  id: string;
  courseCode: string;
  courseTitle: string;
  shortName: string;
  section: string;
  studentsCount: number;
  attendancePercent: number;
  averageScore: number;
  nextClass: string;
  room: string;
  hoursPerWeek: number;
  units: Array<{
    id: string;
    unit: string;
    title: string;
    classMastery: number;
  }>;
}

export interface FacultyAllocationProfile {
  facultyId: string;
  name: string;
  designation: string;
  department: string;
  departmentCode: string;
  stream: Stream;
  totalTeachingLoad: number;
  totalStudents: number;
  averageAttendance: number;
  assignedSections: AllocatedClassSection[];
}

const STREAM_FACULTY_ALLOCATIONS: Record<
  Stream,
  {
    facultyName: string;
    designation: string;
    department: string;
    departmentCode: string;
    sections: AllocatedClassSection[];
  }
> = {
  engineering: {
    facultyName: "Dr. Meena Raghavan",
    designation: "Associate Professor",
    department: "Computer Science & Engineering",
    departmentCode: "CSE",
    sections: [
      {
        id: "sec-cse-a-dbms",
        courseCode: "CS3492",
        courseTitle: "Database Management Systems",
        shortName: "DBMS",
        section: "CSE-A · Sem 5",
        studentsCount: 64,
        attendancePercent: 88,
        averageScore: 68,
        nextClass: "Today 09:00",
        room: "LH-204",
        hoursPerWeek: 4,
        units: [
          { id: "cs3492-u1", unit: "Unit 1", title: "ER Model & Relational Algebra", classMastery: 78 },
          { id: "cs3492-u2", unit: "Unit 2", title: "SQL Queries & Joins", classMastery: 82 },
          { id: "cs3492-u3", unit: "Unit 3", title: "Normalization & Functional Dependencies", classMastery: 46 },
          { id: "cs3492-u4", unit: "Unit 4", title: "Transaction Processing & ACID", classMastery: 58 },
          { id: "cs3492-u5", unit: "Unit 5", title: "NoSQL & Distributed Databases", classMastery: 36 },
        ],
      },
      {
        id: "sec-cse-b-dbms",
        courseCode: "CS3492",
        courseTitle: "Database Management Systems",
        shortName: "DBMS",
        section: "CSE-B · Sem 5",
        studentsCount: 62,
        attendancePercent: 84,
        averageScore: 64,
        nextClass: "Today 14:00",
        room: "LH-206",
        hoursPerWeek: 4,
        units: [
          { id: "cs3492-u1", unit: "Unit 1", title: "ER Model & Relational Algebra", classMastery: 74 },
          { id: "cs3492-u2", unit: "Unit 2", title: "SQL Queries & Joins", classMastery: 78 },
          { id: "cs3492-u3", unit: "Unit 3", title: "Normalization & Functional Dependencies", classMastery: 42 },
          { id: "cs3492-u4", unit: "Unit 4", title: "Transaction Processing & ACID", classMastery: 54 },
          { id: "cs3492-u5", unit: "Unit 5", title: "NoSQL & Distributed Databases", classMastery: 32 },
        ],
      },
      {
        id: "sec-aids-dbms-lab",
        courseCode: "CS3492L",
        courseTitle: "DBMS Laboratory & SQL Studio",
        shortName: "DBMS Lab",
        section: "AI&DS · Sem 5",
        studentsCount: 58,
        attendancePercent: 91,
        averageScore: 74,
        nextClass: "Tomorrow 10:00",
        room: "Computing Lab 3",
        hoursPerWeek: 3,
        units: [
          { id: "cs3492l-u1", unit: "Unit 1", title: "DDL & DML Implementation", classMastery: 88 },
          { id: "cs3492l-u2", unit: "Unit 2", title: "Nested Queries & Views", classMastery: 80 },
          { id: "cs3492l-u3", unit: "Unit 3", title: "PL/SQL Procedures & Triggers", classMastery: 62 },
        ],
      },
      {
        id: "sec-cse-a-adv-db",
        courseCode: "CS3551",
        courseTitle: "Advanced Database Architectures",
        shortName: "Adv. Databases",
        section: "CSE-A · Sem 7",
        studentsCount: 60,
        attendancePercent: 79,
        averageScore: 71,
        nextClass: "Thu 11:00",
        room: "LH-301",
        hoursPerWeek: 3,
        units: [
          { id: "cs3551-u1", unit: "Unit 1", title: "Distributed Query Processing", classMastery: 76 },
          { id: "cs3551-u2", unit: "Unit 2", title: "Columnar & Graph Databases", classMastery: 70 },
          { id: "cs3551-u3", unit: "Unit 3", title: "CAP Theorem & Partitioning", classMastery: 65 },
        ],
      },
    ],
  },
  medical: {
    facultyName: "Dr. K. Vasanth, MD",
    designation: "Professor & HOD",
    department: "Pathology",
    departmentCode: "MED",
    sections: [
      {
        id: "sec-mbbs-p2-a-path",
        courseCode: "PA201",
        courseTitle: "General & Systemic Pathology",
        shortName: "Pathology",
        section: "MBBS Phase II · Batch A",
        studentsCount: 75,
        attendancePercent: 92,
        averageScore: 72,
        nextClass: "Today 08:30",
        room: "Pathology Lecture Hall",
        hoursPerWeek: 5,
        units: [
          { id: "pa201-u1", unit: "Unit 1", title: "Cell Injury & Adaptation", classMastery: 82 },
          { id: "pa201-u2", unit: "Unit 2", title: "Inflammation & Healing", classMastery: 76 },
          { id: "pa201-u3", unit: "Unit 3", title: "Neoplasia (PA 7.1–7.5)", classMastery: 48 },
          { id: "pa201-u4", unit: "Unit 4", title: "Cardiovascular Pathology", classMastery: 62 },
        ],
      },
      {
        id: "sec-mbbs-p2-b-path",
        courseCode: "PA201",
        courseTitle: "General & Systemic Pathology",
        shortName: "Pathology",
        section: "MBBS Phase II · Batch B",
        studentsCount: 75,
        attendancePercent: 89,
        averageScore: 70,
        nextClass: "Today 11:00",
        room: "Pathology Lecture Hall",
        hoursPerWeek: 5,
        units: [
          { id: "pa201-u1", unit: "Unit 1", title: "Cell Injury & Adaptation", classMastery: 78 },
          { id: "pa201-u2", unit: "Unit 2", title: "Inflammation & Healing", classMastery: 72 },
          { id: "pa201-u3", unit: "Unit 3", title: "Neoplasia (PA 7.1–7.5)", classMastery: 44 },
          { id: "pa201-u4", unit: "Unit 4", title: "Cardiovascular Pathology", classMastery: 58 },
        ],
      },
      {
        id: "sec-mbbs-path-histo-lab",
        courseCode: "PA201L",
        courseTitle: "Histopathology & Haematology Practical",
        shortName: "Histo Lab",
        section: "Skills Lab · Unit 1",
        studentsCount: 40,
        attendancePercent: 95,
        averageScore: 78,
        nextClass: "Tomorrow 14:00",
        room: "Central Skills Lab",
        hoursPerWeek: 4,
        units: [
          { id: "pa201l-u1", unit: "Unit 1", title: "Slide Examination & Gram Stain", classMastery: 86 },
          { id: "pa201l-u2", unit: "Unit 2", title: "Peripheral Blood Smear", classMastery: 75 },
        ],
      },
    ],
  },
  artsScience: {
    facultyName: "Dr. V. Murugan",
    designation: "Associate Professor",
    department: "Commerce & Accountancy",
    departmentCode: "COM",
    sections: [
      {
        id: "sec-bcom-a-fa",
        courseCode: "UCO301",
        courseTitle: "Financial Accounting",
        shortName: "Financial Accounts",
        section: "B.Com-A · Sem 5",
        studentsCount: 60,
        attendancePercent: 91,
        averageScore: 74,
        nextClass: "Today 09:30",
        room: "Commerce Hall 1",
        hoursPerWeek: 5,
        units: [
          { id: "uco301-u1", unit: "Unit 1", title: "Final Accounts Preparation", classMastery: 84 },
          { id: "uco301-u2", unit: "Unit 2", title: "Depreciation (WDV & SLM)", classMastery: 48 },
          { id: "uco301-u3", unit: "Unit 3", title: "Branch & Departmental Accounts", classMastery: 65 },
        ],
      },
      {
        id: "sec-bcom-b-fa",
        courseCode: "UCO301",
        courseTitle: "Financial Accounting",
        shortName: "Financial Accounts",
        section: "B.Com-B · Sem 5",
        studentsCount: 58,
        attendancePercent: 87,
        averageScore: 69,
        nextClass: "Today 11:30",
        room: "Commerce Hall 2",
        hoursPerWeek: 5,
        units: [
          { id: "uco301-u1", unit: "Unit 1", title: "Final Accounts Preparation", classMastery: 80 },
          { id: "uco301-u2", unit: "Unit 2", title: "Depreciation (WDV & SLM)", classMastery: 42 },
          { id: "uco301-u3", unit: "Unit 3", title: "Branch & Departmental Accounts", classMastery: 60 },
        ],
      },
      {
        id: "sec-bcom-a-ca",
        courseCode: "UCO303",
        courseTitle: "Corporate Accounting & Auditing",
        shortName: "Corporate Accounts",
        section: "B.Com-A · Sem 3",
        studentsCount: 62,
        attendancePercent: 89,
        averageScore: 71,
        nextClass: "Tomorrow 10:00",
        room: "Commerce Hall 1",
        hoursPerWeek: 4,
        units: [
          { id: "uco303-u1", unit: "Unit 1", title: "Issue of Shares & Debentures", classMastery: 78 },
          { id: "uco303-u2", unit: "Unit 2", title: "Redemption of Preference Shares", classMastery: 70 },
        ],
      },
    ],
  },
  management: {
    facultyName: "Prof. Rajesh Kumar",
    designation: "Assistant Professor",
    department: "Management Studies",
    departmentCode: "BBA",
    sections: [
      {
        id: "sec-bba-a-mkt",
        courseCode: "BA301",
        courseTitle: "Marketing Management",
        shortName: "Marketing",
        section: "BBA-A · Sem 5",
        studentsCount: 55,
        attendancePercent: 88,
        averageScore: 76,
        nextClass: "Today 10:00",
        room: "Management Hall 101",
        hoursPerWeek: 4,
        units: [
          { id: "ba301-u1", unit: "Unit 1", title: "STP & Market Segmentation", classMastery: 82 },
          { id: "ba301-u2", unit: "Unit 2", title: "Product Life Cycle & Pricing", classMastery: 75 },
        ],
      },
      {
        id: "sec-bba-b-mkt",
        courseCode: "BA301",
        courseTitle: "Marketing Management",
        shortName: "Marketing",
        section: "BBA-B · Sem 5",
        studentsCount: 52,
        attendancePercent: 85,
        averageScore: 72,
        nextClass: "Today 14:00",
        room: "Management Hall 102",
        hoursPerWeek: 4,
        units: [
          { id: "ba301-u1", unit: "Unit 1", title: "STP & Market Segmentation", classMastery: 78 },
          { id: "ba301-u2", unit: "Unit 2", title: "Product Life Cycle & Pricing", classMastery: 70 },
        ],
      },
    ],
  },
  polytechnic: {
    facultyName: "Prof. T. Selvam",
    designation: "Lecturer",
    department: "Computer Engineering",
    departmentCode: "DCE",
    sections: [
      {
        id: "sec-dce-a-arch",
        courseCode: "CE301",
        courseTitle: "Computer Architecture & Maintenance",
        shortName: "Architecture",
        section: "DCE-A · Sem 5",
        studentsCount: 50,
        attendancePercent: 89,
        averageScore: 72,
        nextClass: "Today 09:00",
        room: "Polytechnic Lab 1",
        hoursPerWeek: 4,
        units: [
          { id: "ce301-u1", unit: "Unit 1", title: "Processor Architecture & Buses", classMastery: 78 },
          { id: "ce301-u2", unit: "Unit 2", title: "Memory & Storage Troubleshooting", classMastery: 66 },
        ],
      },
      {
        id: "sec-dce-a-web-lab",
        courseCode: "CE302",
        courseTitle: "Web Development & PHP Laboratory",
        shortName: "Web Lab",
        section: "DCE-A · Sem 5",
        studentsCount: 48,
        attendancePercent: 92,
        averageScore: 78,
        nextClass: "Today 13:30",
        room: "Software Lab 2",
        hoursPerWeek: 4,
        units: [
          { id: "ce302-u1", unit: "Unit 1", title: "HTML5 & CSS Grid Layouts", classMastery: 88 },
          { id: "ce302-u2", unit: "Unit 2", title: "PHP MySQL Database Integration", classMastery: 72 },
        ],
      },
    ],
  },
};

export async function getFacultyAllocationProfile(
  session: SessionPayload | { sub: string; name?: string; college: string }
): Promise<FacultyAllocationProfile> {
  const stream = (await collegeStream(session.college)) || "engineering";
  const alloc = STREAM_FACULTY_ALLOCATIONS[stream] || STREAM_FACULTY_ALLOCATIONS.engineering;

  const totalTeachingLoad = alloc.sections.reduce((sum, s) => sum + s.hoursPerWeek, 0);
  const totalStudents = alloc.sections.reduce((sum, s) => sum + s.studentsCount, 0);
  const averageAttendance = Math.round(
    alloc.sections.reduce((sum, s) => sum + s.attendancePercent, 0) / (alloc.sections.length || 1)
  );

  return {
    facultyId: session.sub,
    name: session.name || alloc.facultyName,
    designation: alloc.designation,
    department: alloc.department,
    departmentCode: alloc.departmentCode,
    stream,
    totalTeachingLoad,
    totalStudents,
    averageAttendance,
    assignedSections: alloc.sections,
  };
}

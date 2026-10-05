import "server-only";
import type { Stream } from "@/config/streams";
import type { SessionPayload } from "@/lib/auth/session";
import type { ScorecardData, DashboardData } from "@/lib/api/schemas";
import { collegeStream } from "./records";

export interface EnrolledSubject {
  code: string;
  title: string;
  shortName: string;
  credits: number;
  facultyName: string;
  facultyDesignation?: string;
  semester: number;
  attendancePercent: number;
  ia1Marks: number;
  ia2Marks: number;
  semesterProgress: number;
  units: Array<{
    id: string;
    unit: string;
    title: string;
    mastery: number;
  }>;
}

export interface StudentAcademicProfile {
  studentId: string;
  name: string;
  rollNo: string;
  degree: string;
  department: string;
  departmentCode: string;
  semester: number;
  section: string;
  stream: Stream;
  cgpa: number;
  creditsEarned: number;
  totalCredits: number;
  streakDays: number;
  xp: number;
  enrolledSubjects: EnrolledSubject[];
}

const STREAM_CURRICULUM: Record<
  Stream,
  {
    degree: string;
    department: string;
    departmentCode: string;
    semester: number;
    subjects: EnrolledSubject[];
  }
> = {
  engineering: {
    degree: "B.E. Computer Science & Engineering",
    department: "Computer Science & Engineering",
    departmentCode: "CSE",
    semester: 5,
    subjects: [
      {
        code: "CS3492",
        title: "Database Management Systems",
        shortName: "DBMS",
        credits: 4,
        facultyName: "Dr. Meena Raghavan",
        facultyDesignation: "Associate Professor, CSE",
        semester: 5,
        attendancePercent: 88,
        ia1Marks: 72,
        ia2Marks: 61,
        semesterProgress: 68,
        units: [
          { id: "cs3492-u1", unit: "Unit 1", title: "ER Model & Relational Algebra", mastery: 78 },
          { id: "cs3492-u2", unit: "Unit 2", title: "SQL Queries & Joins", mastery: 82 },
          { id: "cs3492-u3", unit: "Unit 3", title: "Normalization & Functional Dependencies", mastery: 42 },
          { id: "cs3492-u4", unit: "Unit 4", title: "Transaction Processing & ACID", mastery: 55 },
          { id: "cs3492-u5", unit: "Unit 5", title: "NoSQL & Distributed DB", mastery: 30 },
        ],
      },
      {
        code: "CS3451",
        title: "Operating Systems",
        shortName: "OS",
        credits: 4,
        facultyName: "Prof. R. Balaji",
        facultyDesignation: "Assistant Professor, CSE",
        semester: 5,
        attendancePercent: 84,
        ia1Marks: 75,
        ia2Marks: 70,
        semesterProgress: 64,
        units: [
          { id: "cs3451-u1", unit: "Unit 1", title: "Processes & System Calls", mastery: 80 },
          { id: "cs3451-u2", unit: "Unit 2", title: "CPU Scheduling Algorithms", mastery: 74 },
          { id: "cs3451-u3", unit: "Unit 3", title: "Deadlocks & Synchronization", mastery: 65 },
          { id: "cs3451-u4", unit: "Unit 4", title: "Virtual Memory Management", mastery: 58 },
          { id: "cs3451-u5", unit: "Unit 5", title: "File Systems & Storage", mastery: 40 },
        ],
      },
      {
        code: "CS3591",
        title: "Computer Networks",
        shortName: "CN",
        credits: 3,
        facultyName: "Dr. K. Anitha",
        facultyDesignation: "Associate Professor, CSE",
        semester: 5,
        attendancePercent: 90,
        ia1Marks: 68,
        ia2Marks: 74,
        semesterProgress: 72,
        units: [
          { id: "cs3591-u1", unit: "Unit 1", title: "Network Architecture & OSI", mastery: 85 },
          { id: "cs3591-u2", unit: "Unit 2", title: "Data Link Layer & Framing", mastery: 76 },
          { id: "cs3591-u3", unit: "Unit 3", title: "Network Layer & Subnetting", mastery: 62 },
          { id: "cs3591-u4", unit: "Unit 4", title: "Transport Layer Protocols (TCP/UDP)", mastery: 70 },
          { id: "cs3591-u5", unit: "Unit 5", title: "Application Protocols & Security", mastery: 45 },
        ],
      },
      {
        code: "AL3451",
        title: "Machine Learning",
        shortName: "ML",
        credits: 4,
        facultyName: "Dr. V. Srinivasan",
        facultyDesignation: "Professor, AI & DS",
        semester: 5,
        attendancePercent: 91,
        ia1Marks: 78,
        ia2Marks: 80,
        semesterProgress: 70,
        units: [
          { id: "al3451-u1", unit: "Unit 1", title: "Linear & Logistic Regression", mastery: 88 },
          { id: "al3451-u2", unit: "Unit 2", title: "Decision Trees & Random Forests", mastery: 82 },
          { id: "al3451-u3", unit: "Unit 3", title: "Neural Networks Fundamentals", mastery: 60 },
          { id: "al3451-u4", unit: "Unit 4", title: "Unsupervised Clustering & PCA", mastery: 52 },
          { id: "al3451-u5", unit: "Unit 5", title: "Model Evaluation & Bias-Variance", mastery: 48 },
        ],
      },
      {
        code: "CS3401",
        title: "Algorithms & Complexity",
        shortName: "Algorithms",
        credits: 3,
        facultyName: "Dr. P. Kannan",
        facultyDesignation: "Assistant Professor, CSE",
        semester: 5,
        attendancePercent: 82,
        ia1Marks: 65,
        ia2Marks: 69,
        semesterProgress: 60,
        units: [
          { id: "cs3401-u1", unit: "Unit 1", title: "Asymptotic Analysis & Recurrences", mastery: 75 },
          { id: "cs3401-u2", unit: "Unit 2", title: "Divide and Conquer", mastery: 70 },
          { id: "cs3401-u3", unit: "Unit 3", title: "Dynamic Programming", mastery: 50 },
          { id: "cs3401-u4", unit: "Unit 4", title: "Greedy Algorithms & Graphs", mastery: 64 },
          { id: "cs3401-u5", unit: "Unit 5", title: "NP-Completeness", mastery: 35 },
        ],
      },
      {
        code: "GE3151",
        title: "Problem Solving with Python",
        shortName: "Python",
        credits: 3,
        facultyName: "Prof. S. Mohan",
        facultyDesignation: "Assistant Professor, CSE",
        semester: 5,
        attendancePercent: 94,
        ia1Marks: 84,
        ia2Marks: 86,
        semesterProgress: 85,
        units: [
          { id: "ge3151-u1", unit: "Unit 1", title: "Data Structures & Control Flow", mastery: 92 },
          { id: "ge3151-u2", unit: "Unit 2", title: "Functions & Recursion", mastery: 88 },
          { id: "ge3151-u3", unit: "Unit 3", title: "OOP & Exception Handling", mastery: 84 },
          { id: "ge3151-u4", unit: "Unit 4", title: "NumPy & Pandas Analytics", mastery: 76 },
          { id: "ge3151-u5", unit: "Unit 5", title: "Automation Scripts", mastery: 80 },
        ],
      },
    ],
  },
  medical: {
    degree: "MBBS (Phase II)",
    department: "Pathology & Pharmacology",
    departmentCode: "MED",
    semester: 4,
    subjects: [
      {
        code: "PA201",
        title: "Pathology",
        shortName: "Pathology",
        credits: 8,
        facultyName: "Dr. K. Vasanth, MD",
        facultyDesignation: "Professor & HOD, Pathology",
        semester: 4,
        attendancePercent: 92,
        ia1Marks: 66,
        ia2Marks: 60,
        semesterProgress: 58,
        units: [
          { id: "pa201-u1", unit: "Unit 1", title: "Cell Injury & Adaptation", mastery: 80 },
          { id: "pa201-u2", unit: "Unit 2", title: "Inflammation & Healing", mastery: 75 },
          { id: "pa201-u3", unit: "Unit 3", title: "Neoplasia", mastery: 44 },
          { id: "pa201-u4", unit: "Unit 4", title: "Cardiovascular Pathology", mastery: 58 },
          { id: "pa201-u5", unit: "Unit 5", title: "Haematology & Anaemias", mastery: 62 },
        ],
      },
      {
        code: "PH201",
        title: "Pharmacology",
        shortName: "Pharmacology",
        credits: 8,
        facultyName: "Dr. G. Latha, MD",
        facultyDesignation: "Associate Professor, Pharmacology",
        semester: 4,
        attendancePercent: 89,
        ia1Marks: 70,
        ia2Marks: 68,
        semesterProgress: 50,
        units: [
          { id: "ph201-u1", unit: "Unit 1", title: "Pharmacokinetics & Dynamics", mastery: 78 },
          { id: "ph201-u2", unit: "Unit 2", title: "Autonomic Nervous System Drugs", mastery: 51 },
          { id: "ph201-u3", unit: "Unit 3", title: "Cardiovascular Drugs", mastery: 65 },
          { id: "ph201-u4", unit: "Unit 4", title: "Antimicrobials & Chemotherapy", mastery: 55 },
        ],
      },
      {
        code: "MI201",
        title: "Microbiology",
        shortName: "Microbiology",
        credits: 6,
        facultyName: "Dr. S. Anjali, MD",
        facultyDesignation: "Professor, Microbiology",
        semester: 4,
        attendancePercent: 94,
        ia1Marks: 72,
        ia2Marks: 74,
        semesterProgress: 62,
        units: [
          { id: "mi201-u1", unit: "Unit 1", title: "General Bacteriology & Sterilisation", mastery: 82 },
          { id: "mi201-u2", unit: "Unit 2", title: "Immunology Basics", mastery: 57 },
          { id: "mi201-u3", unit: "Unit 3", title: "Systemic Bacteriology", mastery: 64 },
          { id: "mi201-u4", unit: "Unit 4", title: "Virology (HIV, Hepatitis)", mastery: 70 },
        ],
      },
      {
        code: "FM201",
        title: "Forensic Medicine",
        shortName: "Forensic Med",
        credits: 4,
        facultyName: "Dr. R. Surya, MD",
        facultyDesignation: "Associate Professor, Forensic Med",
        semester: 4,
        attendancePercent: 88,
        ia1Marks: 68,
        ia2Marks: 71,
        semesterProgress: 40,
        units: [
          { id: "fm201-u1", unit: "Unit 1", title: "Thanatology & Post-mortem Changes", mastery: 74 },
          { id: "fm201-u2", unit: "Unit 2", title: "Clinical Toxicology", mastery: 68 },
          { id: "fm201-u3", unit: "Unit 3", title: "Medical Jurisprudence & Ethics", mastery: 80 },
        ],
      },
    ],
  },
  artsScience: {
    degree: "B.Com (General)",
    department: "Commerce & Accountancy",
    departmentCode: "COM",
    semester: 5,
    subjects: [
      {
        code: "UCO301",
        title: "Financial Accounting",
        shortName: "Financial Accounts",
        credits: 5,
        facultyName: "Dr. V. Murugan",
        facultyDesignation: "Associate Professor, Commerce",
        semester: 5,
        attendancePercent: 91,
        ia1Marks: 76,
        ia2Marks: 65,
        semesterProgress: 64,
        units: [
          { id: "uco301-u1", unit: "Unit 1", title: "Final Accounts Preparation", mastery: 84 },
          { id: "uco301-u2", unit: "Unit 2", title: "Depreciation (WDV & SLM)", mastery: 45 },
          { id: "uco301-u3", unit: "Unit 3", title: "Branch & Departmental Accounts", mastery: 62 },
          { id: "uco301-u4", unit: "Unit 4", title: "Hire Purchase & Instalment Systems", mastery: 58 },
          { id: "uco301-u5", unit: "Unit 5", title: "Partnership Admission & Retirement", mastery: 70 },
        ],
      },
      {
        code: "UCO302",
        title: "Business Statistics",
        shortName: "Statistics",
        credits: 4,
        facultyName: "Dr. K. Priya",
        facultyDesignation: "Assistant Professor, Commerce",
        semester: 5,
        attendancePercent: 86,
        ia1Marks: 70,
        ia2Marks: 68,
        semesterProgress: 55,
        units: [
          { id: "uco302-u1", unit: "Unit 1", title: "Measures of Central Tendency", mastery: 80 },
          { id: "uco302-u2", unit: "Unit 2", title: "Dispersion & Skewness", mastery: 68 },
          { id: "uco302-u3", unit: "Unit 3", title: "Correlation & Regression", mastery: 52 },
          { id: "uco302-u4", unit: "Unit 4", title: "Index Numbers & Time Series", mastery: 60 },
        ],
      },
      {
        code: "UEN301",
        title: "English for Professionals",
        shortName: "English",
        credits: 3,
        facultyName: "Dr. Anne Joseph",
        facultyDesignation: "Assistant Professor, English",
        semester: 5,
        attendancePercent: 95,
        ia1Marks: 82,
        ia2Marks: 80,
        semesterProgress: 70,
        units: [
          { id: "uen301-u1", unit: "Unit 1", title: "Business Correspondence & Emails", mastery: 86 },
          { id: "uen301-u2", unit: "Unit 2", title: "Report Writing & Proposals", mastery: 60 },
          { id: "uen301-u3", unit: "Unit 3", title: "Workplace Presentation Skills", mastery: 78 },
        ],
      },
      {
        code: "UTA301",
        title: "Tamil Ilakkiyam III",
        shortName: "Tamil",
        credits: 3,
        facultyName: "Dr. P. Senthamizh",
        facultyDesignation: "Associate Professor, Tamil",
        semester: 5,
        attendancePercent: 92,
        ia1Marks: 85,
        ia2Marks: 88,
        semesterProgress: 72,
        units: [
          { id: "uta301-u1", unit: "Unit 1", title: "Kurunthogai & Sangam Poetry", mastery: 88 },
          { id: "uta301-u2", unit: "Unit 2", title: "Bhakti Literature (Thevaram)", mastery: 82 },
          { id: "uta301-u3", unit: "Unit 3", title: "Bharathiyar & Modern Poetry", mastery: 90 },
        ],
      },
    ],
  },
  management: {
    degree: "BBA (Management Studies)",
    department: "Management Studies",
    departmentCode: "BBA",
    semester: 5,
    subjects: [
      {
        code: "BA301",
        title: "Marketing Management",
        shortName: "Marketing",
        credits: 4,
        facultyName: "Prof. Rajesh Kumar",
        facultyDesignation: "Assistant Professor, Management",
        semester: 5,
        attendancePercent: 88,
        ia1Marks: 78,
        ia2Marks: 74,
        semesterProgress: 65,
        units: [
          { id: "ba301-u1", unit: "Unit 1", title: "Segmentation, Targeting & Positioning (STP)", mastery: 82 },
          { id: "ba301-u2", unit: "Unit 2", title: "Product Life Cycle & Pricing Strategies", mastery: 75 },
          { id: "ba301-u3", unit: "Unit 3", title: "Digital Marketing & Consumer Behaviour", mastery: 68 },
        ],
      },
      {
        code: "BA302",
        title: "Financial Management",
        shortName: "Finance",
        credits: 4,
        facultyName: "Dr. Deepa Nair",
        facultyDesignation: "Associate Professor, Management",
        semester: 5,
        attendancePercent: 86,
        ia1Marks: 72,
        ia2Marks: 69,
        semesterProgress: 60,
        units: [
          { id: "ba302-u1", unit: "Unit 1", title: "Time Value of Money & Capital Budgeting", mastery: 65 },
          { id: "ba302-u2", unit: "Unit 2", title: "Working Capital Management", mastery: 72 },
          { id: "ba302-u3", unit: "Unit 3", title: "Cost of Capital & Capital Structure", mastery: 58 },
        ],
      },
      {
        code: "BA303",
        title: "Operations Management",
        shortName: "Operations",
        credits: 4,
        facultyName: "Prof. S. Anand",
        facultyDesignation: "Assistant Professor, Management",
        semester: 5,
        attendancePercent: 90,
        ia1Marks: 74,
        ia2Marks: 77,
        semesterProgress: 70,
        units: [
          { id: "ba303-u1", unit: "Unit 1", title: "Facility Layout & Location Planning", mastery: 80 },
          { id: "ba303-u2", unit: "Unit 2", title: "Inventory Control Models (EOQ, ABC)", mastery: 76 },
          { id: "ba303-u3", unit: "Unit 3", title: "Quality Management & Six Sigma", mastery: 64 },
        ],
      },
      {
        code: "BA304",
        title: "Business Analytics",
        shortName: "Analytics",
        credits: 3,
        facultyName: "Dr. M. Suresh",
        facultyDesignation: "Assistant Professor, Analytics",
        semester: 5,
        attendancePercent: 92,
        ia1Marks: 80,
        ia2Marks: 82,
        semesterProgress: 68,
        units: [
          { id: "ba304-u1", unit: "Unit 1", title: "Descriptive & Predictive Analytics", mastery: 84 },
          { id: "ba304-u2", unit: "Unit 2", title: "Data Visualisation with PowerBI & Tableau", mastery: 78 },
          { id: "ba304-u3", unit: "Unit 3", title: "Decision Trees & Optimization Models", mastery: 62 },
        ],
      },
    ],
  },
  polytechnic: {
    degree: "Diploma in Computer Engineering",
    department: "Computer Engineering",
    departmentCode: "DCE",
    semester: 5,
    subjects: [
      {
        code: "CE301",
        title: "Computer Architecture & Hardware",
        shortName: "Architecture",
        credits: 4,
        facultyName: "Prof. T. Selvam",
        facultyDesignation: "Lecturer, Computer Engg",
        semester: 5,
        attendancePercent: 89,
        ia1Marks: 75,
        ia2Marks: 72,
        semesterProgress: 66,
        units: [
          { id: "ce301-u1", unit: "Unit 1", title: "Processor Architecture & Buses", mastery: 78 },
          { id: "ce301-u2", unit: "Unit 2", title: "Memory Hierarchy & Troubleshooting", mastery: 74 },
        ],
      },
      {
        code: "CE302",
        title: "Web Development & PHP Lab",
        shortName: "Web Dev",
        credits: 4,
        facultyName: "Ms. S. Kavitha",
        facultyDesignation: "Lecturer, Computer Engg",
        semester: 5,
        attendancePercent: 92,
        ia1Marks: 82,
        ia2Marks: 85,
        semesterProgress: 75,
        units: [
          { id: "ce302-u1", unit: "Unit 1", title: "HTML5, CSS3 & Responsive Design", mastery: 90 },
          { id: "ce302-u2", unit: "Unit 2", title: "PHP Backend & MySQL Integration", mastery: 80 },
        ],
      },
    ],
  },
};

export async function getStudentAcademicProfile(
  session: SessionPayload | { sub: string; name?: string; college: string }
): Promise<StudentAcademicProfile> {
  const stream = (await collegeStream(session.college)) || "engineering";
  const curr = STREAM_CURRICULUM[stream] || STREAM_CURRICULUM.engineering;

  const name = session.name || (stream === "medical" ? "Keerthana" : stream === "artsScience" ? "Nandhini" : "Anand Kumar");
  const rollNo = stream === "medical" ? "21MB1042" : stream === "artsScience" ? "21CO2018" : "21CS1014";

  // Calculate overall CGPA and credit totals from enrolled subjects
  const avgMarks =
    curr.subjects.reduce((sum, s) => sum + (s.ia1Marks + s.ia2Marks) / 2, 0) /
    (curr.subjects.length || 1);
  const cgpa = Math.round((avgMarks / 10 + 1.2) * 100) / 100;
  const totalCredits = curr.subjects.reduce((sum, s) => sum + s.credits, 0) + 76;
  const creditsEarned = Math.round(totalCredits * 0.6);

  return {
    studentId: session.sub,
    name,
    rollNo,
    degree: curr.degree,
    department: curr.department,
    departmentCode: curr.departmentCode,
    semester: curr.semester,
    section: `${curr.departmentCode}-A`,
    stream,
    cgpa,
    creditsEarned,
    totalCredits,
    streakDays: 12,
    xp: 4850,
    enrolledSubjects: curr.subjects,
  };
}

export async function generateDynamicStudentDashboard(
  session: SessionPayload | { sub: string; name?: string; college: string }
) {
  const profile = await getStudentAcademicProfile(session);
  const subjects = profile.enrolledSubjects;

  // 1. Calculate academic semester progress and exam readiness
  const semesterProgress = Math.round(
    subjects.reduce((sum, s) => sum + s.semesterProgress, 0) / (subjects.length || 1)
  );
  const avgIa = Math.round(
    subjects.reduce((sum, s) => sum + (s.ia1Marks + s.ia2Marks) / 2, 0) / (subjects.length || 1)
  );
  const examReadiness = Math.min(100, Math.round(avgIa * 0.95));

  // 2. Extract weak topics across all enrolled subjects
  const allUnits: Array<{ subject: string; topic: string; mastery: number }> = [];
  for (const s of subjects) {
    for (const u of s.units) {
      allUnits.push({
        subject: s.shortName,
        topic: u.title,
        mastery: u.mastery,
      });
    }
  }
  // Sort lowest mastery first
  allUnits.sort((a, b) => a.mastery - b.mastery);
  const weakTopics = allUnits.slice(0, 3);
  const weakest = weakTopics[0] || {
    subject: subjects[0]?.shortName || "Major",
    topic: "Core Concepts",
    mastery: 50,
  };

  // 3. Exam countdown based on stream
  const mainSubject = subjects[0]?.shortName || "Semester";
  const examName =
    profile.stream === "medical"
      ? "Pathology Internal Assessment II"
      : profile.stream === "artsScience"
      ? "Continuous Internal Assessment II"
      : `${mainSubject} Internal Assessment II`;

  // 4. Stream-specific projects and upcoming events
  const projectMap: Record<Stream, { name: string; progress: number }> = {
    engineering: { name: "Smart Campus AI & Autonomous Attendance", progress: 68 },
    medical: { name: "ICMR-STS: Anaemia prevalence among adolescents", progress: 55 },
    artsScience: { name: "Survey: Digital payment adoption among Tiruchy retailers", progress: 65 },
    management: { name: "Omnichannel Consumer Acquisition & Retention Model", progress: 60 },
    polytechnic: { name: "IoT Weather Monitoring & Microcontroller Board", progress: 72 },
  };

  const upcomingMap: Record<Stream, Array<{ title: string; when: string }>> = {
    engineering: [
      { title: `${mainSubject} IA-II Exam`, when: "in 9 days" },
      { title: "Smart India Hackathon Internal Round", when: "Friday, 2:00 PM" },
      { title: "Campus AI Buildathon Submission", when: "Oct 21" },
    ],
    medical: [
      { title: "OSCE mock — 8 stations", when: "Friday, 2:00 PM" },
      { title: "Pathology Internal Assessment II", when: "in 9 days" },
      { title: "Rural health camp posting", when: "Oct 21" },
    ],
    artsScience: [
      { title: "Continuous Internal Assessment II", when: "in 9 days" },
      { title: "CBCS elective choice closes", when: "Friday" },
      { title: "Tamil Mandram literary festival", when: "Oct 8" },
    ],
    management: [
      { title: "Marketing Strategy Case Presentation", when: "in 5 days" },
      { title: "Mid-Term Business Analytics Test", when: "in 9 days" },
      { title: "Industry Mentorship Connect", when: "Oct 18" },
    ],
    polytechnic: [
      { title: "Web Development Lab Practical Exam", when: "in 7 days" },
      { title: "State Polytechnic Skill Competition", when: "Oct 24" },
    ],
  };

  // 5. Today's dynamic timetable mapped to enrolled subjects
  const s1 = subjects[0] || { shortName: "Class 1", facultyName: "Faculty", units: [] };
  const s2 = subjects[1] || { shortName: "Class 2", facultyName: "Faculty", units: [] };
  const s3 = subjects[2] || { shortName: "Class 3", facultyName: "Faculty", units: [] };

  const today = [
    {
      time: "09:00",
      title: `${s1.shortName} lecture — ${s1.units[1]?.title || "Theory"} (${s1.facultyName.split(",")[0]})`,
      kind: "class",
    },
    {
      time: "11:00",
      title: `${s2.shortName} class — ${s2.units[0]?.title || "Practice"} (${s2.facultyName.split(",")[0]})`,
      kind: "class",
    },
    {
      time: "14:00",
      title: `${s3.shortName} laboratory / hands-on session`,
      kind: "study",
    },
    {
      time: "18:00",
      title: "Placement aptitude & mock interview drill",
      kind: "career",
    },
    {
      time: "21:00",
      title: `Revision: ${weakest.topic} (25 min)`,
      kind: "study",
    },
  ];

  // 6. AI Mentor recommendation
  const recommendation = `Revise **${weakest.topic} (${weakest.subject})** for 25 minutes and attempt the adaptive 10-question practice set — it is currently your lowest mastery topic (**${weakest.mastery}%**) and the **${examName}** is in 9 days.`;

  return {
    name: profile.name,
    priorities: weakTopics.length,
    academic: {
      semesterProgress,
      examReadiness,
    },
    skills: {
      technical: Math.min(95, Math.round(avgIa * 0.9 + 8)),
      communication: 68,
      interview: 64,
    },
    careerReadiness: 63,
    today,
    recommendation,
    project: projectMap[profile.stream] || projectMap.engineering,
    upcoming: upcomingMap[profile.stream] || upcomingMap.engineering,
    streak: profile.streakDays,
    xp: profile.xp,
    weakTopics,
    examCountdown: {
      exam: examName,
      days: 9,
      syllabusCovered: semesterProgress,
    },
  };
}

export async function generateDynamicSkillGraph(
  session: SessionPayload | { sub: string; name?: string; college: string }
): Promise<ScorecardData> {
  const profile = await getStudentAcademicProfile(session);
  const subjects = profile.enrolledSubjects;

  // Compute dimension scores from subjects
  const dimensions = subjects.map((s) => {
    const avgUnitMastery = Math.round(
      s.units.reduce((sum, u) => sum + u.mastery, 0) / (s.units.length || 1)
    );
    const score = Math.max(30, Math.min(98, Math.round((avgUnitMastery + s.ia1Marks + s.ia2Marks) / 3)));
    return {
      name: s.shortName,
      score,
      target: 80,
    };
  });

  const overall = Math.round(dimensions.reduce((a, d) => a + d.score, 0) / (dimensions.length || 1));

  // Determine strengths (> 70) and gaps (< 65)
  const strengths: string[] = [];
  const gaps: string[] = [];
  const plan: string[] = [];

  for (const s of subjects) {
    const lowUnits = s.units.filter((u) => u.mastery < 55);
    const highUnits = s.units.filter((u) => u.mastery >= 75);
    if (highUnits.length > 0) {
      strengths.push(`${s.shortName}: Strong fundamentals in ${highUnits[0]?.title}`);
    }
    if (lowUnits.length > 0) {
      gaps.push(`${s.shortName}: ${lowUnits[0]?.title} (${lowUnits[0]?.mastery}%)`);
      plan.push(`Complete adaptive revision quiz on ${lowUnits[0]?.title} (${s.shortName})`);
    }
  }

  if (strengths.length === 0) strengths.push(`${subjects[0]?.shortName}: Consistent practice streak (12 days)`);
  if (gaps.length === 0) gaps.push("Advance to mock interview and full-length assessment");
  if (plan.length === 0) plan.push("Take the departmental certification test");

  return {
    template: "scorecard",
    headline: `Target: ${profile.degree.replace(/^B\.E\.|MBBS|B\.Com|BBA|Diploma in /i, "").trim()} Career Benchmark`,
    overall,
    dimensions,
    strengths: strengths.slice(0, 3),
    gaps: gaps.slice(0, 3),
    plan: plan.slice(0, 3),
  };
}

export async function generateDynamicExamPrep(
  collegeScope: string
): Promise<DashboardData> {
  const profile = await getStudentAcademicProfile({ college: collegeScope, sub: "demo-student" });
  const subjects = profile.enrolledSubjects;
  const primarySubject = subjects[0] || { shortName: "Major", units: [], semesterProgress: 60 };

  const avgProgress = Math.round(
    subjects.reduce((sum, s) => sum + s.semesterProgress, 0) / (subjects.length || 1)
  );

  // Extract all units for the primary exam subject
  const topicData = primarySubject.units.map((u) => ({
    name: u.title.length > 20 ? u.title.slice(0, 18) + "…" : u.title,
    Mastery: u.mastery,
  }));

  const allUnits: Array<{ subject: string; topic: string; mastery: number }> = [];
  for (const s of subjects) {
    for (const u of s.units) {
      allUnits.push({ subject: s.shortName, topic: u.title, mastery: u.mastery });
    }
  }
  allUnits.sort((a, b) => a.mastery - b.mastery);
  const weakest = allUnits[0] || { subject: primarySubject.shortName, topic: "Core Units", mastery: 45 };

  const examName =
    profile.stream === "medical"
      ? "Pathology Internal Assessment II"
      : profile.stream === "artsScience"
      ? "Continuous Internal Assessment II"
      : `${primarySubject.shortName} IA-II`;

  return {
    template: "dashboard",
    kpis: [
      { label: "Next exam", value: "9 days", delta: examName, tone: "amber" },
      { label: "Syllabus covered", value: `${avgProgress}%`, delta: "+8% this week", tone: "brand" },
      { label: "Mock tests taken", value: "7", delta: "3 this week", tone: "teal" },
      { label: "Predicted band", value: avgProgress >= 70 ? "A to O" : "B+ to A", delta: "AI estimate", tone: "sky", hint: "Estimate based on mock and quiz attempts" },
    ],
    charts: [
      {
        type: "bar",
        title: `${primarySubject.shortName} Topic Mastery (%)`,
        xKey: "name",
        series: ["Mastery"],
        data: topicData,
      },
      {
        type: "area",
        title: "Daily Study Minutes",
        xKey: "name",
        series: ["Minutes"],
        data: [
          { name: "Mon", Minutes: 75 },
          { name: "Tue", Minutes: 90 },
          { name: "Wed", Minutes: 60 },
          { name: "Thu", Minutes: 110 },
          { name: "Fri", Minutes: 85 },
          { name: "Sat", Minutes: 120 },
          { name: "Sun", Minutes: 95 },
        ],
      },
    ],
    insights: [
      {
        title: "Remediation plan",
        body: `${weakest.topic} in ${weakest.subject} accounts for most of your missed questions. Prioritise it over the next 4 days.`,
        evidence: `Current mastery: ${weakest.mastery}% · Unit test logs`,
        tone: "amber",
      },
      {
        title: "Last-minute revision mode",
        body: "Two days before the exam, your study planner automatically unlocks rapid-fire flashcards and formula summaries.",
        evidence: "Configured by AI Study Planner",
        tone: "brand",
      },
    ],
  };
}



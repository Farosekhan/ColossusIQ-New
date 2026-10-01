import "server-only";
import type {
  CalendarData,
  ChartSpec,
  ChatData,
  Column,
  DashboardData,
  GalleryData,
  GeneratorData,
  Insight,
  Kpi,
  ListData,
  ModuleData,
  ScorecardData,
  SettingsData,
  WorkflowData,
} from "@/lib/api/schemas";
import { findModule, type ModuleDef } from "@/config/modules";
import { TENANTS, hashString, personName, seeded } from "./fixtures";
import { ADMISSION_FLOW, RESOURCES } from "@/config/resources";
import type { ResourceRecord } from "@/config/resources";
import type { Stream } from "@/config/streams";
import { getStore } from "@/lib/data";
import { collegeStream } from "./records";
import { dynamicBiAnalytics } from "./bi-analytics";
import { getCollegeClubs } from "./clubs";
import { getCollegeSports } from "./sports";
import { getCollegeCalendar } from "./academic-calendar";

/** Live data a builder may need, fetched once per request. */
interface ScopeData {
  stream: Stream | null;
  admissions: ResourceRecord[];
}
import {
  aicteCompliance,
  cbcsElectives,
  competencyLogbook,
  hospitalDashboard,
  naacReadiness,
  nmcCompliance,
  osceStations,
  relabelSubjects,
} from "./stream-content";

/* ── small builders ─────────────────────────────── */
type Tone = Kpi["tone"];
const k = (label: string, value: string, delta?: string, tone: Tone = "brand", hint?: string): Kpi => ({ label, value, delta, tone, hint });
const ins = (title: string, body: string, evidence: string, tone: Tone = "brand"): Insight => ({ title, body, evidence, tone });
const col = (key: string, label: string, kind: Column["kind"] = "text"): Column => ({ key, label, kind });
const MONTHS = ["Jun", "Jul", "Aug", "Sep", "Oct", "Nov"];

function trend(seed: string, series: string[], base = 60, spread = 20, labels = MONTHS) {
  const rnd = seeded(hashString(seed));
  return labels.map((name, i) => {
    const row: Record<string, string | number> = { name };
    series.forEach((s, j) => {
      row[s] = Math.round(base + i * 2 + (rnd() - 0.5) * spread - j * 6);
    });
    return row;
  });
}
function cats(seed: string, names: string[], series: string[], base = 60, spread = 30) {
  const rnd = seeded(hashString(seed));
  return names.map((name) => {
    const row: Record<string, string | number> = { name };
    series.forEach((s) => (row[s] = Math.round(base + (rnd() - 0.5) * spread)));
    return row;
  });
}
const chart = (type: ChartSpec["type"], title: string, data: ChartSpec["data"], series: string[]): ChartSpec => ({ type, title, data, series, xKey: "name" });

const dashboard = (kpis: Kpi[], charts: ChartSpec[], insights: Insight[]): DashboardData => ({ template: "dashboard", kpis, charts, insights });
const list = (columns: Column[], rows: ListData["rows"], filterKey?: string, primaryAction?: string): ListData => ({ template: "list", columns, rows, filterKey, primaryAction });
const stagesOf = (title: string, steps: Array<[string, string, string[]?]>, activeIndex: number): WorkflowData => ({
  template: "workflow",
  title,
  stages: steps.map(([t, d, items], i) => ({ title: t, description: d, items: items ?? [], status: i < activeIndex ? "done" : i === activeIndex ? "active" : "todo" })),
});
const score = (headline: string, dims: Array<[string, number, number]>, strengths: string[], gaps: string[], plan: string[]): ScorecardData => ({
  template: "scorecard",
  headline,
  overall: Math.round(dims.reduce((a, [, s]) => a + s, 0) / dims.length),
  dimensions: dims.map(([name, s, target]) => ({ name, score: s, target })),
  strengths,
  gaps,
  plan,
});
const gallery = (items: Array<[string, string, string, string, Tone?, number?]>): GalleryData => ({
  template: "gallery",
  items: items.map(([title, description, tag, meta, tone, progress]) => ({ title, description, tag, meta, tone: tone ?? "brand", progress })),
});

function rows<T extends Record<string, string | number>>(n: number, seed: string, make: (i: number, r: () => number) => T): T[] {
  const r = seeded(hashString(seed));
  return Array.from({ length: n }, (_, i) => make(i, r));
}
const pick = <T,>(arr: readonly T[], r: () => number): T => arr[Math.floor(r() * arr.length)] as T;

/* ── per-module data ─────────────────────────────── */
/** Admission insights are computed live from the admissions store, so they move as records change. */
function admissionInsights(_collegeScope: string, live: ScopeData): DashboardData {
  // Tenant isolation: the store only returns the caller's college ("all" is the university-wide view).
  const rows = live.admissions;
  const count = (pred: (r: (typeof rows)[number]) => boolean) => rows.filter(pred).length;
  const reached = (stage: string) => count((r) => ADMISSION_FLOW.indexOf(String(r.status) as (typeof ADMISSION_FLOW)[number]) >= ADMISSION_FLOW.indexOf(stage as (typeof ADMISSION_FLOW)[number]));
  const enrolled = count((r) => r.status === "Enrolled");
  const applied = reached("Applied");
  const avg = rows.length ? rows.reduce((a, r) => a + (typeof r.hscPercent === "number" ? r.hscPercent : 0), 0) / rows.length : 0;
  const byProgram = new Map<string, number>();
  for (const r of rows) {
    const program = String(r.program).replace(/^(B\.E\.|B\.Tech|M\.E\.) /, "");
    byProgram.set(program, (byProgram.get(program) ?? 0) + 1);
  }
  const byCategory = new Map<string, number>();
  for (const r of rows) byCategory.set(String(r.category), (byCategory.get(String(r.category)) ?? 0) + 1);
  return dashboard(
    [
      k("Applications", String(rows.length), "Current cycle", "brand"),
      k("Enrolled", String(enrolled), applied ? `${Math.round((enrolled / applied) * 100)}% of applicants` : undefined, "teal"),
      k("Offers pending", String(count((r) => r.status === "Offer sent")), undefined, "gold"),
      k("Average 12th %", avg.toFixed(1), undefined, "sky"),
    ],
    [
      chart("bar", "Admission funnel", ADMISSION_FLOW.map((s) => ({ name: s.replace("Documents verified", "Docs verified"), Applicants: reached(s) })), ["Applicants"]),
      chart("donut", "Community / category mix", [...byCategory].map(([name, value]) => ({ name, value })), ["value"]),
      chart("bar", "Demand by programme", [...byProgram].sort((a, b) => b[1] - a[1]).map(([name, v]) => ({ name: name.split(" ").slice(0, 2).join(" "), Applications: v })), ["Applications"]),
      chart("line", "Applications per week", trend("adm-w", ["Applications"], 40, 20, ["W1", "W2", "W3", "W4", "W5", "W6"]), ["Applications"]),
    ],
    [
      ins("Document verification is the bottleneck", "Applicants stall most between Applied and Documents verified. Consider a verification help desk.", `${reached("Applied") - reached("Documents verified")} of ${reached("Applied")} applicants not yet verified`, "amber"),
      ins("Scholarship interest", `${count((r) => r.scholarship === true)} applicants requested scholarship support.`, "Admissions records · scholarship flag", "sky"),
    ],
  );
}

const DATA: Record<string, (collegeScope: string, live: ScopeData) => ModuleData | Promise<ModuleData>> = {
  "admission-insights": admissionInsights,
  "competency-logbook": competencyLogbook,
  osce: osceStations,
  "hospital-dashboard": hospitalDashboard,
  "nmc-compliance": nmcCompliance,
  "naac-readiness": naacReadiness,
  "aicte-compliance": aicteCompliance,
  "cbcs-electives": (_scope, live) => cbcsElectives(live.stream),
  "academic-tracker": () =>
    dashboard(
      [k("CGPA", "8.21", "+0.14 this sem", "teal"), k("Attendance", "87%", "Above 75% requirement", "teal"), k("Internal avg.", "71%", "−3% vs last IA", "amber"), k("Credits earned", "96 / 160", undefined, "brand")],
      [
        chart("bar", "Subject-wise internal marks (%)", cats("acad", ["DBMS", "OS", "CN", "Python", "ML"], ["IA1", "IA2"], 70, 30), ["IA1", "IA2"]),
        chart("line", "Semester progress", trend("acad-t", ["Progress", "Target"], 50, 12), ["Progress", "Target"]),
      ],
      [ins("DBMS needs attention", "Your IA2 DBMS score dropped 11 points, mostly in normalization questions.", "IA1 72% → IA2 61% · 4 of 5 lost marks in Unit 3", "amber"), ins("Python is a strength", "You are in the top 15% of your section for Python.", "Section rank 9 / 64", "teal")],
    ),
  "exam-prep": () =>
    dashboard(
      [k("Next exam", "9 days", "DBMS IA-II", "amber"), k("Syllabus covered", "62%", "+8% this week", "brand"), k("Mock tests taken", "7", "3 this week", "teal"), k("Predicted band", "B+ to A", "AI estimate", "sky", "Estimate only — based on mock performance")],
      [
        chart("bar", "Topic mastery (%)", cats("exam", ["ER model", "Rel. algebra", "SQL", "FDs", "Normalization", "Transactions"], ["Mastery"], 62, 50), ["Mastery"]),
        chart("area", "Daily study minutes", trend("exam-m", ["Minutes"], 90, 60, ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]), ["Minutes"]),
      ],
      [ins("Remediation plan", "Normalization and transactions account for 60% of your lost marks. Prioritise them over the next 4 days.", "Last 3 mocks · 14 of 23 wrong answers", "amber"), ins("Last-minute mode unlocks", "Two days before the exam, your plan switches to quick-revision cards and one full-length mock.", "Configured by Study Planner Agent")],
    ),
  "class-analytics": () =>
    dashboard(
      [k("Class average", "68%", "+4% vs IA1", "teal"), k("At-risk students", "6", "Review suggested", "amber"), k("Assignments pending", "11", undefined, "brand"), k("AI-assisted lessons", "14", "This semester", "sky")],
      [
        chart("bar", "Topic mastery — CSE-A", cats("cls", ["ER", "SQL", "FDs", "3NF", "BCNF", "ACID"], ["Mastery"], 64, 40), ["Mastery"]),
        chart("line", "Assessment trend", trend("cls-t", ["Average", "Top 10%"], 60, 10), ["Average", "Top 10%"]),
      ],
      [ins("Remedial suggestion", "18 students missed the lossless-join property. A 15-minute recap with two worked examples is recommended.", "IA1 Q5 rubric criterion 3 · 18/64 scored 0", "amber"), ins("Engagement up", "Practice-quiz completion rose to 81% after enabling adaptive quizzes.", "LMS activity logs, weeks 3–8", "teal")],
    ),
  "department-academics": () =>
    dashboard(
      [k("Pass percentage", "91.4%", "+2.1%", "teal"), k("Average marks", "71.2", "+1.8", "teal"), k("Failure patterns", "3 subjects", "Rising", "rose"), k("Course completion", "88%", undefined, "brand")],
      [
        chart("bar", "Pass % by subject", cats("dept", ["DBMS", "OS", "CN", "TOC", "ML", "SE"], ["Pass %"], 88, 18), ["Pass %"]),
        chart("line", "Semester averages", trend("dept-t", ["Sem 3", "Sem 5", "Sem 7"], 68, 10), ["Sem 3", "Sem 5", "Sem 7"]),
      ],
      [ins("Theory of Computation", "Failures rose for two consecutive semesters. Consider remedial sessions and a question-bank review.", "Sem 5 failures: 7% → 11% → 14%", "rose"), ins("Faculty upskilling impact", "Sections taught by faculty who completed the AI-for-Teaching path show +6% average.", "Compared across 8 sections, same syllabus", "teal")],
    ),
  "department-skills": () =>
    dashboard(
      [k("Students profiled", "1,284", undefined, "brand"), k("Job-ready (any role)", "38%", "+5%", "teal"), k("Top gap", "Cloud", "Demand ↑, readiness ↓", "rose"), k("Certifications earned", "412", "This year", "gold")],
      [
        chart("bar", "Industry demand vs student readiness", cats("skl", ["Python", "SQL", "Cloud", "DSA", "ML", "Communication"], ["Demand", "Readiness"], 60, 50), ["Demand", "Readiness"]),
        chart("radar", "Skill distribution — final year", cats("skl-r", ["Programming", "Databases", "Cloud", "AI/ML", "Soft skills", "Aptitude"], ["Current"], 60, 40), ["Current"]),
      ],
      [ins("Cloud & AI gap", "Cloud and AI skills have high demand but low student readiness. A 6-week cloud fundamentals track is suggested.", "Job-matching data from 146 openings · readiness from skill graph", "rose")],
    ),
  "placement-analytics": () =>
    dashboard(
      [k("Placement readiness", "68%", "+6%", "teal"), k("Offers", "412", "Season to date", "gold"), k("Resume completion", "91%", undefined, "brand"), k("Mock interview participation", "74%", "+18%", "teal")],
      [
        chart("bar", "Offers by department", cats("plc", ["CSE", "IT", "ECE", "EEE", "MECH", "CIVIL"], ["Offers"], 60, 70), ["Offers"]),
        chart("line", "Average interview score", trend("plc-t", ["Score"], 58, 12), ["Score"]),
      ],
      [ins("Interview practice gap", "Final-year students need increased interview practice — HR-round scores lag technical rounds by 14 points.", "1,120 mock interviews · Aug–Sep", "amber")],
    ),
  "bi-analytics": async (collegeScope) => {
    const bi = await dynamicBiAnalytics({ college: collegeScope, role: "institution", sub: "institution", tenant: "ciq", name: "Principal", mfa: true, exp: 0 });
    return dashboard(bi.kpis, bi.charts, bi.insights);
  },
  "ai-governance": () =>
    dashboard(
      [k("Registered models", "7", "3 providers + 1 self-hosted", "brand"), k("Prompt versions", "142", "12 this week", "sky"), k("Human reviews pending", "23", undefined, "amber"), k("Groundedness", "94.1%", "+1.2%", "teal")],
      [
        chart("line", "Quality metrics", trend("gov", ["Groundedness", "Relevance", "Safety"], 88, 6), ["Groundedness", "Relevance", "Safety"]),
        chart("bar", "Monthly AI cost by agent (₹ '000)", cats("gov-c", ["Mentor", "Tutor", "Evaluation", "Interview", "RAG"], ["Cost"], 40, 50), ["Cost"]),
      ],
      [ins("Bias test passed", "Evaluation agent v3.2 passed the language-bias test across English, Tamil and Hindi answers.", "Eval suite run #1182 · 1,500 samples", "teal"), ins("Prompt regression", "Interview agent prompt v14 lowered relevance by 3%. Rollback to v13 is recommended.", "A/B eval, 400 sessions", "rose")],
    ),

  /* ── lists ── */
  "course-management": () =>
    list([col("code", "Code"), col("title", "Course"), col("faculty", "Faculty"), col("sem", "Semester"), col("progress", "Syllabus", "progress"), col("status", "Status", "badge")],
      [["CS3492", "Database Management Systems", "Dr. Meena Raghavan"], ["CS3451", "Operating Systems", "Prof. R. Balaji"], ["CS3591", "Computer Networks", "Dr. K. Anitha"], ["AL3451", "Machine Learning", "Dr. V. Srinivasan"], ["CS3401", "Algorithms", "Dr. P. Kannan"], ["CS3551", "Distributed Computing", "Prof. L. Deepa"], ["GE3151", "Problem Solving with Python", "Prof. S. Mohan"]].map(([code, title, faculty], i) => ({ code: code!, title: title!, faculty: faculty!, sem: `Sem ${3 + (i % 3) * 2}`, progress: 40 + ((i * 17) % 55), status: i === 6 ? "Completed" : "Active" })),
      "status", "Add course"),
  assignments: () =>
    list([col("title", "Assignment"), col("course", "Course"), col("due", "Due"), col("submitted", "Submitted", "progress"), col("status", "Status", "badge")],
      rows(8, "asg", (i, r) => ({ title: pick(["ER diagram for library system", "SQL joins worksheet", "Scheduler simulation", "Subnetting problems", "Linear regression notebook", "Normalization case study", "Banker's algorithm trace", "Mini-project proposal"], () => (i + 0.5) / 8), course: pick(["DBMS", "OS", "CN", "ML"], r), due: `Oct ${2 + i * 3}`, submitted: Math.round(40 + r() * 60), status: i < 3 ? "Closed" : i < 6 ? "Open" : "Draft" })),
      "status", "New assignment"),
  "question-bank": () =>
    list([col("id", "ID"), col("question", "Question"), col("topic", "Topic"), col("difficulty", "Difficulty", "badge"), col("bloom", "Bloom level", "badge"), col("co", "CO")],
      rows(10, "qb", (i, r) => ({ id: `Q-${1040 + i}`, question: pick(["Define functional dependency with an example.", "Differentiate 3NF and BCNF.", "Explain two-phase locking.", "Construct a B+ tree for the given keys.", "Write SQL to find the second-highest salary.", "Explain lossless-join decomposition.", "What is a view? List its advantages.", "Explain ACID properties."], r), topic: pick(["Normalization", "Transactions", "Indexing", "SQL"], r), difficulty: pick(["Easy", "Medium", "Hard"], r), bloom: pick(["Remember", "Understand", "Apply", "Analyse"], r), co: `CO${1 + Math.floor(r() * 5)}` })),
      "difficulty", "Add question"),
  "team-finder": () =>
    list([col("name", "Student"), col("dept", "Department"), col("skills", "Skills"), col("looking", "Interested in"), col("match", "Match", "progress")],
      rows(9, "team", (i, r) => ({ name: personName(i + 3), dept: pick(["CSE", "ECE", "MECH", "AI&DS", "IT"], r), skills: pick(["Python, ML", "React, UI design", "Embedded C, PCB", "CAD, 3D printing", "Flutter, Firebase", "Data analysis"], r), looking: pick(["IoT project", "Hackathon", "Startup", "Research paper"], r), match: Math.round(55 + r() * 44) })),
      "dept", "Post a team request"),
  hackathons: () =>
    list([col("name", "Hackathon"), col("host", "Host"), col("date", "Date"), col("teams", "Teams", "number"), col("status", "Status", "badge")],
      [["Smart India Hackathon — internal", "AIT Innovation Cell", "Oct 6", 48, "Registration open"], ["HackTN 2026", "TN e-Governance", "Oct 19", 320, "Registration open"], ["ClimateTech Sprint", "IIT Madras Research Park", "Nov 2", 150, "Upcoming"], ["Campus AI Buildathon", "CollossusIQ Community", "Nov 16", 90, "Upcoming"], ["FinTech Hack", "Deccan School of Mgmt", "Sep 7", 64, "Completed"]].map(([name, host, date, teams, status]) => ({ name: name as string, host: host as string, date: date as string, teams: teams as number, status: status as string })),
      "status", "Create hackathon"),
  events: () =>
    list([col("event", "Event"), col("type", "Type", "badge"), col("date", "Date"), col("venue", "Venue"), col("registered", "Registered", "number")],
      [["Techno Fest 2026", "Cultural", "Oct 10–11", "Main Auditorium", 1240], ["Workshop: GenAI for Engineers", "Workshop", "Oct 4", "Seminar Hall 2", 180], ["Alumni Connect — Product Careers", "Alumni", "Oct 8", "Online", 310], ["Inter-department Cricket", "Sports", "Oct 12–20", "Ground A", 160], ["Guest Lecture: Cloud Security", "Seminar", "Oct 15", "Seminar Hall 1", 220], ["Blood Donation Camp", "Social service", "Oct 22", "Health Centre", 95]].map(([event, type, date, venue, registered]) => ({ event: event as string, type: type as string, date: date as string, venue: venue as string, registered: registered as number })),
      "type", "Create event"),
  clubs: (collegeScope) => {
    const items = getCollegeClubs(collegeScope);
    return list(
      [col("club", "Club"), col("category", "Category", "badge"), col("members", "Members", "number"), col("lead", "Student lead"), col("next", "Next activity")],
      items.map((c) => ({
        club: c.name,
        category: c.category,
        members: c.membersCount,
        lead: c.lead,
        next: c.meetingSchedule,
      })),
      "category",
      "Start a club",
    );
  },
  sports: (collegeScope) => {
    const items = getCollegeSports(collegeScope);
    return list(
      [col("sport", "Sport"), col("team", "Team"), col("coach", "Coach"), col("event", "Upcoming"), col("status", "Status", "badge")],
      items.map((s) => ({
        sport: s.sport,
        team: s.team,
        coach: s.coach,
        event: s.event,
        status: s.status,
      })),
      "status",
      "Register",
    );
  },
  experience: () =>
    list([col("activity", "Activity"), col("type", "Type", "badge"), col("role", "Role"), col("date", "Date"), col("verified", "Verification", "badge")],
      [["NSS village survey", "Social service", "Volunteer", "Aug 2026", "Verified"], ["Smart India Hackathon 2025", "Competition", "Team lead", "Dec 2025", "Verified"], ["IEEE student conference", "Conference", "Presenter", "Mar 2026", "Verified"], ["Coding Club", "Leadership", "Secretary", "2025–26", "Verified"], ["Techno Fest", "Cultural", "Organiser", "Oct 2025", "Pending"]].map(([activity, type, role, date, verified]) => ({ activity: activity!, type: type!, role: role!, date: date!, verified: verified! })),
      "type", "Add activity"),
  alumni: () =>
    list([col("name", "Alumnus"), col("batch", "Batch"), col("role", "Current role"), col("company", "Company"), col("offers", "Can help with", "badge"), col("match", "Match", "progress")],
      rows(8, "alm", (i, r) => ({ name: personName(i + 11), batch: `${2012 + Math.floor(r() * 10)}`, role: pick(["Software Engineer", "Product Manager", "Data Scientist", "Founder", "Cloud Architect", "Design Lead"], r), company: pick(["Zoho", "Freshworks", "TCS Research", "Infosys", "Chargebee", "Own startup"], r), offers: pick(["Mentorship", "Mock interviews", "Referrals", "Startup advice"], r), match: Math.round(50 + r() * 49) })),
      "offers", "Request mentorship"),
  "my-classes": () =>
    list([col("section", "Section"), col("course", "Course"), col("students", "Students", "number"), col("attendance", "Attendance", "progress"), col("avg", "Avg. score", "progress"), col("next", "Next class")],
      [["CSE-A · Sem 5", "DBMS", 64, 88, 68, "Today 09:00"], ["CSE-B · Sem 5", "DBMS", 62, 84, 64, "Today 14:00"], ["AI&DS · Sem 5", "DBMS Lab", 58, 91, 74, "Tomorrow 10:00"], ["CSE-A · Sem 7", "Advanced Databases", 60, 79, 71, "Thu 11:00"]].map(([section, course, students, attendance, avg, next]) => ({ section: section as string, course: course as string, students: students as number, attendance: attendance as number, avg: avg as number, next: next as string })),
      undefined, "Take attendance"),
  students: () =>
    list([col("name", "Student"), col("roll", "Roll no.", "masked"), col("section", "Section"), col("cgpa", "CGPA", "number"), col("readiness", "Career readiness", "progress"), col("signal", "Support signal", "badge")],
      rows(12, "stu", (i, r) => ({ name: personName(i), roll: `21CS${String(1001 + i * 13)}`, section: pick(["CSE-A", "CSE-B", "AI&DS"], r), cgpa: Math.round((6.2 + r() * 3.6) * 100) / 100, readiness: Math.round(35 + r() * 60), signal: r() > 0.8 ? "Review suggested" : "None" })),
      "section", "Import students"),
  "early-warning": () =>
    list([col("student", "Student"), col("roll", "Roll no.", "masked"), col("signals", "Signals observed"), col("since", "Since"), col("recommendation", "Support recommendation"), col("status", "Review", "badge")],
      rows(7, "ew", (i, r) => ({ student: personName(i + 5), roll: `21CS${String(1100 + i * 17)}`, signals: pick(["Declining scores (3 assessments)", "Missed 4 assignments", "Reduced engagement (−60%)", "Repeated failed quizzes in OS", "Skill stagnation for 6 weeks"], r), since: `${2 + Math.floor(r() * 5)} weeks`, recommendation: pick(["Faculty check-in", "Peer tutoring", "Counsellor conversation", "Remedial class"], r), status: pick(["Pending review", "In progress", "Resolved"], r) })),
      "status"),
  "department-faculty": () =>
    list([col("name", "Faculty"), col("designation", "Designation"), col("load", "Teaching load (hrs/wk)", "number"), col("development", "Skill development", "progress"), col("ai", "AI adoption", "badge")],
      rows(9, "fac", (i, r) => ({ name: `${pick(["Dr.", "Prof.", "Ms.", "Mr."], r)} ${personName(i + 20)}`, designation: pick(["Professor", "Associate Professor", "Assistant Professor"], r), load: 12 + Math.floor(r() * 8), development: Math.round(20 + r() * 80), ai: pick(["High", "Medium", "Starting"], r) })),
      "ai", "Add faculty"),
  drives: () =>
    list([col("company", "Company"), col("role", "Role"), col("ctc", "CTC (LPA)", "number"), col("date", "Drive date"), col("eligible", "Eligible", "number"), col("status", "Status", "badge")],
      [["Zoho", "Member Technical Staff", 8.4], ["TCS", "Digital", 7.0], ["Freshworks", "Software Engineer", 12.0], ["L&T Technology Services", "Graduate Engineer Trainee", 5.5], ["Ashok Leyland", "Design Trainee", 6.2], ["Chargebee", "SDE-1", 14.0]].map(([company, role, ctc], i) => ({ company: company as string, role: role as string, ctc: ctc as number, date: `Oct ${3 + i * 4}`, eligible: 80 + ((i * 53) % 300), status: i < 2 ? "Completed" : i < 4 ? "Scheduled" : "Draft" })),
      "status", "Schedule drive"),
  jobs: () =>
    list([col("role", "Role"), col("company", "Company"), col("location", "Location"), col("type", "Type", "badge"), col("match", "Profile match", "progress")],
      rows(8, "job", (i, r) => ({ role: pick(["Backend Developer Intern", "Data Analyst", "Graduate Engineer Trainee", "UI Engineer", "ML Engineer Intern", "Cloud Support Associate"], r), company: pick(["Zoho", "Freshworks", "Infosys", "Kissflow", "Tiger Analytics", "Chargebee"], r), location: pick(["Chennai", "Bengaluru", "Coimbatore", "Remote", "Hyderabad"], r), type: pick(["Internship", "Full-time"], r), match: Math.round(45 + r() * 54) })),
      "type"),
  employers: () =>
    list([col("company", "Employer"), col("sector", "Sector", "badge"), col("hires", "Hires (3 yrs)", "number"), col("contact", "Contact"), col("status", "Relationship", "badge")],
      [["Zoho", "Product"], ["TCS", "IT services"], ["Freshworks", "Product"], ["Ashok Leyland", "Automotive"], ["L&T", "Engineering"], ["HDFC Bank", "BFSI"], ["Tiger Analytics", "Analytics"]].map(([company, sector], i) => ({ company: company!, sector: sector!, hires: 12 + ((i * 29) % 140), contact: personName(i + 22), status: i % 3 === 2 ? "New" : "Active" })),
      "sector", "Add employer"),
  startups: () =>
    list([col("name", "Venture"), col("domain", "Domain", "badge"), col("founders", "Founders"), col("stage", "Stage", "badge"), col("readiness", "Readiness", "progress")],
      [["AgriSoil Sense", "AgriTech"], ["CampusCart", "Commerce"], ["MediQueue", "HealthTech"], ["VoltRide", "EV"], ["LexiLearn", "EdTech"], ["GreenGrid", "ClimateTech"]].map(([name, domain], i) => ({ name: name!, domain: domain!, founders: `${personName(i + 2)}, ${personName(i + 9)}`, stage: pick(["Idea", "Validation", "MVP", "Pilot", "Incubated"], seeded(i + 3)), readiness: 25 + ((i * 23) % 70) })),
      "stage", "Add venture"),
  mentors: () =>
    list([col("name", "Mentor"), col("type", "Type", "badge"), col("expertise", "Expertise"), col("mentees", "Mentees", "number"), col("availability", "Availability", "badge")],
      rows(8, "mnt", (i, r) => ({ name: personName(i + 16), type: pick(["Industry", "Alumni", "Startup", "Faculty"], r), expertise: pick(["Go-to-market", "Embedded hardware", "Fundraising", "UX research", "Cloud architecture", "Regulatory (health)"], r), mentees: Math.floor(r() * 8), availability: pick(["Open", "Limited", "Full"], r) })),
      "type", "Invite mentor"),
  "knowledge-base": () =>
    list([col("doc", "Document"), col("type", "Type", "badge"), col("owner", "Owner"), col("updated", "Updated"), col("chunks", "Indexed chunks", "number"), col("status", "Status", "badge")],
      [["Regulations 2021 — B.E./B.Tech", "Regulation"], ["Academic Calendar 2026–27 (Odd sem)", "Calendar"], ["CSE Department Handbook", "Handbook"], ["Internal Assessment Rules", "Policy"], ["Placement Policy 2026", "Policy"], ["Student Code of Conduct", "Guideline"], ["DBMS Lab Manual", "Lab manual"], ["Circular 42/2026 — Exam fee", "Circular"]].map(([doc, type], i) => ({ doc: doc!, type: type!, owner: pick(["Registrar", "Exam Cell", "CSE Dept", "Placement Cell"], seeded(i + 7)), updated: `${1 + i * 3} Sep 2026`, chunks: 40 + ((i * 61) % 500), status: i === 7 ? "Pending approval" : "Approved" })),
      "type", "Upload document"),
  reports: () =>
    list([col("report", "Report"), col("scope", "Scope"), col("period", "Period"), col("format", "Formats", "badge"), col("generated", "Last generated")],
      [["Semester academic report", "Institution"], ["Department performance", "CSE"], ["Course outcome attainment", "DBMS"], ["Skill report", "Final year"], ["Placement report", "Institution"], ["Faculty development", "All departments"], ["Activity & engagement", "Institution"], ["Student progress", "CSE-A"]].map(([report, scope], i) => ({ report: report!, scope: scope!, period: "Odd sem 2026", format: "PDF · Excel · CSV", generated: `${2 + i} days ago` })),
      undefined, "Generate report"),
  "talent-search": () =>
    list([col("candidate", "Candidate"), col("college", "College"), col("dept", "Department"), col("skills", "Verified skills"), col("projects", "Projects", "number"), col("readiness", "Readiness", "progress")],
      rows(10, "tal", (i, r) => ({ candidate: personName(i + 6), college: pick(TENANTS.map((t) => t.name), r), dept: pick(["CSE", "IT", "AI&DS", "ECE"], r), skills: pick(["Python · SQL · ML", "Java · Spring · AWS", "React · Node · MongoDB", "C · Embedded · IoT"], r), projects: 1 + Math.floor(r() * 5), readiness: Math.round(50 + r() * 49) })),
      "dept"),
  shortlists: () =>
    list([col("candidate", "Candidate"), col("role", "Role"), col("stage", "Stage", "badge"), col("assessment", "Assessment", "progress"), col("updated", "Updated")],
      rows(7, "sl", (i, r) => ({ candidate: personName(i + 12), role: pick(["SDE-1", "Data Analyst", "GET"], r), stage: pick(["Shortlisted", "Assessment", "Interview", "Offer"], r), assessment: Math.round(50 + r() * 49), updated: `${1 + i}d ago` })),
      "stage"),
  users: () =>
    list([col("name", "Name"), col("email", "Email", "masked"), col("role", "Role", "badge"), col("tenant", "Tenant"), col("mfa", "MFA", "badge"), col("last", "Last active")],
      rows(12, "usr", (i, r) => ({ name: personName(i + 2), email: `${personName(i + 2).split(" ")[0]!.toLowerCase()}@ait.edu.in`, role: pick(["Student", "Faculty", "HOD", "Placement Officer", "Principal"], r), tenant: "Anna Institute of Technology", mfa: r() > 0.15 ? "Enabled" : "Not enrolled", last: `${1 + Math.floor(r() * 48)}h ago` })),
      "role", "Invite user"),
  billing: () =>
    list([col("tenant", "Tenant"), col("plan", "Plan", "badge"), col("seats", "Active seats", "number"), col("ai", "AI usage (₹)", "number"), col("renewal", "Renewal"), col("status", "Status", "badge")],
      TENANTS.map((t, i) => ({ tenant: t.name, plan: t.plan, seats: t.students, ai: 18000 + i * 7300, renewal: `Jun ${2027}`, status: t.status === "Pilot" ? "Trial" : "Paid" })),
      "plan"),
  "ai-observability": () =>
    list([col("time", "Time"), col("tenant", "Tenant"), col("agent", "Agent", "badge"), col("model", "Model"), col("prompt", "Prompt ver."), col("tokens", "Tokens", "number"), col("latency", "Latency (ms)", "number"), col("confidence", "Confidence", "progress")],
      rows(14, "obs", (i, r) => ({ time: `14:${String(59 - i * 3).padStart(2, "0")}`, tenant: pick(["AIT", "TNTU", "Kaveri", "Malabar"], r), agent: pick(["Mentor", "Tutor", "Evaluation", "Interview", "Knowledge"], r), model: pick(["reasoning-large", "chat-fast", "vision-ocr", "embed-v3"], r), prompt: `v${10 + Math.floor(r() * 6)}`, tokens: Math.round(400 + r() * 4000), latency: Math.round(300 + r() * 2600), confidence: Math.round(60 + r() * 39) })),
      "agent"),
  "audit-log": () =>
    list([col("time", "Time"), col("actor", "Actor"), col("action", "Action", "badge"), col("target", "Target"), col("ip", "IP", "masked")],
      rows(12, "aud", (i, r) => ({ time: `23 Sep 14:${String(58 - i * 4).padStart(2, "0")}`, actor: pick(["Dr. Meena Raghavan", "Platform Admin", "Registrar", "Dr. S. Venkatesh"], r), action: pick(["Score override", "Role changed", "Document approved", "Login (MFA)", "Policy updated", "Export generated"], r), target: pick(["IA1 · 21CS1014", "User: priya.n", "Regulations 2021", "AI policy: evaluation", "Placement report"], r), ip: `10.12.${Math.floor(r() * 255)}.${Math.floor(r() * 255)}` })),
      "action"),
  "developer-api": () =>
    list([col("name", "Key name"), col("scopes", "Scopes"), col("tenant", "Tenant"), col("created", "Created"), col("lastUsed", "Last used"), col("status", "Status", "badge")],
      [["ERP sync", "students:read courses:read"], ["LMS bridge", "courses:read assessments:write"], ["Attendance import", "attendance:write"], ["Analytics export", "analytics:read"]].map(([name, scopes], i) => ({ name: name!, scopes: scopes!, tenant: TENANTS[i]?.name ?? "", created: `${3 + i} Aug 2026`, lastUsed: `${i + 1}h ago`, status: i === 3 ? "Revoked" : "Active" })),
      "status", "Create API key"),

  /* ── workflows ── */
  "mission-planner": () =>
    stagesOf("Mission: Data Scientist at a product company", [
      ["Vision", "Where do I want to be after graduation?", ["Data Scientist, product analytics"]],
      ["Career goal", "Target role and company type", ["Product companies · Bengaluru/Chennai"]],
      ["Required skills", "Derived from 146 real job descriptions", ["Python", "Statistics", "SQL", "ML", "Data viz", "Storytelling"]],
      ["Semester plan", "Sem 5–8 milestones", ["Sem 5: SQL + statistics", "Sem 6: ML + Kaggle", "Sem 7: internship", "Sem 8: capstone"]],
      ["Monthly plan", "October", ["Finish SQL track", "2 Kaggle notebooks", "1 mock interview"]],
      ["Weekly plan", "This week", ["3 SQL sets", "Statistics ch. 4", "Portfolio README"]],
      ["Daily plan", "Today", ["25 min normalization", "Python practice", "Project work"]],
      ["Projects", "Portfolio-grade projects", ["Smart Campus AI", "Retail demand forecasting"]],
      ["Internship", "Target: summer 2027"],
      ["Interview", "Readiness 48% → target 75%"],
      ["Employment / Higher studies", "Outcome"],
    ], 5),
  certifications: () =>
    stagesOf("Certification roadmap — Data Scientist", [
      ["SQL fundamentals", "Free · 12 hours", ["Completed Aug 2026"]],
      ["Python for Data Science", "Free · 20 hours", ["Completed Sep 2026"]],
      ["Statistics essentials", "In progress · 60%"],
      ["Cloud fundamentals (any major provider)", "Recommended for Sem 6"],
      ["Machine Learning specialisation", "Recommended for Sem 6"],
      ["Data visualisation", "Recommended for Sem 7"],
    ], 2),
  "startup-hub": () =>
    stagesOf("AgriSoil Sense", [
      ["Idea", "Low-cost soil health kit for small farmers"],
      ["Problem validation", "32 farmer interviews in 4 villages", ["78% test soil less than once a year"]],
      ["Market analysis", "TAM / SAM / SOM and competitors"],
      ["Customer persona", "Small-holder farmer, 2–5 acres"],
      ["Business model", "Kit + subscription via FPOs"],
      ["MVP", "Sensor prototype + Tamil voice app"],
      ["Mentor", "Assigned: agri-tech alumnus"],
      ["Prototype", "Field test with 10 farmers"],
      ["Pitch deck", "AI-drafted, mentor-reviewed"],
      ["Incubation review", "Panel on Nov 12"],
      ["Startup readiness", "Funding readiness assessment"],
    ], 4),
  "incubation-pipeline": () =>
    stagesOf("Incubation pipeline — 2026 cohort", [
      ["Idea", "41 submissions", ["Screened by Incubation Agent + panel"]],
      ["Problem validation", "22 ventures"],
      ["Market analysis", "15 ventures"],
      ["Customer persona", "15 ventures"],
      ["Business model", "11 ventures"],
      ["MVP", "8 ventures"],
      ["Mentor", "8 ventures matched"],
      ["Prototype", "6 ventures"],
      ["Pitch deck", "5 ventures"],
      ["Incubation review", "Panel Nov 12"],
      ["Startup readiness", "Funding track"],
    ], 6),
  "skill-booster": () =>
    stagesOf("Faculty roadmap — AI for Teaching (12 weeks)", [
      ["Current level", "Self + AI assessment", ["Digital skills: 72", "AI literacy: 41", "Assessment design: 66"]],
      ["Skill gap", "AI literacy and educational analytics"],
      ["AI fundamentals", "Week 1–2"],
      ["Generative AI", "Week 3"],
      ["Prompt engineering", "Week 4"],
      ["AI classroom applications", "Week 5–6"],
      ["Assessment with AI", "Week 7"],
      ["Responsible AI", "Week 8"],
      ["Educational analytics", "Week 9"],
      ["AI project & capstone", "Week 10–11"],
      ["Assessment & certification", "Week 12"],
      ["Portfolio", "Showcase to department"],
    ], 5),

  /* ── scorecards ── */
  "skill-graph": () =>
    score("Target: Data Scientist", [["Python", 78, 85], ["Statistics", 54, 80], ["SQL", 66, 85], ["Machine Learning", 41, 75], ["Data visualisation", 60, 75], ["Communication", 59, 75]], ["Python fundamentals are job-ready", "Consistent practice streak (12 days)"], ["Statistics: hypothesis testing", "ML: model evaluation", "SQL: window functions"], ["Statistics ch. 4–5 this week", "Kaggle beginner notebook", "SQL window-functions set"]),
  "study-twin": () =>
    score("How you learn best", [["Learning pace", 72, 75], ["Retention (7-day)", 58, 75], ["Practice consistency", 81, 80], ["Revision discipline", 49, 70], ["Focus duration", 64, 70]], ["Visual explanations work best for you", "Most productive 7–9 AM"], ["Revision is often skipped on weekends", "Accuracy drops after 45 minutes"], ["Use 25-minute focus blocks", "Schedule spaced revision on Sat mornings", "Prefer diagrams in Tutor answers"]),
  career: () =>
    score("You vs. Data Scientist (entry level)", [["Skills", 62, 80], ["Experience", 35, 60], ["Portfolio", 55, 75], ["Communication", 59, 75], ["Certifications", 50, 60], ["Interview", 48, 75]], ["Strong Python and a real AI project", "Good academic record (8.21)"], ["No internship yet", "Interview readiness below target", "Portfolio lacks a deployed project"], ["Apply to 5 matched internships", "Deploy Smart Campus AI demo", "Two mock interviews per week for 4 weeks"]),
  readiness: () =>
    score("Career readiness by dimension", [["Academic", 78, 75], ["Technical skills", 71, 80], ["Communication", 59, 75], ["Projects", 74, 70], ["Certifications", 50, 60], ["Resume", 82, 80], ["Interview", 48, 75], ["Industry exposure", 30, 60]], ["Academic and project dimensions meet target"], ["Interview and industry exposure are the largest gaps"], ["Mock interviews: technical + HR", "Attend 2 alumni sessions", "Apply for one internship this month"]),
  communication: () =>
    score("Communication profile", [["Grammar", 72, 80], ["Vocabulary", 64, 75], ["Fluency", 55, 75], ["Structure", 61, 75], ["Speaking pace", 58, 70], ["Filler words", 47, 70]], ["Clear written English", "Good use of examples"], ["Frequent fillers (\"basically\", \"like\")", "Answers lack a clear structure"], ["Practise STAR-format answers", "2-minute daily speaking drill", "Weekly presentation practice"]),
  "project-review": () =>
    score("Smart Campus AI — review report", [["Architecture", 82, 75], ["Documentation", 64, 75], ["Code quality", 76, 75], ["Test coverage", 58, 70], ["Innovation", 88, 70], ["Presentation", 70, 75]], ["Clear modular architecture", "Strong novelty for campus context"], ["README lacks setup steps", "Unit tests cover only 41% of services"], ["Add architecture decision records", "Raise coverage on attendance service", "Rehearse demo with viva questions"]),
  "funding-readiness": () =>
    score("AgriSoil Sense", [["Team", 72, 75], ["Problem validation", 81, 75], ["Product", 55, 70], ["Traction", 30, 60], ["Business model", 60, 70], ["Pitch", 66, 75]], ["Well-validated problem", "Complementary founding team"], ["No paying pilots yet", "Unit economics unproven"], ["Run paid pilot with one FPO", "Refine cost model", "Mentor pitch rehearsal"]),

  /* ── calendars ── */
  "daily-plan": () => ({
    template: "calendar",
    days: [
      { day: "Today", items: [
        { time: "06:30", title: "Walk / exercise", tag: "Wellness", tone: "teal" },
        { time: "09:00", title: "DBMS class", tag: "Class", tone: "brand" },
        { time: "11:00", title: "Python practice", tag: "Study", tone: "sky" },
        { time: "13:00", title: "Lunch + break", tag: "Break", tone: "neutral" },
        { time: "15:00", title: "Project: Smart Campus AI", tag: "Project", tone: "gold" },
        { time: "18:00", title: "Interview practice", tag: "Career", tone: "amber" },
        { time: "21:00", title: "Revision: normalization (25 min)", tag: "Revision", tone: "sky" },
      ] },
      { day: "Tomorrow", items: [
        { time: "09:00", title: "OS class", tag: "Class", tone: "brand" },
        { time: "16:00", title: "Coding Club contest", tag: "Club", tone: "teal" },
        { time: "20:00", title: "Mock test: deadlocks", tag: "Assessment", tone: "rose" },
      ] },
    ],
    tips: ["Planner balances study with rest — you have 2 free blocks today.", "Class timings sync from the academic calendar."],
  }),
  "academic-calendar": (collegeScope = "all") => {
    const raw = getCollegeCalendar(collegeScope);
    const thisWeek = raw.filter((it) => it.date >= "2026-09-28" && it.date <= "2026-10-05");
    const next30 = raw.filter((it) => it.date > "2026-10-05" && it.date <= "2026-11-05");
    const later = raw.filter((it) => it.date > "2026-11-05");

    return {
      template: "calendar",
      days: [
        {
          day: "This week",
          items: thisWeek.map((it) => ({
            time: it.date.slice(5) + " · " + it.time,
            title: it.title,
            tag: it.tag,
            tone: it.tone,
          })),
        },
        {
          day: "Next 30 days",
          items: next30.map((it) => ({
            time: it.date.slice(5) + " · " + it.time,
            title: it.title,
            tag: it.tag,
            tone: it.tone,
          })),
        },
        ...(later.length > 0
          ? [
              {
                day: "Semester Milestones & Exams",
                items: later.map((it) => ({
                  time: it.date.slice(5) + " · " + it.time,
                  title: it.title,
                  tag: it.tag,
                  tone: it.tone,
                })),
              },
            ]
          : []),
      ],
      tips: ["Class timings and assessment windows sync from the official academic calendar."],
    };
  },
  wellness: () => ({
    template: "calendar",
    days: [
      { day: "Healthy routine suggestions", items: [
        { time: "Morning", title: "10 minutes of light movement and sunlight", tag: "Activity", tone: "teal" },
        { time: "Every 45 min", title: "5-minute study break, look away from screens", tag: "Breaks", tone: "sky" },
        { time: "All day", title: "Aim for regular water intake", tag: "Hydration", tone: "sky" },
        { time: "Evening", title: "Screen-free wind-down 30 minutes before bed", tag: "Sleep", tone: "brand" },
        { time: "Night", title: "Consistent 7–8 hour sleep window", tag: "Sleep", tone: "brand" },
      ] },
    ],
    tips: ["Educational guidance only — not medical advice.", "Student Welfare Office: Block C, Room 104 · Counsellor hours 10:00–17:00."],
  }),
  "recruiter-interviews": () => ({
    template: "calendar",
    days: [
      { day: "Today", items: [
        { time: "10:00", title: "Divya Raman — SDE-1 technical", tag: "Technical", tone: "brand" },
        { time: "14:30", title: "Karthik Iyer — Data Analyst", tag: "Technical", tone: "brand" },
      ] },
      { day: "Tomorrow", items: [{ time: "11:00", title: "Priya Nair — HR round", tag: "HR", tone: "gold" }] },
    ],
    tips: [],
  }),

  /* ── galleries ── */
  passport: () =>
    gallery([
      ["Academic", "CGPA 8.21 · 96 credits", "Verified by Exam Cell", "Updated Sep 2026", "brand", 82],
      ["Skills", "Python (job-ready), SQL, React", "Skill Graph", "6 skills tracked", "teal", 66],
      ["Projects", "Smart Campus AI · AgriSoil Sense", "Faculty-reviewed", "2 projects", "gold", 74],
      ["Certifications", "SQL fundamentals · Python for DS", "Issuer-verified", "2 earned", "sky", 50],
      ["Activities", "NSS · Coding Club secretary", "Verified", "5 activities", "teal", 70],
      ["Competitions", "SIH 2025 finalist", "Verified", "1 award", "amber", 60],
      ["Communication", "Level: Intermediate", "Communication Lab", "Improving", "brand", 59],
      ["Career readiness", "63% overall", "Dimension-level", "See Career Readiness", "gold", 63],
    ]),
  "competitive-exams": () =>
    gallery([
      ["GATE CSE", "Topic-wise plan, PYQs and full-length mocks", "Engineering", "Next exam: Feb 2027", "brand", 34],
      ["UPSC CSE", "Prelims GS, CSAT and daily current affairs", "Civil services", "Prelims: May 2027", "gold"],
      ["TNPSC Group 2", "Tamil & English, aptitude and GS", "State", "Notification awaited", "teal"],
      ["Banking (IBPS / SBI)", "Quant, reasoning, English, banking awareness", "Banking", "PO prelims: Oct", "sky"],
      ["SSC CGL", "Tier 1 & 2 preparation", "Central govt.", "Tier 1: Nov", "amber"],
      ["Railway (RRB NTPC)", "CBT 1 & 2", "Railways", "Upcoming", "rose"],
      ["UGC-NET", "Paper 1 + subject paper", "Teaching", "Dec cycle", "brand"],
      ["CAT / MBA entrance", "QA, DILR, VARC", "Management", "CAT: Nov 30", "gold"],
      ["Law entrance (CLAT)", "Legal reasoning, GK, English", "Law", "Dec", "teal"],
      ["Defence (CDS / AFCAT)", "Maths, English, GK", "Defence", "Feb", "sky"],
    ]),
  opportunities: () =>
    gallery([
      ["Data Analyst Intern — Tiger Analytics", "SQL, Python, dashboards · Chennai", "Internship", "92% match", "teal", 92],
      ["HackTN 2026", "State-level hackathon, ₹5L prize pool", "Hackathon", "Registrations close Oct 12", "gold"],
      ["Mentor: Priya S. (Data Scientist, Freshworks)", "Alumnus, batch 2016", "Mentor", "Accepting mentees", "brand"],
      ["Workshop: Kaggle for beginners", "Coding Club · Oct 9", "Workshop", "Free", "sky"],
      ["Cloud fundamentals certification", "Recommended by your skill graph", "Certification", "Sponsored seats: 20", "amber"],
      ["Research assistant — IoT lab", "Faculty project, 6 months", "Project", "Stipend", "teal"],
    ]),
  "refresh-zone": () =>
    gallery([
      ["Memory Match", "Short-term memory card game", "Memory", "3 min", "teal"],
      ["Logic Grid", "Deduction puzzles", "Logical reasoning", "5 min", "brand"],
      ["Word Ladder", "Vocabulary builder", "Word", "3 min", "gold"],
      ["SQL Sprint", "Race to write correct queries", "Coding challenge", "10 min", "sky"],
      ["Quiz Battle", "Challenge a classmate on DBMS", "Quiz", "Live", "rose"],
      ["Campus Challenge", "Department vs department trivia", "Team", "This Friday", "amber"],
    ]),
  achievements: () =>
    gallery([
      ["7-Day Learning Streak", "Studied every day for a week", "Badge", "Earned", "gold", 100],
      ["First Project Completed", "Shipped your first project", "Badge", "Earned", "teal", 100],
      ["100 Questions Solved", "Across all subjects", "Badge", "84 / 100", "brand", 84],
      ["First Mock Interview", "Completed an AI interview", "Badge", "Earned", "sky", 100],
      ["Communication Level Up", "Reach Intermediate+", "Badge", "59 / 65", "amber", 90],
      ["Hackathon Participant", "Joined a hackathon", "Badge", "Earned", "rose", 100],
    ]),
  "department-labs": () =>
    gallery([
      ["Coding Lab", "Practice problems, contests and auto-graded labs", "Computer Science / IT", "1,240 problems", "brand"],
      ["AI Lab", "Notebooks, datasets and GPU queue", "Computer Science / IT", "Beta", "sky"],
      ["CAD Practice", "Guided modelling exercises", "Mechanical", "Phase 2", "gold"],
      ["Circuit Design", "Simulations and PCB project templates", "Electronics / ECE", "Phase 2", "teal"],
      ["Structural Design & GIS", "Estimation, planning and site safety modules", "Civil", "Phase 2", "amber"],
      ["Business Simulations", "Case studies, accounting and finance labs", "Commerce / Management", "Phase 2", "rose"],
      ["Language & Research", "Communication, research and presentation", "Humanities / Arts", "Phase 2", "brand"],
    ]),
  integrations: () =>
    gallery([
      ["Student Information System", "Sync students, programs and enrolments", "SIS", "Connected", "teal"],
      ["College ERP", "Fees, timetable and HR", "ERP", "Connected", "teal"],
      ["LMS (Moodle / Canvas)", "Courses, content and grades", "LMS", "Available", "brand"],
      ["Attendance platform", "Biometric / app attendance", "Attendance", "Available", "brand"],
      ["Examination system", "Hall tickets and results", "Exams", "Available", "brand"],
      ["Identity provider (SAML / OIDC)", "Enterprise SSO with MFA", "Identity", "Connected", "teal"],
      ["Email & SMS gateway", "Institution-approved messaging", "Communication", "Connected", "teal"],
    ]),
  "agent-store": () =>
    gallery([
      ["AI GATE Agent", "GATE-specific plans, PYQs and adaptive mocks", "Exam", "Enabled for 3 tenants", "brand"],
      ["AI NEET Preparation Agent", "Biology, chemistry and physics prep", "Exam", "Available", "teal"],
      ["AI Coding Agent", "Code review, hints and debugging", "Skills", "Enabled", "sky"],
      ["AI Accounting Agent", "Tally, GST and accounting practice", "Commerce", "Available", "gold"],
      ["AI Mechanical Design Agent", "CAD and design reasoning", "Engineering", "Beta", "amber"],
      ["AI Civil Engineering Agent", "Estimation, structural basics", "Engineering", "Beta", "amber"],
      ["AI Law Preparation Agent", "CLAT and legal reasoning", "Exam", "Available", "rose"],
      ["AI Entrepreneurship Agent", "Business models and pitch coaching", "Innovation", "Enabled", "teal"],
    ]),

  /* ── settings ── */
  branding: (): SettingsData => ({
    template: "settings",
    sections: [
      { title: "Identity", description: "How your institution appears to students and staff.", fields: [
        { id: "name", label: "Display name", type: "text", value: "Anna Institute of Technology" },
        { id: "subdomain", label: "Subdomain", type: "text", value: "ait.collossusiq.ai", help: "Custom domains (e.g. ai.college.edu) are verified via DNS." },
        { id: "primary", label: "Primary colour", type: "color", value: "#1e2a5a" },
        { id: "accent", label: "Accent colour", type: "color", value: "#c9962b" },
      ] },
      { title: "Language", description: "Default interface and AI explanation languages.", fields: [
        { id: "ui-lang", label: "Default interface language", type: "select", value: "English", options: ["English", "தமிழ்", "हिन्दी"] },
        { id: "ai-lang", label: "Default AI explanation language", type: "select", value: "English", options: ["English", "Tamil", "Hindi", "Telugu", "Kannada", "Malayalam"] },
      ] },
    ],
  }),
  "notifications-config": (): SettingsData => ({
    template: "settings",
    sections: [
      { title: "Channels", description: "Channels approved by the institution.", fields: [
        { id: "web", label: "In-app / web", type: "toggle", value: true },
        { id: "email", label: "Email", type: "toggle", value: true },
        { id: "push", label: "Mobile push", type: "toggle", value: true },
        { id: "sms", label: "SMS", type: "toggle", value: false, help: "Charged per message by your SMS gateway." },
      ] },
      { title: "Rules", description: "Event + priority + audience + timing.", fields: [
        { id: "exam", label: "Exam reminders", type: "select", value: "7 days and 1 day before", options: ["Off", "1 day before", "7 days and 1 day before"] },
        { id: "quiet", label: "Quiet hours", type: "select", value: "22:00–07:00", options: ["None", "22:00–07:00", "21:00–08:00"] },
        { id: "digest", label: "Weekly faculty digest", type: "toggle", value: true },
      ] },
    ],
  }),
  "feature-flags": (): SettingsData => ({
    template: "settings",
    sections: [
      { title: "Phase 2 modules", description: "Roll out per tenant.", fields: [
        { id: "handwritten", label: "Handwritten evaluation", type: "toggle", value: true },
        { id: "voice", label: "Voice AI", type: "toggle", value: false },
        { id: "gd", label: "GD simulation", type: "toggle", value: true },
      ] },
      { title: "Phase 3–4 modules", description: "Early access.", fields: [
        { id: "command", label: "Institution command center", type: "toggle", value: true },
        { id: "market", label: "Recruiter marketplace", type: "toggle", value: false },
        { id: "store", label: "Agent store", type: "toggle", value: false },
      ] },
    ],
  }),
  "security-settings": (): SettingsData => ({
    template: "settings",
    sections: [
      { title: "Authentication", description: "Applies to every user in the tenant.", fields: [
        { id: "mfa", label: "Require MFA for staff", type: "toggle", value: true },
        { id: "mfa-students", label: "Require MFA for students", type: "toggle", value: false },
        { id: "sso", label: "Enterprise SSO (SAML / OIDC)", type: "toggle", value: true },
        { id: "session", label: "Idle session timeout", type: "select", value: "30 minutes", options: ["15 minutes", "30 minutes", "60 minutes"] },
        { id: "pwd", label: "Minimum password length", type: "select", value: "12", options: ["10", "12", "14", "16"] },
      ] },
      { title: "Data & AI", description: "Data protection and AI data isolation.", fields: [
        { id: "retention", label: "AI conversation retention", type: "select", value: "180 days", options: ["30 days", "90 days", "180 days", "1 year"] },
        { id: "masking", label: "Mask personal data before sending to models", type: "toggle", value: true },
        { id: "training", label: "Allow tenant data for model training", type: "toggle", value: false, help: "Off by default. Student data is never used for training without explicit institutional consent." },
        { id: "attendance", label: "Use attendance in early-warning signals", type: "toggle", value: false, help: "Enable only where legally and institutionally permitted." },
      ] },
    ],
  }),
};

/* ── chat & generator configs ── */
const CHAT: Record<string, Omit<ChatData, "template">> = {
  viva: { intro: "I'll act as your viva examiner for **Smart Campus AI**. I'll start with basics and follow up based on your answers.", suggestions: ["Start my project viva", "Ask me architecture questions", "Give me a tough follow-up on security"], context: ["Project: Smart Campus AI", "Stack: Python, FastAPI, React", "Mode: Technical viva"] },
  "group-discussion": { intro: "Welcome to the GD room. Three AI participants — **Asha** (pro), **Vikram** (against) and **Neha** (moderator) — will join you.", suggestions: ["Topic: Should AI be allowed in exams?", "Topic: Work from home vs office", "Give me feedback on my last point"], context: ["Mode: Group discussion", "Participants: 3 AI + you", "Duration: 10 minutes"] },
  languages: { intro: "Vanakkam! Choose a language and a mode — beginner, conversation, workplace, travel or academic. Listen → Speak → Correct → Repeat → Improve.", suggestions: ["Teach me basic Hindi greetings", "Workplace English: asking for a deadline extension", "Explain operating systems in Tamil"], context: ["UI language: English", "Learning: Hindi", "Mode: Conversation"] },
  research: { intro: "I can help you frame research questions, find and compare literature, and plan your paper. I will flag when a claim needs a verified source.", suggestions: ["Research questions on IoT for agriculture", "Compare approaches to handwriting OCR", "Outline an IEEE conference paper"], context: ["Field: Computer Science", "Level: UG"] },
  "campus-assistant": { intro: "Ask me anything about Anna Institute of Technology. I answer from **institution-approved sources** and cite them.", suggestions: ["Where is the placement office?", "What is the exam application process?", "How can I register for sports?"], context: ["Knowledge base: 8 approved documents", "Campus: Main"] },
  "policy-assistant": { intro: "I answer strictly from approved institutional documents. If a policy is not in the knowledge base, I'll say so rather than guess.", suggestions: ["What are the internal assessment rules?", "Minimum attendance for exam eligibility?", "Placement policy for students with offers"], context: ["Sources: Regulations 2021, IA Rules, Placement Policy 2026"] },
};

const GEN: Record<string, Omit<GeneratorData, "template">> = {
  "document-ai": { fields: [{ name: "task", label: "What should AI do?", type: "select", options: ["Summarise", "Create flashcards", "Generate questions", "Revision notes", "Extract key terms"] }, { name: "text", label: "Paste text from your document", type: "textarea", placeholder: "Paste notes or a section of a chapter…" }], cta: "Process document" },
  "job-prep": { fields: [{ name: "role", label: "Target role", type: "select", options: ["Software Engineer", "Data Analyst", "Data Scientist", "Cloud Engineer", "Product Manager", "Core Engineering (GET)"] }, { name: "company", label: "Company type", type: "select", options: ["Product company", "IT services", "Startup", "PSU / Government", "Core engineering"] }, { name: "weeks", label: "Weeks available", type: "number", defaultValue: "8" }], cta: "Build my preparation plan" },
  "project-ideas": { fields: [{ name: "department", label: "Department", type: "select", options: ["CSE", "IT", "ECE", "EEE", "Mechanical", "Civil", "AI & DS", "Management"] }, { name: "category", label: "Category", type: "select", options: ["AI/ML", "IoT", "Embedded Systems", "SaaS", "Cybersecurity", "FinTech", "HealthTech", "EdTech", "AgriTech", "GovTech", "ClimateTech", "Robotics", "EV", "Blockchain", "Industry 4.0"] }, { name: "skills", label: "Your skills", type: "text", placeholder: "Python, React, Arduino…" }, { name: "budget", label: "Budget (₹)", type: "number", defaultValue: "5000" }, { name: "team", label: "Team size", type: "number", defaultValue: "3" }], cta: "Generate project ideas" },
  "event-generator": { fields: [{ name: "brief", label: "Describe the event", type: "textarea", defaultValue: "Create a one-day technology event for 500 students." }, { name: "budget", label: "Budget (₹)", type: "number", defaultValue: "150000" }], cta: "Generate event plan" },
  copilot: { fields: [{ name: "tool", label: "Tool", type: "select", options: ["Lesson plan", "Lecture notes", "PPT outline", "Assignment", "Rubric", "Quiz", "Lab manual", "Remedial plan"] }, { name: "topic", label: "Topic", type: "text", defaultValue: "Database normalization" }, { name: "duration", label: "Duration (minutes)", type: "number", defaultValue: "45" }, { name: "level", label: "Level", type: "select", options: ["UG Year 1", "UG Year 2", "UG Year 3", "UG Year 4", "PG"] }], cta: "Generate" },
  "question-generator": { fields: [{ name: "course", label: "Course", type: "text", defaultValue: "CS3492 Database Management Systems" }, { name: "units", label: "Units", type: "select", options: ["Units 1–2", "Units 3–4", "Units 1–5"] }, { name: "marks", label: "Total marks", type: "number", defaultValue: "50" }, { name: "pattern", label: "Pattern", type: "select", options: ["Part A (2 marks) + Part B (13 marks)", "MCQ only", "Descriptive only"] }], cta: "Generate question paper" },
};

function fallback(mod: ModuleDef): ModuleData {
  return dashboard([k("Status", mod.phase, undefined, "sky")], [], [ins(mod.title, mod.description, "Module configuration")]);
}

const STREAM_RELABEL = new Set(["academic-tracker", "exam-prep", "class-analytics", "department-academics"]);

export async function moduleData(slug: string, collegeScope = "all"): Promise<ModuleData | null> {
  const mod = findModule(slug);
  if (!mod) return null;
  const builder = DATA[slug];
  if (builder) {
    const live: ScopeData = {
      stream: await collegeStream(collegeScope),
      admissions: slug === "admission-insights" ? await getStore().records.all(RESOURCES.admissions!, collegeScope) : [],
    };
    const data = await builder(collegeScope, live);
    if (data.template === "settings") {
      const saved = (await getStore().settings.get(collegeScope, slug))
        ?? (collegeScope !== "all" ? await getStore().settings.get("all", slug) : undefined);
      if (saved) {
        for (const section of data.sections) {
          for (const field of section.fields) {
            if (field.id in saved && saved[field.id] !== undefined) {
              field.value = saved[field.id]!;
            }
          }
        }
      }
    }
    // Generic academic dashboards use the college's own subjects (Anatomy, Accounts, DBMS …).
    if (data.template === "dashboard" && STREAM_RELABEL.has(slug)) return relabelSubjects(data, live.stream);
    return data;
  }
  if (mod.template === "chat") {
    const cfg = CHAT[slug];
    if (cfg) return { template: "chat", ...cfg };
  }
  if (mod.template === "generator") {
    const cfg = GEN[slug];
    if (cfg) return { template: "generator", ...cfg };
  }
  return fallback(mod);
}

// Exposed for tests: every registry module (except bespoke) must resolve to real data.
export const _hasData = (slug: string) => Boolean(DATA[slug] || CHAT[slug] || GEN[slug]);
export type { CalendarData };

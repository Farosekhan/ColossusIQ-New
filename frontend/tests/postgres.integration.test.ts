import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

/*
 * The API against a real PostgreSQL database (DATA_BACKEND=postgres).
 * Skipped unless TEST_DATABASE_URL points at a THROWAWAY database prepared with:
 *   npm run db:migrate && npm run db:seed && npm run db:dev-accounts      (DEV_PASSWORD from the env)
 * The tests add and change rows.
 */
const url = process.env.TEST_DATABASE_URL;
const PASSWORD = process.env.DEV_PASSWORD ?? "";
if (url) {
  process.env.DATA_BACKEND = "postgres";
  process.env.DATABASE_URL = url;
}

type Session = import("@/lib/auth/session").SessionPayload;
type Mods = {
  dispatch: typeof import("@/lib/api/mock/router").dispatch;
  withRequestContext: typeof import("@/lib/data").withRequestContext;
  publicCertificate: typeof import("@/lib/api/mock/learning").publicCertificate;
  accounts: typeof import("@/lib/auth/accounts");
  prisma: typeof import("@/lib/data/postgres/db").prisma;
  store: typeof import("@/lib/data").getStore;
  totp: typeof import("@/lib/auth/totp");
};
let m: Mods;

async function userId(email: string): Promise<string> {
  return (await m.prisma().user.findUniqueOrThrow({ where: { email }, select: { id: true } })).id;
}
async function as(email: string, role: Session["role"], college: string): Promise<Session> {
  return { sub: await userId(email), role, name: `Test ${role}`, tenant: "uni-tntu", college, mfa: true, exp: 9e9 };
}
/** One API call, exactly as the route handler runs it: one transaction with the session's RLS context. */
async function call(method: string, path: string, s: Session, body?: unknown, query = new URLSearchParams()) {
  return m.withRequestContext({ scope: s.college, sub: s.sub }, () => m.dispatch(method, path.split("/"), body, s, query));
}

// Each scenario makes many sequential database round trips; allow for a busy machine.
describe.skipIf(!url)("PostgreSQL backend", { timeout: 30_000 }, () => {
  beforeAll(async () => {
    const [router, data, learning, accounts, db, totp] = await Promise.all([
      import("@/lib/api/mock/router"),
      import("@/lib/data"),
      import("@/lib/api/mock/learning"),
      import("@/lib/auth/accounts"),
      import("@/lib/data/postgres/db"),
      import("@/lib/auth/totp"),
    ]);
    m = { dispatch: router.dispatch, withRequestContext: data.withRequestContext, publicCertificate: learning.publicCertificate, accounts, prisma: db.prisma, store: data.getStore, totp };
    expect(m.store().kind).toBe("postgres");
  });
  afterAll(async () => {
    await m?.prisma().$disconnect();
  });

  describe("records", () => {
    const application = {
      fullName: "Integration Applicant",
      dob: "2006-05-04",
      gender: "Female",
      email: "integration.applicant@example.com",
      phone: "9876501234",
      city: "Chennai",
      state: "Tamil Nadu",
      board: "State Board",
      hscPercent: 91,
      entranceScore: 180,
      program: "B.E. Computer Science & Engineering",
      quota: "Government",
      category: "BC",
      scholarship: false,
      hostel: true,
      guardianName: "Guardian Name",
      guardianPhone: "9876501235",
      guardianOccupation: "Teacher",
      status: "Applied",
      documents: ["10th mark sheet"],
      notes: "",
    };

    it("creates, reads, updates (with version checks) and deletes", async () => {
      const principal = await as("principal@ait.edu.in", "institution", "COL-1001");
      const created = await call("POST", "records/admissions", principal, { data: application });
      expect(created.status).toBe(201);
      const rec = created.body as { id: string; version: number; collegeId: string; documents: string[] };
      expect(rec.id).toMatch(/^ADM-\d{2}-\d+$/);
      expect(rec.collegeId).toBe("COL-1001");
      expect(rec.documents).toEqual(["10th mark sheet"]);

      const updated = await call("PUT", `records/admissions/${rec.id}`, principal, { data: { ...application, status: "Documents verified", documents: ["10th mark sheet", "12th mark sheet"] }, version: rec.version });
      expect(updated.status).toBe(200);
      expect(updated.body).toMatchObject({ status: "Documents verified", version: rec.version + 1 });
      // The database logged the status change.
      const history = await m.prisma().admissionStatusHistory.findMany({ where: { admission: { publicId: rec.id } } });
      expect(history.map((h) => h.toStatus)).toEqual(expect.arrayContaining(["Applied", "Documents_verified"]));

      const stale = await call("PUT", `records/admissions/${rec.id}`, principal, { data: application, version: rec.version });
      expect(stale.status).toBe(409);

      expect((await call("DELETE", `records/admissions/${rec.id}`, principal)).status).toBe(200);
      expect((await call("GET", `records/admissions/${rec.id}`, principal)).status).toBe(404);
    });

    it("applies stream rules and uniqueness", async () => {
      const principal = await as("principal@ait.edu.in", "institution", "COL-1001");
      expect((await call("POST", "records/admissions", principal, { data: { ...application, program: "MBBS" } })).status).toBe(409);
      expect((await call("POST", "records/admissions", principal, { data: { ...application, entranceScore: 650 } })).status).toBe(409);
      // A fresh code per run: the suite can be re-run on the same database.
      const code = `CS9${String(Date.now() % 1000).padStart(3, "0")}`;
      const course = { code, title: "Integration Course", department: "Computer Science & Engineering", semester: "4", credits: 3, courseType: "Theory", faculty: "Dr. Test", status: "Draft", description: "" };
      expect((await call("POST", "records/courses", principal, { data: course })).status).toBe(201);
      expect((await call("POST", "records/courses", principal, { data: course })).status).toBe(409);
    });

    it("keeps colleges apart, in the API and in the database itself", async () => {
      const ait = await as("principal@ait.edu.in", "institution", "COL-1001");
      const kaveri = await as("principal@kaveri.ac.in", "institution", "COL-1002");
      const list = (await call("GET", "records/admissions", ait, undefined, new URLSearchParams({ pageSize: "50" }))).body as { items: Array<{ id: string; collegeId: string }> };
      expect(list.items.length).toBeGreaterThan(0);
      expect(list.items.every((r) => r.collegeId === "COL-1001")).toBe(true);
      const foreign = list.items[0]!.id;
      expect((await call("GET", `records/admissions/${foreign}`, kaveri)).status).toBe(404);
      // Row-level security: even the store, asked directly inside COL-1002's context, cannot see it.
      const res = (await import("@/config/resources")).RESOURCES.admissions!;
      const direct = await m.withRequestContext({ scope: "COL-1002", sub: kaveri.sub }, () => m.store().records.get(res, foreign));
      expect(direct).toBeUndefined();
      // The Super Admin sees every college.
      const admin = await as("admin@tntu.edu.in", "admin", "all");
      const all = (await call("GET", "records/admissions", admin, undefined, new URLSearchParams({ pageSize: "50" }))).body as { items: Array<{ collegeId: string }> };
      expect(new Set(all.items.map((r) => r.collegeId)).size).toBeGreaterThan(3);
    });
  });

  describe("departments", () => {
    it("lists a college's departments with live figures, and keeps other colleges out", async () => {
      const ait = await as("principal@ait.edu.in", "institution", "COL-1001");
      const list = (await call("GET", "records/departments", ait, undefined, new URLSearchParams({ pageSize: "50" }))).body as { items: Array<{ id: string; department: string; head: string; faculty: number; students: number; programmes: number; readiness: number; collegeId: string }> };
      expect(list.items.every((r) => r.collegeId === "COL-1001")).toBe(true);
      const cse = list.items.find((r) => r.department === "Computer Science & Engineering")!;
      expect(cse.head).toBe("Dr. S. Venkatesh");
      expect(cse.faculty).toBeGreaterThanOrEqual(2);
      expect(cse.students).toBeGreaterThanOrEqual(2);
      expect(cse.programmes).toBeGreaterThanOrEqual(1);
      expect(cse.readiness).toBeGreaterThanOrEqual(0);
      const kaveri = await as("principal@kaveri.ac.in", "institution", "COL-1002");
      expect((await call("GET", `records/departments/${cse.id}`, kaveri)).status).toBe(404);
      // One row per department; the stream rule also holds in the database.
      const dup = await call("POST", "records/departments", ait, { data: { department: "Computer Science & Engineering", head: "", established: null, status: "Active", email: "", phone: "", notes: "" } });
      expect(dup.status).toBe(409);
      const { version } = ((await call("GET", `records/departments/${cse.id}`, ait)).body as { record: { version: number } }).record;
      const edited = await call("PUT", `records/departments/${cse.id}`, ait, { data: { department: "Computer Science & Engineering", head: "Dr. S. Venkatesh", established: 2001, status: "Active", email: "cse@ait.edu.in", phone: "9876543210", notes: "Integration" }, version });
      expect(edited.status).toBe(200);
      expect(edited.body).toMatchObject({ email: "cse@ait.edu.in", notes: "Integration" });
    });
  });

  describe("courses, quizzes and certificates", () => {
    it("publishes a course; a student completes it, passes and gets a verifiable certificate", async () => {
      const hod = await as("hod@ait.edu.in", "hod", "COL-1001");
      const student = await as("student2@ait.edu.in", "student", "COL-1001");
      const gen = await call("POST", "learning-courses/generate", hod, {
        department: "Computer Science & Engineering",
        title: "Operating Systems",
        level: "Intermediate (UG Year 2–3)",
        semester: "5",
        credits: 4,
        faculty: "Dr. Test",
        mode: "title",
      });
      expect(gen.status).toBe(201);
      type Detail = { id: string; version: number; units: Array<{ lessons: Array<{ id: string }> }>; quiz: { passMark: number; durationMin: number; questions: Array<{ prompt: string; options: string[]; answer: number; explanation: string; review: boolean }> } };
      let course = gen.body as Detail;
      expect(course.units.length).toBeGreaterThan(2);

      // Reload from the database: the whole course round-trips.
      const again = (await call("GET", `learning-courses/${course.id}`, hod)).body as Detail;
      expect(again.units).toEqual(course.units);

      const reviewed = { version: course.version, passMark: course.quiz.passMark, durationMin: course.quiz.durationMin, questions: course.quiz.questions.map((q) => ({ ...q, review: false })) };
      course = (await call("PUT", `learning-courses/${course.id}/quiz`, hod, reviewed)).body as Detail;
      const pub = await call("POST", `learning-courses/${course.id}/publish`, hod);
      expect(pub.status).toBe(200);
      expect(pub.body).toMatchObject({ status: "Published" });

      // The final assessment stays locked until every lesson is read, in order.
      const lessons = course.units.flatMap((u) => u.lessons);
      const view = (await call("GET", `learning-courses/${course.id}`, student)).body as { final: { quizId: string; unlocked: boolean } };
      expect(view.final.unlocked).toBe(false);
      expect((await call("POST", `learning-courses/${course.id}/lessons/${lessons[1]!.id}/complete`, student)).status).toBe(409);
      for (const l of lessons) expect((await call("POST", `learning-courses/${course.id}/lessons/${l.id}/complete`, student)).status).toBe(200);

      const answers = Object.fromEntries(course.quiz.questions.map((q, i) => [`q${i + 1}`, q.answer]));
      const result = await call("POST", `quizzes/${view.final.quizId}/submit`, student, { answers });
      expect(result.status).toBe(200);
      const r = result.body as { passed: boolean; certificateId: string };
      expect(r.passed).toBe(true);
      expect(r.certificateId).toMatch(/^CIQ-\d{4}-[A-F0-9]{8}$/);

      const pubCert = await m.withRequestContext({ scope: "all", readOnly: true }, () => m.publicCertificate(r.certificateId));
      expect(pubCert).toMatchObject({ valid: true, grade: "O" });
      // Answers are stored per question.
      const stored = await m.prisma().quizAttemptAnswer.count({ where: { attempt: { quiz: { publicId: view.final.quizId } } } });
      expect(stored).toBe(course.quiz.questions.length);

      // Readiness comes from the database view.
      const readiness = (await call("GET", "placement/me", student)).body as { readiness: { quizAverage: number; certificates: number } };
      expect(readiness.readiness.quizAverage).toBe(100);
      expect(readiness.readiness.certificates).toBeGreaterThanOrEqual(1);
    });

    it("limits a quiz to 3 attempts", async () => {
      const faculty = await as("faculty@ait.edu.in", "faculty", "COL-1001");
      const student = await as("student3@ait.edu.in", "student", "COL-1001");
      const created = await call("POST", "quizzes", faculty, {
        title: "Integration attempt-limit quiz",
        department: "Computer Science & Engineering",
        course: "DBMS",
        passMark: 50,
        durationMin: 10,
        certificateEnabled: false,
        status: "Published",
        questions: Array.from({ length: 3 }, (_, i) => ({ prompt: `Question number ${i + 1}`, options: ["a", "b", "c", "d"], answer: 1, explanation: "" })),
      });
      expect(created.status).toBe(201);
      const quiz = created.body as { id: string };
      for (let i = 0; i < 3; i++) expect((await call("POST", `quizzes/${quiz.id}/submit`, student, { answers: {} })).status).toBe(200);
      expect((await call("POST", `quizzes/${quiz.id}/submit`, student, { answers: {} })).status).toBe(409);
    });
  });

  describe("teaching and evaluation", () => {
    it("shares a class summary that students read", async () => {
      const faculty = await as("faculty@ait.edu.in", "faculty", "COL-1001");
      const student = await as("student1@ait.edu.in", "student", "COL-1001");
      const shared = await call("POST", "teaching/summaries", faculty, {
        title: "Integration class summary",
        topic: "Transactions",
        department: "Computer Science & Engineering",
        courseTitle: null,
        date: "2026-09-28",
        points: ["ACID properties keep data consistent."],
        homework: "",
        nextClass: "",
        resources: [],
        infographic: null,
      });
      expect(shared.status).toBe(201);
      const id = (shared.body as { id: string }).id;
      expect((await call("POST", `teaching/summaries/${id}/read`, student)).status).toBe(200);
      const mine = (await call("GET", "teaching/summaries", faculty)).body as Array<{ id: string; readCount: number }>;
      expect(mine.find((s) => s.id === id)?.readCount).toBe(1);
      const booster = (await call("GET", "teaching/booster", faculty)).body as { tasks: Array<{ id: string; count: number }> };
      expect(booster.tasks.find((t) => t.id === "summaries")!.count).toBeGreaterThanOrEqual(1);
    });

    it("keeps the reason for a score override", async () => {
      const faculty = await as("faculty@ait.edu.in", "faculty", "COL-1001");
      const student = await m.prisma().student.findFirstOrThrow({ where: { user: { email: "student1@ait.edu.in" } } });
      const fresh = await m.prisma().evaluationItem.create({
        data: { collegeId: student.collegeId, studentId: student.id, assignedTo: faculty.sub, assessment: "Integration test", question: "Explain 3NF.", answer: "No transitive dependencies…", aiResult: { rubric: [], evidence: [], missing: [], feedback: "" }, aiScore: 6, maxScore: 10, confidence: 0.8 },
      });
      const queue = (await call("GET", "evaluations/queue", faculty)).body as Array<{ id: string; status: string }>;
      const item = queue.find((q) => q.id === fresh.id)!;
      const res = await call("POST", `evaluations/${item.id}/override`, faculty, { finalScore: 8, reason: "Worked example was correct" });
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ status: "overridden", finalScore: 8 });
      const o = await m.prisma().evaluationOverride.findFirstOrThrow({ where: { itemId: item.id } });
      expect(o.reason).toBe("Worked example was correct");
    });
  });

  describe("sign-in", () => {
    it.skipIf(PASSWORD.length < 8)("checks the password, the role in that college, and locks after 5 failures", async () => {
      const ok = await m.accounts.authenticate({ email: "hod@ait.edu.in", password: PASSWORD, role: "hod", college: "COL-1001" });
      expect(ok.ok).toBe(true);
      expect((await m.accounts.authenticate({ email: "hod@ait.edu.in", password: PASSWORD, role: "hod", college: "COL-1002" })).ok).toBe(false);
      expect((await m.accounts.authenticate({ email: "nobody@ait.edu.in", password: PASSWORD, role: "hod", college: "COL-1001" })).ok).toBe(false);

      for (let i = 0; i < 5; i++) expect((await m.accounts.authenticate({ email: "placement@ait.edu.in", password: "wrong-password", role: "placement", college: "COL-1001" })).ok).toBe(false);
      const locked = await m.accounts.authenticate({ email: "placement@ait.edu.in", password: PASSWORD, role: "placement", college: "COL-1001" });
      expect(locked).toMatchObject({ ok: false, locked: true });
    });

    it("verifies authenticator codes, and the dev code only without one", async () => {
      process.env.MFA_ENCRYPTION_KEY ??= "k".repeat(40);
      const s = await as("faculty@kongu.edu.in", "faculty", "COL-1003");
      const secret = m.totp.newTotpSecret();
      await m.prisma().userMfa.upsert({ where: { userId: s.sub }, create: { userId: s.sub, totpSecretEncrypted: m.totp.encryptSecret(secret) }, update: { totpSecretEncrypted: m.totp.encryptSecret(secret) } });
      expect(await m.accounts.verifySecondFactor(s, m.totp.totp(secret))).toBe("ok");
      expect(await m.accounts.verifySecondFactor(s, "246810")).toBe("invalid");
      const noApp = await as("hod@csm.edu.in", "hod", "COL-1004");
      expect(await m.accounts.verifySecondFactor(noApp, "246810")).toBe("ok");
    });
  });
});

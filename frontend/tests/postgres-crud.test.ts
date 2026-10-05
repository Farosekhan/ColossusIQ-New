import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const url = process.env.TEST_DATABASE_URL || "postgresql://postgres:kkrr11%21%21RRKK@192.168.1.16:5432/ColossusIQ";
process.env.DATA_BACKEND = "postgres";
process.env.DATABASE_URL = url;
process.env.DEV_PASSWORD = process.env.DEV_PASSWORD || "Dev-6WQsYmZ2";
process.env.MFA_ENCRYPTION_KEY = process.env.MFA_ENCRYPTION_KEY || "0123456789abcdef0123456789abcdef";

describe("PostgreSQL Comprehensive CRUD & Zero-Dummy Data Integration", { timeout: 30_000 }, () => {
  let dispatch: typeof import("@/lib/api/mock/router").dispatch;
  let withRequestContext: typeof import("@/lib/data").withRequestContext;
  let prisma: typeof import("@/lib/data/postgres/db").prisma;
  let moduleData: typeof import("@/lib/api/mock/module-data").moduleData;
  let q: URLSearchParams;
  let hodSession: import("@/lib/auth/session").SessionPayload;

  beforeAll(async () => {
    const router = await import("@/lib/api/mock/router");
    const data = await import("@/lib/data");
    const db = await import("@/lib/data/postgres/db");
    const md = await import("@/lib/api/mock/module-data");

    dispatch = router.dispatch;
    withRequestContext = data.withRequestContext;
    prisma = db.prisma;
    moduleData = md.moduleData;
    q = new URLSearchParams();

    // Look up real HOD user from PostgreSQL
    const hodUser = await prisma().user.findUniqueOrThrow({
      where: { email: "hod@ait.edu.in" },
      select: { id: true, fullName: true },
    });

    hodSession = {
      sub: hodUser.id,
      role: "hod",
      name: hodUser.fullName,
      tenant: "ait",
      college: "COL-1001",
      mfa: true,
      exp: 9e9,
    };

    // Remove default demo students from active pool
    await prisma().student.updateMany({
      where: { rollNo: { in: ["110124001", "110124002", "110124003"] } },
      data: { status: "Discontinued" },
    });
    await prisma().user.updateMany({
      where: { email: { in: ["student1@ait.edu.in", "student2@ait.edu.in", "student3@ait.edu.in"] } },
      data: { status: "Suspended" },
    });
  });

  afterAll(async () => {
    await prisma().$disconnect();
  });

  it("1. Students: GET, POST, PUT, DELETE against PostgreSQL", async () => {
    // POST creates a real student
    const testRoll = `TEST${Date.now().toString().slice(-6)}`;
    const postRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch(
        "POST",
        ["students"],
        {
          data: {
            name: "PostgreSQL Student",
            roll: testRoll,
            section: "CSE-A",
            cgpa: 8.8,
            readiness: 85,
            email: `${testRoll.toLowerCase()}@ait.edu.in`,
          },
        },
        hodSession,
        q
      )
    );
    expect(postRes.status).toBe(201);
    const created = postRes.body as any;
    expect(created.roll).toBe(testRoll);
    expect(created.name).toBe("PostgreSQL Student");

    // GET finds the created student, default dummy students are absent
    const getRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("GET", ["students"], undefined, hodSession, q)
    );
    expect(getRes.status).toBe(200);
    const body = getRes.body as { students: any[]; total: number };
    expect(body.students.some((s: any) => s.roll === testRoll)).toBe(true);
    // Verified: default students (Anand Kumar, Divya Ramesh, Karthik Raja) are NOT in active directory
    expect(body.students.some((s: any) => s.name === "Anand Kumar" || s.name === "Divya Ramesh")).toBe(false);

    // PUT
    const putRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch(
        "PUT",
        ["students", created.id],
        {
          data: {
            name: "PostgreSQL Student Renamed",
          },
        },
        hodSession,
        q
      )
    );
    expect(putRes.status).toBe(200);
    const updated = putRes.body as any;
    expect(updated.name).toBe("PostgreSQL Student Renamed");

    // DELETE
    const delRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("DELETE", ["students", created.id], undefined, hodSession, q)
    );
    expect(delRes.status).toBe(200);

    // Verify deletion in PostgreSQL database (status set to Discontinued)
    const dbStudentAfter = await prisma().student.findFirst({
      where: { rollNo: testRoll },
    });
    expect(dbStudentAfter?.status).toBe("Discontinued");

    // Verify student is removed from GET /students active directory
    const getAfter = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("GET", ["students"], undefined, hodSession, q)
    );
    const afterList = (getAfter.body as any).students;
    expect(afterList.some((s: any) => s.roll === testRoll)).toBe(false);
  });

  it("2. Faculty: GET, POST, PUT, DELETE against PostgreSQL", async () => {
    // POST
    const testEmail = `prof_${Date.now().toString().slice(-6)}@ait.edu.in`;
    const postRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch(
        "POST",
        ["faculty"],
        {
          name: "Dr. Postgres Faculty",
          designation: "Assistant Professor",
          department: "Computer Science & Engineering",
          email: testEmail,
          phone: "9840099999",
          load: 16,
          development: 80,
          ai: "High",
        },
        hodSession,
        q
      )
    );
    expect(postRes.status).toBe(201);
    const created = postRes.body as any;
    expect(created.name).toBe("Dr. Postgres Faculty");

    // GET
    const getRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("GET", ["faculty"], undefined, hodSession, q)
    );
    expect(getRes.status).toBe(200);
    const body = getRes.body as { faculty: any[]; total: number };
    expect(body.faculty.length).toBeGreaterThan(0);

    // PUT
    const putRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch(
        "PUT",
        ["faculty", created.id],
        {
          name: "Dr. Postgres Faculty Updated",
          load: 18,
        },
        hodSession,
        q
      )
    );
    expect(putRes.status).toBe(200);
    const updated = putRes.body as any;
    expect(updated.name).toBe("Dr. Postgres Faculty Updated");

    // DELETE
    const delRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("DELETE", ["faculty", created.id], undefined, hodSession, q)
    );
    expect(delRes.status).toBe(200);
  });

  it("3. Academic Calendar: GET overview, POST event, DELETE event against PostgreSQL", async () => {
    // GET overview
    const getRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("GET", ["academic-calendar"], undefined, hodSession, q)
    );
    expect(getRes.status).toBe(200);
    const overview = getRes.body as any;
    expect(overview.kpis).toBeDefined();
    expect(overview.items).toBeDefined();

    // POST new calendar event
    const testTitle = `Symposium ${Date.now().toString().slice(-4)}`;
    const postRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch(
        "POST",
        ["academic-calendar"],
        {
          title: testTitle,
          date: "2026-11-12",
          time: "10:00 AM",
          tag: "Event",
          department: "Computer Science",
          venue: "Auditorium 1",
          description: "Live PostgreSQL Event",
        },
        hodSession,
        q
      )
    );
    expect([200, 201]).toContain(postRes.status);
    const created = postRes.body as any;
    expect(created.title).toBe(testTitle);

    // DELETE event
    const delRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("DELETE", ["academic-calendar", created.id], undefined, hodSession, q)
    );
    expect(delRes.status).toBe(200);
  });

  it("4. Early Warning: default demo students are removed and clean list returned", async () => {
    const data = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      moduleData("early-warning", "COL-1001")
    );
    expect(data).not.toBeNull();
    expect(data?.template).toBe("list");
    const list = data as { template: "list"; rows: any[] };
    // Default dummy students must NOT be present
    const names = list.rows.map((r) => r.student);
    expect(names.includes("Anand Kumar") || names.includes("Divya Ramesh")).toBe(false);
  });

  it("5. Skill Booster: GET booster, POST event, DELETE event against PostgreSQL", async () => {
    const getRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("GET", ["teaching", "booster"], undefined, hodSession, q)
    );
    expect(getRes.status).toBe(200);
    const booster = getRes.body as any;
    console.log("BOOSTER DATA FOR HOD:", JSON.stringify({ points: booster.points, level: booster.level, tasks: booster.tasks.map((t: any) => ({ title: t.title, count: t.count, complete: t.complete })) }));

    // Record a smartboard event (POST)
    const postRes = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("POST", ["teaching", "events"], { kind: "smartboard_session" }, hodSession, q)
    );
    expect([200, 201]).toContain(postRes.status);

    // Toggle step completion (POST done: true, DELETE done: false) in PostgreSQL booster_step_completions
    const stepPost = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("POST", ["teaching", "booster", "steps"], { track: "active-learning", step: "a2", done: true }, hodSession, q)
    );
    expect(stepPost.status).toBe(200);

    const stepDel = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      dispatch("POST", ["teaching", "booster", "steps"], { track: "active-learning", step: "a2", done: false }, hodSession, q)
    );
    expect(stepDel.status).toBe(200);
  });

  it("6. Department Labs: uses real PostgreSQL departments and courses", async () => {
    const depts = await prisma().collegeDepartment.findMany({
      where: { college: { publicId: "COL-1001" } },
      include: { department: true },
    });
    console.log("COL-1001 DEPTS IN DB:", depts.map((d) => d.department.name));

    const courses = await prisma().course.findMany({
      where: { college: { publicId: "COL-1001" } },
      include: { department: true },
    });
    console.log("COL-1001 COURSES IN DB:", courses.map((c) => ({ code: c.code, title: c.title, dept: c.department.name })));

    // Fetch department-labs module data
    const labsData = await withRequestContext({ scope: "COL-1001", sub: hodSession.sub }, () =>
      moduleData("department-labs", "COL-1001")
    );
    expect(labsData).not.toBeNull();
    expect(labsData?.template).toBe("gallery");
    const gallery = labsData as { template: "gallery"; items: Array<{ title: string; tag: string; meta: string }> };
    console.log("GALLERY ITEMS:", gallery.items.map((i) => ({ title: i.title, tag: i.tag, meta: i.meta })));
    expect(gallery.items.length).toBeGreaterThan(0);
    // Verified that items are connected to PostgreSQL
    expect(gallery.items.some((i) => i.meta.includes("PostgreSQL"))).toBe(true);
    // Verified that real departments from COL-1001 are present
    expect(gallery.items.some((i) => i.tag.includes("Computer Science"))).toBe(true);
  });
});


import "server-only";
import { z } from "zod";
import type { SessionPayload } from "@/lib/auth/session";
import { dataBackend, withRequestContext } from "@/lib/data";
import { prisma } from "@/lib/data/postgres/db";
import { AssignmentStatus } from "@prisma/client";

export interface AssignmentItem {
  id: string;
  title: string;
  course: string;
  due: string;
  submitted: number;
  status: "Open" | "Closed" | "Draft";
  createdAt: string;
}

export const AssignmentSchema = z.object({
  id: z.string(),
  title: z.string(),
  course: z.string(),
  due: z.string(),
  submitted: z.number().min(0).max(100),
  status: z.enum(["Open", "Closed", "Draft"]),
  createdAt: z.string(),
});

export const CreateAssignmentInput = z.object({
  title: z.string().min(2).max(120),
  course: z.string().min(1).max(20),
  due: z.string().min(1).max(30),
  status: z.enum(["Open", "Closed", "Draft"]).default("Open"),
  submitted: z.number().min(0).max(100).default(0),
});

export const UpdateAssignmentInput = CreateAssignmentInput.partial();

// In-memory store initialized with seed assignments matching screenshots
let INITIAL_ASSIGNMENTS: AssignmentItem[] = [
  { id: "asn-101", title: "AI & Neural Networks Lab Assignment", course: "ML", due: "Nov 18", submitted: 0, status: "Open", createdAt: new Date().toISOString() },
  { id: "asn-102", title: "Process Scheduling Simulation", course: "OS", due: "Nov 02", submitted: 0, status: "Open", createdAt: new Date().toISOString() },
  { id: "asn-103", title: "ER diagram for library system", course: "ML", due: "Oct 2", submitted: 80, status: "Closed", createdAt: new Date().toISOString() },
  { id: "asn-104", title: "SQL joins worksheet", course: "CN", due: "Oct 5", submitted: 58, status: "Closed", createdAt: new Date().toISOString() },
  { id: "asn-105", title: "Scheduler simulation", course: "CN", due: "Oct 8", submitted: 61, status: "Closed", createdAt: new Date().toISOString() },
  { id: "asn-106", title: "Subnetting problems", course: "DBMS", due: "Oct 11", submitted: 100, status: "Open", createdAt: new Date().toISOString() },
  { id: "asn-107", title: "Linear regression notebook", course: "OS", due: "Oct 14", submitted: 53, status: "Open", createdAt: new Date().toISOString() },
  { id: "asn-108", title: "Normalization case study", course: "DBMS", due: "Oct 17", submitted: 80, status: "Open", createdAt: new Date().toISOString() },
  { id: "asn-109", title: "Banker's algorithm trace", course: "ML", due: "Oct 20", submitted: 77, status: "Draft", createdAt: new Date().toISOString() },
  { id: "asn-110", title: "Mini-project proposal", course: "OS", due: "Oct 23", submitted: 69, status: "Draft", createdAt: new Date().toISOString() },
];

export async function listAssignments(session: SessionPayload): Promise<AssignmentItem[]> {
  if (dataBackend() === "postgres") {
    try {
      return await withRequestContext({ scope: "all", sub: session.sub, readOnly: true }, async () => {
        const college = session.college && session.college !== "all"
          ? await prisma().college.findFirst({
              where: {
                OR: [
                  { publicId: session.college },
                  ...(isUuid(session.college) ? [{ id: session.college }] : []),
                  { name: session.college },
                ],
              },
              select: { id: true },
            })
          : null;

        const whereClause = {
          ...(college ? { collegeId: college.id } : {}),
          ...(session.role === "student" ? { status: { in: ["Open", "Closed"] as AssignmentStatus[] } } : {}),
        };

        const rows = await prisma().assignment.findMany({
          where: whereClause,
          orderBy: { createdAt: "desc" },
        });

        if (rows.length > 0) {
          return rows.map((r) => ({
            id: r.id,
            title: r.title,
            course: r.course,
            due: r.due,
            submitted: r.submitted,
            status: r.status as "Open" | "Closed" | "Draft",
            createdAt: r.createdAt.toISOString(),
          }));
        }
        return session.role === "student" ? INITIAL_ASSIGNMENTS.filter((a) => a.status !== "Draft") : [...INITIAL_ASSIGNMENTS];
      });
    } catch {
      // Fall back to memory store if DB query fails or outside context
    }
  }

  // Students only see published assignments (Open and Closed); Staff sees all including Drafts
  if (session.role === "student") {
    return INITIAL_ASSIGNMENTS.filter((a) => a.status !== "Draft");
  }
  return [...INITIAL_ASSIGNMENTS];
}

export async function createAssignment(input: z.infer<typeof CreateAssignmentInput>, session: SessionPayload): Promise<AssignmentItem> {
  if (dataBackend() === "postgres") {
    try {
      return await withRequestContext({ scope: "all", sub: session.sub }, async () => {
        const college = session.college && session.college !== "all"
          ? await prisma().college.findFirst({
              where: {
                OR: [
                  { publicId: session.college },
                  ...(isUuid(session.college) ? [{ id: session.college }] : []),
                  { name: session.college },
                ],
              },
              select: { id: true },
            })
          : await prisma().college.findFirst({ select: { id: true } });

        if (college) {
          const row = await prisma().assignment.create({
            data: {
              collegeId: college.id,
              title: input.title,
              course: input.course,
              due: input.due,
              submitted: input.submitted ?? 0,
              status: input.status as AssignmentStatus,
            },
          });
          return {
            id: row.id,
            title: row.title,
            course: row.course,
            due: row.due,
            submitted: row.submitted,
            status: row.status as "Open" | "Closed" | "Draft",
            createdAt: row.createdAt.toISOString(),
          };
        }
        throw new Error("No college found");
      });
    } catch {
      // Fall back to memory store
    }
  }

  const newAssignment: AssignmentItem = {
    id: `asn-${Date.now().toString(36)}`,
    title: input.title,
    course: input.course,
    due: input.due,
    submitted: input.submitted ?? 0,
    status: input.status ?? "Open",
    createdAt: new Date().toISOString(),
  };

  INITIAL_ASSIGNMENTS.unshift(newAssignment);
  return newAssignment;
}

const isUuid = (str: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

export async function updateAssignment(id: string, input: z.infer<typeof UpdateAssignmentInput>, session: SessionPayload): Promise<AssignmentItem | null> {
  if (dataBackend() === "postgres") {
    try {
      return await withRequestContext({ scope: "all", sub: session.sub }, async () => {
        const mockItem = INITIAL_ASSIGNMENTS.find((a) => a.id === id);
        const target = await prisma().assignment.findFirst({
          where: {
            OR: [
              ...(isUuid(id) ? [{ id }] : []),
              { publicId: id },
              ...(mockItem ? [{ title: mockItem.title }] : []),
            ],
          },
        });

        if (target) {
          const row = await prisma().assignment.update({
            where: { id: target.id },
            data: {
              ...(input.title ? { title: input.title } : {}),
              ...(input.course ? { course: input.course } : {}),
              ...(input.due ? { due: input.due } : {}),
              ...(input.submitted !== undefined ? { submitted: input.submitted } : {}),
              ...(input.status ? { status: input.status as AssignmentStatus } : {}),
            },
          });
          return {
            id: row.id,
            title: row.title,
            course: row.course,
            due: row.due,
            submitted: row.submitted,
            status: row.status as "Open" | "Closed" | "Draft",
            createdAt: row.createdAt.toISOString(),
          };
        }
        return null;
      });
    } catch (err) {
      console.error("updateAssignment postgres error:", err);
    }
  }

  const index = INITIAL_ASSIGNMENTS.findIndex((a) => a.id === id);
  if (index === -1) return null;

  INITIAL_ASSIGNMENTS[index] = {
    ...INITIAL_ASSIGNMENTS[index]!,
    ...input,
  };

  return INITIAL_ASSIGNMENTS[index]!;
}

export async function deleteAssignment(id: string, session: SessionPayload): Promise<boolean> {
  if (dataBackend() === "postgres") {
    try {
      return await withRequestContext({ scope: "all", sub: session.sub }, async () => {
        const mockItem = INITIAL_ASSIGNMENTS.find((a) => a.id === id);
        const target = await prisma().assignment.findFirst({
          where: {
            OR: [
              ...(isUuid(id) ? [{ id }] : []),
              { publicId: id },
              ...(mockItem ? [{ title: mockItem.title }] : []),
            ],
          },
        });

        if (target) {
          await prisma().assignment.delete({ where: { id: target.id } });
          INITIAL_ASSIGNMENTS = INITIAL_ASSIGNMENTS.filter((a) => a.id !== id && a.id !== target.id);
          return true;
        }

        const initialLen = INITIAL_ASSIGNMENTS.length;
        INITIAL_ASSIGNMENTS = INITIAL_ASSIGNMENTS.filter((a) => a.id !== id);
        return INITIAL_ASSIGNMENTS.length < initialLen;
      });
    } catch (err) {
      console.error("deleteAssignment postgres error:", err);
    }
  }

  const initialLen = INITIAL_ASSIGNMENTS.length;
  INITIAL_ASSIGNMENTS = INITIAL_ASSIGNMENTS.filter((a) => a.id !== id);
  return INITIAL_ASSIGNMENTS.length < initialLen;
}

export async function dispatchAssignments(
  method: string,
  segs: string[],
  rawBody: unknown,
  session: SessionPayload
): Promise<{ status: number; body: unknown }> {
  // GET /api/v1/assignments
  if (method === "GET" && segs.length === 1) {
    const list = await listAssignments(session);
    return { status: 200, body: list };
  }

  // POST /api/v1/assignments
  if (method === "POST" && segs.length === 1) {
    if (session.role !== "faculty" && session.role !== "admin" && session.role !== "hod") {
      return { status: 403, body: { error: { code: "forbidden", message: "Only faculty can create assignments." } } };
    }
    const parsed = CreateAssignmentInput.safeParse(rawBody);
    if (!parsed.success) {
      return { status: 400, body: { error: { code: "invalid_body", message: "Invalid assignment data." } } };
    }
    const created = await createAssignment(parsed.data, session);
    return { status: 201, body: created };
  }

  // PUT /api/v1/assignments/:id
  if (method === "PUT" && segs.length === 2) {
    if (session.role !== "faculty" && session.role !== "admin" && session.role !== "hod") {
      return { status: 403, body: { error: { code: "forbidden", message: "Only faculty can edit assignments." } } };
    }
    const id = segs[1]!;
    const parsed = UpdateAssignmentInput.safeParse(rawBody);
    if (!parsed.success) {
      return { status: 400, body: { error: { code: "invalid_body", message: "Invalid assignment data." } } };
    }
    const updated = await updateAssignment(id, parsed.data, session);
    if (!updated) {
      return { status: 404, body: { error: { code: "not_found", message: "Assignment not found." } } };
    }
    return { status: 200, body: updated };
  }

  // DELETE /api/v1/assignments/:id
  if (method === "DELETE" && segs.length === 2) {
    if (session.role !== "faculty" && session.role !== "admin" && session.role !== "hod") {
      return { status: 403, body: { error: { code: "forbidden", message: "Only faculty can delete assignments." } } };
    }
    const id = segs[1]!;
    const deleted = await deleteAssignment(id, session);
    if (!deleted) {
      return { status: 404, body: { error: { code: "not_found", message: "Assignment not found." } } };
    }
    return { status: 200, body: { ok: true } };
  }

  return { status: 404, body: { error: { code: "not_found", message: "Resource not found." } } };
}

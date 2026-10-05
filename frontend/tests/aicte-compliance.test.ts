import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { dispatch } from "@/lib/api/mock/router";
import type { SessionPayload } from "@/lib/auth/session";
import { AicteComplianceData } from "@/lib/api/schemas";

const session = (role: SessionPayload["role"], college = "COL-1001"): SessionPayload => ({
  sub: `test-${role}`,
  role,
  name: "Dr. Lakshmi Sundaram",
  tenant: "t",
  college,
  mfa: true,
  exp: 9e9,
});

const q = new URLSearchParams();

describe("aicte-compliance API", () => {
  const inst = session("institution");

  it("fetches comprehensive dynamic AICTE compliance overview", async () => {
    const res = await dispatch("GET", ["aicte-compliance"], undefined, inst, q);
    expect(res.status).toBe(200);

    const parsed = AicteComplianceData.safeParse(res.body);
    expect(parsed.success).toBe(true);

    const data = res.body as AicteComplianceData;
    expect(data.college.id).toBe("COL-1001");
    expect(data.college.pid).toBe("1-1101-AICTE-TN");
    expect(data.overallScore).toBeGreaterThan(0);
    expect(data.kpis).toHaveLength(4);
    expect(data.norms.length).toBeGreaterThanOrEqual(6);
    expect(data.committees).toHaveLength(6);
    expect(data.departments.length).toBeGreaterThan(0);

    // Verify statutory committees
    const committeeNames = data.committees.map((c) => c.name);
    expect(committeeNames).toContain("Anti-Ragging Committee & Squad");
    expect(committeeNames).toContain("Internal Complaints Committee (ICC) / POSH");
    expect(committeeNames).toContain("Student Grievance Redressal Committee (SGRC)");
    expect(committeeNames).toContain("SC / ST Committee & Equal Opportunity Cell");
    expect(committeeNames).toContain("Internal Quality Assurance Cell (IQAC)");
    expect(committeeNames).toContain("Industry-Institute Interaction Cell (IIIC) & Placement");

    // Verify FSR and cadre norms
    const fsrNorm = data.norms.find((n) => n.id === "NORM-FSR");
    expect(fsrNorm).toBeDefined();
    expect(fsrNorm?.status).toBe("Compliant");

    const cadreNorm = data.norms.find((n) => n.id === "NORM-CADRE");
    expect(cadreNorm).toBeDefined();
  });

  it("creates a new compliance action item", async () => {
    const newAction = {
      title: "Verify High-Speed Internet Bandwidth for Lab 3",
      category: "Infrastructure & Labs",
      priority: "High" as const,
      assignedTo: "Network Administrator",
      dueDate: "2026-11-15",
      notes: "Ensure 1 Gbps leased line connectivity meeting AICTE minimum computational norm.",
    };

    const res = await dispatch("POST", ["aicte-compliance", "actions"], newAction, inst, q);
    expect(res.status).toBe(200);
    const body = res.body as { id: string; title: string; status: string };
    expect(body.title).toBe(newAction.title);
    expect(body.status).toBe("Open");

    // Verify it appears in overview
    const overviewRes = await dispatch("GET", ["aicte-compliance"], undefined, inst, q);
    const overview = overviewRes.body as AicteComplianceData;
    expect(overview.actions.some((a) => a.id === body.id)).toBe(true);

    // Update status to Resolved
    const updateRes = await dispatch(
      "PATCH",
      ["aicte-compliance", "actions", body.id],
      { actionId: body.id, status: "Resolved" },
      inst,
      q
    );
    expect(updateRes.status).toBe(200);
    const updated = updateRes.body as { ok: boolean; action: { status: string } };
    expect(updated.ok).toBe(true);
    expect(updated.action.status).toBe("Resolved");
  });

  it("restricts access to unauthorized roles", async () => {
    const studentSession = session("student");
    const res = await dispatch("GET", ["aicte-compliance"], undefined, studentSession, q);
    expect(res.status).toBe(403);

    const postRes = await dispatch("POST", ["aicte-compliance", "actions"], { title: "Test" }, studentSession, q);
    expect(postRes.status).toBe(403);
  });

  it("exports valid CSV structure from compliance data", async () => {
    const { toCsv } = await import("@/lib/csv");
    const res = await dispatch("GET", ["aicte-compliance"], undefined, inst, q);
    const data = res.body as AicteComplianceData;

    const rows: unknown[][] = [
      ["AICTE Compliance Evaluation Report", data.college.name, `PID: ${data.college.pid}`, `AY: ${data.academicYear}`],
      [],
      ["Norm ID", "Category", "Norm Name", "Requirement", "Actual Value", "Score (%)", "Status", "Notes"],
      ...data.norms.map((n) => [
        n.id,
        n.category,
        n.name,
        n.normRequirement,
        n.actualValue,
        `${n.score}%`,
        n.status,
        n.deficiencyNotes,
      ]),
    ];

    const csv = toCsv(rows);
    expect(typeof csv).toBe("string");
    expect(csv).toContain("AICTE Compliance Evaluation Report");
    expect(csv).toContain(data.college.pid);
    expect(csv).toContain("Faculty-Student Ratio (FSR)");
  });
});


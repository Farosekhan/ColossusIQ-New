"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { z } from "zod";
import {
  AicteActionItem,
  AicteComplianceData,
  CreateAicteActionInput,
  type AicteCommittee,
  type AicteDepartmentCompliance,
  type AicteNormItem,
} from "@/lib/api/schemas";
import { toCsv } from "@/lib/csv";
import { TemplateSkeleton } from "@/components/modules/shared";
import { ChartCard } from "@/components/charts/chart-card";
import { Fi } from "@/components/ui/icon";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Progress,
  Spinner,
  inputClass,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth/roles";
import Link from "next/link";

type TabKey = "scorecard" | "departments" | "committees" | "actions";

export function AicteComplianceModule({ role }: { role: Role }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("scorecard");
  const [selectedDept, setSelectedDept] = useState<string>("All Departments");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [actionStatusFilter, setActionStatusFilter] = useState<string>("All Statuses");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  // Modals state
  const [showAddActionModal, setShowAddActionModal] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState("");
  const [newCategory, setNewCategory] = useState("Statutory Committees");
  const [newPriority, setNewPriority] = useState<"High" | "Medium" | "Low">("High");
  const [newAssignee, setNewAssignee] = useState("");
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10)
  );
  const [newNotes, setNewNotes] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["aicte-compliance"],
    queryFn: () => apiFetch("/api/v1/aicte-compliance", AicteComplianceData),
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setIsRefreshing(false);
    setFlashMessage("Compliance metrics synchronized with live institutional data.");
    setTimeout(() => setFlashMessage(null), 4000);
  };

  // Add Action Mutation
  const addActionMutation = useMutation({
    mutationFn: (input: CreateAicteActionInput) =>
      apiFetch("/api/v1/aicte-compliance/actions", AicteActionItem, {
        method: "POST",
        body: input,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aicte-compliance"] });
      setShowAddActionModal(false);
      setNewTitle("");
      setNewNotes("");
      setFlashMessage("New AICTE compliance action logged successfully.");
      setTimeout(() => setFlashMessage(null), 4000);
    },
    onError: (err: unknown) => {
      setFormError(err instanceof ApiError ? err.message : "Failed to record compliance action.");
    },
  });

  // Update Action Status Mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ actionId, status }: { actionId: string; status: "Open" | "In Progress" | "Resolved" }) =>
      apiFetch(`/api/v1/aicte-compliance/actions/${actionId}`, z.any(), {
        method: "PATCH",
        body: { actionId, status },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["aicte-compliance"] });
      setFlashMessage("Action status updated.");
      setTimeout(() => setFlashMessage(null), 3000);
    },
  });

  const handleSubmitAction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setFormError("Action title is required.");
      return;
    }
    const assignee = newAssignee.trim() || (data?.availableFaculty[0] ?? "Principal Office");
    setFormError(null);
    addActionMutation.mutate({
      title: newTitle.trim(),
      category: newCategory,
      priority: newPriority,
      assignedTo: assignee,
      dueDate: newDueDate,
      notes: newNotes.trim(),
    });
  };

  const handleExportCsv = () => {
    if (!data) return;
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
      [],
      ["Department", "Enrolled Students", "Teaching Faculty", "Dept FSR", "Cadre (Prof / Assoc / Asst)", "Courses", "Labs", "Status"],
      ...data.departments.map((d) => [
        d.department,
        d.studentsCount,
        d.facultyCount,
        d.fsrRatio,
        `${d.professors} Prof / ${d.assocProfessors} Assoc / ${d.asstProfessors} Asst`,
        d.coursesCount,
        d.labCoursesCount,
        d.status,
      ]),
    ];

    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aicte-compliance-report-${data.college.code}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredDepartments = useMemo(() => {
    if (!data) return [];
    return data.departments.filter((d) => {
      if (selectedDept !== "All Departments" && d.department !== selectedDept) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        if (!d.department.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  }, [data, selectedDept, searchQuery]);

  const filteredActions = useMemo(() => {
    if (!data) return [];
    return data.actions.filter((a) => {
      if (actionStatusFilter !== "All Statuses" && a.status !== actionStatusFilter) return false;
      return true;
    });
  }, [data, actionStatusFilter]);

  if (isLoading) {
    return <TemplateSkeleton />;
  }

  if (error || !data) {
    return (
      <EmptyState
        title="Could not load AICTE Compliance Data"
        body={error instanceof ApiError ? error.message : "An unexpected error occurred while fetching institutional compliance metrics."}
        action={<Button onClick={() => void refetch()}>Try Again</Button>}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {flashMessage && (
        <div className="flex items-center justify-between rounded-lg border border-primary-500/20 bg-primary-500/10 px-4 py-3 text-sm font-medium text-primary-700 dark:text-primary-300">
          <div className="flex items-center gap-2">
            <Fi name="check" className="h-4 w-4 shrink-0 text-primary-600 dark:text-primary-400" />
            <span>{flashMessage}</span>
          </div>
          <button
            onClick={() => setFlashMessage(null)}
            className="text-xs opacity-70 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* Hero Banner with Live College Status */}
      <Card className="border-border/60 bg-gradient-to-r from-card via-card to-primary-500/5">
        <CardBody className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  AICTE Regulatory & Approval Tracking
                </span>
                <Badge tone="primary" variant="subtle">
                  PID: {data.college.pid}
                </Badge>
                <Badge tone="neutral" variant="subtle">
                  AY {data.academicYear}
                </Badge>
                <Badge
                  tone={data.overallStatus === "Compliant" ? "good" : data.overallStatus === "Action Required" ? "warn" : "bad"}
                >
                  {data.overallStatus} ({data.overallScore}%)
                </Badge>
              </div>
              <h2 className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                {data.college.name}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Institutional approval conditions, faculty-to-student cadre norms, laboratory curricula, and mandatory public disclosures.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="gap-1.5"
              >
                {isRefreshing ? (
                  <Spinner size="sm" className="h-3.5 w-3.5" />
                ) : (
                  <Fi name="rotate-cw" className="h-3.5 w-3.5" />
                )}
                <span>Sync Metrics</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleExportCsv}
                className="gap-1.5"
              >
                <Fi name="download" className="h-3.5 w-3.5" />
                <span>Export Report (CSV)</span>
              </Button>

              <Button
                size="sm"
                onClick={() => setShowAddActionModal(true)}
                className="gap-1.5"
              >
                <Fi name="plus" className="h-3.5 w-3.5" />
                <span>Log Action</span>
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((kpi, idx) => (
          <Card key={idx} className="border-border/60">
            <CardBody className="p-5">
              <div className="flex items-center justify-between text-xs font-medium text-muted-foreground">
                <span>{kpi.label}</span>
                {kpi.tone === "good" ? (
                  <span className="flex h-2 w-2 rounded-full bg-emerald-500" />
                ) : kpi.tone === "warn" ? (
                  <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                ) : kpi.tone === "bad" ? (
                  <span className="flex h-2 w-2 rounded-full bg-rose-500" />
                ) : null}
              </div>
              <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
                {kpi.value}
              </div>
              {kpi.change && (
                <div className="mt-1 text-xs text-muted-foreground">
                  {kpi.change}
                </div>
              )}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* Interactive Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/60 pb-1">
        <button
          onClick={() => setActiveTab("scorecard")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
            activeTab === "scorecard"
              ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Fi name="shield" className="h-4 w-4" />
          <span>Norms Scorecard & Analysis</span>
        </button>

        <button
          onClick={() => setActiveTab("departments")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
            activeTab === "departments"
              ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Fi name="grid" className="h-4 w-4" />
          <span>Department Breakdown ({data.departments.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("committees")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
            activeTab === "committees"
              ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Fi name="users" className="h-4 w-4" />
          <span>Statutory Committees & Disclosures</span>
        </button>

        <button
          onClick={() => setActiveTab("actions")}
          className={cn(
            "flex items-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors",
            activeTab === "actions"
              ? "bg-primary-500/10 text-primary-700 dark:text-primary-300"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          <Fi name="check-square" className="h-4 w-4" />
          <span>Compliance Action Plan ({data.actions.length})</span>
        </button>
      </div>

      {/* TAB 1: NORM SCORECARD & ANALYSIS */}
      {activeTab === "scorecard" && (
        <div className="space-y-6">
          {/* Charts Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard spec={data.complianceDistribution} />
            <ChartCard spec={data.departmentComparison} />
          </div>

          {/* Strengths & Deficiencies Section */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <Card className="border-border/60">
              <CardHeader className="border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Fi name="check" className="h-4 w-4 text-emerald-500" />
                  <h3 className="font-semibold text-foreground">Institutional Strengths</h3>
                </div>
              </CardHeader>
              <CardBody className="p-4">
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {data.strengths.map((str, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                      <span>{str}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>

            <Card className="border-border/60">
              <CardHeader className="border-b border-border/40 pb-3">
                <div className="flex items-center gap-2">
                  <Fi name="alert-triangle" className="h-4 w-4 text-amber-500" />
                  <h3 className="font-semibold text-foreground">Actionable Observations & Routine Audit</h3>
                </div>
              </CardHeader>
              <CardBody className="p-4">
                <ul className="space-y-2.5 text-sm text-muted-foreground">
                  {data.deficiencies.map((def, i) => (
                    <li key={i} className="flex items-start gap-2.5">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                      <span>{def}</span>
                    </li>
                  ))}
                </ul>
              </CardBody>
            </Card>
          </div>

          {/* Detailed Norms Breakdown Table */}
          <Card className="border-border/60">
            <CardHeader className="border-b border-border/40">
              <h3 className="font-semibold text-foreground">AICTE Regulatory Standards Evaluation</h3>
            </CardHeader>
            <div className="divide-y divide-border/40 overflow-hidden">
              {data.norms.map((norm) => (
                <div key={norm.id} className="p-4 transition-colors hover:bg-muted/30">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{norm.name}</span>
                        <Badge
                          tone={norm.status === "Compliant" ? "good" : norm.status === "Needs Attention" ? "warn" : "bad"}
                          variant="subtle"
                        >
                          {norm.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">({norm.category})</span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Norm Requirement: </span>
                        {norm.normRequirement}
                      </div>
                      <div className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground">Actual Institutional Record: </span>
                        <span className="font-semibold text-foreground">{norm.actualValue}</span>
                      </div>
                      <div className="mt-1 text-xs italic text-muted-foreground">
                        {norm.deficiencyNotes}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 sm:w-48 sm:flex-col sm:items-end sm:gap-1">
                      <span className="text-sm font-bold text-foreground">{norm.score}%</span>
                      <div className="w-24 sm:w-full">
                        <Progress
                          value={norm.score}
                          tone={norm.score >= 85 ? "good" : norm.score >= 70 ? "warn" : "bad"}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: DEPARTMENT BREAKDOWN */}
      {activeTab === "departments" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative flex-1 sm:max-w-xs">
              <Fi
                name="search"
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              />
              <input
                type="text"
                placeholder="Search departments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={cn(inputClass, "pl-9 text-xs")}
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Department:</span>
              <select
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
                className={cn(inputClass, "w-auto text-xs")}
              >
                <option value="All Departments">All Sanctioned Departments</option>
                {data.departments.map((d) => (
                  <option key={d.department} value={d.department}>
                    {d.department}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredDepartments.map((dept, i) => (
              <Card key={i} className="border-border/60 transition-shadow hover:shadow-sm">
                <CardHeader className="border-b border-border/40 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-foreground">{dept.department}</h4>
                    <Badge
                      tone={dept.status === "Compliant" ? "good" : "warn"}
                      variant="subtle"
                    >
                      {dept.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody className="space-y-3 p-4 text-xs">
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-muted/40 p-2.5">
                    <div>
                      <div className="text-muted-foreground">Enrolled Students</div>
                      <div className="text-base font-bold text-foreground">{dept.studentsCount}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">Teaching Faculty</div>
                      <div className="text-base font-bold text-foreground">{dept.facultyCount}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Dept. FSR (Ratio)</span>
                    <span className="font-semibold text-foreground">{dept.fsrRatio}</span>
                  </div>

                  <div className="flex items-center justify-between border-b border-border/30 pb-2">
                    <span className="text-muted-foreground">Cadre Distribution</span>
                    <span className="font-medium text-foreground">
                      {dept.professors} Prof · {dept.assocProfessors} Assoc · {dept.asstProfessors} Asst
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-muted-foreground">Courses & Laboratories</span>
                    <span className="font-medium text-foreground">
                      {dept.coursesCount} Courses ({dept.labCoursesCount} Labs)
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>

          {filteredDepartments.length === 0 && (
            <EmptyState
              title="No Departments Match Filter"
              body="Try clearing your search query or selecting All Departments."
              action={
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDept("All Departments");
                    setSearchQuery("");
                  }}
                >
                  Clear Filters
                </Button>
              }
            />
          )}
        </div>
      )}

      {/* TAB 3: STATUTORY COMMITTEES & MANDATORY DISCLOSURES */}
      {activeTab === "committees" && (
        <div className="space-y-6">
          {/* Mandatory Public Disclosure Card */}
          <Card className="border-primary-500/30 bg-primary-500/5">
            <CardBody className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Fi name="globe" className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                    <h4 className="font-semibold text-foreground">AICTE Mandatory Public Disclosure Portal</h4>
                    <Badge tone="good" variant="subtle">Online & Active</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Publicly accessible regulatory disclosures containing approved programmes, faculty profiles, grievance mechanism, and fee structure.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Link
                    href={data.mandatoryDisclosureUrl}
                    target="_blank"
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary-600 px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-primary-700"
                  >
                    <span>View Public Page</span>
                    <Fi name="arrow-up-right" className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* 6 Statutory Committees */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {data.committees.map((comm) => (
              <Card key={comm.id} className="border-border/60">
                <CardHeader className="border-b border-border/40 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-foreground">{comm.name}</h4>
                      <span className="text-xs text-muted-foreground">{comm.id}</span>
                    </div>
                    <Badge tone="good" variant="subtle">
                      {comm.status}
                    </Badge>
                  </div>
                </CardHeader>
                <CardBody className="space-y-2.5 p-4 text-xs">
                  <p className="line-clamp-2 text-muted-foreground">{comm.mandate}</p>

                  <div className="border-t border-border/30 pt-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Chairperson / Lead</span>
                      <span className="font-semibold text-foreground">{comm.chairperson}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Constituted Members</span>
                    <span className="font-medium text-foreground">{comm.membersCount} Members</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Last Review Meeting</span>
                    <span className="font-medium text-foreground">{comm.lastMeetingDate}</span>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/30 pt-2">
                    <span className="text-muted-foreground">Meeting Minutes (MoM)</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      {comm.momStatus}
                    </span>
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: COMPLIANCE ACTIONS TRACKER */}
      {activeTab === "actions" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Filter by Status:</span>
              <select
                value={actionStatusFilter}
                onChange={(e) => setActionStatusFilter(e.target.value)}
                className={cn(inputClass, "w-auto text-xs")}
              >
                <option value="All Statuses">All Statuses</option>
                <option value="Open">Open</option>
                <option value="In Progress">In Progress</option>
                <option value="Resolved">Resolved</option>
              </select>
            </div>

            <Button
              size="sm"
              onClick={() => setShowAddActionModal(true)}
              className="gap-1.5"
            >
              <Fi name="plus" className="h-3.5 w-3.5" />
              <span>Log Action Item</span>
            </Button>
          </div>

          <Card className="border-border/60">
            <div className="divide-y divide-border/40 overflow-hidden">
              {filteredActions.map((act) => (
                <div key={act.id} className="p-4 transition-colors hover:bg-muted/20">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="max-w-xl">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground">{act.title}</span>
                        <Badge
                          tone={act.priority === "High" ? "bad" : act.priority === "Medium" ? "warn" : "neutral"}
                          variant="subtle"
                        >
                          {act.priority} Priority
                        </Badge>
                        <span className="text-xs text-muted-foreground">({act.category})</span>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{act.notes}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                        <span>
                          <strong className="text-foreground">Assigned to:</strong> {act.assignedTo}
                        </span>
                        <span>
                          <strong className="text-foreground">Due:</strong> {act.dueDate}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={act.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            actionId: act.id,
                            status: e.target.value as "Open" | "In Progress" | "Resolved",
                          })
                        }
                        className={cn(
                          inputClass,
                          "w-auto text-xs font-medium",
                          act.status === "Resolved"
                            ? "text-emerald-600 dark:text-emerald-400"
                            : act.status === "In Progress"
                            ? "text-amber-600 dark:text-amber-400"
                            : "text-foreground"
                        )}
                      >
                        <option value="Open">Open</option>
                        <option value="In Progress">In Progress</option>
                        <option value="Resolved">Resolved</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}

              {filteredActions.length === 0 && (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  {data.actions.length === 0
                    ? "No compliance actions recorded yet. Click 'Log Action Item' above to assign regulatory tasks, committee follow-ups, or audit remediations."
                    : "No action items match the selected status filter."}
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Log Action Modal */}
      {showAddActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <Card className="w-full max-w-md border-border/80 shadow-2xl">
            <CardHeader className="border-b border-border/40 pb-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Log AICTE Compliance Action</h3>
                <button
                  onClick={() => setShowAddActionModal(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </CardHeader>
            <form onSubmit={handleSubmitAction}>
              <CardBody className="space-y-4 p-5 text-xs">
                {formError && (
                  <div className="rounded border border-destructive/20 bg-destructive/10 p-2.5 text-destructive">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="mb-1 block font-medium text-foreground">Action Title</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Schedule Bi-Annual Anti-Ragging Committee Meeting"
                    className={cn(inputClass, "w-full text-xs")}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block font-medium text-foreground">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      className={cn(inputClass, "w-full text-xs")}
                    >
                      <option value="Statutory Committees">Statutory Committees</option>
                      <option value="Faculty & Cadre">Faculty & Cadre</option>
                      <option value="Infrastructure & Labs">Infrastructure & Labs</option>
                      <option value="Mandatory Disclosures">Mandatory Disclosures</option>
                      <option value="Curriculum & Approval">Curriculum & Approval</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block font-medium text-foreground">Priority</label>
                    <select
                      value={newPriority}
                      onChange={(e) => setNewPriority(e.target.value as "High" | "Medium" | "Low")}
                      className={cn(inputClass, "w-full text-xs")}
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-foreground">Assignee / Lead</label>
                  <select
                    value={newAssignee}
                    onChange={(e) => setNewAssignee(e.target.value)}
                    className={cn(inputClass, "w-full text-xs")}
                  >
                    <option value="">Select Faculty Lead or Office...</option>
                    <option value="Principal Office">Principal Office</option>
                    {data.availableFaculty.map((name) => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block font-medium text-foreground">Target Due Date</label>
                  <input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className={cn(inputClass, "w-full text-xs")}
                    required
                  />
                </div>

                <div>
                  <label className="mb-1 block font-medium text-foreground">Notes / Scope</label>
                  <textarea
                    rows={3}
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    placeholder="Details on requirements and deliverables..."
                    className={cn(inputClass, "w-full text-xs")}
                  />
                </div>
              </CardBody>

              <div className="flex items-center justify-end gap-2 border-t border-border/40 p-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddActionModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={addActionMutation.isPending}
                >
                  {addActionMutation.isPending ? <Spinner size="sm" /> : "Save Action"}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
}

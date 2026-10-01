"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { BiAnalyticsData } from "@/lib/api/schemas";
import { toCsv } from "@/lib/csv";
import { TemplateSkeleton } from "@/components/modules/shared";
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
import { ChartCard } from "@/components/charts/chart-card";
import { cn, formatNumber } from "@/lib/utils";

type TabKey = "overview" | "admissions" | "curriculum" | "faculty" | "departments";

function HealthScoreRing({ score }: { score: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const color = score >= 80 ? "var(--teal)" : score >= 65 ? "var(--gold)" : "var(--rose)";
  return (
    <div className="relative size-24 shrink-0">
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-ink">{score}</span>
        <span className="text-[10px] uppercase font-semibold tracking-wider text-ink-3">Health</span>
      </div>
    </div>
  );
}

export function BiAnalyticsModule() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [selectedDept, setSelectedDept] = useState<string>("all");
  const [period, setPeriod] = useState<string>("AY 2026–27");
  const [deptSearch, setDeptSearch] = useState<string>("");

  const q = useQuery({
    queryKey: ["bi-analytics"],
    queryFn: () => apiFetch("/api/v1/analytics/bi", BiAnalyticsData),
  });

  const exportReport = () => {
    if (!q.data) return;
    const { college, executive, departmentMetrics, funnel } = q.data;
    const rows: unknown[][] = [
      ["Institution BI Analytics Report", college.name],
      ["Period", period],
      ["Generated", new Date().toLocaleString("en-IN")],
      [],
      ["Key Institutional Metrics"],
      ["Metric", "Value"],
      ["Approved Student Capacity", college.capacity],
      ["Enrolled Students", executive.enrolledStudents],
      ["Capacity Utilization", `${executive.capacityUtilization}%`],
      ["Total Teaching Faculty", executive.teachingFaculty],
      ["Student to Faculty Ratio", `${executive.studentFacultyRatio}:1`],
      ["Total Courses", executive.totalCourses],
      ["Active Courses", executive.activeCourses],
      ["Admissions Total Applications", executive.applicationsTotal],
      ["Enrollment Conversion Rate", `${executive.conversionRate}%`],
      ["Institutional Health Score", `${executive.healthScore} / 100`],
      [],
      ["Admissions Conversion Funnel"],
      ["Stage", "Count", "Rate (%)"],
      ...funnel.map((f) => [f.stage, f.count, `${f.rate}%`]),
      [],
      ["Departmental League Breakdown"],
      ["Department", "Students", "Courses", "Faculty", "Applications"],
      ...departmentMetrics.map((d) => [d.name, d.studentCount, d.courses, d.faculty, d.applications]),
    ];

    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${college.name.replace(/[^a-zA-Z0-9]/g, "_")}_BI_Analytics_${period.replace(/[^a-zA-Z0-9]/g, "_")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (q.isLoading) return <TemplateSkeleton />;
  if (q.error || !q.data) {
    return (
      <EmptyState
        title="Could not load BI Analytics"
        body={q.error instanceof ApiError ? q.error.message : "Something went wrong fetching institutional analytics."}
        action={<Button onClick={() => void q.refetch()}>Retry</Button>}
      />
    );
  }

  const {
    college,
    kpis,
    executive,
    funnel,
    courseDistribution,
    facultyDesignations,
    departmentMetrics,
    charts,
    insights,
  } = q.data;

  // Filter department list for the league table
  const filteredDepartments = departmentMetrics.filter((d) =>
    d.name.toLowerCase().includes(deptSearch.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      {/* ── Top Header Bar with Context & Action Controls ── */}
      <Card className="overflow-hidden border-brand/20 bg-gradient-to-r from-surface via-surface to-brand-soft/20">
        <CardBody className="p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            {/* College & Stream Identity */}
            <div className="flex items-start gap-4">
              <HealthScoreRing score={executive.healthScore} />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-ink sm:text-2xl">{college.name}</h1>
                  {college.code ? <Badge tone="neutral">{college.code}</Badge> : null}
                  <Badge tone="brand" className="capitalize">
                    {college.stream} stream
                  </Badge>
                  {college.city ? (
                    <span className="flex items-center gap-1 text-xs text-ink-3">
                      <Fi name="marker" /> {college.city}
                    </span>
                  ) : null}
                </div>
                <p className="text-sm text-ink-2">
                  Comprehensive Higher Education Business Intelligence · Principal Command View
                </p>
                <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-ink-3">
                  <span>
                    Intake capacity: <strong className="text-ink">{formatNumber(college.capacity)}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Approved intake utilization:{" "}
                    <strong className={executive.capacityUtilization >= 75 ? "text-teal" : "text-amber"}>
                      {executive.capacityUtilization}%
                    </strong>
                  </span>
                  <span>•</span>
                  <span>
                    Staff roster: <strong className="text-ink">{executive.totalStaff}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Global Filters & Export Controls */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Department selector */}
              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter by department"
                  value={selectedDept}
                  onChange={(e) => setSelectedDept(e.target.value)}
                  className={cn(inputClass, "h-10 text-xs sm:w-44")}
                >
                  <option value="all">All Departments ({departmentMetrics.length})</option>
                  {departmentMetrics.map((d) => (
                    <option key={d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Academic Period Selector */}
              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter academic period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  className={cn(inputClass, "h-10 text-xs sm:w-36")}
                >
                  <option value="AY 2026–27">AY 2026–27</option>
                  <option value="Current Semester">Current Term</option>
                  <option value="Last 30 Days">Last 30 Days</option>
                </select>
              </div>

              {/* Refresh Button */}
              <Button
                size="sm"
                variant="secondary"
                className="h-10"
                onClick={() => void q.refetch()}
                disabled={q.isFetching}
                title="Refresh Live Data"
              >
                {q.isFetching ? <Spinner className="size-4" /> : <Fi name="refresh" />}
              </Button>

              {/* Export CSV Button */}
              <Button size="sm" className="h-10" onClick={exportReport}>
                <Fi name="download" /> Export Report
              </Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* ── Multi-Dimensional Navigation Tabs ── */}
      <div className="flex border-b border-line overflow-x-auto gap-2">
        {[
          { id: "overview" as const, label: "Executive Overview", icon: "dashboard", badge: undefined },
          { id: "admissions" as const, label: "Admissions Funnel", icon: "user-add", badge: executive.applicationsTotal },
          { id: "curriculum" as const, label: "Curriculum & Academics", icon: "book-open-cover", badge: executive.totalCourses },
          { id: "faculty" as const, label: "Faculty & Workforce", icon: "id-card-clip-alt", badge: executive.teachingFaculty },
          { id: "departments" as const, label: "Department League", icon: "layers", badge: departmentMetrics.length },
        ].map((t) => {
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={cn(
                "flex items-center gap-2 whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                active
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-ink-2 hover:border-line hover:text-ink",
              )}
            >
              <Fi name={t.icon} className={active ? "text-brand" : "text-ink-3"} />
              <span>{t.label}</span>
              {t.badge !== undefined ? (
                <span
                  className={cn(
                    "ml-1 rounded-full px-2 py-0.5 text-xs font-semibold",
                    active ? "bg-brand/10 text-brand" : "bg-surface-2 text-ink-3",
                  )}
                >
                  {t.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: EXECUTIVE OVERVIEW ── */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {kpis.map((k) => (
              <Card key={k.label} className="p-5">
                <p className="text-xs font-medium uppercase tracking-wider text-ink-3">{k.label}</p>
                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-3xl font-bold tracking-tight text-ink">{k.value}</span>
                  {k.delta ? (
                    <Badge tone={k.tone} className="text-xs">
                      {k.delta}
                    </Badge>
                  ) : null}
                </div>
                {k.hint ? <p className="mt-2 text-xs text-ink-3">{k.hint}</p> : null}
              </Card>
            ))}
          </div>

          {/* Operational Gauges: Capacity & Faculty Ratio */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Student Capacity Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <h3 className="font-sans text-[15px] font-semibold tracking-tight text-ink">Student Capacity & Intake Utilization</h3>
                  <p className="mt-0.5 text-xs text-ink-3">Enrolled active learners vs total approved seats</p>
                </div>
                <Badge tone={executive.capacityUtilization >= 75 ? "teal" : "amber"}>
                  {executive.capacityUtilization}% utilized
                </Badge>
              </div>
              <CardBody className="p-0 space-y-4">
                <Progress value={executive.capacityUtilization} tone={executive.capacityUtilization >= 75 ? "teal" : "amber"} />
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <p className="text-xs text-ink-3">Approved Seats</p>
                    <p className="text-lg font-bold text-ink">{formatNumber(college.capacity)}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <p className="text-xs text-ink-3">Currently Enrolled</p>
                    <p className="text-lg font-bold text-teal">{formatNumber(executive.enrolledStudents)}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <p className="text-xs text-ink-3">Vacant / Buffer</p>
                    <p className="text-lg font-bold text-ink-2">
                      {formatNumber(Math.max(0, college.capacity - executive.enrolledStudents))}
                    </p>
                  </div>
                </div>
              </CardBody>
            </Card>

            {/* Faculty & Staffing Ratio Card */}
            <Card className="p-6">
              <div className="flex items-center justify-between pb-4">
                <div>
                  <h3 className="font-sans text-[15px] font-semibold tracking-tight text-ink">Faculty Workload & Staffing Ratio</h3>
                  <p className="mt-0.5 text-xs text-ink-3">AICTE / UGC ideal standard: ≤ 20:1</p>
                </div>
                <Badge tone={executive.studentFacultyRatio <= 20 ? "teal" : "amber"}>
                  {executive.studentFacultyRatio}:1 Ratio
                </Badge>
              </div>
              <CardBody className="p-0 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-ink-3">Statutory Regulatory Compliance</span>
                  <span className={executive.studentFacultyRatio <= 20 ? "text-teal font-medium" : "text-amber font-medium"}>
                    {executive.studentFacultyRatio <= 20 ? "Fully Compliant (≤ 20:1)" : "Review Needed (> 20:1)"}
                  </span>
                </div>
                <Progress
                  value={Math.min(100, Math.round((20 / Math.max(1, executive.studentFacultyRatio)) * 100))}
                  tone={executive.studentFacultyRatio <= 20 ? "teal" : "amber"}
                />
                <div className="grid grid-cols-3 gap-2 pt-2 text-center">
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <p className="text-xs text-ink-3">Teaching Faculty</p>
                    <p className="text-lg font-bold text-teal">{executive.teachingFaculty}</p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <p className="text-xs text-ink-3">Admin / Support</p>
                    <p className="text-lg font-bold text-ink">
                      {Math.max(0, executive.totalStaff - executive.teachingFaculty)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-surface-2/40 p-3">
                    <p className="text-xs text-ink-3">Total Staff</p>
                    <p className="text-lg font-bold text-ink">{executive.totalStaff}</p>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Key Executive Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {charts.slice(0, 2).map((c) => (
              <ChartCard key={c.title} spec={c} />
            ))}
          </div>

          {/* AI Strategic Insights */}
          <Card className="p-6">
            <div className="flex items-center gap-2 pb-4">
              <span className="flex size-7 items-center justify-center rounded-lg bg-brand-soft text-brand">
                <Fi name="sparkles" />
              </span>
              <h3 className="text-base font-semibold text-ink">Automated Institutional Intelligence & Early Warnings</h3>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {insights.map((ins, i) => (
                <div key={i} className="flex flex-col justify-between rounded-xl border border-line bg-surface-2/30 p-4">
                  <div>
                    <Badge tone={ins.tone} className="mb-2">
                      {ins.tone === "teal" ? "Healthy" : ins.tone === "amber" ? "Attention" : "Info"}
                    </Badge>
                    <h4 className="text-sm font-semibold text-ink">{ins.title}</h4>
                    <p className="mt-1 text-xs text-ink-2 leading-relaxed">{ins.body}</p>
                  </div>
                  <p className="mt-3 text-[11px] font-mono text-ink-3 border-t border-line/60 pt-2">{ins.evidence}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── TAB 2: ADMISSIONS FUNNEL ── */}
      {activeTab === "admissions" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Card className="p-5">
              <p className="text-xs text-ink-3">Total Pipeline</p>
              <p className="mt-1 text-2xl font-bold text-ink">{formatNumber(executive.applicationsTotal)}</p>
              <p className="mt-1 text-xs text-ink-3">Received across all departments</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-ink-3">Shortlisted for Offer</p>
              <p className="mt-1 text-2xl font-bold text-gold">
                {funnel.find((f) => f.stage === "Shortlisted")?.count ?? 0}
              </p>
              <p className="mt-1 text-xs text-ink-3">Eligibility and criteria verified</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-ink-3">Enrolled Admissions</p>
              <p className="mt-1 text-2xl font-bold text-teal">
                {funnel.find((f) => f.stage === "Enrolled")?.count ?? 0}
              </p>
              <p className="mt-1 text-xs text-ink-3">Fees paid & matriculated</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-ink-3">Conversion Rate</p>
              <p className="mt-1 text-2xl font-bold text-brand">{executive.conversionRate}%</p>
              <p className="mt-1 text-xs text-ink-3">Applications to final enrollment</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Visual Funnel Progression */}
            <Card className="p-6">
              <h3 className="mb-4 text-base font-semibold text-ink">Admissions Stage Progression</h3>
              <div className="space-y-4">
                {funnel.map((step, idx) => (
                  <div key={step.stage} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">
                        {idx + 1}. {step.stage}
                      </span>
                      <span className="text-ink-2">
                        <strong>{step.count}</strong> applicants ({step.rate}%)
                      </span>
                    </div>
                    <Progress
                      value={step.rate}
                      tone={
                        step.stage === "Enrolled"
                          ? "teal"
                          : step.stage === "Fee paid" || step.stage === "Shortlisted"
                            ? "brand"
                            : "neutral"
                      }
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Funnel Bar Chart */}
            <ChartCard spec={charts[2] ?? charts[0]!} />
          </div>
        </div>
      )}

      {/* ── TAB 3: CURRICULUM & ACADEMICS ── */}
      {activeTab === "curriculum" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs text-ink-3">Total Registered Courses</p>
              <p className="mt-1 text-2xl font-bold text-ink">{executive.totalCourses}</p>
              <p className="mt-1 text-xs text-ink-3">Across {departmentMetrics.length} departments</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-ink-3">Active Curricula</p>
              <p className="mt-1 text-2xl font-bold text-teal">{executive.activeCourses}</p>
              <p className="mt-1 text-xs text-ink-3">
                {Math.round((executive.activeCourses / Math.max(1, executive.totalCourses)) * 100)}% active coverage
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-ink-3">Draft / In Preparation</p>
              <p className="mt-1 text-2xl font-bold text-sky">
                {Math.max(0, executive.totalCourses - executive.activeCourses)}
              </p>
              <p className="mt-1 text-xs text-ink-3">Pending departmental sign-off</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Donut Chart: Course Delivery Modes */}
            <ChartCard spec={charts[1] ?? charts[0]!} />

            {/* Delivery Modes Breakdown Cards */}
            <Card className="p-6">
              <h3 className="mb-4 text-base font-semibold text-ink">Pedagogical Delivery Breakdown</h3>
              <div className="grid grid-cols-2 gap-3">
                {courseDistribution.map((item) => (
                  <div key={item.name} className="rounded-xl border border-line bg-surface-2/40 p-4">
                    <p className="text-xs text-ink-3">{item.name}</p>
                    <p className="mt-1 text-xl font-bold text-ink">{item.value}</p>
                    <p className="text-[11px] text-ink-3">
                      {Math.round((item.value / Math.max(1, executive.totalCourses)) * 100)}% of total courses
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── TAB 4: FACULTY & WORKFORCE ── */}
      {activeTab === "faculty" && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs text-ink-3">Total Teaching Faculty</p>
              <p className="mt-1 text-2xl font-bold text-teal">{executive.teachingFaculty}</p>
              <p className="mt-1 text-xs text-ink-3">Permanent & contractual instructional staff</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-ink-3">Support & Administrative</p>
              <p className="mt-1 text-2xl font-bold text-ink">
                {Math.max(0, executive.totalStaff - executive.teachingFaculty)}
              </p>
              <p className="mt-1 text-xs text-ink-3">Non-instructional & lab personnel</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs text-ink-3">Teaching Ratio</p>
              <p className="mt-1 text-2xl font-bold text-brand">{executive.studentFacultyRatio}:1</p>
              <p className="mt-1 text-xs text-ink-3">Students per faculty member</p>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Faculty Designations Breakdown */}
            <Card className="p-6">
              <h3 className="mb-4 text-base font-semibold text-ink">Academic Hierarchy & Designations</h3>
              <div className="space-y-4">
                {facultyDesignations.map((des) => (
                  <div key={des.name} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-ink">{des.name}</span>
                      <span className="text-ink-2">
                        <strong>{des.value}</strong> faculty (
                        {Math.round((des.value / Math.max(1, executive.teachingFaculty)) * 100)}%)
                      </span>
                    </div>
                    <Progress
                      value={Math.round((des.value / Math.max(1, executive.teachingFaculty)) * 100)}
                      tone="teal"
                    />
                  </div>
                ))}
              </div>
            </Card>

            {/* Department Faculty Distribution */}
            <ChartCard spec={charts[3] ?? charts[0]!} />
          </div>
        </div>
      )}

      {/* ── TAB 5: DEPARTMENT LEAGUE TABLE ── */}
      {activeTab === "departments" && (
        <Card className="overflow-hidden">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between p-5 border-b border-line">
            <div>
              <h3 className="font-sans text-[15px] font-semibold tracking-tight text-ink">Departmental Performance League</h3>
              <p className="mt-0.5 text-xs text-ink-3">Comparative operational metrics across academic departments</p>
            </div>
            <div className="w-full sm:w-64">
              <input
                type="text"
                placeholder="Search department…"
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                className={cn(inputClass, "h-9 text-xs")}
              />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-line bg-surface-2/60 text-ink-3 font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Department</th>
                  <th className="px-5 py-3.5 text-right">Students</th>
                  <th className="px-5 py-3.5 text-right">Courses</th>
                  <th className="px-5 py-3.5 text-right">Faculty</th>
                  <th className="px-5 py-3.5 text-right">Ratio</th>
                  <th className="px-5 py-3.5 text-right">Applications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredDepartments.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-ink-3">
                      No departments found matching &ldquo;{deptSearch}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredDepartments.map((dept) => {
                    const ratio = dept.faculty > 0 ? Math.round(dept.studentCount / dept.faculty) : 0;
                    return (
                      <tr key={dept.name} className="hover:bg-surface-2/40 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-ink">{dept.name}</td>
                        <td className="px-5 py-3.5 text-right text-ink font-semibold">
                          {formatNumber(dept.studentCount)}
                        </td>
                        <td className="px-5 py-3.5 text-right text-ink-2">{dept.courses}</td>
                        <td className="px-5 py-3.5 text-right text-teal font-medium">{dept.faculty}</td>
                        <td className="px-5 py-3.5 text-right">
                          <span
                            className={cn(
                              "inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              ratio <= 20
                                ? "bg-teal-soft text-teal"
                                : ratio <= 25
                                  ? "bg-amber-soft text-amber"
                                  : "bg-surface-2 text-ink-3",
                            )}
                          >
                            {ratio > 0 ? `${ratio}:1` : "—"}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-ink font-semibold">{dept.applications}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

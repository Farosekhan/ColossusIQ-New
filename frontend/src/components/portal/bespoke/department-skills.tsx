"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import {
  CreateInterventionInput,
  DepartmentSkillsData,
  type SkillGapItem,
  type SkillIntervention,
  type SkillStudent,
  type Tone,
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
  toneForScore,
} from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/auth/roles";

type TabKey = "gaps" | "students" | "benchmarks" | "interventions";

export function DepartmentSkillsModule({ role }: { role: Role }) {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>("gaps");
  const [selectedDept, setSelectedDept] = useState<string>("All Departments");
  const [selectedBatch, setSelectedBatch] = useState<string>("All Batches");
  const [selectedDomain, setSelectedDomain] = useState<string>("All Domains");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [flashMessage, setFlashMessage] = useState<string | null>(null);

  // Modals state
  const [showAddInterventionModal, setShowAddInterventionModal] = useState<boolean>(false);
  const [selectedStudent, setSelectedStudent] = useState<SkillStudent | null>(null);
  const [quickActionSkill, setQuickActionSkill] = useState<SkillGapItem | null>(null);

  // Form state for new bridge course
  const [newTitle, setNewTitle] = useState("");
  const [newDept, setNewDept] = useState("Computer Science & Engineering");
  const [newBatch, setNewBatch] = useState("2023–2027 (Final Year)");
  const [newTargetSkill, setNewTargetSkill] = useState("");
  const [newFacultyLead, setNewFacultyLead] = useState("");
  const [newDuration, setNewDuration] = useState("4 Weeks");
  const [formError, setFormError] = useState<string | null>(null);

  const queryParams = useMemo(() => {
    const p = new URLSearchParams();
    if (selectedDept !== "All Departments") p.set("department", selectedDept);
    if (selectedBatch !== "All Batches") p.set("batch", selectedBatch);
    if (selectedDomain !== "All Domains") p.set("domain", selectedDomain);
    const qs = p.toString();
    return qs ? `?${qs}` : "";
  }, [selectedDept, selectedBatch, selectedDomain]);

  const q = useQuery({
    queryKey: ["department-skills", selectedDept, selectedBatch, selectedDomain],
    queryFn: () => apiFetch(`/api/v1/department-skills${queryParams}`, DepartmentSkillsData),
  });

  const createInterventionMut = useMutation({
    mutationFn: (input: CreateInterventionInput) =>
      apiFetch("/api/v1/department-skills/interventions", CreateInterventionInput, {
        method: "POST",
        body: input,
      }),
    onSuccess: (created) => {
      void qc.invalidateQueries({ queryKey: ["department-skills"] });
      setShowAddInterventionModal(false);
      setQuickActionSkill(null);
      setFlashMessage(`Successfully scheduled bridge course: "${created.title}"`);
      // Reset form
      setNewTitle("");
      setNewTargetSkill("");
      setNewFacultyLead("");
      setTimeout(() => setFlashMessage(null), 5000);
    },
    onError: (err) => {
      setFormError(err instanceof ApiError ? err.message : "Failed to create intervention");
    },
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await q.refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleExportCsv = () => {
    if (!q.data) return;
    const { skillGaps, college, department, batch } = q.data;
    const rows = [
      ["Skill Intelligence Report", college.name],
      ["Scope Department", department],
      ["Scope Batch", batch],
      ["Generated", new Date().toLocaleString("en-IN")],
      [],
      [
        "Skill Name",
        "Domain Category",
        "Industry Demand (%)",
        "Student Readiness (%)",
        "Gap Delta (%)",
        "Urgency Status",
        "Students Assessed",
        "Recommended Intervention",
      ],
      ...skillGaps.map((s) => [
        s.skill,
        s.category,
        s.demandScore,
        s.readinessScore,
        `${s.gap}%`,
        s.urgency,
        s.studentsAssessed,
        s.recommendedIntervention,
      ]),
    ];

    const csvContent = toCsv(rows);
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Skill-Intelligence-${selectedDept.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleOpenQuickAction = (skill: SkillGapItem) => {
    setQuickActionSkill(skill);
    setNewTitle(`${skill.skill.split("(")[0]?.trim()} Remedial Workshop`);
    setNewTargetSkill(skill.skill);
    const defaultD = selectedDept !== "All Departments" ? selectedDept : (q.data?.availableDepartments.find(d => d !== "All Departments") || "General");
    setNewDept(defaultD);
    setNewBatch(selectedBatch !== "All Batches" ? selectedBatch : "2023–2027 (Final Year)");
    setNewFacultyLead(q.data?.availableFaculty[0] || "");
    setNewDuration("4 Weeks");
    setShowAddInterventionModal(true);
  };

  if (q.isLoading) return <TemplateSkeleton />;
  if (q.error || !q.data) {
    return (
      <EmptyState
        title="Skill Intelligence unavailable"
        body={q.error instanceof ApiError ? q.error.message : "Failed to load department skill metrics."}
        action={<Button onClick={() => void q.refetch()}>Retry</Button>}
      />
    );
  }

  const {
    availableDepartments,
    availableBatches,
    availableDomains,
    availableFaculty,
    kpis,
    demandVsReadiness,
    domainRadar,
    batchProgression,
    certDistribution,
    skillGaps,
    insights,
    students,
    interventions,
    topHiringPartners,
  } = q.data;

  // Filter skill gaps by search
  const filteredSkillGaps = skillGaps.filter(
    (s) =>
      !searchQuery ||
      s.skill.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.topRolesRequiring.some((r) => r.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter students by search
  const filteredStudents = students.filter(
    (st) =>
      !searchQuery ||
      st.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.rollNo.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.topSkills.some((sk) => sk.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {flashMessage && (
        <div className="flex items-center justify-between rounded-xl border border-teal/20 bg-teal-soft px-4 py-3 text-sm text-teal shadow-xs">
          <div className="flex items-center gap-2">
            <Fi name="check-circle" className="text-base" />
            <span className="font-medium">{flashMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setFlashMessage(null)}
            className="text-teal/70 hover:text-teal"
            aria-label="Close notification"
          >
            <Fi name="cross" />
          </button>
        </div>
      )}

      {/* Main Filter & Scope Bar */}
      <Card className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            {/* Department Select */}
            <div>
              <label htmlFor="dept-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-3">
                Department
              </label>
              <select
                id="dept-select"
                className={cn(inputClass, "mt-1 text-sm font-medium")}
                value={selectedDept}
                onChange={(e) => setSelectedDept(e.target.value)}
              >
                {availableDepartments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Batch Select */}
            <div>
              <label htmlFor="batch-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-3">
                Cohort / Batch
              </label>
              <select
                id="batch-select"
                className={cn(inputClass, "mt-1 text-sm font-medium")}
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
              >
                {availableBatches.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Domain Select */}
            <div>
              <label htmlFor="domain-select" className="block text-xs font-semibold uppercase tracking-wider text-ink-3">
                Domain / Stream
              </label>
              <select
                id="domain-select"
                className={cn(inputClass, "mt-1 text-sm font-medium")}
                value={selectedDomain}
                onChange={(e) => setSelectedDomain(e.target.value)}
              >
                {availableDomains.map((dm) => (
                  <option key={dm} value={dm}>
                    {dm}
                  </option>
                ))}
              </select>
            </div>

            {/* Search Input */}
            <div>
              <label htmlFor="skill-search" className="block text-xs font-semibold uppercase tracking-wider text-ink-3">
                Search
              </label>
              <div className="relative mt-1">
                <input
                  id="skill-search"
                  type="text"
                  placeholder="Search skill, role, student..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className={cn(inputClass, "pr-8 text-sm")}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-ink-3 hover:text-ink"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-end">
            <Button
              variant="secondary"
              onClick={handleRefresh}
              disabled={isRefreshing}
              title="Recalculate metrics from live assessment data"
              className="text-xs"
            >
              <Fi name="refresh" className={cn(isRefreshing && "animate-spin")} />
              {isRefreshing ? "Calculating..." : "Sync Live Data"}
            </Button>

            <Button
              variant="secondary"
              onClick={handleExportCsv}
              title="Export complete skill gap matrix"
              className="text-xs"
            >
              <Fi name="download" /> Export CSV
            </Button>

            <Button
              variant="primary"
              onClick={() => {
                setQuickActionSkill(null);
                setNewTitle("");
                setNewTargetSkill("");
                setNewDept(selectedDept !== "All Departments" ? selectedDept : "Computer Science & Engineering");
                setNewBatch(selectedBatch !== "All Batches" ? selectedBatch : "2023–2027 (Final Year)");
                setNewFacultyLead("");
                setNewDuration("4 Weeks");
                setShowAddInterventionModal(true);
              }}
              className="text-xs"
            >
              <Fi name="wand" /> Schedule Bridge Course
            </Button>
          </div>
        </div>

        {/* Applied Filter Tags */}
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3 text-xs text-ink-3">
          <span>Active filter scope:</span>
          <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-ink">
            {selectedDept}
          </span>
          <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-ink">
            {selectedBatch}
          </span>
          <span className="rounded-md bg-surface-2 px-2 py-0.5 font-medium text-ink">
            {selectedDomain}
          </span>
          {(selectedDept !== "All Departments" || selectedBatch !== "All Batches" || selectedDomain !== "All Domains" || searchQuery) && (
            <button
              type="button"
              onClick={() => {
                setSelectedDept("All Departments");
                setSelectedBatch("All Batches");
                setSelectedDomain("All Domains");
                setSearchQuery("");
              }}
              className="font-medium text-brand hover:underline"
            >
              Reset to all
            </button>
          )}
        </div>
      </Card>

      {/* Dynamic Key Performance Indicators (5 KPI Cards) */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {kpis.map((kpi) => {
          const toneMap: Record<Tone, { badge: Tone; border: string }> = {
            brand: { badge: "brand", border: "border-brand/20" },
            teal: { badge: "teal", border: "border-teal/20" },
            gold: { badge: "gold", border: "border-gold/20" },
            rose: { badge: "rose", border: "border-rose/20" },
            amber: { badge: "amber", border: "border-amber/20" },
            sky: { badge: "sky", border: "border-sky/20" },
            neutral: { badge: "neutral", border: "border-line" },
          };
          const style = toneMap[kpi.tone] || toneMap.brand;

          return (
            <Card key={kpi.label} className={cn("p-4 transition-all hover:shadow-xs", style.border)}>
              <div className="flex items-start justify-between gap-1">
                <span className="text-xs font-medium text-ink-3">{kpi.label}</span>
                {kpi.delta && (
                  <Badge tone={style.badge} className="text-[10px] px-1.5 py-0.2">
                    {kpi.delta}
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-2xl font-bold tracking-tight text-ink">{kpi.value}</p>
              {kpi.hint && <p className="mt-1 line-clamp-1 text-[11px] text-ink-3">{kpi.hint}</p>}
            </Card>
          );
        })}
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-line">
        {[
          { key: "gaps", label: "Skill Gap & Industry Demand", icon: "chart" },
          { key: "students", label: "Student Skill Inventory", icon: "users" },
          { key: "benchmarks", label: "Recruiter Benchmarks & Trends", icon: "target" },
          { key: "interventions", label: `Bridge Courses (${interventions.length})`, icon: "wand" },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                isActive
                  ? "border-brand text-brand font-semibold"
                  : "border-transparent text-ink-2 hover:border-line hover:text-ink"
              )}
            >
              <Fi name={tab.icon} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: SKILL GAPS & INDUSTRY DEMAND */}
      {activeTab === "gaps" && (
        <div className="space-y-6">
          {/* Visual Charts Grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard spec={demandVsReadiness} />
            <ChartCard spec={domainRadar} />
          </div>

          {/* AI Curricular Interventions Highlight Box */}
          <div className="rounded-2xl border border-line bg-surface-2/60 p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Fi name="sparkles" className="text-lg text-brand" />
                <h3 className="text-base font-semibold text-ink">
                  AI Curricular Intervention Recommendations
                </h3>
              </div>
              <span className="text-xs text-ink-3">Live recommendations based on current deficit</span>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {insights.map((ins, i) => {
                const toneBg: Record<string, string> = {
                  rose: "border-rose/25 bg-rose-soft/40 text-rose",
                  teal: "border-teal/25 bg-teal-soft/40 text-teal",
                  brand: "border-brand/25 bg-brand-soft/40 text-brand",
                };
                const badgeStyle = toneBg[ins.tone] || toneBg.brand;

                return (
                  <div key={i} className="flex flex-col justify-between rounded-xl border border-line bg-surface p-4 shadow-2xs">
                    <div>
                      <div className="flex items-center justify-between">
                        <span className={cn("text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border", badgeStyle)}>
                          {ins.tone === "rose" ? "Critical Priority" : ins.tone === "teal" ? "Strong Domain" : "Actionable Plan"}
                        </span>
                      </div>
                      <h4 className="mt-2 text-sm font-semibold text-ink">{ins.title}</h4>
                      <p className="mt-1 text-xs text-ink-2 leading-relaxed">{ins.body}</p>
                    </div>
                    <div className="mt-4 border-t border-line/60 pt-3">
                      <p className="text-[11px] text-ink-3">{ins.evidence}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Skill Intelligence Heatmap / Matrix Table */}
          <Card>
            <CardHeader
              title="Skill Intelligence Matrix"
              subtitle="Comparing hiring demand score against evaluated cohort readiness score"
              action={
                <span className="text-xs text-ink-3">
                  Showing {filteredSkillGaps.length} skills
                </span>
              }
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wider text-ink-3">
                    <tr>
                      <th className="px-5 py-3.5">Course / Curricular Competency</th>
                      <th className="px-4 py-3.5">Syllabus Target</th>
                      <th className="px-4 py-3.5">Cohort Mastery</th>
                      <th className="px-4 py-3.5">Deficit / Gap</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5">Students Evaluated</th>
                      <th className="px-5 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredSkillGaps.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-sm text-ink-3">
                          {searchQuery
                            ? `No skills found matching "${searchQuery}"`
                            : `No courses or syllabus outcomes recorded yet for ${selectedDept} in Course Management.`}
                        </td>
                      </tr>
                    ) : (
                      filteredSkillGaps.map((skill) => {
                        const urgencyBadge: Record<
                          SkillGapItem["urgency"],
                          { tone: Tone; text: string }
                        > = {
                          Critical: { tone: "rose", text: "Critical Gap" },
                          High: { tone: "amber", text: "High Deficit" },
                          Moderate: { tone: "gold", text: "Moderate" },
                          "On Track": { tone: "teal", text: "On Track" },
                        };
                        const u = urgencyBadge[skill.urgency];

                        return (
                          <tr key={skill.id} className="transition-colors hover:bg-surface-2/40">
                            <td className="px-5 py-4">
                              <p className="font-medium text-ink">{skill.skill}</p>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-xs text-ink-3">{skill.category}</span>
                                <span className="text-ink-3">·</span>
                                <span className="text-[11px] text-brand">
                                  {skill.topRolesRequiring.slice(0, 2).join(", ")}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className="w-8 font-semibold text-ink">{skill.demandScore}%</span>
                                <div className="w-20">
                                  <Progress value={skill.demandScore} tone="brand" />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span className="w-8 font-semibold text-ink">{skill.readinessScore}%</span>
                                <div className="w-20">
                                  <Progress value={skill.readinessScore} tone={toneForScore(skill.readinessScore)} />
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={cn(
                                  "font-bold",
                                  skill.gap <= -25 ? "text-rose" : skill.gap <= -15 ? "text-amber" : "text-teal"
                                )}
                              >
                                {skill.gap > 0 ? `+${skill.gap}%` : `${skill.gap}%`}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <Badge tone={u.tone}>{u.text}</Badge>
                            </td>
                            <td className="px-4 py-4 text-ink-2">
                              {skill.studentsAssessed.toLocaleString()}
                            </td>
                            <td className="px-5 py-4 text-right">
                              <Button
                                variant="secondary"
                                onClick={() => handleOpenQuickAction(skill)}
                                className="text-xs"
                              >
                                Plan Bridge
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 2: STUDENT SKILL INVENTORY */}
      {activeTab === "students" && (
        <div className="space-y-6">
          <ChartCard spec={batchProgression} />

          <Card>
            <CardHeader
              title="Student Skill Mastery Roster"
              subtitle="Verified skill profiles, assessments completed and placement readiness status"
              action={
                <span className="text-xs text-ink-3">
                  Showing {filteredStudents.length} students
                </span>
              }
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wider text-ink-3">
                    <tr>
                      <th className="px-5 py-3.5">Student Name</th>
                      <th className="px-4 py-3.5">Roll No</th>
                      <th className="px-4 py-3.5">Department</th>
                      <th className="px-4 py-3.5">Overall Readiness</th>
                      <th className="px-4 py-3.5">Top Skills</th>
                      <th className="px-4 py-3.5">Gaps to Close</th>
                      <th className="px-4 py-3.5">Certs</th>
                      <th className="px-5 py-3.5 text-right">Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredStudents.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-8 text-center text-sm text-ink-3">
                          {searchQuery
                            ? `No students matching "${searchQuery}"`
                            : `No student readiness records found for ${selectedDept}.`}
                        </td>
                      </tr>
                    ) : (
                      filteredStudents.map((st) => (
                        <tr key={st.id} className="transition-colors hover:bg-surface-2/40">
                          <td className="px-5 py-4 font-medium text-ink">{st.name}</td>
                          <td className="px-4 py-4 font-mono text-xs text-ink-2">{st.rollNo}</td>
                          <td className="px-4 py-4 text-xs text-ink-2">{st.department}</td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <span className="w-7 font-bold text-ink">{st.overallScore}</span>
                              <div className="w-16">
                                <Progress value={st.overallScore} tone={toneForScore(st.overallScore)} />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1">
                              {st.topSkills.map((sk) => (
                                <span
                                  key={sk}
                                  className="rounded-md bg-teal-soft px-1.5 py-0.5 text-[11px] font-medium text-teal"
                                >
                                  {sk}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-1">
                              {st.gapAreas.map((g) => (
                                <span
                                  key={g}
                                  className="rounded-md bg-rose-soft px-1.5 py-0.5 text-[11px] font-medium text-rose"
                                >
                                  {g}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-center font-semibold text-ink">
                            {st.certifications}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button
                              variant="secondary"
                              onClick={() => setSelectedStudent(st)}
                              className="text-xs"
                            >
                              Inspect
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 3: RECRUITER BENCHMARKS & TECH TRENDS */}
      {activeTab === "benchmarks" && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <ChartCard spec={certDistribution} />

            <Card className="flex flex-col justify-between p-5">
              <div>
                <div className="flex items-center gap-2 text-ink">
                  <Fi name="target" className="text-brand" />
                  <h3 className="text-base font-semibold">Institutional Readiness Criteria Breakdown</h3>
                </div>
                <p className="mt-2 text-xs text-ink-2 leading-relaxed">
                  Real evaluation metrics for {q.data.college.name} measured against the standard placement threshold (Overall ≥ 70).
                </p>

                <div className="mt-4 space-y-3">
                  <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-ink">Placement Ready Cohort</p>
                      <p className="text-xs text-ink-3">Total ≥ 70, Quiz Avg ≥ 60%, Certs ≥ 2, Interview ≥ 50</p>
                    </div>
                    <span className="text-right">
                      <b className="text-teal font-bold text-base">
                        {students.filter((s) => s.status === "Placement ready").length}
                      </b>
                      <span className="block text-[11px] text-ink-3">Students Qualified</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-ink">Almost Ready (Near Threshold)</p>
                      <p className="text-xs text-ink-3">Total score between 55 and 69</p>
                    </div>
                    <span className="text-right">
                      <b className="text-amber font-bold text-base">
                        {students.filter((s) => s.status === "Almost ready").length}
                      </b>
                      <span className="block text-[11px] text-ink-3">In Active Remediation</span>
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-surface-2 p-3 text-sm">
                    <div>
                      <p className="font-semibold text-ink">Needs Curricular Action</p>
                      <p className="text-xs text-ink-3">Total score &lt; 55 or missing multiple assessments</p>
                    </div>
                    <span className="text-right">
                      <b className="text-rose font-bold text-base">
                        {students.filter((s) => s.status === "Needs work").length}
                      </b>
                      <span className="block text-[11px] text-ink-3">Intervention Needed</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 border-t border-line pt-3 text-xs text-ink-3">
                Placement formula: Quiz marks 35% + Certificates 20% + Aptitude 15% + Mock interview 15% + Resume 15%.
              </div>
            </Card>
          </div>

          {/* Placement Gateways Table */}
          <Card>
            <CardHeader
              title="Placement Gateway Thresholds & Cohort Compliance"
              subtitle="Official criteria enforced across students for campus recruitment readiness"
            />
            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-line bg-surface-2 text-xs uppercase tracking-wider text-ink-3">
                    <tr>
                      <th className="px-5 py-3.5">Evaluation Gate / Dimension</th>
                      <th className="px-4 py-3.5">Target Requirement</th>
                      <th className="px-4 py-3.5">Minimum Score Standard</th>
                      <th className="px-4 py-3.5">Evaluated Population</th>
                      <th className="px-5 py-3.5">Cohort Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {topHiringPartners.map((partner) => (
                      <tr key={partner.name} className="transition-colors hover:bg-surface-2/40">
                        <td className="px-5 py-4 font-semibold text-ink">{partner.name}</td>
                        <td className="px-4 py-4 text-ink-2">{partner.hiringDomain}</td>
                        <td className="px-4 py-4">
                          <span className="font-bold text-ink">{partner.minReadiness}</span>
                          <span className="ml-1 text-xs text-ink-3">score cutoff</span>
                        </td>
                        <td className="px-4 py-4 font-semibold text-ink">{partner.openRoles} students</td>
                        <td className="px-5 py-4">
                          <Badge tone="teal">{partner.trend}</Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        </div>
      )}

      {/* TAB 4: INTERVENTIONS & BRIDGE COURSES */}
      {activeTab === "interventions" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-ink">Active Skill Remediation &amp; Bridge Tracks</h3>
              <p className="text-xs text-ink-3">
                Faculty-led sprints, bootcamps and micro-credentials closing measured deficits
              </p>
            </div>
            <Button
              variant="primary"
              onClick={() => {
                setQuickActionSkill(null);
                setNewTitle("");
                setNewTargetSkill("");
                const defaultD = selectedDept !== "All Departments" ? selectedDept : (availableDepartments.find((d) => d !== "All Departments") || "General");
                setNewDept(defaultD);
                setNewBatch(selectedBatch !== "All Batches" ? selectedBatch : "2023–2027 (Final Year)");
                setNewFacultyLead(availableFaculty[0] || "");
                setNewDuration("4 Weeks");
                setShowAddInterventionModal(true);
              }}
              className="text-xs"
            >
              <Fi name="plus" /> New Bridge Course
            </Button>
          </div>

          {interventions.length === 0 ? (
            <Card className="p-8 text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-surface-2 text-ink-3">
                <Fi name="wand" className="text-xl" />
              </div>
              <p className="mt-3 text-base font-semibold text-ink">No Bridge Courses Scheduled Yet</p>
              <p className="mx-auto mt-1 max-w-md text-xs text-ink-2">
                No active or upcoming curricular interventions have been scheduled yet for {selectedDept}.
                Assign a teaching faculty member to lead a focused sprint to close identified deficits.
              </p>
              <div className="mt-5">
                <Button
                  variant="primary"
                  onClick={() => {
                    setQuickActionSkill(null);
                    setNewTitle("");
                    setNewTargetSkill("");
                    const defaultD = selectedDept !== "All Departments" ? selectedDept : (availableDepartments.find((d) => d !== "All Departments") || "General");
                    setNewDept(defaultD);
                    setNewBatch(selectedBatch !== "All Batches" ? selectedBatch : "2023–2027 (Final Year)");
                    setNewFacultyLead(availableFaculty[0] || "");
                    setNewDuration("4 Weeks");
                    setShowAddInterventionModal(true);
                  }}
                  className="text-xs"
                >
                  <Fi name="plus" /> Schedule First Bridge Course
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {interventions.map((item) => (
                <Card key={item.id} className="flex flex-col justify-between p-5">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <Badge
                        tone={
                          item.status === "Active"
                            ? "teal"
                            : item.status === "Upcoming"
                            ? "amber"
                            : "neutral"
                        }
                      >
                        {item.status}
                      </Badge>
                      <span className="text-xs text-ink-3">{item.duration}</span>
                    </div>

                    <h4 className="mt-3 text-base font-semibold text-ink">{item.title}</h4>
                    <p className="mt-1 text-xs text-brand font-medium">Target Skill: {item.targetSkill}</p>

                    <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-3 text-xs">
                      <div>
                        <span className="text-ink-3">Faculty Lead:</span>
                        <p className="font-semibold text-ink">{item.facultyLead}</p>
                      </div>
                      <div>
                        <span className="text-ink-3">Department:</span>
                        <p className="font-semibold text-ink">{item.department}</p>
                      </div>
                      <div>
                        <span className="text-ink-3">Cohort:</span>
                        <p className="font-semibold text-ink">{item.batch}</p>
                      </div>
                      <div>
                        <span className="text-ink-3">Enrolled:</span>
                        <p className="font-semibold text-ink">{item.enrolledCount} students</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-line pt-3 text-xs">
                    <span className="text-teal font-medium flex items-center gap-1">
                      <Fi name="chart" /> {item.impact}
                    </span>
                    <span className="text-ink-3 font-mono text-[11px]">{item.id}</span>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CREATE BRIDGE COURSE MODAL */}
      {showAddInterventionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink">Schedule Curricular Bridge Course</h3>
                <p className="text-xs text-ink-3">
                  Deploy targeted remediation for identified cohort skill deficits
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddInterventionModal(false)}
                className="text-ink-3 hover:text-ink"
              >
                <Fi name="cross" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 rounded-xl bg-rose-soft p-3 text-xs text-rose">{formError}</div>
            )}

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setFormError(null);
                if (!newTitle.trim()) return setFormError("Title is required");
                if (!newTargetSkill.trim()) return setFormError("Target skill is required");
                if (!newFacultyLead.trim()) return setFormError("Faculty lead is required");

                createInterventionMut.mutate({
                  title: newTitle.trim(),
                  department: newDept,
                  batch: newBatch,
                  targetSkill: newTargetSkill.trim(),
                  facultyLead: newFacultyLead.trim(),
                  duration: newDuration,
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-ink">Intervention Title</label>
                <input
                  type="text"
                  placeholder="e.g. AWS Cloud Native Practitioner Sprint"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className={cn(inputClass, "mt-1 w-full text-sm")}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink">Target Skill</label>
                <input
                  type="text"
                  placeholder="e.g. Cloud Architecture (AWS / Azure / GCP)"
                  value={newTargetSkill}
                  onChange={(e) => setNewTargetSkill(e.target.value)}
                  className={cn(inputClass, "mt-1 w-full text-sm")}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className={cn(inputClass, "mt-1 w-full text-sm")}
                  >
                    {availableDepartments.filter((d) => d !== "All Departments").map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Target Cohort</label>
                  <select
                    value={newBatch}
                    onChange={(e) => setNewBatch(e.target.value)}
                    className={cn(inputClass, "mt-1 w-full text-sm")}
                  >
                    {availableBatches.filter((b) => b !== "All Batches").map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink">Faculty Mentor / Lead</label>
                  {availableFaculty.length > 0 ? (
                    <select
                      value={newFacultyLead}
                      onChange={(e) => setNewFacultyLead(e.target.value)}
                      className={cn(inputClass, "mt-1 w-full text-sm")}
                      required
                    >
                      <option value="">Select teaching faculty...</option>
                      {availableFaculty.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Enter assigned faculty name"
                      value={newFacultyLead}
                      onChange={(e) => setNewFacultyLead(e.target.value)}
                      className={cn(inputClass, "mt-1 w-full text-sm")}
                      required
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-ink">Duration</label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className={cn(inputClass, "mt-1 w-full text-sm")}
                  >
                    <option value="2 Weeks">2 Weeks Sprint</option>
                    <option value="4 Weeks">4 Weeks Comprehensive</option>
                    <option value="6 Weeks">6 Weeks Semester Lab</option>
                    <option value="Weekend Bootcamp">Weekend Bootcamp</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3 border-t border-line pt-4">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowAddInterventionModal(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" disabled={createInterventionMut.isPending}>
                  {createInterventionMut.isPending ? "Scheduling..." : "Deploy Intervention"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE INSPECTION MODAL */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-2xl border border-line bg-surface p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <div>
                <h3 className="text-lg font-bold text-ink">{selectedStudent.name}</h3>
                <p className="text-xs text-ink-3">
                  {selectedStudent.rollNo} · {selectedStudent.department} · {selectedStudent.batch}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudent(null)}
                className="text-ink-3 hover:text-ink"
              >
                <Fi name="cross" />
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div className="flex items-center justify-between rounded-xl bg-surface-2 p-4">
                <div>
                  <span className="text-xs text-ink-3">Placement Readiness Total</span>
                  <p className="text-2xl font-bold text-ink">{selectedStudent.overallScore} / 100</p>
                </div>
                <Badge tone={selectedStudent.status === "Placement ready" ? "teal" : selectedStudent.status === "Almost ready" ? "amber" : "rose"}>
                  {selectedStudent.status}
                </Badge>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-ink-3">
                  Demonstrated Strengths &amp; Top Skills
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedStudent.topSkills.map((sk) => (
                    <span
                      key={sk}
                      className="rounded-lg bg-teal-soft px-2.5 py-1 text-xs font-medium text-teal"
                    >
                      ✓ {sk}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <span className="block text-xs font-semibold uppercase tracking-wider text-ink-3">
                  Remediation Gap Areas
                </span>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {selectedStudent.gapAreas.map((g) => (
                    <span
                      key={g}
                      className="rounded-lg bg-rose-soft px-2.5 py-1 text-xs font-medium text-rose"
                    >
                      ⚠ {g}
                    </span>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-line p-3 text-xs text-ink-2">
                <span className="font-semibold text-ink">AI Mentor Action Plan:</span> Recommended to
                enroll in the next upcoming bridge workshop for &quot;
                {selectedStudent.gapAreas[0] || "Advanced Problem Solving"}
                &quot; to clear recruiter cutoff.
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="secondary" onClick={() => setSelectedStudent(null)}>
                  Close Profile
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useMemo, useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { MyReadiness, READINESS_WEIGHTS, ReadinessBoard, type Readiness } from "@/lib/api/learning-schemas";
import { toCsv } from "@/lib/csv";
import { TemplateSkeleton } from "@/components/modules/shared";
import { Fi } from "@/components/ui/icon";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Progress, inputClass, toneForScore } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/api/schemas";

const STATUS_TONE: Record<Readiness["status"], Tone> = { "Placement ready": "teal", "Almost ready": "amber", "Needs work": "rose" };

function Ring({ value, status }: { value: number; status: Readiness["status"] }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const color = status === "Placement ready" ? "var(--teal)" : status === "Almost ready" ? "var(--amber)" : "var(--rose)";
  return (
    <div className="relative size-36 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90" aria-hidden>
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="12" />
        <circle cx="60" cy="60" r={r} fill="none" stroke={color} strokeWidth="12" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)} className="transition-[stroke-dashoffset] duration-700" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-ink">{value}</span>
        <span className="text-xs text-ink-3">out of 100</span>
      </div>
    </div>
  );
}

export function PlacementReadinessModule() {
  const q = useQuery({ queryKey: ["my-readiness"], queryFn: () => apiFetch("/api/v1/placement/me", MyReadiness) });
  if (q.isLoading) return <TemplateSkeleton />;
  if (!q.data) return <EmptyState title="Readiness unavailable" body={q.error instanceof ApiError ? q.error.message : undefined} />;
  const { readiness: r, rules } = q.data;

  const parts = READINESS_WEIGHTS.map((w) => {
    const raw = r[w.key];
    const pct = w.key === "certificates" ? (Math.min(raw, 4) / 4) * 100 : raw;
    return { ...w, raw, pct, points: Math.round((pct * w.weight) / 100) };
  });
  const checks = [
    { ok: r.total >= rules.minTotal, text: `Total of ${rules.minTotal} or more`, now: `${r.total}` },
    { ok: r.quizAverage >= rules.minQuizAverage, text: `Quiz average of ${rules.minQuizAverage}% or more`, now: `${r.quizAverage}%`, href: "my-quizzes" },
    { ok: r.certificates >= rules.minCertificates, text: `At least ${rules.minCertificates} certificates`, now: `${r.certificates}`, href: "my-certificates" },
    { ok: r.interview >= rules.minInterview, text: `Mock interview score of ${rules.minInterview} or more`, now: `${r.interview}`, href: "interview" },
  ];

  return (
    <div className="space-y-6">
      <Card className="flex flex-col items-center gap-6 p-6 sm:flex-row">
        <Ring value={r.total} status={r.status} />
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <Badge tone={STATUS_TONE[r.status]} className="text-sm">
            {r.status}
          </Badge>
          <h2 className="mt-2 text-xl font-semibold text-ink">{r.status === "Placement ready" ? "You are placement ready." : "Your placement readiness"}</h2>
          <p className="mt-1 text-sm text-ink-2">
            One total built from your department quiz marks, earned certificates, aptitude, mock interview and resume. The placement cell sees the same number, so each step you complete
            here shows up on their board.
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <Card>
          <CardHeader title="How your total is made" subtitle="Weighted score out of 100" />
          <CardBody className="space-y-4">
            {parts.map((p) => (
              <div key={p.key}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="flex items-center gap-2 text-ink">
                    <Fi name={p.icon} className="text-brand" /> {p.label}
                    <span className="text-xs text-ink-3">× {p.weight}%</span>
                  </span>
                  <span className="tabular-nums text-ink-2">
                    {p.key === "certificates" ? `${p.raw} earned` : `${p.raw}%`} → <b className="text-ink">{p.points}</b> / {p.weight}
                  </span>
                </div>
                <Progress value={p.pct} tone={toneForScore(p.pct)} className="mt-1.5" label={p.label} />
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Placement-ready checklist" />
          <CardBody>
            <ul className="space-y-3">
              {checks.map((c) => (
                <li key={c.text} className="flex items-start gap-3 text-sm">
                  <Fi name={c.ok ? "check-circle" : "circle"} className={cn("mt-0.5 text-lg", c.ok ? "text-teal" : "text-ink-3")} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block", c.ok ? "text-ink" : "text-ink-2")}>{c.text}</span>
                    <span className="text-xs text-ink-3">Now: {c.now}</span>
                  </span>
                  {!c.ok && c.href ? (
                    <Link href={`/student/${c.href}`} className="text-xs font-medium text-brand hover:underline">
                      Improve
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
            {r.gaps.length ? (
              <div className="mt-5 rounded-xl bg-amber-soft p-4 text-sm">
                <p className="font-medium text-ink">Next steps</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-5 text-ink-2">
                  {r.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="mt-5 rounded-xl bg-teal-soft p-4 text-sm text-teal">All criteria met. You appear in the placement cell&apos;s shortlist.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

export function PlacementBoardModule() {
  const q = useQuery({ queryKey: ["placement-board"], queryFn: () => apiFetch("/api/v1/placement/board", ReadinessBoard) });
  const [status, setStatus] = useState<"All" | Readiness["status"]>("All");
  const [dept, setDept] = useState("All");
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const s = search.trim().toLowerCase();
    return (q.data?.rows ?? []).filter((r) => (status === "All" || r.status === status) && (dept === "All" || r.department === dept) && (!s || r.name.toLowerCase().includes(s)));
  }, [q.data, status, dept, search]);

  if (q.isLoading) return <TemplateSkeleton />;
  if (!q.data) return <EmptyState title="Board unavailable" body={q.error instanceof ApiError ? q.error.message : undefined} />;
  const all = q.data.rows;
  const rules = q.data.rules;
  const count = (s: Readiness["status"]) => all.filter((r) => r.status === s).length;
  const depts = [...new Set(all.map((r) => r.department))].sort();
  const multiCollege = new Set(all.map((r) => r.collegeId)).size > 1;

  const exportCsv = () => {
    const csv = toCsv([
      ["Name", "Roll no (masked)", ...(multiCollege ? ["College"] : []), "Department", "Quiz avg %", "Certificates", "Aptitude", "Interview", "Resume", "Total", "Status"],
      ...rows.map((r) => [r.name, r.rollNo, ...(multiCollege ? [r.collegeName ?? ""] : []), r.department, r.quizAverage, r.certificates, r.aptitude, r.interview, r.resume, r.total, r.status]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `placement-shortlist-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Students tracked", value: all.length, tone: "brand" as Tone, icon: "users" },
          { label: "Placement ready", value: count("Placement ready"), tone: "teal" as Tone, icon: "badge-check" },
          { label: "Almost ready", value: count("Almost ready"), tone: "amber" as Tone, icon: "hourglass-end" },
          { label: "Needs work", value: count("Needs work"), tone: "rose" as Tone, icon: "triangle-warning" },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Fi name={k.icon} /> {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink">{k.value}</p>
          </Card>
        ))}
      </div>
      <Card className="p-4 text-sm text-ink-2">
        <b className="text-ink">Placement ready</b> = total ≥ {rules.minTotal}, quiz average ≥ {rules.minQuizAverage}%, ≥ {rules.minCertificates} certificates and mock interview ≥ {rules.minInterview}. Total =
        quiz 35% + certificates 20% + aptitude 15% + interview 15% + resume 15%.
      </Card>
      <Card>
        <CardHeader
          title="Readiness board"
          subtitle="Roll numbers masked · export only what a drive needs"
          action={
            <Button variant="secondary" onClick={exportCsv} disabled={!rows.length}>
              <Fi name="download" /> Export shortlist (CSV)
            </Button>
          }
        />
        <CardBody>
          <div className="mb-4 flex flex-wrap gap-3">
            <label htmlFor="pb-search" className="sr-only">
              Search students
            </label>
            <input id="pb-search" className={`${inputClass} max-w-xs`} placeholder="Search student" maxLength={80} value={search} onChange={(e) => setSearch(e.target.value)} />
            <label htmlFor="pb-status" className="sr-only">
              Status
            </label>
            <select id="pb-status" className={`${inputClass} w-auto!`} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              {["All", "Placement ready", "Almost ready", "Needs work"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <label htmlFor="pb-dept" className="sr-only">
              Department
            </label>
            <select id="pb-dept" className={`${inputClass} w-auto! max-w-xs`} value={dept} onChange={(e) => setDept(e.target.value)}>
              <option>All</option>
              {depts.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
                  <th className="py-2 pr-3 font-medium">Student</th>
                  <th className="py-2 pr-3 font-medium">Quiz avg</th>
                  <th className="py-2 pr-3 font-medium">Certs</th>
                  <th className="py-2 pr-3 font-medium">Aptitude</th>
                  <th className="py-2 pr-3 font-medium">Interview</th>
                  <th className="py-2 pr-3 font-medium">Resume</th>
                  <th className="py-2 pr-3 font-medium">Total</th>
                  <th className="py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.studentSub} className="border-b border-line/60 last:border-0 align-top">
                    <td className="py-3 pr-3">
                      <p className="font-medium text-ink">{r.name}</p>
                      <p className="text-xs text-ink-3">
                        {r.rollNo} · {r.department}
                        {multiCollege ? ` · ${r.collegeName}` : ""}
                      </p>
                    </td>
                    <td className="py-3 pr-3 tabular-nums">{r.quizAverage}%</td>
                    <td className="py-3 pr-3 tabular-nums">{r.certificates}</td>
                    <td className="py-3 pr-3 tabular-nums">{r.aptitude}</td>
                    <td className="py-3 pr-3 tabular-nums">{r.interview}</td>
                    <td className="py-3 pr-3 tabular-nums">{r.resume}</td>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-2">
                        <span className="w-7 font-semibold tabular-nums text-ink">{r.total}</span>
                        <Progress value={r.total} tone={toneForScore(r.total)} className="w-20" label={`${r.name} total`} />
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                      {r.gaps.length ? <p className="mt-1 max-w-[220px] text-xs text-ink-3">{r.gaps[0]}</p> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

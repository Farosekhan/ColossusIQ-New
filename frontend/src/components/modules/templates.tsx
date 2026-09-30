"use client";

import { useMutation } from "@tanstack/react-query";
import { Check, CheckCircle2, Circle, Copy, Filter, Search, Sparkles, X } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  CalendarData,
  ChatData,
  DashboardData,
  GalleryData,
  GeneratorData,
  ListData,
  ScorecardData,
  SettingsData,
  WorkflowData,
} from "@/lib/api/schemas";
import { GenerateReply } from "@/lib/api/schemas";
import type { ModuleDef } from "@/config/modules";
import { findAgent } from "@/config/agents";
import { apiFetch, ApiError } from "@/lib/api/client";
import { cleanText, mask } from "@/lib/security/sanitize";
import { ChartCard, ChartView } from "@/components/charts/chart-card";
import { ChatPanel } from "@/components/ai/chat-panel";
import { SafeMarkdown } from "@/components/ui/safe-markdown";
import { AiLabel, Notice } from "@/components/ui/notices";
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Field,
  inputClass,
  Progress,
  Spinner,
  toneBar,
  toneClasses,
  toneForScore,
  toneForStatus,
} from "@/components/ui/primitives";
import { cn, formatNumber } from "@/lib/utils";
import { InsightList, KpiGrid } from "./shared";

/* ── Dashboard ─────────────────────────────────── */
export function DashboardTemplate({ data }: { data: DashboardData }) {
  return (
    <div className="space-y-6">
      <KpiGrid kpis={data.kpis} />
      {data.charts.length > 0 ? (
        <div className="grid gap-6 lg:grid-cols-2">
          {data.charts.map((c) => (
            <ChartCard key={c.title} spec={c} />
          ))}
        </div>
      ) : null}
      {data.insights.length > 0 ? <InsightList insights={data.insights} /> : null}
    </div>
  );
}

/* ── List / detail ─────────────────────────────── */
export function ListTemplate({ data, mod }: { data: ListData; mod: ModuleDef }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<ListData["rows"][number] | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const filterValues = useMemo(
    () => (data.filterKey ? Array.from(new Set(data.rows.map((r) => String(r[data.filterKey!] ?? "")))).sort() : []),
    [data],
  );
  const rows = useMemo(() => {
    const needle = cleanText(q, 80).toLowerCase();
    return data.rows.filter((r) => {
      if (filter !== "all" && data.filterKey && String(r[data.filterKey]) !== filter) return false;
      if (!needle) return true;
      // Masked columns are excluded from search so hidden values can't be probed.
      return data.columns.some((c) => c.kind !== "masked" && String(r[c.key] ?? "").toLowerCase().includes(needle));
    });
  }, [data, q, filter]);

  const titleKey = data.columns[0]?.key ?? "";

  return (
    <Card>
      <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
          <label htmlFor="list-search" className="sr-only">
            Search {mod.title}
          </label>
          <input id="list-search" value={q} maxLength={80} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${mod.title.toLowerCase()}…`} className={cn(inputClass, "pl-9")} />
        </div>
        {data.filterKey ? (
          <div className="flex items-center gap-2">
            <Filter className="size-4 text-ink-3" aria-hidden />
            <label htmlFor="list-filter" className="sr-only">
              Filter
            </label>
            <select id="list-filter" value={filter} onChange={(e) => setFilter(e.target.value)} className={cn(inputClass, "w-auto")}>
              <option value="all">All</option>
              {filterValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        ) : null}
        {data.primaryAction ? (
          <Button onClick={() => setToast(`"${data.primaryAction}" opens a form once connected to your institution's live backend.`)}>{data.primaryAction}</Button>
        ) : null}
      </div>
      {toast ? (
        <div className="flex items-center justify-between gap-3 border-b border-line bg-sky-soft px-4 py-2 text-sm text-ink" role="status">
          {toast}
          <button onClick={() => setToast(null)} aria-label="Dismiss" className="rounded p-1 hover:bg-surface-2">
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {rows.length === 0 ? (
        <div className="p-6">
          <EmptyState title="No matching records" body="Try a different search or filter." />
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
                  {data.columns.map((c) => (
                    <th key={c.key} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i} className="cursor-pointer border-b border-line last:border-0 hover:bg-surface-2/60" onClick={() => setSelected(r)}>
                    {data.columns.map((c, j) => (
                      <td key={c.key} className={cn("px-4 py-3 align-middle", j === 0 && "font-medium text-ink")}>
                        {j === 0 ? (
                          <button className="text-left hover:text-brand hover:underline" onClick={() => setSelected(r)}>
                            <CellView kind={c.kind} value={r[c.key]} />
                          </button>
                        ) : (
                          <CellView kind={c.kind} value={r[c.key]} />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* Mobile cards */}
          <ul className="divide-y divide-line md:hidden">
            {rows.map((r, i) => (
              <li key={i}>
                <button className="w-full px-4 py-3 text-left" onClick={() => setSelected(r)}>
                  <p className="font-medium text-ink">{String(r[titleKey] ?? "")}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-2">
                    {data.columns.slice(1, 4).map((c) => (
                      <span key={c.key} className="inline-flex items-center gap-1">
                        <span className="text-ink-3">{c.label}:</span> <CellView kind={c.kind} value={r[c.key]} compact />
                      </span>
                    ))}
                  </div>
                </button>
              </li>
            ))}
          </ul>
          <p className="border-t border-line px-4 py-3 text-xs text-ink-3">
            Showing {rows.length} of {data.rows.length}
          </p>
        </>
      )}

      {selected ? (
        <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Details">
          <button className="absolute inset-0 bg-black/30" aria-label="Close details" onClick={() => setSelected(null)} tabIndex={-1} />
          <aside className="absolute inset-y-0 right-0 w-full max-w-md overflow-y-auto border-l border-line bg-surface p-6 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-ink-3">{mod.title}</p>
                <h2 className="mt-1 text-xl font-semibold text-ink">{String(selected[titleKey] ?? "")}</h2>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-surface-2" aria-label="Close">
                <X className="size-5" />
              </button>
            </div>
            <dl className="mt-6 space-y-4">
              {data.columns.slice(1).map((c) => (
                <div key={c.key}>
                  <dt className="text-xs font-medium text-ink-3">{c.label}</dt>
                  <dd className="mt-1 text-sm text-ink">
                    <CellView kind={c.kind} value={selected[c.key]} />
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      ) : null}
    </Card>
  );
}

function CellView({ kind, value, compact }: { kind: string; value: string | number | undefined; compact?: boolean }) {
  if (value === undefined) return <span className="text-ink-3">—</span>;
  switch (kind) {
    case "badge":
      return <Badge tone={toneForStatus(String(value))}>{String(value)}</Badge>;
    case "progress": {
      const n = Number(value);
      return compact ? (
        <span>{n}%</span>
      ) : (
        <span className="flex min-w-28 items-center gap-2">
          <Progress value={n} tone={toneForScore(n)} className="h-1.5" />
          <span className="w-9 text-right text-xs tabular-nums text-ink-2">{n}%</span>
        </span>
      );
    }
    case "masked":
      return (
        <span className="font-mono text-xs text-ink-2" title="Masked for privacy">
          {mask(String(value))}
        </span>
      );
    case "number":
      return <span className="tabular-nums">{typeof value === "number" ? formatNumber(value) : value}</span>;
    default:
      return <span>{String(value)}</span>;
  }
}

/* ── Workflow ──────────────────────────────────── */
export function WorkflowTemplate({ data }: { data: WorkflowData }) {
  const done = data.stages.filter((s) => s.status === "done").length;
  const pctDone = Math.round((done / data.stages.length) * 100);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <Card>
        <CardHeader title={data.title} subtitle={`${done} of ${data.stages.length} stages complete`} />
        <CardBody>
          <ol className="relative space-y-1">
            {data.stages.map((s, i) => (
              <li key={s.title} className="relative flex gap-4 pb-5 last:pb-0">
                {i < data.stages.length - 1 ? <span className={cn("absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5", s.status === "done" ? "bg-teal" : "bg-line")} aria-hidden /> : null}
                <span
                  className={cn(
                    "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                    s.status === "done" && "border-teal bg-teal text-white",
                    s.status === "active" && "border-gold bg-gold-soft text-amber",
                    s.status === "todo" && "border-line bg-surface text-ink-3",
                  )}
                  aria-hidden
                >
                  {s.status === "done" ? <Check className="size-4" /> : s.status === "active" ? <Sparkles className="size-3.5" /> : <Circle className="size-2.5" />}
                </span>
                <div className="min-w-0 pt-0.5">
                  <p className={cn("text-sm font-semibold", s.status === "todo" ? "text-ink-3" : "text-ink")}>
                    {s.title}
                    {s.status === "active" ? (
                      <Badge tone="gold" className="ml-2">
                        Current
                      </Badge>
                    ) : null}
                    <span className="sr-only"> — {s.status}</span>
                  </p>
                  <p className="text-sm text-ink-2">{s.description}</p>
                  {s.items.length > 0 ? (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {s.items.map((it) => (
                        <li key={it}>
                          <Badge tone="neutral">{it}</Badge>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <p className="text-sm font-medium text-ink-2">Overall progress</p>
          <p className="mt-1 font-serif text-4xl font-semibold text-ink">{pctDone}%</p>
          <Progress value={pctDone} tone="teal" className="mt-3" label="Overall progress" />
        </Card>
        <Notice tone="sky">Each stage can be supported by an AI agent, but stage approvals are made by your mentor or faculty.</Notice>
      </div>
    </div>
  );
}

/* ── Scorecard ─────────────────────────────────── */
export function ScorecardTemplate({ data }: { data: ScorecardData }) {
  const radar = {
    type: "radar" as const,
    title: data.headline,
    xKey: "name",
    series: ["Current", "Target"],
    data: data.dimensions.map((d) => ({ name: d.name, Current: d.score, Target: d.target })),
  };
  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <Card>
          <CardHeader title={data.headline} subtitle="Dimension-level view — no single number decides outcomes" />
          <div className="px-3 pb-4">
            <ChartView spec={radar} height={300} />
          </div>
        </Card>
        <Card>
          <CardHeader title="Dimensions" subtitle={`Overall ${data.overall}%`} />
          <CardBody className="space-y-4">
            {data.dimensions.map((d) => (
              <div key={d.name}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink">{d.name}</span>
                  <span className="tabular-nums text-ink-2">
                    {d.score}
                    <span className="text-ink-3"> / target {d.target}</span>
                  </span>
                </div>
                <div className="relative">
                  <Progress value={d.score} tone={d.score >= d.target ? "teal" : toneForScore(d.score)} label={d.name} />
                  <span className="absolute top-[-2px] h-3 w-0.5 bg-ink" style={{ left: `${d.target}%` }} aria-hidden />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <ListCard title="Strengths" items={data.strengths} tone="teal" />
        <ListCard title="Gaps" items={data.gaps} tone="amber" />
        <ListCard title="Improvement plan" items={data.plan} tone="brand" numbered />
      </div>
    </div>
  );
}

function ListCard({ title, items, tone, numbered }: { title: string; items: string[]; tone: "teal" | "amber" | "brand"; numbered?: boolean }) {
  return (
    <Card>
      <CardHeader title={title} />
      <CardBody>
        <ul className="space-y-2.5">
          {items.map((it, i) => (
            <li key={it} className="flex gap-2.5 text-sm text-ink-2">
              <span className={cn("mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold", toneClasses[tone])}>
                {numbered ? i + 1 : <CheckCircle2 className="size-3.5" aria-hidden />}
              </span>
              {it}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

/* ── Calendar ──────────────────────────────────── */
export function CalendarTemplate({ data }: { data: CalendarData }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        {data.days.map((d) => (
          <Card key={d.day}>
            <CardHeader title={d.day} />
            <CardBody>
              <ol className="space-y-2">
                {d.items.map((it) => (
                  <li key={`${it.time}-${it.title}`} className="flex items-center gap-4 rounded-lg border border-line px-4 py-3">
                    <span className="w-24 shrink-0 text-sm font-medium tabular-nums text-ink-2">{it.time}</span>
                    <span className={cn("h-8 w-1 shrink-0 rounded-full", toneBar[it.tone])} aria-hidden />
                    <span className="min-w-0 flex-1 text-sm text-ink">{it.title}</span>
                    <Badge tone={it.tone} className="hidden sm:inline-flex">
                      {it.tag}
                    </Badge>
                  </li>
                ))}
              </ol>
            </CardBody>
          </Card>
        ))}
      </div>
      {data.tips.length > 0 ? (
        <div className="space-y-3">
          {data.tips.map((t) => (
            <Notice key={t} tone="sky">
              {t}
            </Notice>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ── Settings ──────────────────────────────────── */
const COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function SettingsTemplate({ data }: { data: SettingsData }) {
  const initial = useMemo(() => Object.fromEntries(data.sections.flatMap((s) => s.fields.map((f) => [f.id, f.value]))), [data]);
  const [values, setValues] = useState<Record<string, string | boolean>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(values) !== JSON.stringify(initial);

  const save = () => {
    const next: Record<string, string> = {};
    for (const s of data.sections)
      for (const f of s.fields) {
        const v = values[f.id];
        if (f.type === "color" && (typeof v !== "string" || !COLOR_RE.test(v))) next[f.id] = "Use a hex colour like #1e2a5a.";
        if (f.type === "text" && typeof v === "string" && (cleanText(v, 120).length === 0 || v.length > 120)) next[f.id] = "Required, up to 120 characters.";
        if (f.type === "select" && f.options && !f.options.includes(String(v))) next[f.id] = "Choose a listed option.";
      }
    setErrors(next);
    if (Object.keys(next).length === 0) setSaved(true);
  };

  return (
    <div className="max-w-3xl space-y-6">
      {data.sections.map((s) => (
        <Card key={s.title}>
          <CardHeader title={s.title} subtitle={s.description} />
          <CardBody className="space-y-5">
            {s.fields.map((f) => {
              const id = `setting-${f.id}`;
              const v = values[f.id];
              if (f.type === "toggle") {
                return (
                  <div key={f.id} className="flex items-start justify-between gap-4">
                    <div>
                      <label htmlFor={id} className="text-sm font-medium text-ink">
                        {f.label}
                      </label>
                      {f.help ? <p className="text-xs text-ink-3">{f.help}</p> : null}
                    </div>
                    <button
                      id={id}
                      role="switch"
                      aria-checked={v === true}
                      onClick={() => {
                        setSaved(false);
                        setValues((p) => ({ ...p, [f.id]: !(p[f.id] === true) }));
                      }}
                      className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors", v === true ? "bg-teal" : "bg-line")}
                    >
                      <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", v === true ? "translate-x-5" : "translate-x-0.5")} />
                    </button>
                  </div>
                );
              }
              return (
                <Field key={f.id} label={f.label} htmlFor={id} hint={f.help} error={errors[f.id]}>
                  {f.type === "select" ? (
                    <select
                      id={id}
                      value={String(v)}
                      onChange={(e) => {
                        setSaved(false);
                        setValues((p) => ({ ...p, [f.id]: e.target.value }));
                      }}
                      className={inputClass}
                    >
                      {f.options?.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "color" ? (
                    <div className="flex items-center gap-3">
                      <input
                        id={id}
                        type="color"
                        value={COLOR_RE.test(String(v)) ? String(v) : "#000000"}
                        onChange={(e) => {
                          setSaved(false);
                          setValues((p) => ({ ...p, [f.id]: e.target.value }));
                        }}
                        className="h-10 w-14 cursor-pointer rounded-lg border border-line bg-surface"
                      />
                      <code className="text-sm text-ink-2">{String(v)}</code>
                    </div>
                  ) : (
                    <input
                      id={id}
                      value={String(v)}
                      maxLength={120}
                      onChange={(e) => {
                        setSaved(false);
                        setValues((p) => ({ ...p, [f.id]: e.target.value }));
                      }}
                      className={inputClass}
                    />
                  )}
                </Field>
              );
            })}
          </CardBody>
        </Card>
      ))}
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={!dirty}>
          Save changes
        </Button>
        {saved ? (
          <span className="inline-flex items-center gap-1 text-sm text-teal" role="status">
            <Check className="size-4" /> Validated. Changes are audit-logged when saved to the live backend.
          </span>
        ) : null}
      </div>
    </div>
  );
}

/* ── Gallery ───────────────────────────────────── */
export function GalleryTemplate({ data }: { data: GalleryData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {data.items.map((it) => (
        <Card key={it.title} className="flex flex-col p-5 transition-shadow hover:shadow-lg">
          <div className="flex items-start justify-between gap-2">
            <Badge tone={it.tone}>{it.tag}</Badge>
            <span className="text-xs text-ink-3">{it.meta}</span>
          </div>
          <h3 className="mt-3 font-sans text-base font-semibold text-ink">{it.title}</h3>
          <p className="mt-1 flex-1 text-sm text-ink-2">{it.description}</p>
          {typeof it.progress === "number" ? <Progress value={it.progress} tone={it.tone} className="mt-4" label={`${it.title} progress`} /> : null}
        </Card>
      ))}
    </div>
  );
}

/* ── Chat ──────────────────────────────────────── */
export function ChatTemplate({ data, mod }: { data: ChatData; mod: ModuleDef }) {
  const agent = findAgent(mod.agent);
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <Card className="flex h-[70vh] min-h-[480px] flex-col overflow-hidden">
        <ChatPanel agent={mod.agent ?? "mentor"} agentName={agent?.name ?? mod.title} intro={data.intro} suggestions={data.suggestions} context={data.context} className="flex-1" />
      </Card>
      <div className="space-y-4">
        {agent ? (
          <Card className="p-5">
            <p className="text-xs uppercase tracking-wide text-ink-3">Agent</p>
            <p className="mt-1 font-semibold text-ink">{agent.name}</p>
            <p className="mt-1 text-sm text-ink-2">{agent.summary}</p>
          </Card>
        ) : null}
        <Notice tone="sky">Answers marked <strong>Institution source</strong> come from approved documents. Everything else is a general AI explanation — verify before relying on it.</Notice>
      </div>
    </div>
  );
}

/* ── Generator ─────────────────────────────────── */
export function GeneratorTemplate({ data, mod }: { data: GeneratorData; mod: ModuleDef }) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(data.fields.map((f) => [f.name, f.defaultValue ?? f.options?.[0] ?? ""])),
  );
  const [copied, setCopied] = useState(false);
  const mutation = useMutation({
    mutationFn: (inputs: Record<string, string>) => apiFetch("/api/v1/ai/generate", GenerateReply, { method: "POST", body: { module: mod.slug, inputs } }),
  });

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <Card className="h-fit">
        <CardHeader title="Inputs" subtitle={findAgent(mod.agent)?.name} />
        <CardBody>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const cleaned = Object.fromEntries(Object.entries(values).map(([k, v]) => [k, cleanText(v, 4000)]));
              mutation.mutate(cleaned);
            }}
          >
            {data.fields.map((f) => {
              const id = `gen-${f.name}`;
              return (
                <Field key={f.name} label={f.label} htmlFor={id}>
                  {f.type === "select" ? (
                    <select id={id} className={inputClass} value={values[f.name]} onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}>
                      {f.options?.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea
                      id={id}
                      rows={5}
                      maxLength={4000}
                      className={inputClass}
                      placeholder={f.placeholder}
                      value={values[f.name]}
                      onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                    />
                  ) : (
                    <input
                      id={id}
                      type={f.type === "number" ? "number" : "text"}
                      min={f.type === "number" ? 0 : undefined}
                      max={f.type === "number" ? 10_000_000 : undefined}
                      maxLength={200}
                      className={inputClass}
                      placeholder={f.placeholder}
                      value={values[f.name]}
                      onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                    />
                  )}
                </Field>
              );
            })}
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? <Spinner /> : <Sparkles className="size-4" />}
              {data.cta}
            </Button>
          </form>
        </CardBody>
      </Card>

      <Card className="min-h-80">
        <CardHeader
          title="Output"
          action={
            mutation.data ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  void navigator.clipboard?.writeText(mutation.data.markdown).then(() => {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  });
                }}
              >
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            ) : null
          }
        />
        <CardBody>
          {mutation.isError ? (
            <p className="text-sm text-rose" role="alert">
              {mutation.error instanceof ApiError ? mutation.error.message : "Generation failed."}
            </p>
          ) : mutation.isPending ? (
            <div className="flex items-center gap-2 text-sm text-ink-3">
              <Spinner /> Generating…
            </div>
          ) : mutation.data ? (
            <div className="space-y-4">
              <SafeMarkdown>{mutation.data.markdown}</SafeMarkdown>
              <AiLabel />
            </div>
          ) : (
            <EmptyState title="Nothing generated yet" body="Fill in the inputs and generate. Output is a draft for you to review and edit." />
          )}
        </CardBody>
      </Card>
    </div>
  );
}

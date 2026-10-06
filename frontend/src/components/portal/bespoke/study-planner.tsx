"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { MAX_DAYS, MIN_DAYS, PLANNER_MODES, PlannerOverview, StudyPlan, type StudyTask } from "@/lib/api/study-planner-schemas";
import { SafeMarkdown } from "@/components/ui/safe-markdown";
import { AiLabel } from "@/components/ui/notices";
import { LoadError } from "@/components/ui/load-error";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Progress, Skeleton, Spinner, inputClass, toneForScore } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const KEY = ["study-planner"] as const;
const KIND_TONE = { study: "brand", revision: "teal", mock: "amber" } as const;
const KIND_LABEL = { study: "Study", revision: "Revision", mock: "Mock test" } as const;

const fmtMinutes = (m: number) => (m >= 60 ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}` : `${m}m`);
const dayDate = (iso: string) => new Date(`${iso}T00:00:00`);
const dayLabel = (iso: string) => dayDate(iso).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
const addDays = (iso: string, n: number) => {
  const d = dayDate(iso);
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
/** Today's date in the student's own timezone (yyyy-mm-dd). */
const todayIso = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};

export function StudyPlannerModule() {
  const overview = useQuery({ queryKey: KEY, queryFn: () => apiFetch("/api/v1/study-planner", PlannerOverview) });
  if (overview.isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (overview.isError || !overview.data) return <LoadError error={overview.error} onRetry={() => void overview.refetch()} />;
  return <Planner data={overview.data} />;
}

function Planner({ data }: { data: PlannerOverview }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    days: String(data.plan?.days ?? data.defaults.days),
    hours: String(data.defaults.hours),
    mode: data.defaults.mode,
    subjects: data.plan?.subjects?.length ? data.plan.subjects : data.subjects.map((s) => s.name),
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setPlan = (plan: StudyPlan | null) => qc.setQueryData<PlannerOverview>(KEY, (old) => (old ? { ...old, plan } : old));

  const generate = useMutation({
    mutationFn: (body: { days: number; hours: number; mode: string; subjects: string[]; startDate: string }) => apiFetch("/api/v1/study-planner/plan", StudyPlan, { method: "POST", body }),
    onSuccess: setPlan,
    onError: (e) => {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
    },
  });
  const toggle = useMutation({
    mutationFn: (v: { taskId: string; done: boolean }) => apiFetch("/api/v1/study-planner/plan/tasks", StudyPlan, { method: "PATCH", body: v }),
    onSuccess: setPlan,
  });
  const reset = useMutation({
    mutationFn: () => apiFetch("/api/v1/study-planner/plan", z.object({ ok: z.boolean() }), { method: "DELETE" }),
    onSuccess: () => setPlan(null),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const days = Number(form.days);
    const hours = Number(form.hours);
    if (!Number.isInteger(days) || days < MIN_DAYS || days > MAX_DAYS) errs.days = `Between ${MIN_DAYS} and ${MAX_DAYS} days`;
    if (!Number.isInteger(hours) || hours < 1 || hours > 12) errs.hours = "Between 1 and 12 hours";
    if (form.subjects.length === 0) errs.subjects = "Pick at least one subject";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    generate.mutate({ days, hours, mode: form.mode, subjects: form.subjects, startDate: todayIso() });
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <Card className="h-fit">
        <CardHeader title="Plan your exam window" subtitle={`Built from your own subjects. Next: ${data.defaults.examName}.`} />
        <CardBody>
          <form className="space-y-4" onSubmit={submit} noValidate>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Days until exams" htmlFor="days" error={errors.days}>
                <input id="days" type="number" inputMode="numeric" min={MIN_DAYS} max={MAX_DAYS} className={inputClass} value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value })} />
              </Field>
              <Field label="Hours / day" htmlFor="hours" error={errors.hours}>
                <input id="hours" type="number" inputMode="numeric" min={1} max={12} className={inputClass} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              </Field>
            </div>
            <Field label="Subjects to include" htmlFor="subjects-group" error={errors.subjects}>
              <div id="subjects-group" role="group" aria-label="Subjects to include" className="space-y-1.5">
                {data.subjects.map((s) => {
                  const on = form.subjects.includes(s.name);
                  return (
                    <button
                      key={s.name}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setForm({ ...form, subjects: on ? form.subjects.filter((x) => x !== s.name) : [...form.subjects, s.name] })}
                      className={cn("flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm transition-colors", on ? "border-brand bg-brand-soft/50" : "border-line bg-surface hover:bg-surface-2")}
                    >
                      <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border text-[10px]", on ? "border-brand bg-brand text-white" : "border-line")} aria-hidden>
                        {on ? "✓" : ""}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium text-ink">
                          {s.name} <span className="font-normal text-ink-3">· {s.title}</span>
                        </span>
                        {s.weakestTopic ? <span className="block truncate text-xs text-ink-3">Weakest: {s.weakestTopic}</span> : null}
                      </span>
                      <Badge tone={toneForScore(s.mastery)}>{s.mastery}%</Badge>
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Study mode" htmlFor="mode">
              <select id="mode" className={inputClass} value={form.mode} onChange={(e) => setForm({ ...form, mode: e.target.value })}>
                {PLANNER_MODES.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </select>
            </Field>
            {generate.isError && !(generate.error instanceof ApiError && generate.error.fields) ? (
              <p className="text-sm text-rose" role="alert">
                {generate.error instanceof ApiError ? generate.error.message : "Could not build a plan."}
              </p>
            ) : null}
            <Button type="submit" className="w-full" disabled={generate.isPending}>
              {generate.isPending ? <Spinner /> : <Sparkles className="size-4" />} {data.plan ? "Rebuild my plan" : "Build my plan"}
            </Button>
            <p className="text-xs text-ink-3">Weaker topics, based on your topic mastery, get more time and come first. Rebuilding replaces your current plan and progress.</p>
          </form>
        </CardBody>
      </Card>

      <PlanView
        plan={data.plan}
        building={generate.isPending}
        toggling={toggle.isPending}
        onToggle={(t) => toggle.mutate({ taskId: t.id, done: !t.done })}
        onReset={() => reset.mutate()}
        resetting={reset.isPending}
        toggleError={toggle.isError ? (toggle.error instanceof ApiError ? toggle.error.message : "Could not save that change.") : null}
      />
    </div>
  );
}

function PlanView({ plan, building, toggling, onToggle, onReset, resetting, toggleError }: { plan: StudyPlan | null; building: boolean; toggling: boolean; onToggle: (t: StudyTask) => void; onReset: () => void; resetting: boolean; toggleError: string | null }) {
  const today = todayIso();
  const byDay = useMemo(() => {
    const m = new Map<number, StudyTask[]>();
    for (const t of plan?.tasks ?? []) m.set(t.day, [...(m.get(t.day) ?? []), t]);
    return [...m.entries()].sort((a, b) => a[0] - b[0]);
  }, [plan]);

  if (building) {
    return (
      <Card className="min-h-96">
        <CardBody>
          <p className="flex items-center gap-2 text-sm text-ink-3">
            <Spinner /> Building your plan from your marks and topic mastery…
          </p>
        </CardBody>
      </Card>
    );
  }
  if (!plan) {
    return (
      <Card className="min-h-96">
        <CardHeader title="Your plan" subtitle="Daily schedule · weakest topics first · mock tests · final revision" />
        <CardBody>
          <EmptyState title="No plan yet" body="Choose your subjects and exam window, then build a day-by-day plan made from your own topic mastery." />
        </CardBody>
      </Card>
    );
  }

  const done = plan.tasks.filter((t) => t.done).length;
  const totalMin = plan.tasks.reduce((a, t) => a + t.minutes, 0);
  const doneMin = plan.tasks.filter((t) => t.done).reduce((a, t) => a + t.minutes, 0);
  const pct = plan.tasks.length ? Math.round((done / plan.tasks.length) * 100) : 0;

  return (
    <Card className="min-h-96">
      <CardHeader
        title="Your plan"
        subtitle={`${plan.days} days from ${dayLabel(plan.startDate)} · ${plan.hoursPerDay}h a day · ${plan.mode}`}
        action={
          <Button variant="ghost" size="sm" onClick={onReset} disabled={resetting}>
            {resetting ? <Spinner /> : null} Clear plan
          </Button>
        }
      />
      <CardBody className="space-y-5">
        <div>
          <div className="mb-1 flex justify-between text-sm">
            <span className="text-ink-2">
              {done} of {plan.tasks.length} tasks done
            </span>
            <span className="tabular-nums text-ink">
              {fmtMinutes(doneMin)} / {fmtMinutes(totalMin)}
            </span>
          </div>
          <Progress value={pct} label="Plan progress" tone={pct === 100 ? "teal" : "brand"} />
        </div>

        {plan.note ? (
          <div className="rounded-xl border border-line bg-surface-2/60 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-3">Coach&apos;s note</p>
            <SafeMarkdown>{plan.note}</SafeMarkdown>
            <div className="mt-2">
              <AiLabel />
            </div>
          </div>
        ) : null}

        {toggleError ? (
          <p className="text-sm text-rose" role="alert">
            {toggleError}
          </p>
        ) : null}

        <ol className="space-y-3">
          {byDay.map(([day, tasks]) => {
            const date = addDays(plan.startDate, day - 1);
            const isToday = date === today;
            const missed = date < today && tasks.some((t) => !t.done);
            return (
              <li key={day} className={cn("rounded-xl border p-3", isToday ? "border-brand bg-brand-soft/30" : "border-line bg-surface")}>
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold text-ink">Day {day}</span>
                  <span className="text-xs text-ink-3">{dayLabel(date)}</span>
                  {isToday ? <Badge tone="brand">Today</Badge> : null}
                  {missed ? <Badge tone="amber">Catch up</Badge> : null}
                </div>
                <ul className="space-y-1.5">
                  {tasks.map((t) => (
                    <li key={t.id}>
                      <label className="flex cursor-pointer items-start gap-3 rounded-lg px-1 py-1 hover:bg-surface-2/60">
                        <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--color-brand,#4f46e5)]" checked={t.done} disabled={toggling} onChange={() => onToggle(t)} />
                        <span className="min-w-0 flex-1">
                          <span className={cn("block text-sm text-ink", t.done && "text-ink-3 line-through")}>{t.title}</span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5">
                            <Badge tone={KIND_TONE[t.kind]}>{KIND_LABEL[t.kind]}</Badge>
                            <span className="text-xs text-ink-3">
                              {t.subject} · {fmtMinutes(t.minutes)}
                            </span>
                          </span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ol>
      </CardBody>
    </Card>
  );
}

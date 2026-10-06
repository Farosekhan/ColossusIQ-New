"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Circle, Sparkles } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { MissionOverview, MissionPlan, type Phase } from "@/lib/api/mission-planner-schemas";
import { AiLabel, Notice } from "@/components/ui/notices";
import { LoadError } from "@/components/ui/load-error";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Progress, Skeleton, Spinner, inputClass } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const KEY = ["mission-planner"] as const;

export function MissionPlannerModule() {
  const q = useQuery({ queryKey: KEY, queryFn: () => apiFetch("/api/v1/mission-planner", MissionOverview) });
  if (q.isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (q.isError || !q.data) return <LoadError error={q.error} onRetry={() => void q.refetch()} />;
  return <Mission data={q.data} />;
}

type Status = "done" | "active" | "todo";
/** A phase is done when all its milestones are; the first unfinished phase is the current one. */
function statuses(phases: Phase[]): Status[] {
  let activeSeen = false;
  return phases.map((p) => {
    if (p.milestones.every((m) => m.done)) return "done";
    if (!activeSeen) {
      activeSeen = true;
      return "active";
    }
    return "todo";
  });
}

function Mission({ data }: { data: MissionOverview }) {
  const qc = useQueryClient();
  const { plan, defaults } = data;
  const [form, setForm] = useState({ role: defaults.role, hours: String(defaults.hoursPerWeek), vision: plan?.vision ?? "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const setPlan = (p: MissionPlan | null) => qc.setQueryData<MissionOverview>(KEY, (old) => (old ? { ...old, plan: p } : old));

  const generate = useMutation({
    mutationFn: (body: { role: string; hoursPerWeek: number; vision?: string }) => apiFetch("/api/v1/mission-planner/plan", MissionPlan, { method: "POST", body }),
    onSuccess: setPlan,
    onError: (e) => {
      if (e instanceof ApiError && e.fields) setErrors(e.fields);
    },
  });
  const toggle = useMutation({ mutationFn: (v: { id: string; done: boolean }) => apiFetch("/api/v1/mission-planner/milestones", MissionPlan, { method: "PATCH", body: v }), onSuccess: setPlan });
  const reset = useMutation({ mutationFn: () => apiFetch("/api/v1/mission-planner/plan", z.object({ ok: z.boolean() }), { method: "DELETE" }), onSuccess: () => setPlan(null) });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    const role = form.role.trim();
    const hours = Number(form.hours);
    if (role.length < 3) errs.role = "Say where you want to be (at least 3 characters)";
    if (!Number.isInteger(hours) || hours < 1 || hours > 40) errs.hoursPerWeek = "Between 1 and 40 hours";
    setErrors(errs);
    if (Object.keys(errs).length) return;
    generate.mutate({ role, hoursPerWeek: hours, ...(form.vision.trim() ? { vision: form.vision.trim() } : {}) });
  };
  const failure = generate.isError && !(generate.error instanceof ApiError && generate.error.fields) ? (generate.error instanceof ApiError ? generate.error.message : "Could not build your roadmap.") : null;

  return (
    <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
      <div className="space-y-6">
        <Card className="h-fit">
          <CardHeader title="Where do you want to be?" subtitle={`${defaults.program} · semester ${defaults.semester} of ${defaults.totalSemesters}`} />
          <CardBody>
            <form className="space-y-4" onSubmit={submit} noValidate>
              <Field label="Your goal after graduation" htmlFor="mp-role" error={errors.role}>
                <input id="mp-role" list="mp-roles" className={inputClass} maxLength={80} placeholder="e.g. Data Scientist" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
                <datalist id="mp-roles">
                  {defaults.roleSuggestions.map((r) => (
                    <option key={r} value={r} />
                  ))}
                </datalist>
              </Field>
              <Field label="Hours you can study per week" htmlFor="mp-hours" error={errors.hoursPerWeek}>
                <input id="mp-hours" type="number" inputMode="numeric" min={1} max={40} className={inputClass} value={form.hours} onChange={(e) => setForm({ ...form, hours: e.target.value })} />
              </Field>
              <Field label="In your own words (optional)" htmlFor="mp-vision" error={errors.vision}>
                <textarea id="mp-vision" rows={3} maxLength={300} className={inputClass} placeholder="What does success look like for you?" value={form.vision} onChange={(e) => setForm({ ...form, vision: e.target.value })} />
              </Field>
              {failure ? (
                <p className="text-sm text-rose" role="alert">
                  {failure}
                </p>
              ) : null}
              <Button type="submit" className="w-full" disabled={generate.isPending}>
                {generate.isPending ? <Spinner /> : <Sparkles className="size-4" />} {plan ? "Rebuild my roadmap" : "Build my roadmap"}
              </Button>
              <p className="text-xs text-ink-3">The roadmap uses your own marks, weakest topics, attendance, next exam and project. Rebuilding replaces your current roadmap and progress.</p>
            </form>
          </CardBody>
        </Card>
        <Notice tone="sky">Each stage can be supported by an AI agent, but stage approvals are made by your mentor or faculty.</Notice>
      </div>

      {generate.isPending ? (
        <Card className="min-h-96">
          <CardBody>
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Spinner /> Building your roadmap from your records…
            </p>
          </CardBody>
        </Card>
      ) : !plan ? (
        <Card className="min-h-96">
          <CardHeader title="Your roadmap" subtitle="Next 4 weeks · this semester · each remaining semester · your goal" />
          <CardBody>
            <EmptyState title="No roadmap yet" body="Tell the planner where you want to be after graduation and it will turn that into a plan you can tick off." />
          </CardBody>
        </Card>
      ) : (
        <Roadmap plan={plan} onToggle={(id, done) => toggle.mutate({ id, done })} toggling={toggle.isPending} onReset={() => reset.mutate()} resetting={reset.isPending} error={toggle.isError ? (toggle.error instanceof ApiError ? toggle.error.message : "Could not save that change.") : null} />
      )}
    </div>
  );
}

function Roadmap({ plan, onToggle, toggling, onReset, resetting, error }: { plan: MissionPlan; onToggle: (id: string, done: boolean) => void; toggling: boolean; onReset: () => void; resetting: boolean; error: string | null }) {
  const st = statuses(plan.phases);
  const all = plan.phases.flatMap((p) => p.milestones);
  const doneCount = all.filter((m) => m.done).length;
  const pct = all.length ? Math.round((doneCount / all.length) * 100) : 0;
  const activeIdx = st.indexOf("active");
  const focus = activeIdx >= 0 ? plan.phases[activeIdx]!.milestones.filter((m) => !m.done).slice(0, 3) : [];

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_280px]">
      <Card>
        <CardHeader
          title={`Roadmap to: ${plan.role}`}
          subtitle={`${st.filter((s) => s === "done").length} of ${plan.phases.length} stages complete · ${plan.hoursPerWeek} h/week`}
          action={
            <Button variant="ghost" size="sm" onClick={onReset} disabled={resetting}>
              {resetting ? <Spinner /> : null} Clear
            </Button>
          }
        />
        <CardBody className="space-y-4">
          {plan.note ? (
            <div className="rounded-xl border border-line bg-surface-2/60 p-4">
              <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-3">Mentor&apos;s note</p>
              <p className="text-sm text-ink-2">{plan.note}</p>
              <div className="mt-2">
                <AiLabel />
              </div>
            </div>
          ) : null}
          {error ? (
            <p className="text-sm text-rose" role="alert">
              {error}
            </p>
          ) : null}
          <ol className="relative space-y-1">
            {plan.phases.map((p, i) => (
              <li key={p.id} className="relative flex gap-4 pb-5 last:pb-0">
                {i < plan.phases.length - 1 ? <span className={cn("absolute left-[13px] top-7 h-[calc(100%-1.25rem)] w-0.5", st[i] === "done" ? "bg-teal" : "bg-line")} aria-hidden /> : null}
                <span
                  className={cn(
                    "relative z-10 flex size-7 shrink-0 items-center justify-center rounded-full border-2",
                    st[i] === "done" && "border-teal bg-teal text-white",
                    st[i] === "active" && "border-gold bg-gold-soft text-amber",
                    st[i] === "todo" && "border-line bg-surface text-ink-3",
                  )}
                  aria-hidden
                >
                  {st[i] === "done" ? <Check className="size-4" /> : st[i] === "active" ? <Sparkles className="size-3.5" /> : <Circle className="size-2.5" />}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <p className={cn("flex flex-wrap items-center gap-2 text-sm font-semibold", st[i] === "todo" ? "text-ink-3" : "text-ink")}>
                    {p.title}
                    {p.period ? <span className="text-xs font-normal text-ink-3">{p.period}</span> : null}
                    {st[i] === "active" ? <Badge tone="gold">Current</Badge> : null}
                    <span className="sr-only"> — {st[i]}</span>
                  </p>
                  <p className="text-sm text-ink-2">{p.description}</p>
                  <ul className="mt-2 space-y-1">
                    {p.milestones.map((m) => (
                      <li key={m.id}>
                        <label className="flex cursor-pointer items-start gap-2.5 rounded-lg px-1 py-1 hover:bg-surface-2/60">
                          <input type="checkbox" className="mt-1 size-4 shrink-0 accent-[var(--color-brand,#4f46e5)]" checked={m.done} disabled={toggling} onChange={() => onToggle(m.id, !m.done)} />
                          <span className={cn("text-sm text-ink-2", m.done && "text-ink-3 line-through")}>{m.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              </li>
            ))}
          </ol>
        </CardBody>
      </Card>

      <div className="space-y-4">
        <Card className="p-5">
          <p className="text-sm font-medium text-ink-2">Overall progress</p>
          <p className="mt-1 font-serif text-4xl font-semibold text-ink">{pct}%</p>
          <Progress value={pct} tone="teal" className="mt-3" label="Overall progress" />
          <p className="mt-2 text-xs text-ink-3">
            {doneCount} of {all.length} milestones done
          </p>
        </Card>
        {focus.length > 0 ? (
          <Card className="p-5">
            <p className="mb-2 text-sm font-medium text-ink-2">Focus next</p>
            <ul className="space-y-2">
              {focus.map((m) => (
                <li key={m.id} className="text-sm text-ink">
                  {m.text}
                </li>
              ))}
            </ul>
          </Card>
        ) : null}
        <p className="px-1 text-xs text-ink-3">{plan.source === "ai" ? "Written by AI from your records." : "Built from your records. With AI on, roadmaps are tailored further."}</p>
      </div>
    </div>
  );
}

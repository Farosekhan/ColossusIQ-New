"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { GeneratedQuiz, LearningContext, StaffQuizRow, type BankQuestion } from "@/lib/api/learning-schemas";
import { TemplateSkeleton } from "@/components/modules/shared";
import { LoadError } from "@/components/ui/load-error";
import { AiLabel } from "@/components/ui/notices";
import { Fi } from "@/components/ui/icon";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Spinner, inputClass, toneForScore, toneForStatus } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const PLACEMENT_DEPT = "Training & Placement";
const LETTERS = ["A", "B", "C", "D"];

export function QuizBuilderModule() {
  const ctx = useQuery({ queryKey: ["learning-context"], queryFn: () => apiFetch("/api/v1/learning/context", LearningContext) });
  const [building, setBuilding] = useState(false);
  if (ctx.isLoading) return <TemplateSkeleton />;
  if (ctx.isError) return <LoadError error={ctx.error} onRetry={() => void ctx.refetch()} />;
  if (!ctx.data?.stream) return <EmptyState title="Choose a college first" body="Quizzes belong to one college. Switch into a college from the top bar." />;
  return building ? <Builder ctx={ctx.data} onDone={() => setBuilding(false)} /> : <QuizList onNew={() => setBuilding(true)} />;
}

function QuizList({ onNew }: { onNew: () => void }) {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: ["quizzes"], queryFn: () => apiFetch("/api/v1/quizzes", z.array(StaffQuizRow)) });
  const [error, setError] = useState<string | null>(null);
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiFetch(`/api/v1/quizzes/${encodeURIComponent(id)}/status`, z.object({ id: z.string(), status: z.string() }), { method: "POST", body: { status } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Update failed."),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/quizzes/${encodeURIComponent(id)}`, z.object({ ok: z.boolean() }), { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
    onError: (e) => setError(e instanceof ApiError ? e.message : "Delete failed."),
  });

  if (list.isError) return <LoadError error={list.error} onRetry={() => void list.refetch()} />;
  if (list.isLoading || !list.data) return <TemplateSkeleton />;
  const rows = list.data;
  const totals = {
    published: rows.filter((r) => r.status === "Published").length,
    attempts: rows.reduce((s, r) => s + r.attempts, 0),
    avg: rows.filter((r) => r.attempts).length ? Math.round(rows.filter((r) => r.attempts).reduce((s, r) => s + r.average, 0) / rows.filter((r) => r.attempts).length) : 0,
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Quizzes", value: rows.length, icon: "test" },
          { label: "Published", value: totals.published, icon: "paper-plane" },
          { label: "Attempts", value: totals.attempts, icon: "users" },
          { label: "Average score", value: `${totals.avg}%`, icon: "chart-histogram" },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="flex items-center gap-2 text-sm text-ink-3">
              <Fi name={k.icon} /> {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink">{k.value}</p>
          </Card>
        ))}
      </div>
      {error ? (
        <p role="alert" className="rounded-xl border border-rose/30 bg-rose-soft px-4 py-3 text-sm text-rose">
          {error}
        </p>
      ) : null}
      <Card>
        <CardHeader
          title="Department quizzes"
          subtitle="Server-scored · students never receive the answer key"
          action={
            <Button onClick={onNew}>
              <Fi name="sparkles" /> New AI quiz
            </Button>
          }
        />
        <CardBody className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-3">
                <th className="py-2 pr-3 font-medium">Quiz</th>
                <th className="py-2 pr-3 font-medium">Questions</th>
                <th className="py-2 pr-3 font-medium">Pass mark</th>
                <th className="py-2 pr-3 font-medium">Students</th>
                <th className="py-2 pr-3 font-medium">Average</th>
                <th className="py-2 pr-3 font-medium">Pass rate</th>
                <th className="py-2 pr-3 font-medium">Status</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line/60 last:border-0">
                  <td className="py-3 pr-3">
                    <p className="font-medium text-ink">{r.title}</p>
                    <p className="text-xs text-ink-3">
                      {r.department} · {r.durationMin} min {r.certificateEnabled ? "· certificate" : ""}
                    </p>
                  </td>
                  <td className="py-3 pr-3">{r.questions}</td>
                  <td className="py-3 pr-3">{r.passMark}%</td>
                  <td className="py-3 pr-3">{r.students}</td>
                  <td className="py-3 pr-3">{r.attempts ? <Badge tone={toneForScore(r.average)}>{r.average}%</Badge> : "—"}</td>
                  <td className="py-3 pr-3">{r.students ? `${r.passRate}%` : "—"}</td>
                  <td className="py-3 pr-3">
                    <Badge tone={toneForStatus(r.status)}>{r.status}</Badge>
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex justify-end gap-1">
                      {r.status !== "Published" ? (
                        <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: r.id, status: "Published" })}>
                          Publish
                        </Button>
                      ) : (
                        <Button size="sm" variant="secondary" onClick={() => setStatus.mutate({ id: r.id, status: "Closed" })}>
                          Close
                        </Button>
                      )}
                      {r.attempts === 0 ? (
                        <Button size="sm" variant="ghost" aria-label={`Delete ${r.title}`} onClick={() => remove.mutate(r.id)}>
                          <Fi name="trash" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}

function Builder({ ctx, onDone }: { ctx: LearningContext; onDone: () => void }) {
  const qc = useQueryClient();
  const departments = [...ctx.departments, PLACEMENT_DEPT];
  const [meta, setMeta] = useState({ title: "", department: departments[0] ?? "", course: "", topic: "", count: 8, passMark: 50, durationMin: 20, certificateEnabled: true });
  const [questions, setQuestions] = useState<Array<BankQuestion & { review?: boolean }>>([]);
  const [info, setInfo] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const gen = useMutation({
    mutationFn: () => apiFetch("/api/v1/quizzes/generate", GeneratedQuiz, { method: "POST", body: { department: meta.department, topic: meta.topic.trim() || undefined, count: meta.count } }),
    onSuccess: (r) => {
      setQuestions(r.questions.map((q, i) => ({ ...q, review: i >= r.fromBank })));
      setInfo(`${r.fromBank} question(s) from the curated ${meta.department} bank${r.templated ? ` · ${r.templated} template question(s) marked “review” — edit them before publishing` : ""}.`);
      if (!meta.title) setMeta((m) => ({ ...m, title: `${m.department}${m.topic ? ` — ${m.topic}` : ""} quiz` }));
      if (!meta.course) setMeta((m) => ({ ...m, course: m.topic || m.department }));
    },
    onError: (e) => setError(e instanceof ApiError ? e.message : "Generation failed."),
  });

  const save = useMutation({
    mutationFn: (status: "Draft" | "Published") =>
      apiFetch("/api/v1/quizzes", z.object({ id: z.string() }), {
        method: "POST",
        body: {
          title: meta.title,
          department: meta.department,
          course: meta.course,
          passMark: meta.passMark,
          durationMin: meta.durationMin,
          certificateEnabled: meta.certificateEnabled,
          status,
          questions: questions.map(({ prompt, options, answer, explanation }) => ({ prompt, options, answer, explanation })),
        },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quizzes"] });
      onDone();
    },
    onError: (e) => {
      if (e instanceof ApiError) {
        setErrors(e.fields);
        setError(e.message);
      } else setError("Could not save.");
    },
  });

  const update = (i: number, patch: Partial<BankQuestion>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch, review: false } : q)));
  const setM = <K extends keyof typeof meta>(k: K, v: (typeof meta)[K]) => setMeta((m) => ({ ...m, [k]: v }));
  const unreviewed = questions.filter((q) => q.review).length;

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Card className="h-fit">
        <CardHeader title="Quiz settings" action={<Button size="sm" variant="ghost" onClick={onDone}>Cancel</Button>} />
        <CardBody className="space-y-4">
          <Field label="Department" htmlFor="q-dept">
            <select id="q-dept" className={inputClass} value={meta.department} onChange={(e) => setM("department", e.target.value)}>
              {departments.map((d) => (
                <option key={d}>{d}</option>
              ))}
            </select>
          </Field>
          <Field label="Topic (optional)" htmlFor="q-topic" hint="Narrows template questions, e.g. Normalization, Cardiac cycle">
            <input id="q-topic" className={inputClass} maxLength={100} value={meta.topic} onChange={(e) => setM("topic", e.target.value)} />
          </Field>
          <Field label="Number of questions" htmlFor="q-count">
            <input id="q-count" type="number" min={3} max={20} className={inputClass} value={meta.count} onChange={(e) => setM("count", Math.max(3, Math.min(20, Number(e.target.value) || 3)))} />
          </Field>
          <Button className="w-full" disabled={gen.isPending} onClick={() => gen.mutate()}>
            {gen.isPending ? <Spinner /> : <Fi name="sparkles" />} {questions.length ? "Regenerate questions" : "Generate questions"}
          </Button>
          <hr className="border-line" />
          <Field label="Quiz title" htmlFor="q-title" error={errors.title}>
            <input id="q-title" className={inputClass} maxLength={120} value={meta.title} onChange={(e) => setM("title", e.target.value)} />
          </Field>
          <Field label="Course / subject" htmlFor="q-course" error={errors.course}>
            <input id="q-course" className={inputClass} maxLength={100} value={meta.course} onChange={(e) => setM("course", e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pass mark %" htmlFor="q-pass">
              <input id="q-pass" type="number" min={30} max={90} className={inputClass} value={meta.passMark} onChange={(e) => setM("passMark", Math.max(30, Math.min(90, Number(e.target.value) || 30)))} />
            </Field>
            <Field label="Minutes" htmlFor="q-min">
              <input id="q-min" type="number" min={5} max={120} className={inputClass} value={meta.durationMin} onChange={(e) => setM("durationMin", Math.max(5, Math.min(120, Number(e.target.value) || 5)))} />
            </Field>
          </div>
          <label className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
            <input type="checkbox" className="mt-0.5 accent-[var(--brand)]" checked={meta.certificateEnabled} onChange={(e) => setM("certificateEnabled", e.target.checked)} />
            <span>
              <span className="font-medium text-ink">Issue mark-based certificate</span>
              <span className="block text-xs text-ink-3">Students who pass get a signed certificate graded O / A+ / A / B / C.</span>
            </span>
          </label>
        </CardBody>
      </Card>

      <div className="min-w-0 space-y-4">
        {info ? (
          <Card className="flex flex-wrap items-center gap-3 p-4 text-sm text-ink-2">
            <AiLabel /> {info}
          </Card>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl border border-rose/30 bg-rose-soft px-4 py-3 text-sm text-rose">
            {error}
          </p>
        ) : null}
        {!questions.length ? (
          <EmptyState title="No questions yet" body="Choose a department and generate. You can edit every question, option, answer key and explanation before publishing." />
        ) : (
          questions.map((q, i) => (
            <Card key={i} className={cn("p-5", q.review && "border-amber/50")}>
              <div className="mb-3 flex items-center justify-between gap-2">
                <p className="text-sm font-semibold text-ink">Question {i + 1}</p>
                <div className="flex items-center gap-2">
                  {q.review ? (
                    <Button size="sm" variant="secondary" onClick={() => update(i, {})}>
                      <Fi name="check" /> Mark reviewed
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" aria-label={`Remove question ${i + 1}`} onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                    <Fi name="trash" />
                  </Button>
                </div>
              </div>
              <label htmlFor={`qp-${i}`} className="sr-only">
                Question {i + 1} prompt
              </label>
              <textarea id={`qp-${i}`} rows={2} maxLength={400} className={inputClass} value={q.prompt} onChange={(e) => update(i, { prompt: e.target.value })} />
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {q.options.map((o, k) => (
                  <div key={k} className={cn("flex items-center gap-2 rounded-xl border px-2 py-1.5", q.answer === k ? "border-teal bg-teal-soft" : "border-line")}>
                    <input
                      type="radio"
                      name={`ans-${i}`}
                      aria-label={`Mark option ${LETTERS[k]} correct`}
                      className="accent-[var(--teal)]"
                      checked={q.answer === k}
                      onChange={() => update(i, { answer: k })}
                    />
                    <span className="text-xs font-semibold text-ink-3">{LETTERS[k]}</span>
                    <input
                      aria-label={`Option ${LETTERS[k]}`}
                      className="min-w-0 flex-1 bg-transparent text-sm text-ink focus:outline-none"
                      maxLength={200}
                      value={o}
                      onChange={(e) => {
                        const next = [...q.options] as BankQuestion["options"];
                        next[k] = e.target.value;
                        update(i, { options: next });
                      }}
                    />
                  </div>
                ))}
              </div>
              <label htmlFor={`qe-${i}`} className="mt-3 block text-xs text-ink-3">
                Explanation shown after submission
              </label>
              <input id={`qe-${i}`} maxLength={400} className={cn(inputClass, "mt-1")} value={q.explanation} onChange={(e) => update(i, { explanation: e.target.value })} />
            </Card>
          ))
        )}
        {questions.length ? (
          <Card className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-ink-2">
              {questions.length} questions{unreviewed ? <span className="text-amber"> · {unreviewed} still marked for review</span> : null}
            </p>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={save.isPending || questions.length < 3} onClick={() => save.mutate("Draft")}>
                Save draft
              </Button>
              <Button variant="gold" disabled={save.isPending || questions.length < 3 || unreviewed > 0} title={unreviewed ? "Review every templated question first" : undefined} onClick={() => save.mutate("Published")}>
                {save.isPending ? <Spinner /> : <Fi name="paper-plane" />} Publish quiz
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    </div>
  );
}

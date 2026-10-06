"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { ApiError, apiFetch } from "@/lib/api/client";
import { BLOOM_LEVELS, COURSE_OUTCOMES, DIFFICULTY_OPTIONS } from "@/config/resources";
import { MAX_GENERATED, MAX_TOPICS, QUESTION_STYLES, QuestionGenResult, type GeneratedQuestion } from "@/lib/api/question-ai-schemas";
import { Fi } from "@/components/ui/icon";
import { Badge, Button, Field, Spinner, inputClass } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";
import { setFlash } from "./flash";

/*
 * "Generate with AI" for the Question Bank: enter topics, get drafted questions with model answers, edit or untick
 * the ones you do not want, and save the rest as Drafts. Nothing is saved until you press Save.
 */

interface Draft extends GeneratedQuestion {
  key: number;
  keep: boolean;
}

const msg = (e: unknown) => (e instanceof ApiError ? e.message : "Something went wrong. Please try again.");
const parseTopics = (raw: string) => [...new Set(raw.split(/[\n,;]+/).map((t) => t.trim()).filter(Boolean))];

export function QuestionAiDialog({ onClose }: { onClose: () => void }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ subject: "", topicsText: "", count: 10, difficulty: "Mixed", bloom: "Mixed", marks: "", style: "Mixed", co: "CO1", notes: "" });
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const set = (k: keyof typeof f, v: string | number) => setF((p) => ({ ...p, [k]: v }));

  const generate = useMutation({
    mutationFn: (body: unknown) => apiFetch("/api/v1/question-bank/generate", QuestionGenResult, { method: "POST", body, timeoutMs: 150_000 }),
    onSuccess: (r) => setDrafts(r.questions.map((q, i) => ({ ...q, key: i, keep: true }))),
    onError: (e) => {
      setError(msg(e));
      setFieldErrors(e instanceof ApiError ? e.fields : {});
    },
  });

  const save = useMutation({
    mutationFn: async (items: Draft[]) => {
      const savedKeys: number[] = [];
      let failed = 0;
      for (const d of items) {
        try {
          await apiFetch("/api/v1/records/questions", z.object({ id: z.string() }).passthrough(), {
            method: "POST",
            body: { data: { question: d.question, topic: d.topic, difficulty: d.difficulty, bloom: d.bloom, co: f.co, marks: d.marks, status: "Draft", explanation: d.explanation } },
          });
          savedKeys.push(d.key);
        } catch {
          failed++;
        }
      }
      return { saved: savedKeys.length, savedKeys, failed };
    },
    onSuccess: ({ saved, savedKeys, failed }) => {
      void qc.invalidateQueries({ queryKey: ["records", "questions"] });
      if (failed === 0) {
        setFlash(`Added ${saved} AI-drafted question${saved === 1 ? "" : "s"} as Draft. Review them, then set them to Active.`);
        onClose();
      } else {
        setError(`${saved} saved; ${failed} could not be saved. Check the questions that remain and try again.`);
        setDrafts((cur) => (cur ? cur.filter((d) => !savedKeys.includes(d.key)) : cur));
      }
    },
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !generate.isPending && !save.isPending && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, generate.isPending, save.isPending]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const topics = parseTopics(f.topicsText);
    if (topics.length === 0) return setFieldErrors({ topics: "Enter at least one topic" });
    if (topics.length > MAX_TOPICS) return setFieldErrors({ topics: `Use at most ${MAX_TOPICS} topics` });
    const marks = f.marks.trim() === "" ? null : Number(f.marks);
    if (marks !== null && (!Number.isInteger(marks) || marks < 1 || marks > 50)) return setFieldErrors({ marks: "Enter whole marks from 1 to 50, or leave blank" });
    generate.mutate({ subject: f.subject, topics, count: f.count, difficulty: f.difficulty, bloom: f.bloom, marks, style: f.style, co: f.co, notes: f.notes });
  };

  const update = (key: number, patch: Partial<Draft>) => setDrafts((cur) => cur?.map((d) => (d.key === key ? { ...d, ...patch } : d)) ?? cur);
  const chosen = drafts?.filter((d) => d.keep && d.question.trim().length >= 10) ?? [];
  const busy = generate.isPending || save.isPending;

  const body: ReactNode = (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8" role="dialog" aria-modal="true" aria-label="Generate questions with AI" onClick={() => !busy && onClose()}>
      <div className="w-full max-w-3xl rounded-2xl bg-surface shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-ink"><Fi name="sparkles" className="text-brand" /> Generate questions with AI</h2>
            <p className="mt-0.5 text-sm text-ink-3">{drafts ? "Review the drafts. Edit or untick any you do not want, then save." : "Enter the topics and the AI drafts questions with model answers for you to review."}</p>
          </div>
          <button onClick={onClose} disabled={busy} aria-label="Close" className="rounded p-1 text-ink-3 hover:bg-surface-2 disabled:opacity-50"><Fi name="cross-small" /></button>
        </div>

        {!drafts ? (
          <form onSubmit={submit} className="space-y-4 p-5">
            <Field label="Subject or course (optional)" htmlFor="qa-subject">
              <input id="qa-subject" className={inputClass} value={f.subject} maxLength={100} onChange={(e) => set("subject", e.target.value)} placeholder="e.g. Database Management Systems" disabled={busy} />
            </Field>
            <Field label="Topics" htmlFor="qa-topics" hint={`One per line or comma-separated, up to ${MAX_TOPICS}.`} error={fieldErrors.topics}>
              <textarea id="qa-topics" rows={4} className={inputClass} value={f.topicsText} onChange={(e) => set("topicsText", e.target.value)} placeholder={"Normalization\nTransactions and concurrency control\nSQL joins"} disabled={busy} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-3">
              <Field label="Number of questions" htmlFor="qa-count">
                <select id="qa-count" className={inputClass} value={f.count} onChange={(e) => set("count", Number(e.target.value))} disabled={busy}>
                  {[3, 5, 10, 15, MAX_GENERATED].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Difficulty" htmlFor="qa-diff">
                <select id="qa-diff" className={inputClass} value={f.difficulty} onChange={(e) => set("difficulty", e.target.value)} disabled={busy}>
                  {["Mixed", ...DIFFICULTY_OPTIONS].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Bloom level" htmlFor="qa-bloom">
                <select id="qa-bloom" className={inputClass} value={f.bloom} onChange={(e) => set("bloom", e.target.value)} disabled={busy}>
                  {["Mixed", ...BLOOM_LEVELS].map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Question style" htmlFor="qa-style">
                <select id="qa-style" className={inputClass} value={f.style} onChange={(e) => set("style", e.target.value)} disabled={busy}>
                  {QUESTION_STYLES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Marks each" htmlFor="qa-marks" hint="Blank lets the AI choose." error={fieldErrors.marks}>
                <input id="qa-marks" inputMode="numeric" className={inputClass} value={f.marks} onChange={(e) => set("marks", e.target.value)} placeholder="Auto" disabled={busy} />
              </Field>
              <Field label="Course outcome" htmlFor="qa-co">
                <select id="qa-co" className={inputClass} value={f.co} onChange={(e) => set("co", e.target.value)} disabled={busy}>
                  {COURSE_OUTCOMES.map((o) => <option key={o}>{o}</option>)}
                </select>
              </Field>
            </div>
            <Field label="Reference notes (optional)" htmlFor="qa-notes" hint="Paste syllabus text or notes to keep the questions within what you taught.">
              <textarea id="qa-notes" rows={3} className={inputClass} value={f.notes} maxLength={3000} onChange={(e) => set("notes", e.target.value)} disabled={busy} />
            </Field>
            {error ? <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{error}</p> : null}
            {generate.isPending ? <p className="flex items-center gap-2 text-sm text-ink-3"><Spinner /> Drafting questions. This usually takes 10 to 40 seconds.</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={busy}>{generate.isPending ? <Spinner /> : <Fi name="sparkles" />} Generate</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-ink-3">
              <span>{chosen.length} of {drafts.length} selected · will be saved as <Badge tone="amber">Draft</Badge> with {f.co}</span>
              <span className="flex gap-3">
                <button className="underline" onClick={() => setDrafts(drafts.map((d) => ({ ...d, keep: true })))} disabled={busy}>Select all</button>
                <button className="underline" onClick={() => setDrafts(drafts.map((d) => ({ ...d, keep: false })))} disabled={busy}>Clear</button>
              </span>
            </div>
            <ul className="max-h-[60vh] space-y-3 overflow-y-auto pr-1">
              {drafts.map((d, i) => (
                <li key={d.key} className={cn("rounded-xl border p-3", d.keep ? "border-brand/40" : "border-line opacity-60")}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={d.keep} onChange={(e) => update(d.key, { keep: e.target.checked })} className="mt-1.5" aria-label={`Keep question ${i + 1}`} disabled={busy} />
                    <div className="min-w-0 flex-1 space-y-2">
                      <textarea value={d.question} rows={2} maxLength={800} onChange={(e) => update(d.key, { question: e.target.value })} className={inputClass} aria-label={`Question ${i + 1}`} disabled={busy} />
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge tone="brand">{d.topic}</Badge>
                        <select value={d.difficulty} onChange={(e) => update(d.key, { difficulty: e.target.value as Draft["difficulty"] })} className={cn(inputClass, "h-8 w-auto py-0 text-xs")} aria-label="Difficulty" disabled={busy}>
                          {DIFFICULTY_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <select value={d.bloom} onChange={(e) => update(d.key, { bloom: e.target.value as Draft["bloom"] })} className={cn(inputClass, "h-8 w-auto py-0 text-xs")} aria-label="Bloom level" disabled={busy}>
                          {BLOOM_LEVELS.map((o) => <option key={o}>{o}</option>)}
                        </select>
                        <label className="flex items-center gap-1 text-ink-3">Marks
                          <input type="number" min={1} max={50} value={d.marks} onChange={(e) => update(d.key, { marks: Math.min(50, Math.max(1, Math.round(Number(e.target.value) || 1))) })} className={cn(inputClass, "h-8 w-16 py-0 text-xs")} disabled={busy} />
                        </label>
                      </div>
                      <details className="text-sm">
                        <summary className="cursor-pointer text-ink-3">Model answer</summary>
                        <textarea value={d.explanation} rows={4} maxLength={2000} onChange={(e) => update(d.key, { explanation: e.target.value })} className={cn(inputClass, "mt-2")} aria-label={`Model answer ${i + 1}`} disabled={busy} />
                      </details>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <p className="text-xs text-ink-3">AI can make mistakes. Check each question and answer before setting it to Active.</p>
            {error ? <p role="alert" className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose">{error}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button variant="ghost" onClick={() => { setDrafts(null); setError(""); }} disabled={busy}>Back</Button>
              <Button variant="secondary" onClick={() => { setError(""); generate.mutate({ subject: f.subject, topics: parseTopics(f.topicsText), count: f.count, difficulty: f.difficulty, bloom: f.bloom, marks: f.marks.trim() === "" ? null : Number(f.marks), style: f.style, co: f.co, notes: f.notes }); }} disabled={busy}>
                {generate.isPending ? <Spinner /> : <Fi name="refresh" />} Regenerate
              </Button>
              <Button onClick={() => { setError(""); save.mutate(chosen); }} disabled={busy || chosen.length === 0}>
                {save.isPending ? <Spinner /> : <Fi name="check" />} Save {chosen.length} to question bank
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
  return typeof document === "undefined" ? null : createPortal(body, document.body);
}

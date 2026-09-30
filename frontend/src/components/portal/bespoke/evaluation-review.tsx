"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { EvaluationQueueItem } from "@/lib/api/schemas";
import { mask } from "@/lib/security/sanitize";
import { EvaluationCard } from "@/components/portal/evaluation-card";
import { TemplateSkeleton } from "@/components/modules/shared";
import { Badge, Button, Card, CardBody, CardHeader, Field, inputClass, Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const AuditRow = z.object({ at: z.string(), actor: z.string(), action: z.string(), target: z.string() });

export function EvaluationReviewModule() {
  const qc = useQueryClient();
  const queue = useQuery({ queryKey: ["eval-queue"], queryFn: () => apiFetch("/api/v1/evaluations/queue", z.array(EvaluationQueueItem)) });
  const audit = useQuery({ queryKey: ["audit-recent"], queryFn: () => apiFetch("/api/v1/audit/recent", z.array(AuditRow)) });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [override, setOverride] = useState({ score: "", reason: "" });
  const [formError, setFormError] = useState<string | null>(null);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["eval-queue"] });
    void qc.invalidateQueries({ queryKey: ["audit-recent"] });
  };
  const approve = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/v1/evaluations/${encodeURIComponent(id)}/approve`, EvaluationQueueItem, { method: "POST" }),
    onSuccess: refresh,
  });
  const doOverride = useMutation({
    mutationFn: (v: { id: string; finalScore: number; reason: string }) =>
      apiFetch(`/api/v1/evaluations/${encodeURIComponent(v.id)}/override`, EvaluationQueueItem, { method: "POST", body: { finalScore: v.finalScore, reason: v.reason } }),
    onSuccess: () => {
      setOverride({ score: "", reason: "" });
      refresh();
    },
    onError: (e) => setFormError(e instanceof ApiError ? e.message : "Override failed."),
  });

  if (queue.isLoading || !queue.data) return <TemplateSkeleton />;
  const items = queue.data;
  const item = items.find((i) => i.id === selectedId) ?? items[0];

  return (
    <div className="grid gap-6 xl:grid-cols-[340px_1fr]">
      <Card className="h-fit">
        <CardHeader title="Review queue" subtitle={`${items.filter((i) => i.status === "pending").length} pending`} />
        <ul className="p-2">
          {items.map((i) => (
            <li key={i.id}>
              <button
                onClick={() => {
                  setSelectedId(i.id);
                  setFormError(null);
                }}
                className={cn("w-full rounded-lg px-3 py-3 text-left", item?.id === i.id ? "bg-brand-soft" : "hover:bg-surface-2")}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-medium text-ink">{i.student}</span>
                  <Badge tone={i.status === "pending" ? (i.result.reviewRequired ? "amber" : "brand") : "teal"}>
                    {i.status === "pending" ? (i.result.reviewRequired ? "Low confidence" : "Pending") : i.status === "approved" ? "Approved" : "Overridden"}
                  </Badge>
                </div>
                <p className="mt-0.5 font-mono text-xs text-ink-3">{mask(i.rollNo)}</p>
                <p className="mt-1 text-xs text-ink-2">
                  AI: {i.result.score}/{i.result.max} · conf. {i.result.confidence.toFixed(2)}
                  {i.finalScore !== null ? ` · Final: ${i.finalScore}` : ""}
                </p>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      {item ? (
        <div className="space-y-6">
          <Card>
            <CardHeader title={item.assessment} subtitle={item.question} />
            <CardBody>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-3">Student answer</p>
              <p className="whitespace-pre-wrap rounded-lg bg-surface-2 p-4 text-sm leading-relaxed text-ink">{item.answer}</p>
            </CardBody>
          </Card>
          <EvaluationCard result={item.result} />
          <Card>
            <CardHeader title="Your decision" subtitle="Teachers always have the final say" />
            <CardBody>
              {item.status !== "pending" ? (
                <p className="text-sm text-teal">
                  {item.status === "approved" ? "Approved" : "Overridden"} — final score {item.finalScore} / {item.result.max}. Recorded in the audit log.
                </p>
              ) : (
                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-3">
                    <p className="text-sm text-ink-2">Accept the AI-suggested score of {item.result.score} / {item.result.max}.</p>
                    <Button variant="primary" disabled={approve.isPending} onClick={() => approve.mutate(item.id)}>
                      {approve.isPending ? <Spinner /> : null} Approve AI score
                    </Button>
                  </div>
                  <form
                    className="space-y-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      setFormError(null);
                      const score = Number(override.score);
                      if (!Number.isFinite(score) || score < 0 || score > item.result.max) return setFormError(`Enter a score between 0 and ${item.result.max}.`);
                      if (override.reason.trim().length < 5) return setFormError("A reason (5+ characters) is required for the audit trail.");
                      doOverride.mutate({ id: item.id, finalScore: score, reason: override.reason.trim().slice(0, 500) });
                    }}
                  >
                    <Field label={`Override score (0–${item.result.max})`} htmlFor="ov-score">
                      <input id="ov-score" type="number" step="0.5" min={0} max={item.result.max} className={inputClass} value={override.score} onChange={(e) => setOverride({ ...override, score: e.target.value })} />
                    </Field>
                    <Field label="Reason" htmlFor="ov-reason" error={formError ?? undefined}>
                      <textarea id="ov-reason" rows={2} maxLength={500} className={inputClass} value={override.reason} onChange={(e) => setOverride({ ...override, reason: e.target.value })} />
                    </Field>
                    <Button type="submit" variant="secondary" disabled={doOverride.isPending}>
                      {doOverride.isPending ? <Spinner /> : null} Override score
                    </Button>
                  </form>
                </div>
              )}
            </CardBody>
          </Card>
          <Card>
            <CardHeader title="Audit trail (this session)" />
            <CardBody>
              {audit.data && audit.data.length > 0 ? (
                <ul className="divide-y divide-line text-sm">
                  {audit.data.map((a) => (
                    <li key={a.at + a.target} className="flex flex-wrap justify-between gap-2 py-2">
                      <span className="text-ink">
                        {a.action} · <span className="text-ink-2">{a.target}</span>
                      </span>
                      <span className="text-xs text-ink-3">
                        {a.actor} · {new Date(a.at).toLocaleTimeString("en-IN")}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink-3">No decisions recorded yet.</p>
              )}
            </CardBody>
          </Card>
        </div>
      ) : null}
    </div>
  );
}

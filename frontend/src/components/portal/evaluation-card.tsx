import { AlertTriangle, CheckCircle2, UserCheck, XCircle } from "lucide-react";
import type { EvaluationResult } from "@/lib/api/schemas";
import { AiLabel } from "@/components/ui/notices";
import { Badge, Card, CardBody, CardHeader, Progress, toneForScore } from "@/components/ui/primitives";

/** Renders the AI Evaluation Safety Model output: score, confidence, evidence, rubric match, missing concepts, review flag. */
export function EvaluationCard({ result, title = "AI evaluation (provisional)" }: { result: EvaluationResult; title?: string }) {
  const pct = Math.round((result.score / result.max) * 100);
  return (
    <Card>
      <CardHeader
        title={title}
        action={
          result.reviewRequired ? (
            <Badge tone="amber">
              <UserCheck className="size-3" aria-hidden /> Teacher review recommended
            </Badge>
          ) : (
            <Badge tone="teal">High confidence</Badge>
          )
        }
      />
      <CardBody className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-line p-4">
            <p className="text-xs text-ink-3">Suggested score</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-ink">
              {result.score}
              <span className="text-lg text-ink-3"> / {result.max}</span>
            </p>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="text-xs text-ink-3">Confidence</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-ink">{result.confidence.toFixed(2)}</p>
          </div>
          <div className="rounded-xl border border-line p-4">
            <p className="text-xs text-ink-3">Percentage</p>
            <p className="mt-1 font-serif text-3xl font-semibold text-ink">{pct}%</p>
            <Progress value={pct} tone={toneForScore(pct)} className="mt-2" label="Score percentage" />
          </div>
        </div>

        <div>
          <p className="mb-2 text-sm font-semibold text-ink">Rubric match</p>
          <div className="overflow-hidden rounded-lg border border-line">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-left text-xs text-ink-3">
                <tr>
                  <th className="px-3 py-2 font-medium">Criterion</th>
                  <th className="px-3 py-2 text-right font-medium">Awarded</th>
                </tr>
              </thead>
              <tbody>
                {result.rubric.map((r) => (
                  <tr key={r.criterion} className="border-t border-line">
                    <td className="px-3 py-2 text-ink-2">{r.criterion}</td>
                    <td className="px-3 py-2 text-right tabular-nums text-ink">
                      {r.awarded} / {r.max}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Evidence found</p>
            <ul className="space-y-1.5">
              {result.evidence.length ? (
                result.evidence.map((e) => (
                  <li key={e} className="flex gap-2 text-sm text-ink-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
                    {e.replace(/^✓\s*/, "")}
                  </li>
                ))
              ) : (
                <li className="text-sm text-ink-3">No expected points detected.</li>
              )}
            </ul>
          </div>
          <div>
            <p className="mb-2 text-sm font-semibold text-ink">Missing concepts</p>
            <ul className="space-y-1.5">
              {result.missing.length ? (
                result.missing.map((m) => (
                  <li key={m} className="flex gap-2 text-sm text-ink-2">
                    <XCircle className="mt-0.5 size-4 shrink-0 text-rose" aria-hidden />
                    {m}
                  </li>
                ))
              ) : (
                <li className="text-sm text-ink-3">None — all expected points covered.</li>
              )}
            </ul>
          </div>
        </div>

        {result.feedback ? <p className="rounded-lg bg-surface-2 px-4 py-3 text-sm text-ink">{result.feedback}</p> : null}

        <p className="flex items-start gap-2 text-xs text-ink-3">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber" aria-hidden />
          Marks are provisional until your faculty approves or overrides them. Every override is audit-logged.
        </p>
        <AiLabel confidence={result.confidence} />
      </CardBody>
    </Card>
  );
}

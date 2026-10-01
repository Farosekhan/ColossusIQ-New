import type { Insight, Kpi } from "@/lib/api/schemas";
import { Badge, Card, IconChip, Skeleton, toneBar } from "@/components/ui/primitives";
import { Fi } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

/** Picks a Flaticon glyph for a KPI from its label, so API data needs no icon hints. */
function kpiIcon(label: string): string {
  const l = label.toLowerCase();
  if (/student|learner|user|applic|candidate|profile/.test(l)) return "users-alt";
  if (/faculty|staff|mentor/.test(l)) return "chalkboard-user";
  if (/department|tenant|campus/.test(l)) return "building";
  if (/course|class|syllabus|credit/.test(l)) return "book-open-cover";
  if (/project|venture|idea/.test(l)) return "bulb";
  if (/placement|offer|job|drive|interview/.test(l)) return "briefcase";
  if (/ai|model|prompt|request/.test(l)) return "robot";
  if (/exam|test|score|mark|pass|cgpa|average/.test(l)) return "diploma";
  if (/attendance|uptime|latency|time|days/.test(l)) return "clock";
  if (/alert|risk|review|warning|support/.test(l)) return "triangle-warning";
  if (/cost|fee|₹|revenue/.test(l)) return "coins";
  return "chart-line-up";
}

export function KpiTile({ kpi }: { kpi: Kpi }) {
  const down = kpi.delta?.trim().startsWith("−") || kpi.delta?.trim().startsWith("-");
  return (
    <Card className="card-hover relative overflow-hidden p-5">
      <span className={cn("absolute inset-x-0 top-0 h-1", toneBar[kpi.tone])} aria-hidden />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ink-3" title={kpi.hint}>
            {kpi.label}
          </p>
          <p className="mt-1.5 text-2xl font-semibold tracking-tight text-ink">{kpi.value}</p>
        </div>
        <IconChip tone={kpi.tone}>
          <Fi name={kpiIcon(kpi.label)} />
        </IconChip>
      </div>
      {kpi.delta ? (
        <p className={cn("mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", down ? "bg-amber-soft text-amber" : "bg-teal-soft text-teal")}>
          <Fi name={down ? "arrow-trend-down" : "arrow-trend-up"} className="text-[11px]" />
          {kpi.delta}
        </p>
      ) : kpi.hint ? (
        <p className="mt-2 text-xs text-ink-3">{kpi.hint}</p>
      ) : null}
    </Card>
  );
}

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  const colClass =
    kpis.length >= 6
      ? "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-6"
      : kpis.length === 5
        ? "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
        : kpis.length >= 4
          ? "sm:grid-cols-2 xl:grid-cols-4"
          : "sm:grid-cols-2 xl:grid-cols-3";

  return (
    <div className={cn("grid gap-4", colClass)}>
      {kpis.map((k) => (
        <KpiTile key={k.label} kpi={k} />
      ))}
    </div>
  );
}

/** AI insights always carry the evidence they were derived from (requirements doc 2, §26). */
export function InsightList({ insights }: { insights: Insight[] }) {
  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-5">
        <h3 className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
          <IconChip tone="gold" className="size-8 text-base">
            <Fi name="bulb" />
          </IconChip>
          AI insights
        </h3>
        <Badge tone="neutral">Evidence-linked</Badge>
      </div>
      <ul className="divide-y divide-line px-5 pb-2">
        {insights.map((i) => (
          <li key={i.title} className="py-4">
            <div className="flex items-start gap-3">
              <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", toneBar[i.tone])} aria-hidden />
              <div>
                <p className="text-sm font-semibold text-ink">{i.title}</p>
                <p className="mt-0.5 text-sm text-ink-2">{i.body}</p>
                <p className="mt-1.5 text-xs text-ink-3">
                  <span className="font-medium">Evidence:</span> {i.evidence}
                </p>
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="border-t border-line px-5 py-3 text-xs text-ink-3">Insights support — not replace — human decisions.</p>
    </Card>
  );
}

export function TemplateSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    </div>
  );
}

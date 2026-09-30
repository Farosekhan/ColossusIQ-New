import type { Metadata } from "next";
import { MODULE_GROUPS, MODULES } from "@/config/modules";
import { ModuleIcon } from "@/components/ui/icon";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Platform modules" };

const PHASE_TONE = { MVP: "teal", "Phase 2": "brand", "Phase 3": "gold", "Phase 4": "neutral" } as const;

export default function ModulesPage() {
  const groups = MODULE_GROUPS.map((g) => ({ g, items: MODULES.filter((m) => m.group === g) })).filter((x) => x.items.length);
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <PageHeader
        eyebrow="Platform"
        title={`${MODULES.length} modules, one student-intelligence platform`}
        description="Every module shares the same identity, tenant isolation, AI orchestration and governance layer. Phases follow the recommended roadmap: MVP first, then student, campus and enterprise intelligence."
      />
      <div className="mb-10 flex flex-wrap gap-2">
        {Object.entries(PHASE_TONE).map(([p, t]) => (
          <Badge key={p} tone={t}>
            {p}: {MODULES.filter((m) => m.phase === p).length}
          </Badge>
        ))}
      </div>
      <div className="space-y-12">
        {groups.map(({ g, items }) => (
          <section key={g} aria-labelledby={`g-${g}`}>
            <h2 id={`g-${g}`} className="mb-4 text-2xl font-semibold text-ink">
              {g}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((m) => (
                <Card key={m.slug} className="p-5">
                  <div className="flex items-start justify-between gap-2">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-brand-soft text-brand">
                      <ModuleIcon name={m.icon} className="size-4" />
                    </span>
                    <Badge tone={PHASE_TONE[m.phase]}>{m.phase}</Badge>
                  </div>
                  <h3 className="mt-3 font-sans text-base font-semibold text-ink">{m.title}</h3>
                  <p className="mt-1 text-sm text-ink-2">{m.description}</p>
                </Card>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

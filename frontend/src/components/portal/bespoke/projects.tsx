"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Lightbulb, Mic, Users } from "lucide-react";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { Project } from "@/lib/api/schemas";
import type { Role } from "@/lib/auth/roles";
import { TemplateSkeleton } from "@/components/modules/shared";
import { Badge, Card, CardBody, CardHeader, LinkButton, Progress, toneForScore } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function ProjectsModule({ role }: { role: Role }) {
  const { data, isLoading } = useQuery({ queryKey: ["projects"], queryFn: () => apiFetch("/api/v1/projects", z.array(Project)) });
  if (isLoading || !data) return <TemplateSkeleton />;

  return (
    <div className="space-y-6">
      {role === "student" ? (
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/student/project-ideas">
            <Lightbulb className="size-4" /> Generate a new idea
          </LinkButton>
          <LinkButton href="/student/team-finder" variant="secondary">
            <Users className="size-4" /> Find teammates
          </LinkButton>
          <LinkButton href="/student/viva" variant="secondary">
            <Mic className="size-4" /> Practise viva
          </LinkButton>
        </div>
      ) : null}

      {data.map((p) => (
        <Card key={p.id}>
          <CardHeader
            title={p.title}
            subtitle={`${p.domain} · Mentor: ${p.mentor}`}
            action={<Badge tone="gold">{p.stage}</Badge>}
          />
          <CardBody className="space-y-6">
            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-2">
              <Users className="size-4 text-ink-3" aria-hidden /> {p.team.join(", ")}
            </div>

            <ol className="flex gap-1 overflow-x-auto pb-1" aria-label="Project lifecycle">
              {p.stages.map((s) => (
                <li key={s.title} className="min-w-24 flex-1">
                  <div className={cn("h-1.5 rounded-full", s.status === "done" ? "bg-teal" : s.status === "active" ? "bg-gold" : "bg-line")} />
                  <p className={cn("mt-1.5 flex items-center gap-1 text-[11px]", s.status === "todo" ? "text-ink-3" : "text-ink")}>
                    {s.status === "done" ? <Check className="size-3 text-teal" aria-hidden /> : null}
                    {s.title}
                    <span className="sr-only"> ({s.status})</span>
                  </p>
                </li>
              ))}
            </ol>

            <div>
              <p className="mb-3 text-sm font-semibold text-ink">AI Project Review Board</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {Object.entries(p.review).map(([k, v]) => (
                  <div key={k}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="capitalize text-ink-2">{k.replace(/([A-Z])/g, " $1")}</span>
                      <span className="tabular-nums text-ink">{v || "—"}</span>
                    </div>
                    <Progress value={v} tone={toneForScore(v)} className="h-1.5" label={k} />
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-ink-3">AI review is advisory; faculty review decides milestone approval.</p>
            </div>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { ChatPanel } from "@/components/ai/chat-panel";
import { LoadError } from "@/components/ui/load-error";
import { Badge, Card, CardBody, CardHeader, EmptyState, Progress, Skeleton } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/notices";
import { AGENTS } from "@/config/agents";
import { apiFetch } from "@/lib/api/client";
import { MentorProfileSchema } from "@/lib/api/mentor-schemas";

export function MentorModule() {
  const profile = useQuery({ queryKey: ["mentor-profile"], queryFn: () => apiFetch("/api/v1/mentor/profile", MentorProfileSchema), staleTime: 60_000 });

  if (profile.isPending) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <Skeleton className="h-[74vh] min-h-[520px]" />
        <div className="space-y-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }
  if (profile.isError || !profile.data) return <LoadError error={profile.error} onRetry={() => void profile.refetch()} />;

  const p = profile.data;
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="flex h-[74vh] min-h-[520px] flex-col overflow-hidden">
        <ChatPanel agent="mentor" agentName="AI Mentor" intro={p.intro} suggestions={p.suggestions} context={p.context} className="flex-1" />
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader title="What your mentor knows" subtitle="Built from your own marks, attendance and progress" action={<Badge tone={p.aiLive ? "teal" : "neutral"}>{p.aiLive ? "AI live" : "Built-in replies"}</Badge>} />
          <CardBody className="space-y-4">
            {p.metrics.length === 0 ? (
              <EmptyState title="Nothing recorded yet" body="Your mentor will fill this in as marks and attendance are recorded." />
            ) : (
              p.metrics.map((m) => (
                <div key={m.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="text-ink-2">{m.label}</span>
                    <span className="tabular-nums text-ink">{m.value}%</span>
                  </div>
                  <Progress value={m.value} label={m.label} />
                  {m.hint ? <p className="mt-0.5 text-[11px] text-ink-3">{m.hint}</p> : null}
                </div>
              ))
            )}
            <p className="text-xs text-ink-3">You can review or delete what the mentor remembers from Profile → Privacy.</p>
          </CardBody>
        </Card>
        {p.focus.length > 0 ? (
          <Card>
            <CardHeader title="Your focus topics" subtitle="Lowest mastery first" />
            <CardBody className="space-y-3">
              {p.focus.map((f) => (
                <div key={`${f.subject}-${f.topic}`}>
                  <div className="mb-1 flex justify-between gap-3 text-sm">
                    <span className="min-w-0 truncate text-ink-2">
                      {f.topic} <span className="text-ink-3">· {f.subject}</span>
                    </span>
                    <span className="tabular-nums text-ink">{f.mastery}%</span>
                  </div>
                  <Progress value={f.mastery} label={`${f.topic} mastery`} />
                </div>
              ))}
            </CardBody>
          </Card>
        ) : null}
        <Card>
          <CardHeader title="Agents your mentor can call" />
          <CardBody className="flex flex-wrap gap-1.5">
            {AGENTS.filter((a) => a.audience === "Student").map((a) => (
              <Badge key={a.id} tone="neutral">
                {a.name}
              </Badge>
            ))}
          </CardBody>
        </Card>
        <Notice tone="sky">Wellness questions get general educational guidance only. For personal concerns the mentor will point you to the Student Welfare Office.</Notice>
      </div>
    </div>
  );
}

"use client";

import { ChatPanel } from "@/components/ai/chat-panel";
import { Badge, Card, CardBody, CardHeader, Progress } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/notices";
import { AGENTS } from "@/config/agents";

const CONTEXT = [
  ["Academic progress", 72],
  ["Exam readiness", 64],
  ["Technical skills", 71],
  ["Interview readiness", 48],
] as const;

export function MentorModule() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
      <Card className="flex h-[74vh] min-h-[520px] flex-col overflow-hidden">
        <ChatPanel
          agent="mentor"
          agentName="AI Mentor"
          intro="Hi Anand 👋 I'm your persistent academic & career mentor. I know your courses, goals, weak subjects and projects, and I coordinate the other agents for you. Ask me anything — or pick a suggestion."
          suggestions={["What should I study today?", "Why am I scoring low in DBMS?", "What skills do I need for software engineering?", "Help me prepare for tomorrow's viva", "Create a 90-day placement plan"]}
          context={["Goal: Data Scientist", "Sem 5 · B.E. CSE", "Exam in 9 days", "Project: Smart Campus AI"]}
          className="flex-1"
        />
      </Card>
      <div className="space-y-6">
        <Card>
          <CardHeader title="What your mentor knows" subtitle="Student Intelligence Profile" />
          <CardBody className="space-y-4">
            {CONTEXT.map(([label, v]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-ink-2">{label}</span>
                  <span className="tabular-nums text-ink">{v}%</span>
                </div>
                <Progress value={v} label={label} />
              </div>
            ))}
            <p className="text-xs text-ink-3">You can review or delete what the mentor remembers from Profile → Privacy.</p>
          </CardBody>
        </Card>
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

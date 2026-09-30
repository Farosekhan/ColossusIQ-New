"use client";

import { useMutation } from "@tanstack/react-query";
import { MessageSquareQuote, Play, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api/client";
import { InterviewTurn } from "@/lib/api/schemas";
import { cleanText } from "@/lib/security/sanitize";
import { ChartView } from "@/components/charts/chart-card";
import { AiLabel, Notice } from "@/components/ui/notices";
import { Badge, Button, Card, CardBody, CardHeader, Progress, Spinner } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

const MODES = [
  { id: "technical", label: "Technical", desc: "Projects, CS fundamentals, design" },
  { id: "hr", label: "HR", desc: "Motivation, fit, career goals" },
  { id: "behavioral", label: "Behavioural", desc: "STAR-format situations" },
] as const;
const OTHER = ["Domain-specific", "Placement", "Internship", "Startup", "Management", "Government job"];

interface Turn {
  q: string;
  a: string;
  feedback: string | null;
}

export function InterviewModule() {
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("technical");
  const [current, setCurrent] = useState<InterviewTurn | null>(null);
  const [history, setHistory] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [startedAt, setStartedAt] = useState(0);

  const start = useMutation({
    mutationFn: () => apiFetch("/api/v1/ai/interview/start", InterviewTurn, { method: "POST", body: { mode } }),
    onSuccess: (t) => {
      setHistory([]);
      setCurrent(t);
      setStartedAt(Date.now());
    },
  });
  const respond = useMutation({
    mutationFn: (a: string) => apiFetch("/api/v1/ai/interview/respond", InterviewTurn, { method: "POST", body: { sessionId: current?.sessionId, answer: a } }),
    onSuccess: (t, a) => {
      setHistory((h) => [...h, { q: current?.question ?? "", a, feedback: t.feedback }]);
      setCurrent(t);
      setAnswer("");
      setStartedAt(Date.now());
    },
  });

  const err = start.error ?? respond.error;

  if (!current) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader title="Choose an interview" subtitle="The AI asks follow-up questions based on your previous answers." />
          <CardBody className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label="Interview mode">
              {MODES.map((m) => (
                <button
                  key={m.id}
                  role="radio"
                  aria-checked={mode === m.id}
                  onClick={() => setMode(m.id)}
                  className={cn("rounded-xl border p-4 text-left", mode === m.id ? "border-brand bg-brand-soft" : "border-line hover:border-brand/50")}
                >
                  <p className="font-semibold text-ink">{m.label}</p>
                  <p className="mt-1 text-xs text-ink-2">{m.desc}</p>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {OTHER.map((o) => (
                <Badge key={o} tone="neutral">
                  {o} · Phase 2
                </Badge>
              ))}
            </div>
            <Button size="lg" onClick={() => start.mutate()} disabled={start.isPending}>
              {start.isPending ? <Spinner /> : <Play className="size-4" />} Start mock interview
            </Button>
            {err ? <p className="text-sm text-rose">{err instanceof ApiError ? err.message : "Could not start."}</p> : null}
          </CardBody>
        </Card>
        <div className="space-y-4">
          <Notice tone="sky">
            The AI analyses content, technical accuracy, clarity, structure, filler words, response time and relevance. Confidence <em>indicators</em> are coaching hints, not judgements about you.
          </Notice>
          <Notice tone="teal">Voice practice uses your microphone only while you are recording, and audio is not stored by default.</Notice>
        </div>
      </div>
    );
  }

  if (current.done && current.scorecard) {
    const sc = current.scorecard;
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
          <Card className="p-6">
            <p className="text-sm text-ink-3">Interview Readiness Scorecard</p>
            <p className="mt-1 font-serif text-5xl font-semibold text-ink">{sc.overall}</p>
            <Progress value={sc.overall} className="mt-3" label="Overall" />
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-sm font-semibold text-teal">Strong areas</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                  {sc.strengths.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="mb-1.5 text-sm font-semibold text-amber">Recommended practice</p>
                <ul className="list-disc space-y-1 pl-5 text-sm text-ink-2">
                  {sc.improvements.map((s) => (
                    <li key={s}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
            <Button className="mt-6" variant="secondary" onClick={() => setCurrent(null)}>
              <RotateCcw className="size-4" /> Practise again
            </Button>
          </Card>
          <Card>
            <CardHeader title="Dimensions" />
            <div className="px-3 pb-4">
              <ChartView spec={{ type: "radar", title: "Interview dimensions", xKey: "name", series: ["Score"], data: sc.dimensions.map((d) => ({ name: d.name, Score: d.score })) }} height={300} />
            </div>
          </Card>
        </div>
        <Transcript history={history} />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <Card>
        <CardHeader title={`Question ${current.index + 1} of ${current.total}`} subtitle={`${MODES.find((m) => m.id === mode)?.label} interview`} />
        <CardBody className="space-y-4">
          <div className="flex gap-3 rounded-xl bg-brand-soft p-4">
            <MessageSquareQuote className="size-5 shrink-0 text-brand" aria-hidden />
            <p className="text-base font-medium text-ink">{current.question}</p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const a = cleanText(answer, 6000);
              if (a) respond.mutate(a);
            }}
            className="space-y-3"
          >
            <label htmlFor="iv-answer" className="sr-only">
              Your answer
            </label>
            <textarea
              id="iv-answer"
              rows={8}
              maxLength={6000}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="w-full rounded-xl border border-line bg-bg p-4 text-sm leading-relaxed text-ink focus:border-brand focus:outline-none"
              placeholder="Type your answer as you would say it…"
            />
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs text-ink-3">Response time is measured from when the question appeared.</span>
              <Button type="submit" disabled={!answer.trim() || respond.isPending}>
                {respond.isPending ? <Spinner /> : <Send className="size-4" />} Submit answer
              </Button>
            </div>
            {err ? <p className="text-sm text-rose">{err instanceof ApiError ? err.message : "Something went wrong."}</p> : null}
          </form>
        </CardBody>
      </Card>
      <div className="space-y-4">
        <Card className="p-5">
          <Progress value={(current.index / current.total) * 100} label="Interview progress" />
          <p className="mt-2 text-xs text-ink-3">
            {current.index} of {current.total} answered{startedAt ? " · timer running" : ""}
          </p>
        </Card>
        {history.at(-1)?.feedback ? (
          <Card className="p-5">
            <p className="text-sm font-semibold text-ink">Feedback on your last answer</p>
            <p className="mt-1 text-sm text-ink-2">{history.at(-1)?.feedback}</p>
            <AiLabel className="mt-3" />
          </Card>
        ) : null}
      </div>
    </div>
  );
}

function Transcript({ history }: { history: Turn[] }) {
  return (
    <Card>
      <CardHeader title="Transcript & feedback" />
      <CardBody className="space-y-4">
        {history.map((h, i) => (
          <div key={i} className="rounded-xl border border-line p-4">
            <p className="text-sm font-semibold text-ink">
              Q{i + 1}. {h.q}
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-ink-2">{h.a}</p>
            {h.feedback ? <p className="mt-2 rounded-lg bg-surface-2 px-3 py-2 text-sm text-ink">{h.feedback}</p> : null}
          </div>
        ))}
      </CardBody>
    </Card>
  );
}

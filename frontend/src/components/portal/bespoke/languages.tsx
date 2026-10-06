"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react";
import { ChatPanel } from "@/components/ai/chat-panel";
import { LoadError } from "@/components/ui/load-error";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, Field, Progress, Skeleton, Spinner, inputClass } from "@/components/ui/primitives";
import { apiFetch, ApiError } from "@/lib/api/client";
import { LanguageOverview, type LanguageSettings } from "@/lib/api/languages-schemas";
import { cn } from "@/lib/utils";

const KEY = ["languages"] as const;
const DAY = 86_400_000;
const addDays = (iso: string, n: number) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);

export function LanguagesModule() {
  const q = useQuery({ queryKey: KEY, queryFn: () => apiFetch("/api/v1/languages", LanguageOverview) });
  if (q.isPending) {
    return (
      <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
        <Skeleton className="h-[640px]" />
        <Skeleton className="h-96" />
      </div>
    );
  }
  if (q.isError || !q.data) return <LoadError error={q.error} onRetry={() => void q.refetch()} />;
  return <Languages data={q.data} />;
}

function Languages({ data }: { data: LanguageOverview }) {
  const qc = useQueryClient();
  const put = (o: LanguageOverview) => qc.setQueryData(KEY, o);
  const { settings, lesson } = data;
  const native = data.catalog.languages.find((l) => l.name === settings.language)?.native ?? "";
  const learnedHere = data.perLanguage.find((l) => l.language === settings.language)?.count ?? 0;

  const save = useMutation({ mutationFn: (s: LanguageSettings) => apiFetch("/api/v1/languages/settings", LanguageOverview, { method: "PUT", body: s }), onSuccess: put });
  const newLesson = useMutation({ mutationFn: () => apiFetch("/api/v1/languages/lesson", LanguageOverview, { method: "POST", body: {} }), onSuccess: put });
  const toggle = useMutation({ mutationFn: (v: { key: string; learned: boolean }) => apiFetch("/api/v1/languages/phrases", LanguageOverview, { method: "PATCH", body: v }), onSuccess: put });

  const choose = (patch: Partial<LanguageSettings>) => save.mutate({ ...settings, ...patch });
  const errorOf = (m: { isError: boolean; error: unknown }) => (m.isError ? (m.error instanceof ApiError ? m.error.message : "Something went wrong. Please try again.") : null);
  const error = errorOf(save) ?? errorOf(newLesson) ?? errorOf(toggle);

  const learnedCount = lesson?.phrases.filter((p) => p.learned).length ?? 0;
  const intro = [
    `Hello! I'm your Language Coach. We're working on **${settings.language}${native && native !== settings.language ? ` (${native})` : ""}**: ${settings.mode.toLowerCase()} practice at ${settings.level.toLowerCase()} level.`,
    learnedHere > 0 ? `You've saved ${learnedHere} ${settings.language} phrase${learnedHere === 1 ? "" : "s"} so far.` : "Mark the phrases you know in today's lesson and I'll build your phrasebook.",
    "Ask me to teach you phrases, correct a sentence you wrote, or quiz you.",
  ].join(" ");
  const first = lesson?.phrases[0];
  const suggestions = [
    `Teach me ${settings.mode.toLowerCase()} phrases in ${settings.language}`,
    first ? `Use "${first.text}" in three different sentences` : `How do I introduce myself in ${settings.language}?`,
    learnedHere > 0 ? "Quiz me on my phrasebook" : "What should I learn first?",
    `Correct my ${settings.language} sentence`,
  ];
  const context = [`Learning: ${settings.language}`, `Mode: ${settings.mode}`, `Level: ${settings.level}`, ...(data.streak > 0 ? [`Streak: ${data.streak} day${data.streak === 1 ? "" : "s"}`] : [])];

  const activity = new Set(data.activeDays);
  const week = Array.from({ length: 14 }, (_, i) => addDays(data.today, i - 13));

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="min-w-0 space-y-6">
        <Card>
          <CardHeader
            title={lesson ? lesson.title : "Today's lesson"}
            subtitle={lesson ? `${lesson.language} · ${lesson.mode} · ${lesson.level}` : `${settings.language} · ${settings.mode} · ${settings.level}`}
            action={
              <Button size="sm" variant={lesson ? "secondary" : "primary"} onClick={() => newLesson.mutate()} disabled={newLesson.isPending}>
                {newLesson.isPending ? <Spinner /> : <Sparkles className="size-4" />} {lesson ? "New lesson" : "Start a lesson"}
              </Button>
            }
          />
          <CardBody className="space-y-4">
            {error ? (
              <p className="text-sm text-rose" role="alert">
                {error}
              </p>
            ) : null}
            {newLesson.isPending ? (
              <p className="flex items-center gap-2 text-sm text-ink-3">
                <Spinner /> Preparing your lesson…
              </p>
            ) : !lesson ? (
              <EmptyState title="No lesson yet" body="Pick a language, mode and level, then start a lesson. Mark the phrases you know to build your phrasebook." />
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={lesson.source === "ai" ? "teal" : "neutral"}>{lesson.source === "ai" ? "AI lesson" : "Built-in lesson"}</Badge>
                  <span className="text-xs text-ink-3">
                    {learnedCount} of {lesson.phrases.length} marked as known
                  </span>
                </div>
                <ul className="divide-y divide-line rounded-xl border border-line">
                  {lesson.phrases.map((p) => (
                    <li key={p.key}>
                      <label className="flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-surface-2/60">
                        <input type="checkbox" className="mt-1.5 size-4 shrink-0 accent-[var(--color-brand,#4f46e5)]" checked={p.learned} disabled={toggle.isPending} onChange={() => toggle.mutate({ key: p.key, learned: !p.learned })} aria-label={`I know "${p.text}"`} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-lg font-medium leading-snug text-ink [overflow-wrap:anywhere]">
                            {p.text}
                          </span>
                          {p.romanized ? <span className="block text-sm text-brand">{p.romanized}</span> : null}
                          <span className="block text-sm text-ink-2">{p.meaning}</span>
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-surface-2/60 p-3">
                    <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-ink-3">Tip</p>
                    <p className="text-sm text-ink-2">{lesson.tip}</p>
                  </div>
                  <div className="rounded-xl bg-surface-2/60 p-3">
                    <p className="mb-0.5 text-xs font-semibold uppercase tracking-wider text-ink-3">Practice now</p>
                    <p className="text-sm text-ink-2">{lesson.practice}</p>
                  </div>
                </div>
                {lesson.source === "built-in" ? <p className="text-xs text-ink-3">Built-in lessons cover everyday essentials. With AI switched on, lessons are tailored to your mode, level and subjects.</p> : null}
              </>
            )}
          </CardBody>
        </Card>

        <Card className="flex h-[620px] min-h-[480px] flex-col overflow-hidden">
          <ChatPanel
            key={`${settings.language}|${settings.mode}|${settings.level}|${lesson?.date ?? ""}|${lesson?.phrases[0]?.key ?? ""}`}
            agent="language"
            agentName="Language Coach"
            intro={intro}
            suggestions={suggestions}
            context={context}
            className="flex-1"
            onReply={() => void qc.invalidateQueries({ queryKey: KEY })}
          />
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader title="What are you learning?" subtitle="Saved to your account" action={save.isPending ? <Spinner /> : undefined} />
          <CardBody className="space-y-4">
            <div role="group" aria-label="Language" className="grid grid-cols-3 gap-1.5">
              {data.catalog.languages.map((l) => (
                <button
                  key={l.name}
                  type="button"
                  aria-pressed={settings.language === l.name}
                  disabled={save.isPending}
                  onClick={() => choose({ language: l.name as LanguageSettings["language"] })}
                  className={cn("rounded-xl border px-2 py-2 text-center transition-colors", settings.language === l.name ? "border-brand bg-brand-soft/50" : "border-line bg-surface hover:bg-surface-2")}
                >
                  <span className="block truncate text-sm font-medium text-ink">{l.name}</span>
                  <span className="block truncate text-xs text-ink-3">{l.native}</span>
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Mode" htmlFor="lang-mode">
                <select id="lang-mode" className={inputClass} value={settings.mode} disabled={save.isPending} onChange={(e) => choose({ mode: e.target.value as LanguageSettings["mode"] })}>
                  {data.catalog.modes.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Level" htmlFor="lang-level">
                <select id="lang-level" className={inputClass} value={settings.level} disabled={save.isPending} onChange={(e) => choose({ level: e.target.value as LanguageSettings["level"] })}>
                  {data.catalog.levels.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Your progress" />
          <CardBody className="space-y-4">
            <div className="grid grid-cols-3 gap-3 text-center">
              <Stat label="Day streak" value={data.streak} />
              <Stat label="Phrases saved" value={data.vocabCount} />
              <Stat label="Coach chats" value={data.chatCount} />
            </div>
            <div>
              <p className="mb-1.5 text-xs text-ink-3">Last 14 days</p>
              <div className="flex gap-1" role="img" aria-label={`Practised on ${data.activeDays.length} of the last 14 days`}>
                {week.map((d) => (
                  <span key={d} title={d} className={cn("h-6 flex-1 rounded", activity.has(d) ? "bg-brand" : "bg-surface-2", d === data.today && "ring-2 ring-brand/40")} />
                ))}
              </div>
            </div>
            {data.perLanguage.length > 0 ? (
              <div className="space-y-2">
                {data.perLanguage.map((l) => (
                  <div key={l.language}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-ink-2">{l.language}</span>
                      <span className="tabular-nums text-ink">{l.count} phrase{l.count === 1 ? "" : "s"}</span>
                    </div>
                    <Progress value={Math.min(100, l.count * 5)} label={`${l.language} phrases`} />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-ink-3">Mark phrases as known in a lesson to see your progress here.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="My phrasebook" subtitle={data.vocabCount ? `${data.vocabCount} saved` : undefined} />
          <CardBody>
            {data.vocab.length === 0 ? (
              <EmptyState title="Nothing saved yet" body="Phrases you mark as known appear here." />
            ) : (
              <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
                {data.vocab.map((v) => (
                  <li key={v.key} className="flex items-start gap-2 rounded-lg border border-line px-3 py-2">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-ink [overflow-wrap:anywhere]">{v.text}</span>
                      {v.romanized ? <span className="block text-xs text-brand">{v.romanized}</span> : null}
                      <span className="block text-xs text-ink-3">
                        {v.meaning} · {v.language}
                      </span>
                    </span>
                    <button type="button" className="text-xs text-ink-3 hover:text-rose" disabled={toggle.isPending} onClick={() => toggle.mutate({ key: v.key, learned: false })} aria-label={`Remove "${v.text}" from phrasebook`}>
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-surface-2/60 px-2 py-3">
      <p className="text-xl font-semibold tabular-nums text-ink">{value}</p>
      <p className="text-[11px] text-ink-3">{label}</p>
    </div>
  );
}

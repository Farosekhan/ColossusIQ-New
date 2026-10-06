"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, Flame, Lock, Medal, Target, Trophy } from "lucide-react";
import { useState } from "react";
import { LoadError } from "@/components/ui/load-error";
import { Badge as Pill, Card, CardBody, CardHeader, EmptyState, Progress, Skeleton } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/api/client";
import { AchievementsOverview, BADGE_GROUPS, type Badge } from "@/lib/api/achievements-schemas";
import { cn } from "@/lib/utils";

const KEY = ["achievements"] as const;
const fmt = (n: number) => n.toLocaleString("en-IN");
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
const TONE_BG: Record<Badge["tone"], string> = {
  brand: "bg-brand-soft text-brand",
  gold: "bg-gold-soft text-gold",
  teal: "bg-teal-soft text-teal",
  rose: "bg-rose-soft text-rose",
  amber: "bg-amber-soft text-amber",
  sky: "bg-sky-soft text-sky",
};

type Filter = "all" | "earned" | "locked";

export function AchievementsModule() {
  const q = useQuery({ queryKey: KEY, queryFn: () => apiFetch("/api/v1/achievements", AchievementsOverview), staleTime: 0, refetchOnMount: "always" });
  const [filter, setFilter] = useState<Filter>("all");

  if (q.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-44" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (q.isError) return <LoadError error={q.error} onRetry={() => void q.refetch()} />;
  const d = q.data;
  const earned = d.badges.filter((b) => b.earned);
  const nextUp = d.badges
    .filter((b) => !b.earned)
    .sort((a, b) => b.value / b.target - a.value / a.target)
    .slice(0, 3);
  const levelPct = Math.round(((d.xp - d.levelFrom) / Math.max(1, d.nextLevelAt - d.levelFrom)) * 100);
  const shown = d.badges.filter((b) => (filter === "all" ? true : filter === "earned" ? b.earned : !b.earned));
  const fresh = d.xp === 0;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex items-center gap-5">
            <div className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-brand text-white shadow-sm" aria-hidden="true">
              <div className="text-center leading-none">
                <p className="text-[10px] uppercase tracking-widest opacity-80">Level</p>
                <p className="text-3xl font-semibold">{d.level}</p>
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-ink-3">{d.levelTitle}</p>
              <p className="text-3xl font-semibold text-ink">
                {fmt(d.xp)} <span className="text-base font-normal text-ink-3">XP</span>
              </p>
              <Progress value={levelPct} className="mt-2 max-w-md" label={`Progress to level ${d.level + 1}`} />
              <p className="mt-1 text-xs text-ink-3">
                {fmt(d.nextLevelAt - d.xp)} XP to level {d.level + 1}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-2xl border border-line px-5 py-4">
            <Flame className={cn("h-8 w-8", d.streak.current ? "text-amber" : "text-ink-3")} aria-hidden="true" />
            <div>
              <p className="text-2xl font-semibold text-ink">
                {d.streak.current} <span className="text-sm font-normal text-ink-3">day streak</span>
              </p>
              <p className="text-xs text-ink-3">
                {d.streak.activeToday ? "Done for today" : d.streak.current ? "Do something today to keep it alive" : "Take a quiz or hand in work to start one"} · best {d.streak.longest}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Badges earned", value: `${earned.length}/${d.badges.length}`, icon: <Medal className="h-4 w-4" /> },
          { label: "Quizzes passed", value: d.stats.quizzesPassed, icon: <Check className="h-4 w-4" /> },
          { label: "Certificates", value: d.stats.certificates, icon: <Trophy className="h-4 w-4" /> },
          { label: "Class rank", value: d.board.rank ? `#${d.board.rank} of ${d.board.of}` : "—", icon: <Target className="h-4 w-4" /> },
        ].map((k) => (
          <Card key={k.label} className="p-5">
            <p className="flex items-center gap-2 text-sm text-ink-3">
              {k.icon} {k.label}
            </p>
            <p className="mt-1 text-2xl font-semibold text-ink">{k.value}</p>
          </Card>
        ))}
      </div>

      {fresh ? (
        <EmptyState title="Your first XP is one quiz away" body="Take a quiz from My Quizzes, read a lesson in Courses, or hand in an assignment. Your XP, streak and badges update from what you actually do." />
      ) : null}

      {nextUp.length ? (
        <Card>
          <CardHeader title="Next up" subtitle="The badges you are closest to" />
          <CardBody className="grid gap-4 md:grid-cols-3">
            {nextUp.map((b) => (
              <div key={b.id} className="rounded-xl border border-line p-4">
                <p className="font-medium text-ink">{b.title}</p>
                <p className="text-xs text-ink-3">{b.description}</p>
                <Progress value={(b.value / b.target) * 100} className="mt-3" label={`${b.title} progress`} />
                <p className="mt-1 text-xs text-ink-3">
                  {b.value} of {b.target}
                </p>
              </div>
            ))}
          </CardBody>
        </Card>
      ) : null}

      <Card>
        <CardHeader
          title="Badges"
          action={
            <div className="flex gap-1" role="tablist" aria-label="Filter badges">
              {(["all", "earned", "locked"] as const).map((f) => (
                <button
                  key={f}
                  role="tab"
                  aria-selected={filter === f}
                  onClick={() => setFilter(f)}
                  className={cn("rounded-full px-3 py-1 text-xs font-medium capitalize", filter === f ? "bg-brand text-white" : "text-ink-3 hover:bg-surface-2")}
                >
                  {f}
                </button>
              ))}
            </div>
          }
        />
        <CardBody className="space-y-6">
          {!shown.length ? <p className="text-sm text-ink-3">{filter === "earned" ? "No badges earned yet. Pick one from Next up." : "You have earned every badge."}</p> : null}
          {BADGE_GROUPS.map((g) => {
            const list = shown.filter((b) => b.group === g);
            if (!list.length) return null;
            return (
              <section key={g} aria-label={g}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-3">{g}</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((b) => (
                    <div key={b.id} className={cn("flex gap-3 rounded-xl border p-4", b.earned ? "border-line" : "border-dashed border-line opacity-80")}>
                      <div className={cn("grid h-11 w-11 shrink-0 place-items-center rounded-xl", b.earned ? TONE_BG[b.tone] : "bg-surface-2 text-ink-3")} aria-hidden="true">
                        {b.earned ? <Medal className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-2 font-medium text-ink">
                          {b.title} {b.earned ? <Pill tone="teal">Earned</Pill> : null}
                        </p>
                        <p className="text-xs text-ink-3">{b.description}</p>
                        {!b.earned ? (
                          <>
                            <Progress value={(b.value / b.target) * 100} className="mt-2" label={`${b.title} progress`} />
                            <p className="mt-1 text-xs text-ink-3">
                              {b.value} of {b.target}
                            </p>
                          </>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Where your XP came from" />
          <CardBody>
            <ul className="divide-y divide-line">
              {d.breakdown.map((r) => (
                <li key={r.key} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-ink">
                    {r.label} <span className="text-ink-3">· {r.count}</span>
                  </span>
                  <span className="font-medium text-ink">{fmt(r.xp)} XP</span>
                </li>
              ))}
            </ul>
            <details className="mt-4 text-sm">
              <summary className="cursor-pointer font-medium text-brand">How XP is earned</summary>
              <ul className="mt-2 space-y-1 text-ink-2">
                {d.rules.map((r) => (
                  <li key={r.label} className="flex justify-between gap-3">
                    <span>{r.label}</span>
                    <span className="shrink-0 font-medium">+{r.xp}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-ink-3">A streak counts a day when you attempt a quiz or hand in an assignment (India time).</p>
            </details>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Class leaderboard" subtitle="Ranked by learning XP: quizzes, certificates and lessons. Classmates stay anonymous." />
          <CardBody>
            {!d.board.top.length ? (
              <p className="text-sm text-ink-3">Nobody in your college has earned learning XP yet. Be the first.</p>
            ) : (
              <ol className="space-y-2">
                {d.board.top.map((t, i) => (
                  <li key={`${t.rank}-${i}`} className={cn("flex items-center gap-3 rounded-xl px-3 py-2 text-sm", t.you ? "bg-brand-soft" : "bg-surface-2")}>
                    <span className="w-8 shrink-0 font-semibold text-ink">#{t.rank}</span>
                    <span className="min-w-0 flex-1 truncate text-ink">{t.you ? "You" : "Classmate"}</span>
                    <span className="shrink-0 font-medium text-ink">{fmt(t.xp)} XP</span>
                  </li>
                ))}
              </ol>
            )}
            {d.board.toNext !== null ? <p className="mt-3 text-xs text-ink-3">{fmt(d.board.toNext)} more learning XP to move up a place.</p> : null}
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recent XP" subtitle="Your latest activity" />
        <CardBody>
          {!d.recent.length ? (
            <p className="text-sm text-ink-3">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-line">
              {d.recent.map((e, i) => (
                <li key={`${e.at}-${i}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <span className="min-w-0">
                    <span className="block truncate text-ink">{e.label}</span>
                    <span className="text-xs text-ink-3">{when(e.at)}</span>
                  </span>
                  <Pill tone="teal">+{e.xp} XP</Pill>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

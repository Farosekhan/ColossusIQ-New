"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { z } from "zod";
import { apiFetch } from "@/lib/api/client";
import { StudentSummary } from "@/lib/api/teaching-schemas";
import { TemplateSkeleton } from "@/components/modules/shared";
import { Fi } from "@/components/ui/icon";
import { LoadError } from "@/components/ui/load-error";
import { Badge, Button, Card, EmptyState } from "@/components/ui/primitives";
import { hostLabel } from "@/lib/video";
import { cn } from "@/lib/utils";
import { InfographicPoster } from "./infographic-poster";

const fmt = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/** Student view of class summaries and infographic lessons shared by faculty. */
export function ClassNotesModule() {
  const list = useQuery({ queryKey: ["class-notes"], queryFn: () => apiFetch("/api/v1/teaching/summaries", z.array(StudentSummary)) });
  const [dept, setDept] = useState("All");
  const [openId, setOpenId] = useState<string | null>(null);

  if (list.isError) return <LoadError error={list.error} onRetry={() => void list.refetch()} />;
  if (list.isLoading || !list.data) return <TemplateSkeleton />;
  const open = list.data.find((s) => s.id === openId);
  if (open) return <NoteView note={open} onBack={() => setOpenId(null)} />;

  const depts = [...new Set(list.data.map((s) => s.department))].sort();
  const shown = list.data.filter((s) => dept === "All" || s.department === dept);
  const unread = list.data.filter((s) => !s.read).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-ink-2">
          Summaries your faculty share after class — what was covered, homework, resources and infographic handouts.
          {unread ? <span className="ml-2 font-medium text-brand">{unread} new</span> : null}
        </p>
        {depts.length > 1 ? (
          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by department">
            {["All", ...depts].map((d) => (
              <button key={d} type="button" aria-pressed={dept === d} onClick={() => setDept(d)} className={cn("rounded-full border px-3 py-1 text-sm", dept === d ? "border-brand bg-brand text-white" : "border-line bg-surface text-ink-2")}>
                {d}
              </button>
            ))}
          </div>
        ) : null}
      </div>
      {!shown.length ? (
        <EmptyState title="No class notes yet" body="When your faculty share a class summary, it will appear here." />
      ) : (
        <ol className="relative space-y-4 border-l-2 border-line pl-6">
          {shown.map((s) => (
            <li key={s.id} className="relative">
              <span className={cn("absolute -left-[33px] top-5 size-4 rounded-full border-4 border-bg", s.read ? "bg-line" : "bg-brand")} aria-hidden />
              <Card className="card-hover p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="eyebrow">
                      {fmt(s.date)} · {s.department}
                      {s.courseTitle ? ` · ${s.courseTitle}` : ""}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-ink">{s.title}</h3>
                    <p className="text-sm text-ink-3">by {s.authorName}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {!s.read ? <Badge tone="brand">New</Badge> : null}
                    {s.infographic ? (
                      <Badge tone="gold">
                        <Fi name="picture" /> Infographic
                      </Badge>
                    ) : null}
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-[13.5px] text-ink-2">
                  {s.points.slice(0, 3).map((p) => (
                    <li key={p} className="flex gap-2">
                      <Fi name="check" className="mt-1 text-teal" /> <span className="line-clamp-1">{p}</span>
                    </li>
                  ))}
                </ul>
                <Button className="mt-4" onClick={() => setOpenId(s.id)}>
                  Open notes <Fi name="arrow-right" />
                </Button>
              </Card>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function NoteView({ note, onBack }: { note: StudentSummary; onBack: () => void }) {
  const qc = useQueryClient();
  const markRead = useMutation({
    mutationFn: () => apiFetch(`/api/v1/teaching/summaries/${note.id}/read`, z.object({ ok: z.boolean() }), { method: "POST" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["class-notes"] }),
  });
  const { mutate } = markRead;
  useEffect(() => {
    if (!note.read) mutate();
  }, [note.id, note.read, mutate]);

  return (
    <div className="space-y-5">
      <button type="button" onClick={onBack} className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-2 hover:text-brand">
        <Fi name="arrow-left" /> All class notes
      </button>
      <Card className="p-6 sm:p-8">
        <p className="eyebrow">
          {fmt(note.date)} · {note.department}
          {note.courseTitle ? ` · ${note.courseTitle}` : ""}
        </p>
        <h2 className="display mt-2 text-3xl text-ink">{note.title}</h2>
        <p className="mt-1 text-sm text-ink-3">Shared by {note.authorName}</p>
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section>
            <p className="eyebrow mb-3">What we covered</p>
            <ol className="space-y-2.5">
              {note.points.map((p, i) => (
                <li key={p} className="flex gap-3 text-[15px] leading-relaxed text-ink">
                  <span className="display-italic font-display text-2xl leading-none text-gold">{i + 1}</span>
                  {p}
                </li>
              ))}
            </ol>
          </section>
          <div className="space-y-4">
            {note.homework ? (
              <section className="rounded-2xl bg-brand-soft/60 p-4">
                <p className="eyebrow mb-1.5 flex items-center gap-2">
                  <Fi name="pencil" /> Homework
                </p>
                <p className="text-[14px] leading-relaxed text-ink">{note.homework}</p>
              </section>
            ) : null}
            {note.nextClass ? (
              <section className="rounded-2xl bg-surface-2 p-4">
                <p className="eyebrow mb-1.5">Next class</p>
                <p className="text-[14px] text-ink">{note.nextClass}</p>
              </section>
            ) : null}
            {note.resources.length ? (
              <section>
                <p className="eyebrow mb-2">Resources</p>
                <ul className="space-y-1.5">
                  {note.resources.map((r) => (
                    <li key={r.url}>
                      <a href={r.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-2 rounded-lg border border-line px-3 py-2 text-[13px] text-ink hover:border-brand/40 hover:text-brand">
                        <Fi name={hostLabel(r.url) === "YouTube" ? "play-circle" : "globe"} className="text-brand" />
                        <span className="min-w-0 flex-1 truncate">{r.label}</span>
                        <span className="font-sans tabular-nums text-[10.5px] text-ink-3">{hostLabel(r.url)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        </div>
      </Card>
      {note.infographic ? (
        <>
          <div className="flex items-center justify-between">
            <p className="eyebrow">Infographic lesson</p>
            <Button variant="secondary" size="sm" onClick={() => window.print()}>
              <Fi name="print" /> Print / save as PDF
            </Button>
          </div>
          <InfographicPoster data={{ ...note.infographic, topic: note.topic, department: note.department, courseTitle: note.courseTitle, footer: `Shared by ${note.authorName} · ${fmt(note.date)}` }} />
        </>
      ) : null}
    </div>
  );
}

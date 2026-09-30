"use client";

import { useId } from "react";
import { Fi } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export type IllustrationKind = "flow" | "layers" | "cycle";

const COLORS = ["#4a5bd4", "#2f9e93", "#8b74ec", "#c8952c", "#4f93d8", "#c85672"];

/**
 * "The idea in one picture": a diagram built from a topic's key points.
 * - flow:   ideas that follow one another
 * - layers: ideas that build on a foundation
 * - cycle:  ideas that feed back into each other
 * `board` renders for the dark smart board; the default suits cards and print.
 */
export function TopicIllustration({ title, points, kind, board = false, className }: { title: string; points: string[]; kind: IllustrationKind; board?: boolean; className?: string }) {
  const items = points.slice(0, 5);
  const label = `${kind === "flow" ? "Flow" : kind === "layers" ? "Layered" : "Cycle"} diagram of ${title}: ${items.join("; ")}`;
  return (
    <div role="img" aria-label={label} className={cn("w-full", className)}>
      {kind === "flow" ? <Flow title={title} items={items} board={board} /> : kind === "layers" ? <Layers title={title} items={items} board={board} /> : <Cycle title={title} items={items} board={board} />}
    </div>
  );
}

function Flow({ title, items, board }: { title: string; items: string[]; board: boolean }) {
  return (
    <div>
      <p className={cn("mb-4 text-center font-sans tabular-nums text-[11px] uppercase tracking-[0.1em]", board ? "text-white/60" : "text-ink-3")}>{title} · step by step</p>
      <ol className="flex flex-col items-stretch gap-3 md:flex-row md:items-stretch md:gap-0">
        {items.map((p, i) => (
          <li key={p} className="flex flex-col items-center md:flex-1 md:flex-row" aria-hidden>
            <div className={cn("relative w-full rounded-2xl p-4 pt-7 text-center shadow-sm", board ? "bg-white/10 text-white ring-1 ring-white/15" : "border border-line bg-surface text-ink")}>
              <span className="absolute -top-4 left-1/2 flex size-8 -translate-x-1/2 items-center justify-center rounded-full font-sans tabular-nums text-sm font-semibold text-white shadow" style={{ background: COLORS[i % COLORS.length] }}>
                {i + 1}
              </span>
              <p className="text-[13.5px] leading-relaxed">{p}</p>
            </div>
            {i < items.length - 1 ? (
              <span className={cn("my-1 flex rotate-90 items-center justify-center md:mx-1 md:my-0 md:rotate-0", board ? "text-white/50" : "text-ink-3")}>
                <Fi name="arrow-right" className="text-lg" />
              </span>
            ) : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Layers({ title, items, board }: { title: string; items: string[]; board: boolean }) {
  const n = items.length;
  // Foundation (first point) at the bottom, widest; each later idea builds on it.
  return (
    <div className="flex flex-col items-center gap-2" aria-hidden>
      <div className={cn("mb-1 rounded-full px-4 py-1.5 text-center text-sm font-semibold", board ? "bg-[#e0b453] text-[#1b2233]" : "bg-gold text-[#1b2233]")}>{title}</div>
      {[...items].reverse().map((p, ri) => {
        const i = n - 1 - ri;
        const width = 58 + (42 * i) / Math.max(1, n - 1);
        return (
          <div
            key={p}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-white shadow-sm"
            style={{ width: `${width}%`, backgroundImage: `linear-gradient(100deg, ${COLORS[i % COLORS.length]}, ${COLORS[(i + 1) % COLORS.length]})` }}
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-white/20 font-sans tabular-nums text-xs font-semibold">{i + 1}</span>
            <span className="text-[13.5px] leading-snug">{p}</span>
          </div>
        );
      })}
      <p className={cn("mt-1 font-sans tabular-nums text-[10.5px] uppercase tracking-[0.1em]", board ? "text-white/55" : "text-ink-3")}>Foundation ↑ builds upward</p>
    </div>
  );
}

function Cycle({ title, items, board }: { title: string; items: string[]; board: boolean }) {
  const uid = useId().replace(/:/g, "");
  const n = items.length;
  return (
    <>
      {/* Wide screens: points around a ring */}
      <div className="relative mx-auto hidden aspect-[16/11] w-full max-w-3xl md:block" aria-hidden>
        <svg viewBox="0 0 160 110" className="absolute inset-0 h-full w-full">
          <defs>
            <marker id={`arrow-${uid}`} viewBox="0 0 10 10" refX="6" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill={board ? "rgba(255,255,255,.6)" : "var(--gold)"} />
            </marker>
          </defs>
          {items.map((_, i) => {
            const a1 = ((-90 + (i * 360) / n + 16) * Math.PI) / 180;
            const a2 = ((-90 + ((i + 1) * 360) / n - 16) * Math.PI) / 180;
            const r = 40;
            const [x1, y1, x2, y2] = [80 + r * 1.35 * Math.cos(a1), 55 + r * Math.sin(a1), 80 + r * 1.35 * Math.cos(a2), 55 + r * Math.sin(a2)];
            return <path key={i} d={`M ${x1} ${y1} A ${r * 1.35} ${r} 0 0 1 ${x2} ${y2}`} fill="none" stroke={board ? "rgba(255,255,255,.45)" : "var(--gold)"} strokeWidth="0.8" strokeDasharray="2 1.5" markerEnd={`url(#arrow-${uid})`} />;
          })}
        </svg>
        <div className="bg-brand-gradient absolute left-1/2 top-1/2 flex size-32 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full p-4 text-center text-white shadow-xl ring-4 ring-white/20">
          <span className="display text-base leading-tight">{title}</span>
        </div>
        {items.map((p, i) => {
          const a = ((-90 + (i * 360) / n) * Math.PI) / 180;
          return (
            <div
              key={p}
              className={cn("absolute w-[30%] -translate-x-1/2 -translate-y-1/2 rounded-xl p-3 text-[12.5px] leading-snug shadow-sm", board ? "bg-white/10 text-white ring-1 ring-white/15 backdrop-blur" : "border border-line bg-surface text-ink")}
              style={{ left: `${50 + 36 * Math.cos(a)}%`, top: `${50 + 38 * Math.sin(a)}%` }}
            >
              <span className="mb-1 flex size-6 items-center justify-center rounded-full font-sans tabular-nums text-[11px] font-semibold text-white" style={{ background: COLORS[i % COLORS.length] }}>
                {i + 1}
              </span>
              {p}
            </div>
          );
        })}
      </div>
      {/* Narrow screens: the same cycle as a loop list */}
      <ol className="space-y-2 md:hidden" aria-hidden>
        {items.map((p, i) => (
          <li key={p} className={cn("flex items-start gap-3 rounded-xl p-3 text-[13.5px]", board ? "bg-white/10 text-white" : "border border-line bg-surface text-ink")}>
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full font-sans tabular-nums text-[11px] text-white" style={{ background: COLORS[i % COLORS.length] }}>
              {i + 1}
            </span>
            {p}
          </li>
        ))}
        <li className={cn("text-center font-sans tabular-nums text-[11px]", board ? "text-white/55" : "text-ink-3")}>↻ back to 1</li>
      </ol>
    </>
  );
}

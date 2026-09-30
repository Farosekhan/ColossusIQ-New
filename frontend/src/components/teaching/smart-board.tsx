"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { TeachingPack } from "@/lib/api/teaching-schemas";
import { TopicIllustration } from "@/components/learning/illustration";
import { Fi } from "@/components/ui/icon";
import { SafeMarkdown } from "@/components/ui/safe-markdown";
import { cn } from "@/lib/utils";

type Theme = "night" | "chalk" | "white";
type Tool = "pointer" | "pen" | "highlighter" | "eraser";

const THEMES: Record<Theme, { bg: string; label: string; dark: boolean }> = {
  night: { bg: "radial-gradient(1200px 600px at 80% -10%, #2a3a8a55, transparent), #0f1530", label: "Night", dark: true },
  chalk: { bg: "radial-gradient(1000px 500px at 20% 0%, #ffffff10, transparent), #17332b", label: "Chalkboard", dark: true },
  white: { bg: "#fbfaf6", label: "Whiteboard", dark: false },
};
const PENS_DARK = ["#ffffff", "#ffd54a", "#ff6b6b", "#5ee1d0"];
const PENS_LIGHT = ["#1b2233", "#2f47c9", "#d23c3c", "#0f766e"];

interface Slide {
  key: string;
  label: string;
  render: (dark: boolean) => ReactNode;
}

function useSlides(pack: TeachingPack): Slide[] {
  return useMemo(() => {
    const H = ({ children, dark }: { children: ReactNode; dark: boolean }) => <p className={cn("font-sans tabular-nums text-sm uppercase tracking-[0.12em]", dark ? "text-[#e0b453]" : "text-amber")}>{children}</p>;
    const s: Slide[] = [
      {
        key: "title",
        label: "Title",
        render: (dark) => (
          <div className="flex h-full flex-col justify-center">
            <H dark={dark}>{pack.source.courseTitle ? `${pack.source.code ?? ""} · ${pack.source.courseTitle}` : pack.department}</H>
            <h1 className="display mt-6 text-[clamp(3rem,8vw,7rem)]">{pack.topic}</h1>
            <p className={cn("mt-6 text-xl", dark ? "text-white/70" : "text-ink-2")}>
              {pack.department} · {pack.outline.minutes}-minute class
            </p>
          </div>
        ),
      },
      {
        key: "plan",
        label: "Today's plan",
        render: (dark) => (
          <div>
            <H dark={dark}>Today&apos;s plan</H>
            <ol className="mt-8 grid gap-4 md:grid-cols-3">
              {pack.outline.blocks.map((b, i) => (
                <li key={b.title} className={cn("rounded-2xl p-5", dark ? "bg-white/8 ring-1 ring-white/15" : "border border-line bg-white")}>
                  <p className="font-sans tabular-nums text-sm opacity-70">
                    {String(b.start).padStart(2, "0")}–{String(b.start + b.minutes).padStart(2, "0")} min
                  </p>
                  <p className="mt-2 text-2xl font-semibold">
                    {i + 1}. {b.title}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        ),
      },
      {
        key: "basics",
        label: "Topic basics",
        render: (dark) => (
          <div className="grid h-full content-center gap-10 lg:grid-cols-[1.4fr_1fr]">
            <div>
              <H dark={dark}>What is it?</H>
              <p className="mt-6 text-[clamp(1.4rem,2.4vw,2.2rem)] leading-snug">{pack.basics.what}</p>
            </div>
            <div className={cn("self-center rounded-3xl p-7", dark ? "bg-white/8 ring-1 ring-white/15" : "border border-line bg-white")}>
              <H dark={dark}>Why it matters</H>
              <p className={cn("mt-4 text-xl leading-relaxed", dark ? "text-white/85" : "text-ink-2")}>{pack.basics.why}</p>
            </div>
          </div>
        ),
      },
      {
        key: "picture",
        label: "The idea in one picture",
        render: (dark) => (
          <div>
            <H dark={dark}>The idea in one picture</H>
            <div className="mt-10">
              <TopicIllustration title={pack.topic} points={pack.keyPoints} kind={pack.illustration} board={dark} />
            </div>
          </div>
        ),
      },
      {
        key: "points",
        label: "Key points",
        render: (dark) => (
          <div>
            <H dark={dark}>Key points</H>
            <ol className="mt-8 space-y-6">
              {pack.keyPoints.map((p, i) => (
                <li key={p} className="flex gap-6 text-[clamp(1.3rem,2.2vw,2rem)] leading-snug">
                  <span className="display-italic font-display text-[1.6em] leading-none" style={{ color: dark ? "#e0b453" : "#b07c12" }}>
                    {i + 1}
                  </span>
                  {p}
                </li>
              ))}
            </ol>
          </div>
        ),
      },
    ];
    if (pack.terms.length)
      s.push({
        key: "terms",
        label: "Key terms",
        render: (dark) => (
          <div>
            <H dark={dark}>Key terms</H>
            <dl className="mt-8 grid gap-5 md:grid-cols-3">
              {pack.terms.map((t) => (
                <div key={t.term} className={cn("rounded-3xl p-6", dark ? "bg-white/8 ring-1 ring-white/15" : "border border-line bg-white")}>
                  <dt className="display text-3xl">{t.term}</dt>
                  <dd className={cn("mt-3 text-lg leading-relaxed", dark ? "text-white/80" : "text-ink-2")}>{t.meaning}</dd>
                </div>
              ))}
            </dl>
          </div>
        ),
      });
    if (pack.example.trim())
      s.push({
        key: "example",
        label: "Worked example",
        render: (dark) => (
          <div>
            <H dark={dark}>Worked example</H>
            <div className={cn("mt-6 max-w-5xl text-xl", dark && "board-md")}>
              <SafeMarkdown className="text-[1.15rem] leading-8">{pack.example}</SafeMarkdown>
            </div>
          </div>
        ),
      });
    if (pack.mistakes.length)
      s.push({
        key: "mistakes",
        label: "Watch out",
        render: (dark) => (
          <div>
            <H dark={dark}>Watch out</H>
            <ul className="mt-8 grid gap-5 md:grid-cols-2">
              {pack.mistakes.map((m) => (
                <li key={m} className={cn("flex gap-4 rounded-3xl p-6 text-xl leading-relaxed", dark ? "bg-[#ffb02e]/15 ring-1 ring-[#ffb02e]/40" : "border border-amber/30 bg-amber-soft")}>
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[#e0a33a] text-xl font-bold text-white">!</span>
                  {m}
                </li>
              ))}
            </ul>
          </div>
        ),
      });
    pack.practice.forEach((q, i) =>
      s.push({
        key: `check-${i}`,
        label: `Check ${i + 1}`,
        render: (dark) => <CheckSlide q={q.q} a={q.a} n={i + 1} dark={dark} />,
      }),
    );
    s.push({
      key: "summary",
      label: "Summary",
      render: (dark) => (
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <H dark={dark}>What we covered</H>
            <ul className="mt-6 space-y-4 text-2xl leading-snug">
              {pack.keyPoints.map((p) => (
                <li key={p} className="flex gap-4">
                  <Fi name="check" className={cn("mt-1.5", dark ? "text-[#5ee1d0]" : "text-teal")} /> {p}
                </li>
              ))}
            </ul>
          </div>
          <div className={cn("self-start rounded-3xl p-7", dark ? "bg-white/8 ring-1 ring-white/15" : "border border-line bg-white")}>
            <H dark={dark}>Exit ticket</H>
            <ol className="mt-4 list-decimal space-y-3 pl-6 text-xl">
              {pack.outline.exitTicket.map((q) => (
                <li key={q}>{q}</li>
              ))}
            </ol>
            {pack.nextTopic ? <p className={cn("mt-6 text-lg", dark ? "text-white/70" : "text-ink-2")}>Next class: {pack.nextTopic}</p> : null}
          </div>
        </div>
      ),
    });
    return s;
  }, [pack]);
}

function CheckSlide({ q, a, n, dark }: { q: string; a: string; n: number; dark: boolean }) {
  const [shown, setShown] = useState(false);
  return (
    <div className="flex h-full flex-col justify-center">
      <p className={cn("font-sans tabular-nums text-sm uppercase tracking-[0.12em]", dark ? "text-[#e0b453]" : "text-amber")}>Check your understanding · {n}</p>
      <p className="display mt-6 text-[clamp(2rem,4vw,3.5rem)] leading-tight">{q}</p>
      {shown ? (
        <p className={cn("mt-8 max-w-4xl rounded-3xl p-6 text-2xl leading-relaxed", dark ? "bg-[#5ee1d0]/15 ring-1 ring-[#5ee1d0]/40" : "border border-teal/30 bg-teal-soft")}>{a}</p>
      ) : (
        <button type="button" onClick={() => setShown(true)} className={cn("mt-8 self-start rounded-full px-6 py-3 text-lg font-medium", dark ? "bg-white/15 hover:bg-white/25" : "bg-ink text-bg")}>
          Reveal answer
        </button>
      )}
    </div>
  );
}

export function SmartBoard({ pack, onClose }: { pack: TeachingPack; onClose: () => void }) {
  const slides = useSlides(pack);
  const [index, setIndex] = useState(0);
  const [theme, setTheme] = useState<Theme>("night");
  const [tool, setTool] = useState<Tool>("pointer");
  const [color, setColor] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawings = useRef(new Map<number, string>());
  const drawing = useRef<{ x: number; y: number } | null>(null);
  const t = THEMES[theme];
  const pens = t.dark ? PENS_DARK : PENS_LIGHT;

  const saveDrawing = useCallback(() => {
    const c = canvasRef.current;
    if (c) drawings.current.set(index, c.toDataURL());
  }, [index]);

  const go = useCallback(
    (to: number) => {
      const next = Math.max(0, Math.min(slides.length - 1, to));
      if (next === index) return;
      saveDrawing();
      setIndex(next);
    },
    [index, slides.length, saveDrawing],
  );

  // Size the canvas to the screen and restore this slide's drawing.
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const fit = () => {
      const dpr = window.devicePixelRatio || 1;
      c.width = Math.floor(window.innerWidth * dpr);
      c.height = Math.floor(window.innerHeight * dpr);
      const ctx = c.getContext("2d")!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const saved = drawings.current.get(index);
      if (saved) {
        const img = new Image();
        img.onload = () => ctx.drawImage(img, 0, 0, window.innerWidth, window.innerHeight);
        img.src = saved;
      }
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [index]);

  useEffect(() => {
    const started = Date.now();
    const timer = setInterval(() => setElapsed(Math.floor((Date.now() - started) / 1000)), 1000);
    const previous = document.activeElement as HTMLElement | null;
    rootRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      clearInterval(timer);
      document.body.style.overflow = "";
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
      previous?.focus?.();
    };
  }, []);

  const onKey = (e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).closest("button, input")) {
      if (e.key !== "Escape") return;
    }
    if (["ArrowRight", "PageDown", " "].includes(e.key)) {
      e.preventDefault();
      go(index + 1);
    } else if (["ArrowLeft", "PageUp"].includes(e.key)) {
      e.preventDefault();
      go(index - 1);
    } else if (e.key === "Escape" && !document.fullscreenElement) onClose();
    else if (e.key.toLowerCase() === "p") setTool((x) => (x === "pen" ? "pointer" : "pen"));
  };

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const stroke = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (tool === "eraser") {
      ctx.globalCompositeOperation = "destination-out";
      ctx.lineWidth = 28;
      ctx.globalAlpha = 1;
    } else {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = tool === "highlighter" ? "#ffe066" : pens[color]!;
      ctx.lineWidth = tool === "highlighter" ? 22 : 4;
      ctx.globalAlpha = tool === "highlighter" ? 0.35 : 1;
    }
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.globalAlpha = 1;
  };
  const clear = () => {
    const c = canvasRef.current;
    c?.getContext("2d")?.clearRect(0, 0, c.width, c.height);
    drawings.current.delete(index);
  };
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.().catch(() => undefined);
  };

  const mm = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");
  const slide = slides[index]!;
  const btn = cn("inline-flex size-9 items-center justify-center rounded-lg transition-colors", t.dark ? "text-white/80 hover:bg-white/15" : "text-ink-2 hover:bg-black/5");

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label={`Smart board: ${pack.topic}`}
      tabIndex={-1}
      onKeyDown={onKey}
      className={cn("fixed inset-0 z-[200] flex flex-col outline-none", t.dark ? "text-white" : "text-ink")}
      style={{ background: t.bg }}
    >
      {/* slide */}
      <div className="relative flex-1 overflow-y-auto px-[6vw] pb-28 pt-[7vh]" aria-live="polite">
        <div key={slide.key} className="animate-fade-up mx-auto h-full max-w-[1400px]">
          {slide.render(t.dark)}
        </div>
      </div>

      {/* drawing layer */}
      <canvas
        ref={canvasRef}
        className={cn("absolute inset-0 h-full w-full", tool === "pointer" ? "pointer-events-none" : "cursor-crosshair touch-none")}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drawing.current = point(e);
        }}
        onPointerMove={(e) => {
          if (!drawing.current) return;
          const p = point(e);
          stroke(drawing.current, p);
          drawing.current = p;
        }}
        onPointerUp={() => {
          drawing.current = null;
          saveDrawing();
        }}
        aria-hidden
      />

      {/* toolbar */}
      <div className={cn("absolute inset-x-0 bottom-0 flex flex-wrap items-center justify-between gap-3 px-5 py-3 backdrop-blur", t.dark ? "bg-black/30" : "bg-white/80 shadow-[0_-1px_0_rgba(0,0,0,.06)]")}>
        <div className="flex items-center gap-1">
          <button type="button" className={btn} onClick={() => go(index - 1)} disabled={index === 0} aria-label="Previous slide">
            <Fi name="angle-left" />
          </button>
          <span className="w-24 text-center font-sans tabular-nums text-sm tabular-nums">
            {index + 1} / {slides.length}
          </span>
          <button type="button" className={btn} onClick={() => go(index + 1)} disabled={index === slides.length - 1} aria-label="Next slide">
            <Fi name="angle-right" />
          </button>
          <span className={cn("ml-3 hidden text-sm md:inline", t.dark ? "text-white/60" : "text-ink-3")}>{slide.label}</span>
        </div>

        <div className="flex items-center gap-1" role="toolbar" aria-label="Drawing tools">
          {(
            [
              ["pointer", "cursor", "Pointer"],
              ["pen", "pencil", "Pen (P)"],
              ["highlighter", "highlighter", "Highlighter"],
              ["eraser", "eraser", "Eraser"],
            ] as const
          ).map(([k, icon, label]) => (
            <button key={k} type="button" aria-pressed={tool === k} aria-label={label} title={label} onClick={() => setTool(k)} className={cn(btn, tool === k && (t.dark ? "bg-white/20 text-white" : "bg-black/10 text-ink"))}>
              <Fi name={icon} />
            </button>
          ))}
          <span className={cn("mx-1 h-6 w-px", t.dark ? "bg-white/20" : "bg-black/10")} aria-hidden />
          {pens.map((c, i) => (
            <button
              key={c}
              type="button"
              aria-label={`Pen colour ${i + 1}`}
              aria-pressed={color === i}
              onClick={() => {
                setColor(i);
                setTool("pen");
              }}
              className={cn("size-6 rounded-full ring-2 ring-offset-2", color === i ? "ring-[#e0b453]" : "ring-transparent", t.dark ? "ring-offset-[#0f1530]" : "ring-offset-white")}
              style={{ background: c }}
            />
          ))}
          <button type="button" className={btn} onClick={clear} aria-label="Clear drawing" title="Clear drawing">
            <Fi name="broom" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="mr-2 inline-flex items-center gap-1.5 font-sans tabular-nums text-sm tabular-nums" aria-label="Class time">
            <Fi name="clock" /> {mm}:{ss}
          </span>
          <select
            aria-label="Board style"
            value={theme}
            onChange={(e) => setTheme(e.target.value as Theme)}
            className={cn("h-9 rounded-lg px-2 text-sm", t.dark ? "bg-white/10 text-white" : "border border-line bg-white text-ink")}
          >
            {(Object.keys(THEMES) as Theme[]).map((k) => (
              <option key={k} value={k} className="text-ink">
                {THEMES[k].label}
              </option>
            ))}
          </select>
          <button type="button" className={btn} onClick={fullscreen} aria-label="Full screen" title="Full screen">
            <Fi name="expand" />
          </button>
          <button type="button" className={btn} onClick={onClose} aria-label="Close smart board" title="Close (Esc)">
            <Fi name="cross" />
          </button>
        </div>
        <div className={cn("absolute inset-x-0 top-0 h-0.5", t.dark ? "bg-white/10" : "bg-black/5")} aria-hidden>
          <div className="h-full bg-[#e0b453] transition-[width] duration-300" style={{ width: `${((index + 1) / slides.length) * 100}%` }} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

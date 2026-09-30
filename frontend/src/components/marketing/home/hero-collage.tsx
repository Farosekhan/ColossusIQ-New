import { Fi } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo";

/** Index-card collage for the hero: a lesson, a certificate and a readiness score, as the student sees them. */
export function HeroCollage() {
  return (
    <div className="relative grid gap-4 lg:block lg:h-[610px]" aria-label="Product preview">
      {/* Lesson reader card */}
      <div className="paper p-5 transition-transform duration-500 lg:absolute lg:left-6 lg:top-24 lg:w-[74%] lg:-rotate-2 lg:hover:rotate-0">
        <div className="flex items-center justify-between">
          <span className="eyebrow">CSE101 · Lesson 07 / 10</span>
          <span className="rounded-full bg-teal-soft px-2.5 py-0.5 text-[11px] font-medium text-teal">30 min</span>
        </div>
        <p className="display mt-3 text-[28px] text-ink">Normalization (1NF–BCNF)</p>
        <ol className="mt-4 space-y-2.5 text-[13px] leading-snug text-ink-2">
          {[
            "2NF removes partial dependencies on part of a composite key.",
            "3NF removes transitive dependencies of non-key attributes.",
            "In BCNF, every determinant is a superkey.",
          ].map((t, i) => (
            <li key={t} className="flex gap-3">
              <span className="font-mono text-[11px] text-gold">0{i + 1}</span>
              {t}
            </li>
          ))}
        </ol>
        <div className="mt-5 flex items-center gap-3">
          <div className="h-1.5 flex-1 rounded-full bg-surface-2">
            <div className="h-full w-[70%] rounded-full bg-brand" />
          </div>
          <span className="font-mono text-[11px] text-ink-3">7 of 10</span>
          <span className="inline-flex items-center gap-1 rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-medium text-white">
            Next <Fi name="arrow-right" />
          </span>
        </div>
      </div>

      {/* Certificate card */}
      <div className="paper overflow-hidden transition-transform duration-500 lg:absolute lg:right-0 lg:top-[52%] lg:w-[60%] lg:rotate-3 lg:hover:rotate-0">
        <div className="border-b border-dashed border-gold/50 bg-gold-soft/50 px-5 py-2.5">
          <span className="eyebrow !text-amber">Certificate of achievement</span>
        </div>
        <div className="flex items-center gap-4 p-5">
          <div className="relative flex size-16 shrink-0 items-center justify-center rounded-full border-2 border-gold bg-gold-soft">
            <span className="display text-2xl text-gold">O</span>
          </div>
          <div className="min-w-0">
            <p className="display text-xl text-ink">Anand Kumar</p>
            <p className="text-[12px] text-ink-2">Database Management Systems · 29 / 30</p>
            <p className="mt-1.5 inline-flex items-center gap-1 font-mono text-[10.5px] text-teal">
              <Fi name="shield-check" /> CIQ-2026-520F5771 · verified
            </p>
          </div>
        </div>
      </div>

      {/* Readiness card */}
      <div className="paper p-5 transition-transform duration-500 lg:absolute lg:bottom-2 lg:left-0 lg:w-[44%] lg:-rotate-3 lg:hover:rotate-0">
        <span className="eyebrow">Placement readiness</span>
        <div className="mt-3 flex items-end gap-2">
          <span className="display text-5xl text-ink">78</span>
          <span className="mb-1.5 font-mono text-xs text-ink-3">/ 100</span>
        </div>
        <div className="mt-3 flex gap-1" aria-hidden>
          {[35, 20, 11, 7, 5].map((w, i) => (
            <span key={i} className="h-2 rounded-full" style={{ flex: w, background: ["var(--brand)", "var(--gold)", "var(--teal)", "var(--violet)", "var(--sky)"][i] }} />
          ))}
        </div>
        <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-soft px-2.5 py-1 text-[11px] font-medium text-teal">
          <Fi name="badge-check" /> Placement ready
        </p>
      </div>

      {/* Mentor note, pinned like a sticky note */}
      <div className="hidden rotate-2 rounded-xl bg-[#fff6d6] px-4 py-3 text-[12.5px] leading-snug text-[#5b4a14] shadow-lg lg:absolute lg:right-2 lg:top-0 lg:block lg:w-56 dark:bg-[#3a3218] dark:text-[#f3e3a8]">
        <p className="flex items-center gap-1.5 font-semibold">
          <Fi name="robot" /> AI Mentor
        </p>
        <p className="mt-1">Revise BCNF for 25 minutes, then take the final assessment. You&apos;re 3 lessons away.</p>
      </div>

      {/* Rotating seal */}
      <div className="pointer-events-none absolute -bottom-6 right-10 hidden size-32 lg:block" aria-hidden>
        <svg viewBox="0 0 120 120" className="animate-spin-slow size-full">
          <defs>
            <path id="seal-circle" d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
          </defs>
          <circle cx="60" cy="60" r="58" fill="var(--surface)" stroke="var(--gold)" strokeWidth="1" />
          <text fill="var(--ink-2)" style={{ fontFamily: "var(--font-mono)", fontSize: "9px", letterSpacing: "0.1em" }}>
            <textPath href="#seal-circle" textLength="286" lengthAdjust="spacing">AI-NATIVE · HUMAN-REVIEWED · VERIFIABLE ·</textPath>
          </text>
        </svg>
        <LogoMark className="absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2" />
      </div>
    </div>
  );
}

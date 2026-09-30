import { Info, ShieldCheck, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Notice({ children, tone = "sky", className }: { children: ReactNode; tone?: "sky" | "amber" | "teal"; className?: string }) {
  const styles = {
    sky: "border-sky/30 bg-sky-soft text-ink",
    amber: "border-amber/30 bg-amber-soft text-ink",
    teal: "border-teal/30 bg-teal-soft text-ink",
  }[tone];
  const Icon = tone === "teal" ? ShieldCheck : Info;
  return (
    <div className={cn("flex gap-3 rounded-xl border px-4 py-3 text-sm", styles, className)} role="note">
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>{children}</div>
    </div>
  );
}

/** Label shown on every AI output so users never mistake it for verified or final information. */
export function AiLabel({ confidence, className }: { confidence?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs text-ink-3", className)}>
      <Sparkles className="size-3.5 text-gold" aria-hidden />
      AI-generated — verify important details
      {typeof confidence === "number" ? <span className="ml-1 rounded bg-surface-2 px-1.5 py-0.5 font-medium text-ink-2">confidence {Math.round(confidence * 100)}%</span> : null}
    </span>
  );
}

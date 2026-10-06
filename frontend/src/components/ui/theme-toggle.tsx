"use client";

import { usePrefs } from "@/components/providers";
import { Fi } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, t } = usePrefs();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "flex size-9 sm:size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 hover:text-ink transition-colors border border-transparent hover:border-line",
        className,
      )}
      aria-label={t("nav.theme")}
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Fi name={theme === "dark" ? "sun" : "moon"} className="text-base sm:text-lg" />
    </button>
  );
}

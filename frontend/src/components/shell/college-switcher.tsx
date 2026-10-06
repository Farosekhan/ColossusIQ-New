"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { ALL_COLLEGES } from "@/config/tenancy";
import { Fi } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

const Options = z.object({
  scope: z.string(),
  colleges: z.array(z.object({ id: z.string(), name: z.string(), status: z.string(), city: z.string(), type: z.string() })),
});

/**
 * University Super Admin only: switch between "All colleges" and a single college.
 * The server re-issues the session with the new scope; every list, form and dashboard follows it.
 */
export function CollegeSwitcher({ scope }: { scope: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { data } = useQuery({ queryKey: ["college-options"], queryFn: () => apiFetch("/api/v1/colleges/options", Options) });

  const change = async (next: string) => {
    if (next === scope) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/api/v1/auth/scope", z.object({ college: z.string() }), { method: "POST", body: { college: next } });
      qc.clear(); // cached data belongs to the previous scope
      router.refresh();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Could not switch college.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="hidden items-center md:flex">
      <label htmlFor="college-scope" className="sr-only">
        College scope
      </label>
      <div className={cn("relative flex h-10 items-center rounded-xl border px-3 transition-colors", scope === ALL_COLLEGES ? "border-violet/30 bg-violet-soft" : "border-gold/40 bg-gold-soft")}>
        <Fi name={scope === ALL_COLLEGES ? "building" : "school"} className={scope === ALL_COLLEGES ? "text-violet" : "text-amber"} />
        <select
          id="college-scope"
          value={scope}
          disabled={busy || !data}
          onChange={(e) => void change(e.target.value)}
          className="h-full max-w-[220px] cursor-pointer appearance-none truncate bg-transparent pl-2 pr-6 text-sm font-medium text-ink outline-none"
          title="Switch college"
        >
          <option value={ALL_COLLEGES} className="bg-surface text-ink">
            All colleges (university)
          </option>
          {data?.colleges.map((c) => (
            <option key={c.id} value={c.id} className="bg-surface text-ink">
              {c.name}
              {c.status !== "Active" ? ` · ${c.status}` : ""}
            </option>
          ))}
        </select>
        <Fi name="angle-small-down" className="pointer-events-none absolute right-2.5 text-ink-3" />
      </div>
      {error ? (
        <span className="ml-2 text-xs text-rose" role="alert">
          {error}
        </span>
      ) : null}
    </div>
  );
}

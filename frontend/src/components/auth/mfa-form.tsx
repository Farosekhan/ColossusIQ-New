"use client";

import { ShieldCheck } from "lucide-react";
import { useRef, useState, useSyncExternalStore } from "react";
import { z } from "zod";
import { apiFetch, ApiError } from "@/lib/api/client";
import { safeNextPath } from "@/lib/security/redirect";
import { roleForPath } from "@/lib/auth/routes";
import { Button, Spinner } from "@/components/ui/primitives";
import { Notice } from "@/components/ui/notices";

const noSubscribe = () => () => {};
function readDemoHint(): boolean {
  try {
    return sessionStorage.getItem("ciq_mfa_hint") !== "authenticator";
  } catch {
    return true;
  }
}

export function MfaForm() {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  // Set by the sign-in form from the server's answer: accounts with an authenticator never see the demo code.
  const showDemo = useSyncExternalStore(noSubscribe, readDemoHint, () => false);

  const setDigit = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      // Pasted code
      const next = clean.slice(0, 6).split("");
      setDigits((d) => d.map((_, j) => next[j] ?? ""));
      refs.current[Math.min(next.length, 5)]?.focus();
      return;
    }
    setDigits((d) => d.map((x, j) => (j === i ? clean : x)));
    if (clean && i < 5) refs.current[i + 1]?.focus();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join("");
    if (!/^\d{6}$/.test(code)) return setError("Enter all 6 digits.");
    setBusy(true);
    setError(null);
    try {
      const res = await apiFetch("/api/v1/auth/mfa/verify", z.object({ redirect: z.string() }), { method: "POST", body: { code } });
      const home = safeNextPath(res.redirect, "/");
      let target = home;
      try {
        const stored = sessionStorage.getItem("ciq_next");
        sessionStorage.removeItem("ciq_next");
        const next = safeNextPath(stored, "");
        // Only honour `next` if it points inside the user's own portal.
        if (next && roleForPath(next) === roleForPath(home)) target = next;
      } catch {
        /* storage unavailable */
      }
      window.location.replace(target);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Verification failed.");
      setDigits(Array(6).fill(""));
      refs.current[0]?.focus();
      setBusy(false);
    }
  };

  return (
    <div>
      <span className="flex size-12 items-center justify-center rounded-xl bg-teal-soft text-teal">
        <ShieldCheck className="size-6" />
      </span>
      <h1 className="mt-5 text-3xl font-semibold text-ink">Verify it&apos;s you</h1>
      <p className="mt-2 text-sm text-ink-2">Enter the 6-digit code from your authenticator app.</p>
      {showDemo ? (
        <Notice tone="amber" className="mt-6">
          Demo code: <strong className="font-mono">246810</strong>
        </Notice>
      ) : null}
      <form onSubmit={submit} className="mt-6 space-y-5">
        <fieldset>
          <legend className="sr-only">One-time code</legend>
          <div className="flex justify-between gap-2">
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
                }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                maxLength={6}
                aria-label={`Digit ${i + 1}`}
                className="h-14 w-full rounded-xl border border-line bg-surface text-center font-mono text-xl text-ink focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                autoFocus={i === 0}
              />
            ))}
          </div>
        </fieldset>
        {error ? (
          <p className="rounded-lg bg-rose-soft px-3 py-2 text-sm text-rose" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? <Spinner /> : null} Verify and continue
        </Button>
        <p className="text-center text-xs text-ink-3">After 5 failed attempts verification is locked for 10 minutes.</p>
      </form>
    </div>
  );
}

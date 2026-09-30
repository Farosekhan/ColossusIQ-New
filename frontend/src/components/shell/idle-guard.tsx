"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { z } from "zod";
import { usePrefs } from "@/components/providers";
import { Button } from "@/components/ui/primitives";
import { apiFetch } from "@/lib/api/client";
import { listenForLogout, signOut } from "@/lib/auth/client";

const IDLE_MS = 30 * 60_000; // matches the tenant's "idle session timeout" policy
const WARN_MS = 2 * 60_000;

/** Signs the user out after inactivity (shared/lab computers are common on campuses) and syncs logout across tabs. */
export function IdleGuard({ loginPath = "/login" }: { loginPath?: string }) {
  const { t } = usePrefs();
  const [warning, setWarning] = useState(false);
  const last = useRef(0);

  const bump = useCallback(() => {
    last.current = Date.now();
  }, []);

  useEffect(() => {
    last.current = Date.now();
    const events = ["mousemove", "keydown", "pointerdown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    const timer = setInterval(() => {
      const idle = Date.now() - last.current;
      if (idle >= IDLE_MS) void signOut("idle", loginPath);
      else setWarning(idle >= IDLE_MS - WARN_MS);
    }, 15_000);
    const stop = listenForLogout(() => window.location.replace(`${loginPath}?reason=signed-out`));
    return () => {
      events.forEach((e) => window.removeEventListener(e, bump));
      clearInterval(timer);
      stop();
    };
  }, [bump, loginPath]);

  if (!warning) return null;
  return (
    <div className="fixed bottom-4 left-1/2 z-[70] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 rounded-xl border border-amber/40 bg-surface p-4 shadow-card" role="alertdialog" aria-live="assertive">
      <p className="text-sm text-ink">{t("session.expiring")}</p>
      <div className="mt-3 flex justify-end">
        <Button
          size="sm"
          onClick={() => {
            bump();
            setWarning(false);
            void apiFetch("/api/v1/auth/refresh", z.object({ ok: z.literal(true) }), { method: "POST" }).catch(() => undefined);
          }}
        >
          {t("session.stay")}
        </Button>
      </div>
    </div>
  );
}

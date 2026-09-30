"use client";

import { apiFetch } from "@/lib/api/client";
import { z } from "zod";

const CHANNEL = "ciq-auth";

/** Signs out on the server, then tells every other open tab to leave authenticated pages. */
export async function signOut(reason: "user" | "idle" = "user", loginPath = "/login") {
  try {
    await apiFetch("/api/v1/auth/logout", z.object({ ok: z.literal(true) }), { method: "POST" });
  } catch {
    /* even if the call fails, leave the portal */
  }
  try {
    const bc = new BroadcastChannel(CHANNEL);
    bc.postMessage({ type: "logout" });
    bc.close();
  } catch {
    /* BroadcastChannel unsupported */
  }
  const path = /^\/(login|colleges\/COL-\d{4}\/login)$/.test(loginPath) ? loginPath : "/login";
  window.location.replace(`${path}?reason=${reason === "idle" ? "idle" : "signed-out"}`);
}

export function listenForLogout(onLogout: () => void): () => void {
  let bc: BroadcastChannel | null = null;
  try {
    bc = new BroadcastChannel(CHANNEL);
    bc.onmessage = (e: MessageEvent<{ type?: string }>) => {
      if (e.data?.type === "logout") onLogout();
    };
  } catch {
    bc = null;
  }
  return () => bc?.close();
}

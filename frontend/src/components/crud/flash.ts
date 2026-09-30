"use client";

import { useSyncExternalStore } from "react";

/*
 * One-shot success message that survives a client-side navigation (e.g. "Application created").
 * In-memory only (never persisted), text only (never HTML). Auto-dismisses after a few seconds.
 */
let current: string | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function setFlash(message: string) {
  current = message.slice(0, 200);
  if (timer) clearTimeout(timer);
  timer = setTimeout(clearFlash, 6000);
  emit();
}

export function clearFlash() {
  current = null;
  emit();
}

export function useFlash(): string | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
    () => null,
  );
}

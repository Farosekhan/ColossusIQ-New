/** Sliding-window limiter used to throttle AI prompts client-side (the server enforces real limits). */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits: number[] = [];
  return {
    tryAcquire(now = Date.now()): boolean {
      while (hits.length && now - (hits[0] ?? 0) >= windowMs) hits.shift();
      if (hits.length >= limit) return false;
      hits.push(now);
      return true;
    },
    retryAfterMs(now = Date.now()): number {
      if (hits.length < limit) return 0;
      return Math.max(0, windowMs - (now - (hits[0] ?? now)));
    },
  };
}

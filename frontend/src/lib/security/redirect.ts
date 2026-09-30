/**
 * Open-redirect guard for `?next=` parameters.
 * Only same-origin absolute *paths* are allowed ("/student/courses") — never protocol-relative
 * ("//evil.com"), backslash tricks ("/\evil.com"), encoded slashes, or full URLs.
 */
export function safeNextPath(next: string | null | undefined, fallback = "/"): string {
  if (!next || typeof next !== "string") return fallback;
  if (next.length > 512) return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f\u007f]/.test(next)) return fallback;
  if (/^\/(%2f|%5c)/i.test(next)) return fallback;
  try {
    const url = new URL(next, "https://placeholder.local");
    if (url.origin !== "https://placeholder.local") return fallback;
    return url.pathname + url.search + url.hash;
  } catch {
    return fallback;
  }
}

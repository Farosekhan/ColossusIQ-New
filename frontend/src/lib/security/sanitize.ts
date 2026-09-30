// Zero-width and bidi-override characters (built from code points to keep this source file ASCII-only).
const cp = (n: number) => String.fromCharCode(n);
// eslint-disable-next-line security/detect-non-literal-regexp -- built from constant code points
const INVISIBLE_CHARS = new RegExp(`[${cp(0x200b)}-${cp(0x200f)}${cp(0x202a)}-${cp(0x202e)}${cp(0x2066)}-${cp(0x2069)}]`, "g");

/** Normalises free text before it is sent to the API (defence-in-depth; React already escapes on render). */
export function cleanText(input: string, maxLength = 4000): string {
  return (
    input
      .normalize("NFKC")
      .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "")
      .replace(INVISIBLE_CHARS, "") // zero-width & bidi overrides
      .trim()
      .slice(0, maxLength)
  );
}

/** Masks all but the last `visible` characters, e.g. roll numbers or phone numbers in shared views. */
export function mask(value: string, visible = 4): string {
  if (value.length <= visible) return "•".repeat(value.length);
  return "•".repeat(value.length - visible) + value.slice(-visible);
}

export function maskEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!user || !domain) return mask(email);
  return `${user.slice(0, 1)}${"•".repeat(Math.max(user.length - 1, 2))}@${domain}`;
}

/** Only allow relative paths and http(s)/mailto links in rendered content. */
export function isSafeHref(href: string | undefined | null): boolean {
  if (!href) return false;
  if (href.startsWith("/") && !href.startsWith("//") && !href.startsWith("/\\")) return true;
  try {
    const url = new URL(href);
    return ["http:", "https:", "mailto:"].includes(url.protocol);
  } catch {
    return false;
  }
}

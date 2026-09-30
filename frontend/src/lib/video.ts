/*
 * Reference videos and links for course lessons. Shared by the browser and the API so both apply the same rules:
 * https only, a short allow-list of educational hosts, and YouTube embedded through youtube-nocookie.
 */

const YT_ID = /^[A-Za-z0-9_-]{11}$/;
const YT_HOSTS = new Set(["www.youtube.com", "youtube.com", "m.youtube.com", "youtu.be", "www.youtube-nocookie.com"]);
const VIDEO_LINK_HOSTS = new Set(["nptel.ac.in", "www.nptel.ac.in", "onlinecourses.nptel.ac.in", "swayam.gov.in", "www.swayam.gov.in", "onlinecourses.swayam2.ac.in", "www.khanacademy.org"]);
const REFERENCE_HOSTS = new Set([...YT_HOSTS, ...VIDEO_LINK_HOSTS, "en.wikipedia.org", "www.w3schools.com", "docs.python.org", "www.who.int"]);

function httpsUrl(raw: string): URL | null {
  try {
    const u = new URL(raw.trim());
    return u.protocol === "https:" && !u.username && !u.password ? u : null;
  } catch {
    return null;
  }
}

export type ParsedVideo = { kind: "youtube"; id: string; url: string } | { kind: "link"; url: string };

/** YouTube → embeddable id; NPTEL / SWAYAM / Khan Academy → plain link; anything else → null. */
export function parseVideoUrl(raw: string): ParsedVideo | null {
  const u = httpsUrl(raw);
  if (!u) return null;
  if (YT_HOSTS.has(u.hostname)) {
    let id: string | null = null;
    if (u.hostname === "youtu.be") id = u.pathname.slice(1).split("/")[0] ?? null;
    else if (u.pathname === "/watch") id = u.searchParams.get("v");
    else {
      const m = /^\/(?:embed|shorts|live)\/([^/?#]+)/.exec(u.pathname);
      id = m?.[1] ?? null;
    }
    return id && YT_ID.test(id) ? { kind: "youtube", id, url: `https://www.youtube.com/watch?v=${id}` } : null;
  }
  return VIDEO_LINK_HOSTS.has(u.hostname) ? { kind: "link", url: u.toString() } : null;
}

export function youtubeEmbed(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`;
}

/** Links shown under "Watch & read" (search pages and trusted references only). */
export function isReferenceUrl(raw: string): boolean {
  const u = httpsUrl(raw);
  return Boolean(u && REFERENCE_HOSTS.has(u.hostname));
}

export function hostLabel(raw: string): string {
  const u = httpsUrl(raw);
  if (!u) return "";
  if (YT_HOSTS.has(u.hostname)) return "YouTube";
  if (u.hostname.includes("nptel")) return "NPTEL";
  if (u.hostname.includes("swayam")) return "SWAYAM";
  if (u.hostname.includes("wikipedia")) return "Wikipedia";
  if (u.hostname.includes("khanacademy")) return "Khan Academy";
  return u.hostname.replace(/^www\./, "");
}

import "server-only";
import type { z } from "zod";

/*
 * Minimal server-side client for the Gemini API (Google AI Studio key).
 * The key is read from GEMINI_API_KEY and never leaves the server. Every call asks for JSON and is
 * validated against a zod schema, so a malformed or hostile model reply can never reach the database.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";
const DEFAULT_MODEL = "gemini-2.5-flash";

export function geminiModel(): string {
  const m = (process.env.GEMINI_MODEL ?? "").trim();
  return /^[a-z0-9.\-]{3,60}$/i.test(m) ? m : DEFAULT_MODEL;
}

/** True when a key is configured. Always false under tests so generation stays deterministic. */
export function geminiEnabled(): boolean {
  if (process.env.VITEST || process.env.NODE_ENV === "test") return false;
  if (process.env.COURSE_AI === "off") return false;
  return (process.env.GEMINI_API_KEY ?? "").trim().length > 20;
}

export type GeminiResult<T> = { ok: true; data: T } | { ok: false; reason: string };

interface Options {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
  /** Forces enabled-ness in unit tests that mock fetch. */
  force?: boolean;
}

/** Tolerates a model wrapping its JSON in a ```json fence. */
function parseJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  return JSON.parse(t);
}

async function once(opts: Options): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const key = (process.env.GEMINI_API_KEY ?? "").trim();
  if (!key) return { ok: false, reason: "no_key" };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 60_000);
  try {
    const res = await fetch(`${ENDPOINT}/${geminiModel()}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
        generationConfig: { temperature: opts.temperature ?? 0.4, maxOutputTokens: opts.maxOutputTokens ?? 8192, responseMimeType: "application/json" },
      }),
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, reason: `http_${res.status}` };
    const body = (await res.json()) as {
      promptFeedback?: { blockReason?: string };
      candidates?: Array<{ finishReason?: string; content?: { parts?: Array<{ text?: string }> } }>;
    };
    if (body.promptFeedback?.blockReason) return { ok: false, reason: "blocked" };
    const cand = body.candidates?.[0];
    const text = (cand?.content?.parts ?? []).map((p) => p.text ?? "").join("");
    if (!text) return { ok: false, reason: cand?.finishReason ? `empty_${cand.finishReason}` : "empty" };
    if (cand?.finishReason === "MAX_TOKENS") return { ok: false, reason: "truncated" };
    return { ok: true, text };
  } catch (e) {
    return { ok: false, reason: (e as Error).name === "AbortError" ? "timeout" : "network" };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Asks Gemini for JSON and validates it. Retries once on a malformed reply or a transient error.
 * Never throws: callers fall back to the built-in templates on `ok: false`.
 */
export async function geminiJson<S extends z.ZodTypeAny>(schema: S, opts: Options): Promise<GeminiResult<z.infer<S>>> {
  if (!opts.force && !geminiEnabled()) return { ok: false, reason: "disabled" };
  let last = "unknown";
  for (let attempt = 0; attempt < 2; attempt++) {
    const r = await once(opts);
    if (!r.ok) {
      last = r.reason;
      if (["no_key", "blocked", "timeout", "truncated", "http_400", "http_401", "http_403", "http_404"].includes(r.reason)) break; // retrying will not help
      if (r.reason === "http_429" || r.reason === "http_503") await new Promise((res) => setTimeout(res, 3000)); // rate-limited or overloaded: brief back-off
      continue;
    }
    try {
      const parsed = schema.safeParse(parseJson(r.text));
      if (parsed.success) return { ok: true, data: parsed.data };
      last = "schema";
    } catch {
      last = "json";
    }
  }
  console.warn(`[gemini] request failed: ${last}`); // reason code only — never the key or the content
  return { ok: false, reason: last };
}

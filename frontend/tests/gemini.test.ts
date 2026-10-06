import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

vi.mock("server-only", () => ({}));

import { geminiEnabled, geminiJson, geminiModel } from "@/lib/ai/gemini";

const Schema = z.object({ items: z.array(z.string()).min(1) });
const reply = (text: string, extra: Record<string, unknown> = {}) => ({ ok: true, status: 200, json: async () => ({ candidates: [{ finishReason: "STOP", content: { parts: [{ text }] }, ...extra }] }) });
const opts = { system: "sys", prompt: "go", force: true };

describe("gemini client", () => {
  const fetchMock = vi.fn();
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test-key-test-key-test-key-1234";
    delete process.env.GEMINI_MODEL;
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });
  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("is off under tests so generation stays deterministic", () => {
    expect(geminiEnabled()).toBe(false);
  });

  it("sends the key in a header (never the URL), asks for JSON and validates the reply", async () => {
    fetchMock.mockResolvedValueOnce(reply('```json\n{"items":["a","b"]}\n```'));
    const r = await geminiJson(Schema, opts);
    expect(r).toEqual({ ok: true, data: { items: ["a", "b"] } });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(String(url)).toContain(`models/${geminiModel()}:generateContent`);
    expect(String(url)).not.toContain("key");
    expect((init as RequestInit).headers).toMatchObject({ "x-goog-api-key": "test-key-test-key-test-key-1234" });
    expect(JSON.parse(String((init as RequestInit).body)).generationConfig.responseMimeType).toBe("application/json");
  });

  it("retries once on malformed JSON, then succeeds", async () => {
    fetchMock.mockResolvedValueOnce(reply("not json")).mockResolvedValueOnce(reply('{"items":["ok"]}'));
    expect((await geminiJson(Schema, opts)).ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("rejects replies that do not match the schema", async () => {
    fetchMock.mockResolvedValue(reply('{"items":[]}'));
    expect(await geminiJson(Schema, opts)).toEqual({ ok: false, reason: "schema" });
  });

  it("does not retry auth errors, truncated replies or blocked prompts", async () => {
    fetchMock.mockResolvedValueOnce({ ok: false, status: 403, json: async () => ({}) });
    expect(await geminiJson(Schema, opts)).toEqual({ ok: false, reason: "http_403" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(reply('{"items":["x"', { finishReason: "MAX_TOKENS" }));
    expect((await geminiJson(Schema, opts)).ok).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("never throws on a network failure", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    expect(await geminiJson(Schema, opts)).toEqual({ ok: false, reason: "network" });
  });

  it("is disabled without force while running tests", async () => {
    expect(await geminiJson(Schema, { system: "s", prompt: "p" })).toEqual({ ok: false, reason: "disabled" });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { RESOURCES, WEBSITE, recordSchema } from "@/config/resources";
import { mediaUrl } from "@/lib/media";
import { getMedia, saveMedia } from "@/lib/api/mock/media";
import { dispatch } from "@/lib/api/mock/router";
import { getSite, publicCollegeDirectory, publicCollegePage } from "@/lib/api/mock/website";
import type { SessionPayload } from "@/lib/auth/session";

const as = (role: SessionPayload["role"], college: string): SessionPayload => ({ sub: `${role}-${college}`, role, name: "Tester", tenant: "uni-tntu", college, mfa: true, exp: 9e9 });
const q = new URLSearchParams();

// 1×1 transparent PNG
const PNG_1x1 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>').toString("base64");

describe("image uploads", () => {
  it("accepts a real PNG and serves it back", async () => {
    const r = await saveMedia("image/png", PNG_1x1, "COL-1001", "tester");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.id).toMatch(/^MED-[a-f0-9]{24}$/);
      expect((await getMedia(r.id))?.contentType).toBe("image/png");
    }
  });
  it("rejects SVG, disguised files and non-base64 data", async () => {
    expect((await saveMedia("image/svg+xml", SVG, null, "t")).ok).toBe(false);
    expect((await saveMedia("image/png", SVG, null, "t")).ok).toBe(false);
    expect((await saveMedia("image/jpeg", PNG_1x1, null, "t")).ok).toBe(false);
    expect((await saveMedia("image/png", "not base64 !!!", null, "t")).ok).toBe(false);
  });
  it("rejects images over 2 MB", async () => {
    const big = Buffer.concat([Buffer.from(PNG_1x1, "base64"), Buffer.alloc(2 * 1024 * 1024)]).toString("base64");
    expect((await saveMedia("image/png", big, null, "t")).ok).toBe(false);
  });
  it("only resolves safe image references", async () => {
    expect(mediaUrl("/campus/campus.svg")).toBe("/campus/campus.svg");
    expect(mediaUrl("MED-0123456789abcdef01234567")).toBe("/api/v1/public/media/MED-0123456789abcdef01234567");
    expect(mediaUrl("https://evil.example/x.png")).toBeNull();
    expect(mediaUrl("javascript:alert(1)")).toBeNull();
    expect(mediaUrl("/campus/../../etc/passwd.svg")).toBeNull();
  });
});

describe("college website", () => {
  it("rejects external image URLs in the website schema", async () => {
    const site = (await getSite("COL-1001"))!;
    const data = Object.fromEntries(WEBSITE.fields.map((f) => [f.name, site[f.name]]));
    expect(recordSchema(WEBSITE).safeParse(data).success).toBe(true);
    expect(recordSchema(WEBSITE).safeParse({ ...data, heroImage: "https://evil.example/x.png" }).success).toBe(false);
  });
  it("public pages exist only for active colleges", async () => {
    expect((await publicCollegePage("COL-1006"))?.college.stream).toBe("medical");
    expect((await publicCollegePage("COL-1005"))).toBeNull(); // onboarding
    expect((await publicCollegePage("COL-9999"))).toBeNull();
    expect((await publicCollegeDirectory()).some((c) => c.id === "COL-1005")).toBe(false);
  });
  it("shows only published gallery photos and upcoming published events", async () => {
    const page = (await publicCollegePage("COL-1001"))!;
    const all = ((await dispatch("GET", ["records", "gallery"], undefined, as("institution", "COL-1001"), new URLSearchParams({ pageSize: "50" }))).body as { items: Array<{ id: string; status: string }> }).items;
    const drafts = all.filter((g) => g.status === "Draft").map((g) => g.id);
    expect(drafts.length).toBeGreaterThan(0);
    expect(page.gallery.some((g) => drafts.includes(g.id))).toBe(false);
    const today = new Date().toISOString().slice(0, 10);
    expect(page.events.every((e) => e.date >= today)).toBe(true);
  });
  it("programmes on the page follow the college's stream", async () => {
    expect((await publicCollegePage("COL-1006"))!.programs).toContain("MBBS");
    expect((await publicCollegePage("COL-1007"))!.programs).not.toContain("MBBS");
    expect((await publicCollegePage("COL-1002"))!.programs).toContain("B.Com");
  });
  it("gallery management is limited to the college's own principal", async () => {
    expect((await dispatch("GET", ["records", "gallery"], undefined, as("student", "COL-1001"), q)).status).toBe(403);
    const mine = (await dispatch("GET", ["records", "gallery"], undefined, as("institution", "COL-1002"), new URLSearchParams({ pageSize: "50" }))).body as { items: Array<{ collegeId: string }> };
    expect(mine.items.every((g) => g.collegeId === "COL-1002")).toBe(true);
    expect(RESOURCES.gallery!.scoped).toBe(true);
  });
});

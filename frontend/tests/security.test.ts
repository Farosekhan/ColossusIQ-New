import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/security/redirect";
import { cleanText, isSafeHref, mask, maskEmail } from "@/lib/security/sanitize";
import { validateUpload } from "@/lib/security/upload";
import { createRateLimiter } from "@/lib/security/throttle";
import { can } from "@/lib/auth/roles";
import { roleForPath } from "@/lib/auth/routes";

describe("safeNextPath (open-redirect guard)", () => {
  it("allows same-origin paths", async () => {
    expect(safeNextPath("/student/courses?id=dbms")).toBe("/student/courses?id=dbms");
  });
  it.each([
    "https://evil.com",
    "//evil.com",
    "/\\evil.com",
    "javascript:alert(1)",
    "/%2f%2fevil.com",
    "/%5cevil.com",
    "\\\\evil.com",
    "/student\u0000",
    "",
    null,
    undefined,
  ])("rejects %s", (bad) => {
    expect(safeNextPath(bad as string, "/fallback")).toBe("/fallback");
  });
});

describe("sanitisation helpers", () => {
  it("strips control, zero-width and bidi characters and trims", async () => {
    const zw = String.fromCharCode(0x200b);
    const rlo = String.fromCharCode(0x202e);
    expect(cleanText(`  hi${zw}\u0007there${rlo}  `)).toBe("hithere");
  });
  it("enforces max length", async () => {
    expect(cleanText("a".repeat(50), 10)).toHaveLength(10);
  });
  it("masks identifiers", async () => {
    expect(mask("21CS1014")).toBe("••••1014");
    expect(maskEmail("anand@ait.edu.in")).toBe("a••••@ait.edu.in");
  });
  it("only allows safe link protocols", async () => {
    expect(isSafeHref("https://example.org")).toBe(true);
    expect(isSafeHref("/student")).toBe(true);
    expect(isSafeHref("javascript:alert(1)")).toBe(false);
    expect(isSafeHref("data:text/html,x")).toBe(false);
    expect(isSafeHref("//evil.com")).toBe(false);
  });
});

function fakeFile(name: string, type: string, bytes: number[], size = bytes.length) {
  const buf = new Uint8Array(bytes);
  return { name, type, size, slice: (s: number, e: number) => ({ arrayBuffer: async () => buf.slice(s, e).buffer }) };
}

describe("validateUpload", () => {
  const PDF = [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31];
  it("accepts a real PDF", async () => {
    expect(await validateUpload(fakeFile("sheet.pdf", "application/pdf", PDF), "answer-sheet")).toEqual({ ok: true });
  });
  it("rejects a renamed executable", async () => {
    const res = await validateUpload(fakeFile("sheet.pdf", "application/pdf", [0x4d, 0x5a, 0x90, 0x00]), "answer-sheet");
    expect(res.ok).toBe(false);
  });
  it("rejects disallowed MIME types", async () => {
    const res = await validateUpload(fakeFile("x.html", "text/html", [0x3c]), "answer-sheet");
    expect(res.ok).toBe(false);
  });
  it("rejects mismatched extensions and oversize files", async () => {
    expect((await validateUpload(fakeFile("sheet.exe", "application/pdf", PDF), "answer-sheet")).ok).toBe(false);
    expect((await validateUpload(fakeFile("cv.pdf", "application/pdf", PDF, 6 * 1024 * 1024), "resume")).ok).toBe(false);
  });
});

describe("rate limiter", () => {
  it("blocks after the limit within the window", async () => {
    const rl = createRateLimiter(2, 1000);
    expect(rl.tryAcquire(0)).toBe(true);
    expect(rl.tryAcquire(10)).toBe(true);
    expect(rl.tryAcquire(20)).toBe(false);
    expect(rl.tryAcquire(1001)).toBe(true);
  });
});

describe("RBAC", () => {
  it("only lets faculty-type roles override scores", async () => {
    expect(can("faculty", "assessment:override-score")).toBe(true);
    expect(can("student", "assessment:override-score")).toBe(false);
    expect(can("recruiter", "ai:chat")).toBe(false);
  });
  it("maps paths to portal roles", async () => {
    expect(roleForPath("/admin/colleges")).toBe("admin");
    expect(roleForPath("/pricing")).toBeNull();
  });
});

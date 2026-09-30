import { describe, expect, it } from "vitest";
import { safeEqual, signSession, verifySession, type SessionPayload } from "@/lib/auth/session";

const SECRET = "x".repeat(40);
const base: SessionPayload = { sub: "u1", role: "student", name: "Anand", tenant: "t1", college: "COL-1001", mfa: true, exp: 2_000_000_000 };

describe("session tokens", () => {
  it("round-trips a valid token", async () => {
    const token = await signSession(base, SECRET);
    expect(await verifySession(token, SECRET, 1_000)).toMatchObject({ sub: "u1", role: "student" });
  });

  it("rejects a tampered payload (privilege escalation attempt)", async () => {
    const token = await signSession(base, SECRET);
    const [body, sig] = token.split(".") as [string, string];
    const json = JSON.parse(Buffer.from(body, "base64url").toString());
    json.role = "admin";
    const forged = `${Buffer.from(JSON.stringify(json)).toString("base64url")}.${sig}`;
    expect(await verifySession(forged, SECRET, 1_000)).toBeNull();
  });

  it("rejects tokens signed with another secret", async () => {
    const token = await signSession(base, "y".repeat(40));
    expect(await verifySession(token, SECRET, 1_000)).toBeNull();
  });

  it("rejects expired tokens and garbage", async () => {
    const token = await signSession({ ...base, exp: 500 }, SECRET);
    expect(await verifySession(token, SECRET, 1_000)).toBeNull();
    expect(await verifySession("not-a-token", SECRET)).toBeNull();
    expect(await verifySession("", SECRET)).toBeNull();
  });

  it("rejects unknown roles even with a valid signature", async () => {
    const token = await signSession({ ...base, role: "superuser" as never }, SECRET);
    expect(await verifySession(token, SECRET, 1_000)).toBeNull();
  });

  it("only the Super Admin may hold the all-colleges scope", async () => {
    const forged = await signSession({ ...base, college: "all" }, SECRET);
    expect(await verifySession(forged, SECRET, 1_000)).toBeNull();
    const admin = await signSession({ ...base, role: "admin", college: "all" }, SECRET);
    expect(await verifySession(admin, SECRET, 1_000)).not.toBeNull();
    const bad = await signSession({ ...base, college: "../COL" }, SECRET);
    expect(await verifySession(bad, SECRET, 1_000)).toBeNull();
  });

  it("compares CSRF tokens safely", async () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

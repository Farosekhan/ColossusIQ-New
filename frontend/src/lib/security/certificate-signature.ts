import { createHmac } from "node:crypto";

/*
 * Certificate signatures: HMAC-SHA256 over the printed fields, keyed from SESSION_SECRET
 * (base64url, 43 characters). Shared by the API and db/scripts/dev-accounts.ts.
 */

export interface SignedFields {
  id: string;
  kind: string;
  studentName: string;
  collegeId: string;
  title: string;
  marks: number;
  total: number;
  percentage: number;
  grade: string;
  issuedAt: string;
}

export function certificateKey(): string {
  const k = process.env.SESSION_SECRET;
  if (k && k.length >= 32) return `cert:${k}`;
  if (process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is required to sign certificates");
  return "cert:dev-only-signing-key-do-not-use-in-production";
}

export function signCertificateFields(c: SignedFields): string {
  const payload = [c.id, c.kind, c.studentName, c.collegeId, c.title, c.marks, c.total, c.percentage, c.grade, c.issuedAt].join("|");
  return createHmac("sha256", certificateKey()).update(payload).digest("base64url");
}

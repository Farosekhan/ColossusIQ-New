/*
 * Local development helper for the PostgreSQL backend (never run against production).
 *
 *   npm run db:dev-accounts                      set DEV_PASSWORD for every seeded account, re-sign
 *                                                seeded certificates with SESSION_SECRET, list sign-ins
 *   npm run db:dev-accounts -- --totp <email>    also enrol an authenticator for that account and
 *                                                print its otpauth:// URI (needs MFA_ENCRYPTION_KEY)
 *
 * Reads .env (DATABASE_URL, DEV_PASSWORD, SESSION_SECRET, MFA_ENCRYPTION_KEY). Connects as the
 * DATABASE_URL role directly (no row-level security context): this is an admin tool.
 */
import { existsSync } from "node:fs";
import { hash } from "@node-rs/argon2";
import { PrismaClient } from "@prisma/client";
import { signCertificateFields } from "../../src/lib/security/certificate-signature";
import { encryptSecret, newTotpSecret, otpauthUri } from "../../src/lib/auth/totp";

if (existsSync(".env")) process.loadEnvFile(".env");

const ARGON2 = { memoryCost: 19_456, timeCost: 2, parallelism: 1 } as const;

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("dev-accounts is for local development only.");
  const password = process.env.DEV_PASSWORD ?? "";
  if (password.length < 8) throw new Error("Set DEV_PASSWORD (8+ characters) in .env first.");
  const totpFor = process.argv.includes("--totp") ? process.argv[process.argv.indexOf("--totp") + 1] : undefined;

  const db = new PrismaClient();
  try {
    // 1. Passwords
    const users = await db.user.findMany({ include: { roleAssignments: { include: { college: { select: { publicId: true, name: true } } } } }, orderBy: { email: "asc" } });
    const passwordHash = await hash(password, ARGON2);
    for (const u of users) {
      await db.userCredential.upsert({
        where: { userId: u.id },
        create: { userId: u.id, passwordHash },
        update: { passwordHash, failedAttempts: 0, lockedUntil: null },
      });
    }
    await db.user.updateMany({ where: { status: "Invited" }, data: { status: "Active" } });

    // 2. Certificates signed with this installation's key (the seed cannot know SESSION_SECRET)
    const certs = await db.certificate.findMany({ where: { supersededAt: null }, include: { college: { select: { publicId: true } } } });
    for (const c of certs) {
      const signature = signCertificateFields({
        id: c.publicId,
        kind: c.kind,
        studentName: c.studentName,
        collegeId: c.college.publicId,
        title: c.title,
        marks: c.marks,
        total: c.total,
        percentage: Number(c.percentage),
        grade: c.grade === "A_plus" ? "A+" : c.grade,
        issuedAt: c.issuedAt.toISOString(),
      });
      await db.certificate.update({ where: { id: c.id }, data: { signature } });
    }

    // 3. Optional authenticator enrolment
    if (totpFor) {
      const u = users.find((x) => x.email.toLowerCase() === totpFor.toLowerCase());
      if (!u) throw new Error(`No account ${totpFor}`);
      const secret = newTotpSecret();
      await db.userMfa.upsert({ where: { userId: u.id }, create: { userId: u.id, totpSecretEncrypted: encryptSecret(secret) }, update: { totpSecretEncrypted: encryptSecret(secret), enabledAt: new Date() } });
      console.log(`\nAuthenticator enrolled for ${u.email}. Add this to your authenticator app:\n  ${otpauthUri(secret, u.email)}\n`);
    }

    console.log(`Password set for ${users.length} accounts; ${certs.length} certificate(s) re-signed.\n`);
    console.log("Sign in with (role · college · email):");
    for (const u of users) {
      for (const r of u.roleAssignments) console.log(`  ${r.role.padEnd(11)} ${(r.college?.publicId ?? "university").padEnd(10)} ${u.email}`);
    }
    console.log("\nMFA: accounts without an authenticator accept the demo code 246810 outside production.");
  } finally {
    await db.$disconnect();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});

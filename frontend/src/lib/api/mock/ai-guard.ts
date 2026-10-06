import "server-only";
import { ALL_COLLEGES } from "@/config/tenancy";
import { accountActive } from "@/lib/auth/accounts";
import type { SessionPayload } from "@/lib/auth/session";
import { withRequestContext } from "@/lib/data";
import { isCollegeActive } from "./records";

/**
 * AI work that runs before the request's database transaction (see the prefetch hooks) skips the checks the
 * session handler does, so repeat the cheap ones: the college and the account must still be active.
 */
export async function stillActive(session: SessionPayload): Promise<boolean> {
  return withRequestContext({ scope: session.college, sub: session.sub, readOnly: true }, async () => (session.college === ALL_COLLEGES || (await isCollegeActive(session.college))) && (await accountActive(session.sub)));
}

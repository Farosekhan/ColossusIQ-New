import "server-only";
import { getStore } from "@/lib/data";

/** Audit trail (memory: last 500 entries; postgres: the append-only audit_log table). */
export async function audit(actor: string, action: string, target: string, opts: { collegeId?: string | null; actorSub?: string | null } = {}) {
  await getStore().audit.add({ actor, action, target, ...opts });
}

export async function recentAudit(limit: number, scope?: string) {
  return getStore().audit.recent(limit, scope);
}

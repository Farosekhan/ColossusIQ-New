import "server-only";
import type { DataStore } from "./store";
import { memoryStore } from "./memory";
import { postgresStore } from "./postgres";
import { runInTransaction } from "./postgres/db";

export type { DataStore } from "./store";

export type DataBackend = "memory" | "postgres";

/** Which store the API uses: DATA_BACKEND=postgres (needs DATABASE_URL), otherwise the in-memory demo. */
export function dataBackend(): DataBackend {
  return process.env.DATA_BACKEND === "postgres" ? "postgres" : "memory";
}

export function getStore(): DataStore {
  if (dataBackend() === "memory") return memoryStore;
  if (!process.env.DATABASE_URL) throw new Error("DATA_BACKEND=postgres needs DATABASE_URL");
  return postgresStore;
}

/**
 * Who a request acts as. The postgres store runs the callback in one transaction with row-level
 * security set to this context; the memory store just runs it.
 */
export interface RequestContext {
  /** A college id, or "all" (University Super Admin; public directory; certificate verification). */
  scope: string;
  /** Signed-in user id (postgres: users.id), if any. */
  sub?: string | null;
  readOnly?: boolean;
}

export async function withRequestContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  if (dataBackend() === "memory") return fn();
  return runInTransaction(ctx, fn);
}

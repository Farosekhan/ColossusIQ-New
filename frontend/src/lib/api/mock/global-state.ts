import "server-only";

/**
 * Next.js compiles route handlers and server components into separate bundles, so a plain
 * module-level `const store = new Map()` would exist once per bundle — pages and the API would
 * disagree (e.g. a college suspended via the API would still look active to a page).
 * Mock state therefore lives on one process-wide object. (A real deployment uses a database.)
 */
const bag = globalThis as unknown as { __ciqMockState?: Map<string, unknown> };

export function sharedState<T>(key: string, init: () => T): T {
  bag.__ciqMockState ??= new Map();
  if (!bag.__ciqMockState.has(key)) bag.__ciqMockState.set(key, init());
  return bag.__ciqMockState.get(key) as T;
}

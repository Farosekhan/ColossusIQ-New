"use client";

import { ApiError } from "@/lib/api/client";
import { Button, EmptyState } from "@/components/ui/primitives";

/** Shown instead of an endless skeleton when a request fails, with a way to retry. */
export function LoadError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const message =
    error instanceof ApiError
      ? error.status === 401
        ? "Your session has ended. Sign in again to continue."
        : error.message
      : "The server could not be reached. Check that the app is running, then try again.";
  return <EmptyState title="This page could not load" body={message} action={<Button onClick={onRetry}>Try again</Button>} />;
}

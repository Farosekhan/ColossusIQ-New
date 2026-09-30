"use client";

import { Button } from "@/components/ui/primitives";

// Never render error.message/stack to users — it can leak internals. Show a digest for support instead.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main id="main" className="flex min-h-[70dvh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-2xl font-semibold text-ink">Something went wrong</h1>
        <p className="mt-2 text-ink-2">Please try again. If the problem continues, contact support{error.digest ? ` with reference ${error.digest}` : ""}.</p>
        <Button className="mt-6" onClick={reset}>
          Try again
        </Button>
      </div>
    </main>
  );
}

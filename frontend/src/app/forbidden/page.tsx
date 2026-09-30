import type { Metadata } from "next";
import { ShieldAlert } from "lucide-react";
import { LinkButton } from "@/components/ui/primitives";
import { getSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Access denied", robots: { index: false } };

export default async function ForbiddenPage() {
  const session = await getSession();
  return (
    <main id="main" className="bg-notebook flex min-h-dvh items-center justify-center px-4">
      <div className="max-w-md text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-rose-soft text-rose">
          <ShieldAlert className="size-7" />
        </span>
        <h1 className="mt-5 text-3xl font-semibold text-ink">Access denied</h1>
        <p className="mt-2 text-ink-2">Your account doesn&apos;t have permission to open this portal. Each role can only access its own workspace.</p>
        <div className="mt-6 flex justify-center gap-2">
          {session?.mfa ? <LinkButton href={`/${session.role}`}>Go to my portal</LinkButton> : <LinkButton href="/login">Sign in</LinkButton>}
          <LinkButton href="/" variant="secondary">
            Home
          </LinkButton>
        </div>
      </div>
    </main>
  );
}

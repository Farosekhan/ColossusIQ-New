import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthFrame } from "@/components/auth/auth-frame";
import { MfaForm } from "@/components/auth/mfa-form";
import { getSession } from "@/lib/auth/server";

export const metadata: Metadata = { title: "Verify it's you", robots: { index: false } };

export default async function MfaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.mfa) redirect(`/${session.role}`);
  return (
    <AuthFrame>
      <MfaForm />
    </AuthFrame>
  );
}

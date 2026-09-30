import type { Metadata } from "next";
import { VerifyForm } from "@/components/certificate/verify-form";
import { Fi } from "@/components/ui/icon";
import { Card } from "@/components/ui/primitives";
import { UNIVERSITY } from "@/config/tenancy";

export const metadata: Metadata = { title: "Verify a certificate" };

export default function VerifyIndexPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <Card className="p-8 text-center">
        <span className="bg-brand-gradient mx-auto flex size-14 items-center justify-center rounded-2xl text-2xl text-gold">
          <Fi name="shield-check" />
        </span>
        <h1 className="mt-4 text-2xl font-semibold text-ink">Verify a certificate</h1>
        <p className="mt-1 text-sm text-ink-2">
          Employers and admissions teams can confirm any certificate issued through {UNIVERSITY.name}. Enter the ID printed on the certificate.
        </p>
        <div className="mt-6 text-left">
          <VerifyForm />
        </div>
      </Card>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Fi } from "@/components/ui/icon";
import { Button, inputClass } from "@/components/ui/primitives";

export const CERT_ID_RE = /^CIQ-\d{4}-[A-F0-9]{8}$/;

export function VerifyForm({ initial = "" }: { initial?: string }) {
  const router = useRouter();
  const [id, setId] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        const v = id.trim().toUpperCase();
        if (!CERT_ID_RE.test(v)) {
          setError("Enter an ID like CIQ-2026-1A2B3C4D.");
          return;
        }
        setError(null);
        router.push(`/verify/${v}`);
      }}
    >
      <label htmlFor="cert-id" className="sr-only">
        Certificate ID
      </label>
      <input id="cert-id" className={inputClass} placeholder="CIQ-2026-XXXXXXXX" maxLength={20} value={id} onChange={(e) => setId(e.target.value)} aria-invalid={Boolean(error)} autoComplete="off" spellCheck={false} />
      <Button type="submit">
        <Fi name="shield-check" /> Verify
      </Button>
      {error ? (
        <p role="alert" className="text-xs text-rose sm:self-center">
          {error}
        </p>
      ) : null}
    </form>
  );
}

export function PrintButton() {
  return (
    <Button variant="secondary" onClick={() => window.print()}>
      <Fi name="print" /> Print / save as PDF
    </Button>
  );
}

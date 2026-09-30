import type { Metadata } from "next";
import { headers } from "next/headers";
import { PrintButton, VerifyForm } from "@/components/certificate/verify-form";
import { Fi } from "@/components/ui/icon";
import { LogoMark } from "@/components/ui/logo";
import { Card } from "@/components/ui/primitives";
import { UNIVERSITY } from "@/config/tenancy";
import { publicCertificate } from "@/lib/api/mock/learning";
import { rateLimit } from "@/lib/api/mock/rate-limit";
import { withRequestContext } from "@/lib/data";

export const metadata: Metadata = { title: "Certificate verification", robots: { index: false, follow: false } };

export default async function VerifyCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = decodeURIComponent(raw).toUpperCase().slice(0, 20);
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "local";
  const rl = rateLimit(`verify-page:${ip}`, process.env.NODE_ENV === "production" ? 30 : 300, 10 * 60_000);
  if (!rl.ok) return <Invalid id={id} message="Too many verification requests from your network. Please try again later." />;

  const cert = await withRequestContext({ scope: "all", readOnly: true }, () => publicCertificate(id));
  if (!cert.valid) return <Invalid id={id} message={cert.tampered ? "This certificate's record failed its signature check and must not be trusted." : "No certificate with this ID was issued by the university."} />;

  const issued = new Date(cert.issuedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 print:max-w-none print:p-0">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
        <p className="inline-flex items-center gap-2 rounded-full bg-teal-soft px-3 py-1.5 text-sm font-medium text-teal">
          <Fi name="shield-check" /> Verified — issued by {UNIVERSITY.name}
        </p>
        <PrintButton />
      </div>

      <Card className="relative overflow-hidden p-2 print:border-0 print:shadow-none">
        <div className="rounded-xl border-4 border-double border-gold/70 px-6 py-10 text-center sm:px-14">
          <div className="pointer-events-none absolute inset-0 opacity-[0.04]" aria-hidden>
            <LogoMark className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2" />
          </div>
          <LogoMark className="mx-auto size-14" />
          <p className="mt-3 text-sm font-semibold uppercase tracking-[0.2em] text-brand">{UNIVERSITY.name}</p>
          <p className="text-xs text-ink-3">{cert.collegeName}</p>
          <h1 className="mt-8 font-serif text-3xl font-semibold text-ink sm:text-4xl">Certificate of Achievement</h1>
          <p className="mt-6 text-sm text-ink-3">This is to certify that</p>
          <p className="mt-2 font-serif text-3xl text-brand sm:text-4xl">{cert.studentName}</p>
          <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-ink-2">
            {cert.kind === "course" ? (
              <>
                has successfully completed the course <b className="text-ink">{cert.course}</b>, Department of {cert.department}, and passed its final assessment, securing{" "}
              </>
            ) : (
              <>
                has successfully completed the assessment <b className="text-ink">{cert.title}</b> in <b className="text-ink">{cert.course}</b>, Department of {cert.department}, securing{" "}
              </>
            )}
            <b className="text-ink">
              {cert.marks} out of {cert.total} ({cert.percentage}%)
            </b>
            .
          </p>
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-6">
            <div className="flex size-20 flex-col items-center justify-center rounded-full border-2 border-gold bg-gold-soft text-gold">
              <span className="text-2xl font-bold">{cert.grade}</span>
              <span className="text-[10px] uppercase tracking-wide">grade</span>
            </div>
            <div className="text-left">
              <p className="text-lg font-semibold text-ink">{cert.gradeLabel}</p>
              <p className="text-xs text-ink-3">Awarded on {issued}</p>
            </div>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-10 text-xs text-ink-3 sm:px-10">
            <div>
              <div className="border-t border-ink-3/50 pt-2">Controller of Examinations</div>
            </div>
            <div>
              <div className="border-t border-ink-3/50 pt-2">Principal</div>
            </div>
          </div>
          <p className="mt-10 font-mono text-[11px] text-ink-3">
            Certificate ID {cert.id} · verify at {"/verify/"}
            {cert.id}
          </p>
        </div>
      </Card>
    </div>
  );
}

function Invalid({ id, message }: { id: string; message: string }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 sm:px-6">
      <Card className="p-8">
        <span className="flex size-12 items-center justify-center rounded-xl bg-rose-soft text-xl text-rose">
          <Fi name="cross-circle" />
        </span>
        <h1 className="mt-4 text-xl font-semibold text-ink">Not verified</h1>
        <p className="mt-1 break-all text-sm text-ink-3">ID: {id}</p>
        <p className="mt-2 text-sm text-ink-2">{message}</p>
        <div className="mt-6">
          <VerifyForm />
        </div>
      </Card>
    </div>
  );
}

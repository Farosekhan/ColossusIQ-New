import type { Metadata } from "next";
import { ApplyForm } from "@/components/marketing/apply-form";
import { Fi } from "@/components/ui/icon";

export const metadata: Metadata = { title: "Apply for admission 2026–27" };

const HIGHLIGHTS = [
  ["building", "Engineering · Medical · Arts & Science", "Every affiliated college, one form"],
  ["shield-check", "Secure & private", "Encrypted, DPDP-compliant processing"],
  ["time-past", "Track your status", "Updates by email and SMS"],
];

export default function ApplyPage() {
  return (
    <>
      <section className="bg-hero-glow relative overflow-hidden text-white">
        <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:32px_32px]" aria-hidden />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            <Fi name="user-add" /> Admissions open · 2026–27
          </span>
          <h1 className="mt-4 max-w-2xl text-4xl font-semibold leading-tight sm:text-5xl">Apply to a Tamil Nadu Technical University college</h1>
          <p className="mt-4 max-w-2xl text-white/75">Complete the online application in about 10 minutes. You&apos;ll receive an application number instantly.</p>
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {HIGHLIGHTS.map(([icon, title, body]) => (
              <div key={title} className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 ring-1 ring-white/15 backdrop-blur">
                <span className="flex size-10 items-center justify-center rounded-xl bg-gold text-lg text-[#1b2233]">
                  <Fi name={icon!} />
                </span>
                <div>
                  <p className="text-sm font-semibold">{title}</p>
                  <p className="text-xs text-white/65">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <ApplyForm />
      </div>
    </>
  );
}

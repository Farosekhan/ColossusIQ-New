import type { Metadata } from "next";
import { Mail, MapPin } from "lucide-react";
import { ContactForm } from "@/components/marketing/contact-form";
import { Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Book a demo" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
      <PageHeader eyebrow="Contact" title="Plan a pilot for your campus" description="Tell us about your institution. We usually start with one university, 2–3 colleges and 1,000–5,000 students." />
      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <Card className="p-6 sm:p-8">
          <ContactForm />
        </Card>
        <div className="space-y-4">
          <Card className="p-6">
            <Mail className="size-5 text-brand" aria-hidden />
            <p className="mt-2 font-semibold text-ink">Partnerships</p>
            <p className="text-sm text-ink-2">We reply within two working days.</p>
          </Card>
          <Card className="p-6">
            <MapPin className="size-5 text-brand" aria-hidden />
            <p className="mt-2 font-semibold text-ink">India-first</p>
            <p className="text-sm text-ink-2">Built for Indian universities, colleges and polytechnics, with data hosted in India on request.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}

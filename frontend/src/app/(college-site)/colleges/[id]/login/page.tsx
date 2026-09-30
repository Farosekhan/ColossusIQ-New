import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { COLLEGE_ID_RE } from "@/config/tenancy";
import { publicCollegePage } from "@/lib/api/mock/website";
import { withRequestContext } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { LoginForm } from "@/components/auth/login-form";
import { Fi } from "@/components/ui/icon";
import { Card } from "@/components/ui/primitives";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const page = COLLEGE_ID_RE.test(id) ? await withRequestContext({ scope: id, readOnly: true }, () => publicCollegePage(id)) : null;
  return { title: page ? `Login · ${page.college.name}` : "Login", robots: { index: false } };
}

export default async function CollegeLoginPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = COLLEGE_ID_RE.test(id) ? await withRequestContext({ scope: id, readOnly: true }, () => publicCollegePage(id)) : null;
  if (!page) notFound();
  const { college, site } = page;

  return (
    <section className="relative isolate min-h-[calc(100dvh-4rem)] overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(site.heroImage) ?? "/campus/campus.svg"} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-br from-[#0e1433]/90 via-[#1e2a5a]/80 to-[#4b3fae]/70" aria-hidden />
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 lg:grid-cols-[1fr_440px] lg:py-20">
        <div className="text-white">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
            <Fi name="shield-check" /> Secure sign-in · MFA protected
          </span>
          <h1 className="mt-4 text-3xl font-semibold sm:text-4xl">{college.name}</h1>
          <p className="mt-2 text-white/75">{site.tagline}</p>
          <ul className="mt-8 space-y-3 text-sm text-white/85">
            <li className="flex items-center gap-3">
              <Fi name="user-graduate" className="text-lg text-gold" /> Students: courses, AI mentor, exams, projects and careers
            </li>
            <li className="flex items-center gap-3">
              <Fi name="chalkboard-user" className="text-lg text-gold" /> Faculty &amp; HODs: teaching copilot, evaluation and department dashboards
            </li>
            <li className="flex items-center gap-3">
              <Fi name="building" className="text-lg text-gold" /> Principal &amp; office: admissions, staff, users and the college website
            </li>
          </ul>
          <p className="mt-8 text-xs text-white/55">You can only sign in to {college.name} here. Staff of other colleges should use their own college&apos;s login page.</p>
        </div>
        <Card className="p-6 sm:p-8">
          <Suspense>
            <LoginForm fixedCollege={{ id: college.id, name: college.name }} />
          </Suspense>
        </Card>
      </div>
    </section>
  );
}

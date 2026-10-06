import Link from "next/link";
import { Fi } from "@/components/ui/icon";
import { LinkButton } from "@/components/ui/primitives";
import { HeroCollage } from "@/components/marketing/home/hero-collage";
import { RoleSwitcher } from "@/components/marketing/home/role-switcher";
import { cn } from "@/lib/utils";

const STREAMS = [
  ["Engineering", "AICTE"],
  ["Medical & Health Sciences", "NMC"],
  ["Arts & Science", "UGC · NAAC"],
  ["Nursing & Allied Health", "INC"],
  ["Management", "AICTE"],
  ["Polytechnic", "DOTE"],
  ["Dental", "DCI"],
  ["Pharmacy", "PCI"],
];

const CHAPTERS = [
  { n: "I", title: "Learn", body: "Courses built by your own department, read lesson by lesson, with an AI mentor for the hard parts.", tags: ["My Courses", "AI Mentor", "Study planner"] },
  { n: "II", title: "Assess", body: "Timed quizzes and final assessments marked on the server. AI evaluation of written answers, always faculty-approved.", tags: ["Final assessment", "Mock tests", "Evaluation"] },
  { n: "III", title: "Certify", body: "Certificates graded by marks, signed by the university and verifiable online by anyone.", tags: ["O · A+ · A · B · C", "/verify"] },
  { n: "IV", title: "Get ready", body: "A readiness score out of 100 from quizzes, certificates, aptitude, interview and resume, with the gaps named.", tags: ["Readiness", "Mock interview", "Resume"] },
  { n: "V", title: "Get hired", body: "Placement officers shortlist by readiness; recruiters see verified skills, not just a CGPA.", tags: ["Readiness board", "Drives", "Recruiters"] },
];

const FIGURES = [
  { n: "70", sup: "+", label: "modules in one platform", note: 1 },
  { n: "30", sup: "", label: "specialised AI agents", note: 2 },
  { n: "5", sup: "", label: "academic streams, one university", note: 3 },
  { n: "100", sup: "%", label: "of AI marks reviewable by faculty", note: 4 },
];
const FOOTNOTES = [
  "Learning, assessment, career, campus life, admissions, staff, website and governance.",
  "Mentor, tutor, evaluator, interviewer, course planner and more — each with a narrow, auditable job.",
  "Engineering, medical & health sciences, arts & science, management and polytechnic, each with its own regulator rules.",
  "AI never publishes a mark on its own; overrides are audit-logged.",
];

export default function LandingPage() {
  return (
    <>
      {/* ───────────── Hero: ruled answer sheet ───────────── */}
      <section className="bg-ruled relative overflow-hidden border-b border-line">
        <div className="margin-rule pointer-events-none absolute inset-y-0 left-[max(1rem,calc(50%-41rem))] hidden md:block" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-14 sm:px-6 md:pl-16 lg:grid-cols-[1.08fr_1fr] lg:pt-20">
          <div>
            <p className="eyebrow flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-gold">Vol. 01</span>
              <span aria-hidden className="h-px w-8 bg-line" />
              The AI-native campus
              <span aria-hidden className="h-px w-8 bg-line" />
              Tamil Nadu Technical University
            </p>
            <h1 className="display mt-6 text-[clamp(2.9rem,6.6vw,5.6rem)] text-ink">
              From first lecture .
              <br />
              to{" "}
              <span className="relative inline-block whitespace-nowrap">
                <em className="text-brand">first offer</em>
                <svg className="swoosh absolute -bottom-3 left-0 h-4 w-full" viewBox="0 0 300 16" preserveAspectRatio="none" aria-hidden>
                  <path d="M3 11 C 70 3, 150 2, 297 8" fill="none" stroke="var(--gold)" strokeWidth="4" strokeLinecap="round" />
                </svg>
              </span>
              .
            </h1>
            <p className="mt-8 max-w-xl text-lg leading-relaxed text-ink-2">
              One secure platform where departments build the courses, students learn and earn verifiable certificates, and placement teams see who is ready. That covers every college in the
              university and every stream.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <LinkButton href="/login" size="lg" className="rounded-full px-7">
                Explore the live demo <Fi name="arrow-right" />
              </LinkButton>
              <LinkButton href="/colleges" size="lg" variant="secondary" className="rounded-full px-7">
                Find your college
              </LinkButton>
              <Link href="/apply" className="ml-1 inline-flex items-center gap-1.5 text-sm font-semibold text-ink underline decoration-gold decoration-2 underline-offset-4 hover:text-brand">
                Apply for admission <Fi name="arrow-up-right" />
              </Link>
            </div>
            <dl className="mt-12 grid max-w-lg grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                ["Tenant-isolated", "per college"],
                ["MFA + SSO", "sign-in"],
                ["EN · தமிழ் · हिन्दी", "interface"],
              ].map(([a, b]) => (
                <div key={a}>
                  <dt className="text-sm font-semibold text-ink">{a}</dt>
                  <dd className="eyebrow mt-1 !text-[10px]">{b}</dd>
                </div>
              ))}
            </dl>
          </div>
          <HeroCollage />
        </div>
      </section>

      {/* ───────────── Streams marquee ───────────── */}
      <section className="marquee overflow-hidden border-b border-[#0b1130] bg-[#141d42] py-4 text-white" aria-label="Streams supported">
        <div className="animate-marquee flex w-max">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 || undefined}>
              {STREAMS.map(([s, r]) => (
                <li key={`${copy}-${s}`} className="flex items-center gap-3 px-7">
                  <span className="display-italic font-display text-xl text-white/95">{s}</span>
                  <span className="rounded-full border border-white/20 px-2 py-0.5 font-mono text-[10.5px] tracking-wider text-[#e0b453]">{r}</span>
                  <span className="ml-4 text-white/25" aria-hidden>
                    ✦
                  </span>
                </li>
              ))}
            </ul>
          ))}
        </div>
      </section>

      {/* ───────────── § 01 The syllabus of a career ───────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr] lg:items-end">
          <div>
            <p className="eyebrow">§ 01 — The syllabus of a career</p>
            <h2 className="mt-4 text-4xl leading-[1.02] text-ink sm:text-5xl">
              Five chapters.
              <br />
              <span className="display-italic text-brand">One login.</span>
            </h2>
          </div>
          <p className="max-w-xl text-lg leading-relaxed text-ink-2 lg:justify-self-end">
            Each chapter feeds the next: the lessons a student reads become the questions they answer. Their marks become the certificate a recruiter can verify, and the readiness score a placement team trusts.
          </p>
        </div>

        <ol className="relative mt-16 grid gap-px overflow-hidden rounded-3xl border border-line bg-line md:grid-cols-5">
          {CHAPTERS.map((c, i) => (
            <li key={c.n} className="group relative flex flex-col bg-surface p-6 transition-colors hover:bg-brand-soft/40">
              <div className="flex items-baseline justify-between">
                <span className="numeral-outline text-6xl leading-none">{c.n}</span>
                <span className="font-mono text-[10.5px] text-ink-3">{String(i + 1).padStart(2, "0")} / 05</span>
              </div>
              <h3 className="display mt-6 text-3xl text-ink">{c.title}</h3>
              <p className="mt-3 flex-1 text-sm leading-relaxed text-ink-2">{c.body}</p>
              <ul className="mt-5 flex flex-wrap gap-1.5">
                {c.tags.map((t) => (
                  <li key={t} className="rounded-md bg-surface-2 px-2 py-0.5 font-mono text-[10.5px] text-ink-2">
                    {t}
                  </li>
                ))}
              </ul>
              {i < CHAPTERS.length - 1 ? (
                <span className="absolute -right-3 top-8 z-10 hidden size-6 items-center justify-center rounded-full border border-line bg-bg text-[10px] text-gold md:flex" aria-hidden>
                  <Fi name="arrow-right" />
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </section>

      {/* ───────────── § 02 Bento: what's inside ───────────── */}
      <section className="border-y border-line bg-surface-2/60">
        <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
          <p className="eyebrow">§ 02 — Inside the platform</p>
          <h2 className="mt-4 max-w-3xl text-4xl leading-[1.04] text-ink sm:text-5xl">
            Not an LMS with AI bolted on. <span className="display-italic text-ink-3">A campus that thinks with you.</span>
          </h2>

          <div className="mt-14 grid auto-rows-[minmax(210px,auto)] gap-5 md:grid-cols-6">
            {/* Big tile: course studio */}
            <article className="paper flex flex-col p-7 md:col-span-4 md:row-span-2">
              <span className="eyebrow">For HODs</span>
              <h3 className="display mt-3 text-3xl text-ink sm:text-4xl">Department courses, built in an afternoon.</h3>
              <p className="mt-3 max-w-lg text-ink-2">
                Type a course title or paste your syllabus. Review the lessons and a 30-question final assessment drafted from them, then publish to your students.
              </p>
              <div className="mt-auto grid gap-4 pt-8 sm:grid-cols-[1fr_1.2fr]">
                <ol className="space-y-2">
                  {["Course details", "Lessons", "Final assessment", "Publish"].map((s, i) => (
                    <li key={s} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm", i === 2 ? "border-brand bg-brand-soft font-medium text-brand" : "border-line bg-surface text-ink-2")}>
                      <span className={cn("flex size-6 items-center justify-center rounded-full font-mono text-[11px]", i < 2 ? "bg-teal text-white" : i === 2 ? "bg-brand text-white" : "bg-surface-2")}>
                        {i < 2 ? <Fi name="check" /> : i + 1}
                      </span>
                      {s}
                    </li>
                  ))}
                </ol>
                <div className="rounded-2xl border border-line bg-bg p-4">
                  <p className="eyebrow">Unit II · Relational model & SQL</p>
                  {["Relational model & keys", "Relational algebra", "SQL queries & joins"].map((l, i) => (
                    <p key={l} className="mt-2.5 flex items-center justify-between text-[13px] text-ink">
                      <span className="flex items-center gap-2">
                        <Fi name="document" className="text-ink-3" /> {l}
                      </span>
                      <span className="font-mono text-[10.5px] text-ink-3">L0{i + 3}</span>
                    </p>
                  ))}
                  <p className="mt-4 rounded-lg bg-gold-soft px-3 py-2 text-[12px] text-amber">
                    <b>30</b> questions drafted from these lessons · <b>0</b> to review
                  </p>
                </div>
              </div>
            </article>

            {/* Assessment */}
            <article className="paper p-6 md:col-span-2">
              <span className="eyebrow">Assessment</span>
              <h3 className="mt-2 text-lg font-semibold text-ink">Marked on the server.</h3>
              <p className="mt-1 text-sm text-ink-2">The answer key never reaches the browser.</p>
              <div className="mt-4 space-y-1.5 text-[12.5px]">
                {["Queue", "Stack", "Heap"].map((o, i) => (
                  <p key={o} className={cn("flex items-center justify-between rounded-lg border px-3 py-1.5", i === 1 ? "border-teal bg-teal-soft text-teal" : "border-line text-ink-2")}>
                    {o} {i === 1 ? <Fi name="check" /> : null}
                  </p>
                ))}
              </div>
            </article>

            {/* Certificates */}
            <article className="paper relative overflow-hidden p-6 md:col-span-2">
              <span className="eyebrow">Certificates</span>
              <h3 className="mt-2 text-lg font-semibold text-ink">Verifiable by anyone.</h3>
              <p className="mt-1 text-sm text-ink-2">Signed IDs, a public verify page, and tamper detection.</p>
              <p className="mt-5 inline-flex items-center gap-2 rounded-full border border-teal/30 bg-teal-soft px-3 py-1 font-mono text-[11px] text-teal">
                <Fi name="shield-check" /> CIQ-2026-520F5771
              </p>
              <span className="display absolute -bottom-6 -right-2 text-[110px] text-gold/15" aria-hidden>
                A+
              </span>
            </article>

            {/* Streams */}
            <article className="paper p-6 md:col-span-2">
              <span className="eyebrow">Every stream</span>
              <h3 className="mt-2 text-lg font-semibold text-ink">Medical to management.</h3>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {[
                  ["stethoscope", "MBBS"],
                  ["gears", "B.E."],
                  ["flask", "B.Sc"],
                  ["calculator", "B.Com"],
                  ["briefcase", "MBA"],
                ].map(([icon, t]) => (
                  <span key={t} className="inline-flex items-center gap-1.5 rounded-full border border-line bg-bg px-2.5 py-1 text-[12px] text-ink-2">
                    <Fi name={icon!} className="text-brand" /> {t}
                  </span>
                ))}
              </div>
              <p className="mt-4 text-[12.5px] text-ink-3">Departments, terms, entrance scores and regulator rules adapt per college.</p>
            </article>

            {/* Readiness */}
            <article className="paper p-6 md:col-span-2">
              <span className="eyebrow">Placement</span>
              <h3 className="mt-2 text-lg font-semibold text-ink">Readiness, out of 100.</h3>
              <div className="mt-4 space-y-2">
                {[
                  ["Quizzes", 35, "var(--brand)"],
                  ["Certificates", 20, "var(--gold)"],
                  ["Aptitude", 15, "var(--teal)"],
                  ["Interview", 15, "var(--violet)"],
                  ["Resume", 15, "var(--sky)"],
                ].map(([l, w, c]) => (
                  <div key={l as string} className="flex items-center gap-2 text-[11.5px]">
                    <span className="w-20 text-ink-2">{l}</span>
                    <span className="h-1.5 rounded-full" style={{ width: `${(w as number) * 2.2}%`, background: c as string }} />
                    <span className="font-mono text-ink-3">{w}%</span>
                  </div>
                ))}
              </div>
            </article>

            {/* Human in the loop */}
            <article className="relative overflow-hidden rounded-[18px] bg-[#141d42] p-6 text-white md:col-span-2">
              <span className="eyebrow !text-white/50">Governance</span>
              <h3 className="mt-2 text-lg font-semibold">Humans stay in the loop.</h3>
              <p className="mt-1 text-sm text-white/70">Confidence, evidence and a faculty decision on every AI mark.</p>
              <div className="mt-5 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2.5 text-[12.5px]">
                Teacher review before publishing
                <span className="relative h-5 w-9 rounded-full bg-[#e0b453]">
                  <span className="absolute right-0.5 top-0.5 size-4 rounded-full bg-white" />
                </span>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ───────────── § 03 Roles ───────────── */}
      <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6">
        <p className="eyebrow">§ 03 — Made for every desk on campus</p>
        <h2 className="mb-10 mt-4 max-w-3xl text-4xl leading-[1.04] text-ink sm:text-5xl">One platform, five very different mornings.</h2>
        <RoleSwitcher />
      </section>

      {/* ───────────── Figures with footnotes ───────────── */}
      <section className="border-y border-line">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <dl className="grid divide-line sm:grid-cols-2 sm:divide-x lg:grid-cols-4">
            {FIGURES.map((f) => (
              <div key={f.label} className="border-b border-line px-2 py-10 sm:px-8 lg:border-b-0">
                <dt className="sr-only">{f.label}</dt>
                <dd>
                  <span className="display text-7xl text-ink">
                    {f.n}
                    <span className="text-gold">{f.sup}</span>
                  </span>
                  <sup className="ml-1 font-mono text-xs text-ink-3">{f.note}</sup>
                  <p className="mt-3 text-sm text-ink-2">{f.label}</p>
                </dd>
              </div>
            ))}
          </dl>
          <ol className="grid gap-x-8 gap-y-1.5 border-t border-dashed border-line py-6 font-mono text-[11px] leading-relaxed text-ink-3 md:grid-cols-2">
            {FOOTNOTES.map((n, i) => (
              <li key={n}>
                <span className="text-gold">{i + 1}.</span> {n}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ───────────── Pull quote ───────────── */}
      <section className="bg-ruled relative">
        <div className="mx-auto max-w-5xl px-4 py-28 text-center sm:px-6">
          <span className="display block text-[120px] leading-[0.5] text-gold/60" aria-hidden>
            “
          </span>
          <blockquote className="display mt-4 text-[clamp(2.2rem,5vw,4rem)] text-ink">
            Teachers always have <em className="text-brand">the final say.</em>
          </blockquote>
          <p className="eyebrow mt-8">— Principle 01 of our AI governance</p>
          <ul className="mx-auto mt-10 grid max-w-3xl gap-4 text-left sm:grid-cols-3">
            {[
              ["02", "Every AI insight links back to the evidence it came from."],
              ["03", "Each college's data is isolated; nothing crosses tenants."],
              ["04", "Students see confidence, not false certainty."],
            ].map(([n, t]) => (
              <li key={n} className="border-t border-ink/15 pt-4 text-sm text-ink-2">
                <span className="font-mono text-xs text-gold">{n}</span>
                <p className="mt-1">{t}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ───────────── Admission-ticket CTA ───────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
        <div className="ticket grid overflow-hidden rounded-[28px] bg-[#141d42] text-white md:grid-cols-[1fr_auto_300px]">
          <div className="relative p-8 sm:p-12">
            <p className="eyebrow !text-[#e0b453]">Admit one · Pilot programme</p>
            <h2 className="mt-4 text-4xl leading-[1.04] sm:text-5xl">
              Start with one university, <span className="display-italic text-[#e0b453]">two colleges.</span>
            </h2>
            <p className="mt-5 max-w-xl text-white/70">
              Run a semester, then measure lessons completed, certificates earned, interview practice and the change in readiness scores. Scale with evidence, not promises.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href="/contact" variant="gold" size="lg" className="rounded-full px-7">
                Plan a pilot <Fi name="arrow-right" />
              </LinkButton>
              <LinkButton href="/login" size="lg" className="rounded-full bg-white/10 px-7 text-white hover:bg-white/20">
                Try the demo
              </LinkButton>
            </div>
          </div>
          <div className="ticket-perforation relative hidden w-[2px] md:block" aria-hidden>
            <span className="ticket-notch -top-[18px] left-1/2 -translate-x-1/2" />
            <span className="ticket-notch -bottom-[18px] left-1/2 -translate-x-1/2" />
          </div>
          <dl className="grid content-center gap-5 border-t border-dashed border-white/20 p-8 font-mono text-[12px] md:border-t-0 sm:p-10">
            {[
              ["Duration", "1 semester"],
              ["Scope", "1 university · 2–3 colleges"],
              ["Streams", "Any mix"],
              ["Seat", "No. 0001"],
            ].map(([k, v]) => (
              <div key={k}>
                <dt className="uppercase tracking-[0.16em] text-white/45">{k}</dt>
                <dd className="mt-0.5 text-base text-white">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { COLLEGE_ID_RE } from "@/config/tenancy";
import { publicCollegePage } from "@/lib/api/mock/website";
import { withRequestContext } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { Fi } from "@/components/ui/icon";
import { Badge, Card, LinkButton } from "@/components/ui/primitives";
import { GalleryGrid } from "@/components/college-site/gallery-grid";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const page = COLLEGE_ID_RE.test(id) ? await withRequestContext({ scope: id, readOnly: true }, () => publicCollegePage(id)) : null;
  if (!page) return { title: "College not found" };
  return { title: page.college.name, description: page.site.tagline };
}

const EVENT_ICON: Record<string, string> = {
  Seminar: "chalkboard-user",
  Workshop: "settings",
  Hackathon: "code-simple",
  Cultural: "party-horn",
  Sports: "football",
  Alumni: "users-alt",
  "Social service": "heart",
};

export default async function CollegeHomePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = COLLEGE_ID_RE.test(id) ? await withRequestContext({ scope: id, readOnly: true }, () => publicCollegePage(id)) : null;
  if (!page) notFound();
  const { college, site, programs, departments, events, gallery } = page;
  const hero = mediaUrl(site.heroImage) ?? "/campus/campus.svg";
  const base = `/colleges/${college.id}`;

  return (
    <>
      {site.announcement ? (
        <div className="bg-gold text-[#1b2233]">
          <p className="mx-auto flex max-w-7xl items-center justify-center gap-2 px-4 py-2 text-center text-sm font-medium">
            <Fi name="megaphone" /> {site.announcement}
            {college.admissionsOpen ? (
              <Link href={`/apply?college=${college.id}`} className="ml-2 underline underline-offset-2">
                Apply now
              </Link>
            ) : null}
          </p>
        </div>
      ) : null}

      {/* Hero */}
      <section className="relative isolate overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={hero} alt={`${college.name} campus`} className="absolute inset-0 -z-10 h-full w-full object-cover" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#0e1433]/90 via-[#1e2a5a]/70 to-[#1e2a5a]/20" aria-hidden />
        <div className="mx-auto max-w-7xl px-4 py-20 text-white sm:px-6 sm:py-28 lg:py-32">
          <div className="max-w-2xl">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">{college.type}</span>
              <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">
                <Fi name="marker" className="mr-1" />
                {college.city}
              </span>
              {college.established ? <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium backdrop-blur">Est. {college.established}</span> : null}
            </div>
            <h1 className="mt-5 text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">{college.name}</h1>
            <p className="mt-4 text-lg text-white/85 sm:text-xl">{site.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              {college.admissionsOpen ? (
                <LinkButton href={`/apply?college=${college.id}`} size="lg" variant="gold">
                  <Fi name="user-add" /> Apply for admission
                </LinkButton>
              ) : null}
              <LinkButton href={`${base}/login`} size="lg" className="bg-white/15 text-white backdrop-blur hover:bg-white/25">
                <Fi name="sign-in-alt" /> Student &amp; staff login
              </LinkButton>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative z-10 mx-auto -mt-10 max-w-6xl px-4 sm:px-6">
        <Card className="grid grid-cols-2 divide-line p-2 sm:grid-cols-4 sm:divide-x">
          {(
            [
              ["calendar", "Established", college.established ?? "—"],
              ["users-alt", "Sanctioned intake", college.capacity?.toLocaleString("en-IN") ?? "—"],
              ["diploma", "Programmes", programs.length],
              ["building", "Departments", departments.length],
            ] as const
          ).map(([icon, label, value]) => (
            <div key={label} className="flex items-center gap-3 px-4 py-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-soft text-lg text-brand">
                <Fi name={icon} />
              </span>
              <div>
                <p className="text-xl font-semibold text-ink">{value}</p>
                <p className="text-xs text-ink-3">{label}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      {/* About */}
      <section id="about" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.3fr_1fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-gold">About us</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Welcome to {college.name}</h2>
            <p className="mt-4 whitespace-pre-line leading-relaxed text-ink-2">{site.about}</p>
            {site.highlights.length ? (
              <ul className="mt-6 flex flex-wrap gap-2">
                {site.highlights.map((h) => (
                  <li key={h}>
                    <Badge tone="brand" className="px-3 py-1 text-sm">
                      <Fi name="badge-check" /> {h}
                    </Badge>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-6 text-xs text-ink-3">
              {college.streamLabel} · {college.regulator}
            </p>
          </div>
          {site.principalMessage ? (
            <Card className="relative overflow-hidden p-7">
              <Fi name="quote-right" className="absolute right-5 top-4 text-5xl text-brand/10" />
              <p className="text-sm font-semibold uppercase tracking-widest text-gold">Principal&apos;s message</p>
              <p className="mt-4 whitespace-pre-line leading-relaxed text-ink">{site.principalMessage}</p>
              <p className="mt-5 flex items-center gap-3 border-t border-line pt-4">
                <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-full text-sm font-semibold text-gold">
                  <Fi name="user" />
                </span>
                <span>
                  <span className="block font-semibold text-ink">{college.principal}</span>
                  <span className="block text-xs text-ink-3">Principal</span>
                </span>
              </p>
            </Card>
          ) : null}
        </div>
      </section>

      {/* Programmes */}
      <section id="programmes" className="scroll-mt-20 border-y border-line bg-surface">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
          <p className="text-sm font-semibold uppercase tracking-widest text-gold">Academics</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Programmes offered</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {programs.map((p) => (
              <Card key={p} className="card-hover flex items-center gap-4 p-5">
                <span className="bg-brand-gradient flex size-11 shrink-0 items-center justify-center rounded-xl text-gold">
                  <Fi name="graduation-cap" />
                </span>
                <span className="font-medium text-ink">{p}</span>
              </Card>
            ))}
          </div>
          <h3 className="mt-12 text-lg font-semibold text-ink">Departments</h3>
          <ul className="mt-4 flex flex-wrap gap-2">
            {departments.map((d) => (
              <li key={d} className="rounded-full border border-line bg-bg px-3.5 py-1.5 text-sm text-ink-2">
                {d}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Events */}
      {site.showEvents ? (
        <section id="events" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-widest text-gold">What&apos;s on</p>
              <h2 className="mt-2 text-3xl font-semibold text-ink">Upcoming events</h2>
            </div>
          </div>
          {events.length ? (
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => {
                const d = new Date(`${e.date}T00:00:00`);
                return (
                  <Card key={e.id} className="card-hover flex gap-4 p-5">
                    <div className="bg-brand-gradient flex w-16 shrink-0 flex-col items-center justify-center rounded-2xl py-2 text-white">
                      <span className="text-2xl font-semibold leading-none">{d.getDate()}</span>
                      <span className="mt-1 text-[11px] uppercase tracking-wider text-gold">{d.toLocaleString("en-IN", { month: "short" })}</span>
                    </div>
                    <div className="min-w-0">
                      <Badge tone="gold">
                        <Fi name={EVENT_ICON[e.type] ?? "calendar"} /> {e.type}
                      </Badge>
                      <h3 className="mt-2 font-semibold text-ink">{e.title}</h3>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-3">
                        <span className="inline-flex items-center gap-1">
                          <Fi name="clock" /> {e.startTime}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Fi name="marker" /> {e.venue}
                        </span>
                      </p>
                      {e.registrationOpen ? <p className="mt-2 text-xs font-medium text-teal">Registrations open — sign in to register</p> : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <p className="mt-6 text-ink-3">No upcoming events right now. Check back soon.</p>
          )}
        </section>
      ) : null}

      {/* Gallery */}
      {site.showGallery ? (
        <section id="gallery" className="scroll-mt-20 border-t border-line bg-surface">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
            <p className="text-sm font-semibold uppercase tracking-widest text-gold">Campus life</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Gallery</h2>
            {gallery.length ? <GalleryGrid items={gallery} /> : <p className="mt-6 text-ink-3">Photos coming soon.</p>}
          </div>
        </section>
      ) : null}

      {/* Contact */}
      <section id="contact" className="mx-auto max-w-7xl scroll-mt-20 px-4 py-16 sm:px-6">
        <div className="bg-hero-glow relative overflow-hidden rounded-3xl p-8 text-white sm:p-10">
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr]">
            <div>
              <h2 className="text-3xl font-semibold">Visit or contact us</h2>
              <p className="mt-2 text-white/75">We&apos;re happy to help with admissions, programmes and campus visits.</p>
              <div className="mt-6 flex flex-wrap gap-3">
                {college.admissionsOpen ? (
                  <LinkButton href={`/apply?college=${college.id}`} variant="gold" size="lg">
                    Apply online
                  </LinkButton>
                ) : null}
                <LinkButton href={`${base}/login`} size="lg" className="bg-white/15 text-white hover:bg-white/25">
                  Student &amp; staff login
                </LinkButton>
              </div>
            </div>
            <ul className="space-y-4 text-sm">
              <li className="flex gap-3">
                <Fi name="marker" className="mt-0.5 text-lg text-gold" />
                <span className="whitespace-pre-line">{site.address}</span>
              </li>
              <li className="flex gap-3">
                <Fi name="phone-call" className="mt-0.5 text-lg text-gold" />
                <a href={`tel:+91${site.phone}`} className="hover:underline">
                  +91 {site.phone}
                </a>
              </li>
              <li className="flex gap-3">
                <Fi name="envelope" className="mt-0.5 text-lg text-gold" />
                <a href={`mailto:${site.email}`} className="hover:underline">
                  {site.email}
                </a>
              </li>
              {site.officeHours ? (
                <li className="flex gap-3">
                  <Fi name="clock" className="mt-0.5 text-lg text-gold" />
                  <span>{site.officeHours}</span>
                </li>
              ) : null}
            </ul>
          </div>
        </div>
      </section>
    </>
  );
}

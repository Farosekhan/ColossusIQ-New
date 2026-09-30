import type { Metadata } from "next";
import Link from "next/link";
import { STREAM_DEFS, STREAMS } from "@/config/streams";
import { UNIVERSITY } from "@/config/tenancy";
import { publicCollegeDirectory } from "@/lib/api/mock/website";
import { withRequestContext } from "@/lib/data";
import { mediaUrl } from "@/lib/media";
import { Fi } from "@/components/ui/icon";
import { Badge, Card, PageHeader } from "@/components/ui/primitives";

export const metadata: Metadata = { title: "Affiliated colleges" };

export default async function CollegesDirectoryPage() {
  const colleges = await withRequestContext({ scope: "all", readOnly: true }, publicCollegeDirectory);
  return (
    <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
      <PageHeader
        eyebrow={UNIVERSITY.name}
        title="Our affiliated colleges"
        description="Engineering, medical & health sciences, arts & science and more — explore each college, its programmes, events and campus life."
      />
      <div className="space-y-12">
        {STREAMS.map((s) => {
          const list = colleges.filter((c) => c.stream === s);
          if (!list.length) return null;
          return (
            <section key={s} aria-labelledby={`stream-${s}`}>
              <h2 id={`stream-${s}`} className="mb-4 flex items-center gap-3 text-2xl font-semibold text-ink">
                <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-lg text-gold">
                  <Fi name={STREAM_DEFS[s].icon} />
                </span>
                {STREAM_DEFS[s].label}
                <span className="text-sm font-normal text-ink-3">· {STREAM_DEFS[s].regulator}</span>
              </h2>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {list.map((c) => (
                  <Link key={c.id} href={`/colleges/${c.id}`} className="group">
                    <Card className="card-hover h-full overflow-hidden">
                      <div className="relative aspect-[16/8] overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(c.heroImage) ?? "/campus/campus.svg"} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                        <span className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" aria-hidden />
                        <Badge tone="gold" className="absolute left-3 top-3">
                          {c.type}
                        </Badge>
                      </div>
                      <div className="p-5">
                        <h3 className="font-semibold text-ink group-hover:text-brand">{c.name}</h3>
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-ink-3">
                          <Fi name="marker" /> {c.city}
                        </p>
                        <p className="mt-2 text-sm text-ink-2">{c.tagline}</p>
                        <p className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand">
                          Visit college <Fi name="arrow-right" className="text-xs" />
                        </p>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

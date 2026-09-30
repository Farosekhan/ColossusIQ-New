"use client";

import { useEffect, useState } from "react";
import { mediaUrl } from "@/lib/media";
import { Fi } from "@/components/ui/icon";
import { cn } from "@/lib/utils";

interface Item {
  id: string;
  title: string;
  caption: string;
  category: string;
  image: string;
}

/** Filterable photo grid with an accessible lightbox (Esc / arrow keys). */
export function GalleryGrid({ items }: { items: Item[] }) {
  const categories = ["All", ...Array.from(new Set(items.map((i) => i.category)))];
  const [cat, setCat] = useState("All");
  const [open, setOpen] = useState<number | null>(null);
  const shown = items.filter((i) => cat === "All" || i.category === cat);
  const current = open !== null ? shown[open] : undefined;

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") setOpen((o) => (o === null ? o : (o + 1) % shown.length));
      if (e.key === "ArrowLeft") setOpen((o) => (o === null ? o : (o - 1 + shown.length) % shown.length));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shown.length]);

  return (
    <>
      <div className="mt-6 flex flex-wrap gap-2" role="tablist" aria-label="Gallery categories">
        {categories.map((c) => (
          <button
            key={c}
            role="tab"
            aria-selected={cat === c}
            onClick={() => setCat(c)}
            className={cn("rounded-full px-4 py-1.5 text-sm transition-colors", cat === c ? "bg-brand-gradient text-white" : "border border-line bg-bg text-ink-2 hover:border-brand/40")}
          >
            {c}
          </button>
        ))}
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {shown.map((g, i) => {
          const src = mediaUrl(g.image);
          if (!src) return null;
          return (
            <button
              key={g.id}
              onClick={() => setOpen(i)}
              className={cn("group relative overflow-hidden rounded-2xl text-left", i === 0 && "md:col-span-2 md:row-span-2")}
              aria-label={`Open photo: ${g.title}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt={g.title} loading="lazy" className="aspect-[4/3] h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
              <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-sm font-medium text-white opacity-90">{g.title}</span>
            </button>
          );
        })}
      </div>
      {current ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label={current.title}>
          <button className="absolute inset-0 cursor-default" aria-label="Close" tabIndex={-1} onClick={() => setOpen(null)} />
          <figure className="relative max-h-full w-full max-w-5xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mediaUrl(current.image) ?? ""} alt={current.title} className="max-h-[78vh] w-full rounded-2xl object-contain" />
            <figcaption className="mt-3 text-center text-white">
              <span className="font-semibold">{current.title}</span>
              {current.caption ? <span className="block text-sm text-white/70">{current.caption}</span> : null}
            </figcaption>
          </figure>
          <button onClick={() => setOpen(null)} className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/15 text-xl text-white hover:bg-white/25" aria-label="Close">
            <Fi name="cross-small" />
          </button>
          {shown.length > 1 ? (
            <>
              <button onClick={() => setOpen((o) => ((o ?? 0) - 1 + shown.length) % shown.length)} className="absolute left-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Previous photo">
                <Fi name="angle-left" />
              </button>
              <button onClick={() => setOpen((o) => ((o ?? 0) + 1) % shown.length)} className="absolute right-4 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Next photo">
                <Fi name="angle-right" />
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

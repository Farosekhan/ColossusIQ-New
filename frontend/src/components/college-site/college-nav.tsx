"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Fi } from "@/components/ui/icon";

const SECTIONS = [
  ["about", "About"],
  ["programmes", "Programmes"],
  ["events", "Events"],
  ["gallery", "Gallery"],
  ["contact", "Contact"],
] as const;

export function CollegeNav({ base }: { base: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  return (
    <>
      <nav className="ml-4 hidden items-center gap-1 lg:flex" aria-label="College sections">
        {SECTIONS.map(([id, label]) => (
          <Link key={id} href={`${base}#${id}`} className="rounded-lg px-3 py-2 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink">
            {label}
          </Link>
        ))}
      </nav>
      <button className="flex size-10 items-center justify-center rounded-xl text-ink-2 hover:bg-surface-2 lg:hidden" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Menu">
        <Fi name={open ? "cross-small" : "menu-burger"} />
      </button>
      {open ? (
        <nav className="absolute inset-x-0 top-16 border-b border-line bg-surface px-4 py-3 shadow-card lg:hidden" aria-label="College sections">
          {SECTIONS.map(([id, label]) => (
            <Link key={id} href={`${base}#${id}`} onClick={() => setOpen(false)} className="block rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-surface-2">
              {label}
            </Link>
          ))}
        </nav>
      ) : null}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export function MarketingNav({ links }: { links: Array<{ href: string; label: string }> }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }
  return (
    <div className="xl:hidden">
      <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-ink-2 hover:bg-surface-2" aria-expanded={open} aria-label="Menu">
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </button>
      {open ? (
        <nav className="absolute inset-x-0 top-16 border-b border-line bg-surface px-4 py-3 shadow-card" aria-label="Mobile">
          {[...links, { href: "/login", label: "Sign in" }].map((l) => (
            <Link key={l.href} href={l.href} className="block rounded-lg px-3 py-2.5 text-sm text-ink hover:bg-surface-2">
              {l.label}
            </Link>
          ))}
        </nav>
      ) : null}
    </div>
  );
}

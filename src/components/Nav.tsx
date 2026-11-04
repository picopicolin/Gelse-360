"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export type NavLink = { href: string; label: string };

/** Menú lateral en PC y barra con scroll horizontal arriba en móvil y tablet. */
export default function Nav({ links }: { links: NavLink[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col">
      {links.map((l) => (
        <Link key={l.href} href={l.href}
          className={`shrink-0 rounded-xl px-3 py-2.5 text-[15px] ${active(l.href) ? "bg-ink text-white" : "text-ink hover:bg-line/60"}`}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

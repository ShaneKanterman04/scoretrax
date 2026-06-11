"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Scores",
    match: (p: string) => p === "/" || p.startsWith("/game") || p.startsWith("/player"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="12" cy="12" r="9" />
        <path d="M6 6c2.5 1.6 4 3.6 4 6s-1.5 4.4-4 6M18 6c-2.5 1.6-4 3.6-4 6s1.5 4.4 4 6" />
      </svg>
    ),
  },
  {
    href: "/standings",
    label: "Standings",
    match: (p: string) => p.startsWith("/standings"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16M4 12h12M4 18h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/teams",
    label: "Teams",
    match: (p: string) => p.startsWith("/teams") || p.startsWith("/team/"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.6-3 2.9-5 5.5-5s4.9 2 5.5 5M16 9.5a2.8 2.8 0 1 0 .01-5.6M16.5 14c2.2.3 3.7 2 4.2 4.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-surface/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg">
        {TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

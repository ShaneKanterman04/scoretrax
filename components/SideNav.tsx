"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBets } from "@/lib/bets";
import { NAV_TABS } from "./navItems";

// Desktop-only left rail (lg+). The mobile bottom bar (BottomNav) covers
// smaller screens; both render from the shared NAV_TABS definitions.
export default function SideNav() {
  const pathname = usePathname();
  const { bets } = useBets();
  const openBets = bets.filter((b) => b.status === "open").length;
  return (
    <aside className="sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-edge bg-surface/40 px-3 py-5 lg:flex">
      <Link href="/" className="mb-6 flex items-center gap-2 px-2">
        <span className="h-2.5 w-2.5 rounded-full bg-accent" />
        <span className="text-lg font-bold tracking-tight">ScoreTrax</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {NAV_TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors ${
                active
                  ? "bg-surface-2 text-foreground"
                  : "text-muted hover:bg-surface hover:text-foreground"
              }`}
            >
              <span className={active ? "text-accent" : ""}>{tab.icon}</span>
              <span className="flex-1">{tab.label}</span>
              {tab.href === "/bets" && openBets > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-white">
                  {openBets}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useBets } from "@/lib/bets";
import { NAV_TABS } from "./navItems";

// Mobile/tablet bottom tab bar (hidden at lg+, where SideNav takes over).
export default function BottomNav() {
  const pathname = usePathname();
  const { bets } = useBets();
  const openBets = bets.filter((b) => b.status === "open").length;
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t border-edge bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-lg">
        {NAV_TABS.map((tab) => {
          const active = tab.match(pathname);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? "text-accent" : "text-muted"
              }`}
            >
              <span className="relative">
                {tab.icon}
                {tab.href === "/bets" && openBets > 0 && (
                  <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white">
                    {openBets}
                  </span>
                )}
              </span>
              {tab.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

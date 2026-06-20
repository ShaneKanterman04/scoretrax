import type { ReactNode } from "react";

export type NavTab = {
  href: string;
  label: string;
  match: (pathname: string) => boolean;
  icon: ReactNode;
};

// Shared nav definitions used by the mobile bottom bar (BottomNav) and the
// desktop side rail (SideNav). One source of truth keeps the two in sync.
export const NAV_TABS: NavTab[] = [
  {
    href: "/",
    label: "Scores",
    match: (p) => p === "/" || p.startsWith("/game") || p.startsWith("/player"),
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
    match: (p) => p.startsWith("/standings"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 6h16M4 12h12M4 18h8" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/intel",
    label: "Intel",
    match: (p) => p.startsWith("/intel"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 17 9 8l4 6 3-5 4 8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M4 20h16" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/teams",
    label: "Teams",
    match: (p) => p.startsWith("/teams") || p.startsWith("/team/"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <circle cx="9" cy="8" r="3.2" />
        <path d="M3.5 19c.6-3 2.9-5 5.5-5s4.9 2 5.5 5M16 9.5a2.8 2.8 0 1 0 .01-5.6M16.5 14c2.2.3 3.7 2 4.2 4.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: "/bets",
    label: "Bets",
    match: (p) => p.startsWith("/bets"),
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
        <path d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1.5a2.5 2.5 0 0 0 0 5V16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-1.5a2.5 2.5 0 0 0 0-5V8Z" />
        <path d="M14 7.5v1.5M14 11.25v1.5M14 15v1.5" strokeLinecap="round" />
      </svg>
    ),
  },
];

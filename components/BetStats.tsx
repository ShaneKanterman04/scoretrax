"use client";

import { betStats } from "@/lib/bets";
import type { Bet } from "@/lib/types";

export default function BetStats({ bets }: { bets: Bet[] }) {
  const s = betStats(bets);
  if (s.wins + s.losses + s.voids === 0) return null;

  const tiles = [
    {
      label: "Record",
      value: `${s.wins}-${s.losses}${s.voids > 0 ? `-${s.voids}` : ""}`,
    },
    {
      label: "Win rate",
      value: s.winRate !== undefined ? `${Math.round(s.winRate * 100)}%` : "—",
    },
    { label: "Legs", value: `${s.legWins}-${s.legLosses}` },
    {
      label: "Streak",
      value: s.streak ? `${s.streak.result === "won" ? "W" : "L"}${s.streak.count}` : "—",
      className: s.streak
        ? s.streak.result === "won"
          ? "text-good"
          : "text-live"
        : "",
    },
  ];

  return (
    <div className="mb-2">
      <div className="grid grid-cols-4 gap-2">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-xl bg-surface p-2 text-center">
            <div className={`text-base font-bold tabular-nums ${t.className ?? ""}`}>
              {t.value}
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted">
              {t.label}
            </div>
          </div>
        ))}
      </div>
      {s.longestShot !== undefined && (
        <div className="mt-1 px-1 text-[11px] text-muted">
          Longest shot hit: {Math.round(s.longestShot * 100)}%
        </div>
      )}
    </div>
  );
}

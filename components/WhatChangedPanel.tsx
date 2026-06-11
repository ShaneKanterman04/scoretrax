"use client";

import { useEffect, useMemo, useState } from "react";
import type { LiveGame, RecentPlay } from "@/lib/types";

function keyFor(gamePk: number): string {
  return `scoretrax:last-seen:${gamePk}`;
}

function maxSeen(plays: RecentPlay[]): number {
  return plays.reduce((max, play) => Math.max(max, play.atBatIndex), 0);
}

function playLine(play: RecentPlay): string {
  const half = play.half === "top" ? "Top" : "Bot";
  return `${half} ${play.inning}: ${play.event}`;
}

export default function WhatChangedPanel({ game }: { game: LiveGame }) {
  const [previousSeen, setPreviousSeen] = useState<number | null>(null);
  const currentMax = useMemo(() => maxSeen(game.recentPlays), [game.recentPlays]);

  useEffect(() => {
    const key = keyFor(game.gamePk);
    const stored = Number(window.localStorage.getItem(key) ?? "");
    setPreviousSeen(Number.isFinite(stored) && stored > 0 ? stored : null);

    if (currentMax > 0) {
      window.localStorage.setItem(key, String(currentMax));
    }
  }, [game.gamePk, currentMax]);

  if (previousSeen === null || currentMax <= previousSeen) return null;

  const newPlays = game.recentPlays
    .filter((play) => play.atBatIndex > previousSeen)
    .sort((a, b) => b.atBatIndex - a.atBatIndex);
  if (newPlays.length === 0) return null;

  const scoring = newPlays.filter((play) => play.isScoring).length;
  const latest = newPlays.slice(0, 3);

  return (
    <section className="mx-4 mt-3 rounded-xl bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold">What changed?</h2>
          <p className="mt-0.5 text-xs text-muted">
            {newPlays.length} new play{newPlays.length === 1 ? "" : "s"}
            {scoring > 0 ? ` · ${scoring} scoring` : ""} since your last visit.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-accent/15 px-2 py-1 text-[10px] font-bold text-accent">
          Since last view
        </span>
      </div>
      <div className="mt-2 flex flex-col gap-1.5">
        {latest.map((play) => (
          <div key={play.atBatIndex} className="text-xs leading-snug">
            <span className={play.isScoring ? "font-bold text-good" : "font-bold"}>
              {playLine(play)}
            </span>
            <span className="text-muted"> · {play.description}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

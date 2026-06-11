"use client";

import { useEffect, useRef, useState } from "react";
import type { LiveGame } from "@/lib/types";

// Flashes a label when something happens between live polls: home run, run,
// hit, strikeout, out, strike, ball (in that priority order).

type Flash = { key: number; label: string; className: string };

const HITS = ["Single", "Double", "Triple"];

function detect(prev: LiveGame, next: LiveGame): Omit<Flash, "key"> | null {
  const newPlay = next.recentPlays[0];
  const isNewPlay =
    newPlay && newPlay.atBatIndex !== prev.recentPlays[0]?.atBatIndex;

  if (isNewPlay && newPlay.event === "Home Run") {
    return { label: "HOME RUN!", className: "text-accent" };
  }
  const runs =
    next.teams.away.score +
    next.teams.home.score -
    prev.teams.away.score -
    prev.teams.home.score;
  if (runs > 0) {
    return {
      label: runs > 1 ? `${runs} RUNS SCORE!` : "RUN SCORES!",
      className: "text-good",
    };
  }
  if (isNewPlay && HITS.includes(newPlay.event)) {
    return { label: `${newPlay.event.toUpperCase()}!`, className: "text-accent" };
  }
  if (isNewPlay && newPlay.event === "Strikeout") {
    return { label: "STRIKEOUT!", className: "text-live" };
  }
  if (next.count.outs > prev.count.outs) {
    return {
      label: next.count.outs >= 3 ? "INNING OVER" : "OUT!",
      className: "text-live",
    };
  }
  if (next.count.strikes > prev.count.strikes) {
    return { label: `STRIKE ${next.count.strikes}`, className: "text-amber-400" };
  }
  if (next.count.balls > prev.count.balls) {
    return { label: `BALL ${next.count.balls}`, className: "text-good" };
  }
  return null;
}

export default function EventFlash({ game }: { game: LiveGame }) {
  const prevRef = useRef<LiveGame | null>(null);
  const counter = useRef(0);
  const [flash, setFlash] = useState<Flash | null>(null);

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = game;
    if (!prev || prev.gamePk !== game.gamePk) return;
    if (game.status.abstract !== "Live") return;
    const hit = detect(prev, game);
    if (!hit) return;
    counter.current += 1;
    setFlash({ ...hit, key: counter.current });
    const t = setTimeout(() => setFlash(null), 1400);
    return () => clearTimeout(t);
  }, [game]);

  if (!flash) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 top-28 z-40 flex justify-center">
      <span
        key={flash.key}
        className={`animate-event-flash rounded-full border border-edge bg-surface/95 px-5 py-2 text-2xl font-extrabold tracking-wide shadow-lg ${flash.className}`}
      >
        {flash.label}
      </span>
    </div>
  );
}

"use client";

import type { GameOddsHistory, OddsSample } from "@/lib/types";

function probFor(sample: OddsSample, side: "away" | "home"): number {
  return side === "away" ? sample.awayProb : sample.homeProb;
}

export function movement(history: GameOddsHistory | null | undefined, side: "away" | "home") {
  if (!history?.first || !history.latest || history.samples.length < 2) return null;
  const first = probFor(history.first, side);
  const latest = probFor(history.latest, side);
  const delta = Math.round((latest - first) * 100);
  if (delta === 0) return { delta, label: "flat", className: "text-muted" };
  return {
    delta,
    label: `${delta > 0 ? "+" : ""}${delta} pts`,
    className: delta > 0 ? "text-good" : "text-live",
  };
}

export default function OddsTimeline({
  history,
  side,
  className = "",
}: {
  history?: GameOddsHistory | null;
  side: "away" | "home";
  className?: string;
}) {
  const samples = history?.samples ?? [];
  if (samples.length < 2) return null;

  const values = samples.map((sample) => probFor(sample, side));
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(0.01, max - min);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? 0 : (index / (values.length - 1)) * 60;
      const y = 16 - ((value - min) / range) * 14 - 1;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 60 16"
      className={`h-4 w-16 shrink-0 overflow-visible ${className}`}
    >
      <polyline
        points={points}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";

function formatCountdown(ms: number): string {
  if (ms <= 0) return "soon";

  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  return `${seconds}s`;
}

export default function FirstPitchCountdown({ gameDate }: { gameDate: string }) {
  const firstPitch = useMemo(() => new Date(gameDate).getTime(), [gameDate]);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!Number.isFinite(firstPitch)) return;

    const tick = () => setNow(Date.now());
    tick();

    const msUntilFirstPitch = firstPitch - Date.now();
    const interval = window.setInterval(tick, msUntilFirstPitch <= 3_600_000 ? 1000 : 60_000);
    return () => window.clearInterval(interval);
  }, [firstPitch]);

  if (now === null || !Number.isFinite(firstPitch)) return null;

  return (
    <span className="whitespace-nowrap rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-bold text-accent tabular-nums">
      First pitch {formatCountdown(firstPitch - now)}
    </span>
  );
}

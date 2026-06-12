"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { ODDS_HISTORY_REFRESH_MS, VISIBLE_REFRESH_MS } from "@/lib/refresh";
import type { GameOddsHistory, MarketOdds } from "@/lib/types";
import OddsTimeline, { movement } from "./OddsTimeline";

export default function OddsChip({
  gamePk,
  away,
  home,
  date,
  gameNumber = 1,
  live,
}: {
  gamePk: number;
  away: string;
  home: string;
  date: string;
  gameNumber?: number;
  live?: boolean;
}) {
  const { data } = useSWR<MarketOdds>(
    `/api/polymarket/game?away=${away}&home=${home}&date=${date}&gameNumber=${gameNumber}`,
    fetcher,
    { refreshInterval: VISIBLE_REFRESH_MS, revalidateOnFocus: false }
  );
  const { data: history } = useSWR<GameOddsHistory | null>(
    `/api/odds/history?date=${date}&gamePk=${gamePk}`,
    fetcher,
    { refreshInterval: ODDS_HISTORY_REFRESH_MS, revalidateOnFocus: false }
  );
  if (!data?.matched || data.awayProb === undefined || data.homeProb === undefined) {
    return null;
  }
  const fav =
    data.homeProb >= data.awayProb
      ? { label: home, prob: data.homeProb, side: "home" as const }
      : { label: away, prob: data.awayProb, side: "away" as const };
  const move = movement(history, fav.side);
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-foreground"
      title={`Polymarket: ${away} ${Math.round((data.awayProb ?? 0) * 100)}% / ${home} ${Math.round((data.homeProb ?? 0) * 100)}%`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {fav.label} {Math.round(fav.prob * 100)}%
      <OddsTimeline history={history} side={fav.side} className={move?.className} />
      {move && <span className={move.className}>{move.label}</span>}
    </span>
  );
}

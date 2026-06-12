"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { VISIBLE_REFRESH_MS } from "@/lib/refresh";
import type { MarketOdds } from "@/lib/types";

export default function OddsChip({
  away,
  home,
  date,
  gameNumber = 1,
  live,
}: {
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
  if (!data?.matched || data.awayProb === undefined || data.homeProb === undefined) {
    return null;
  }
  const fav =
    data.homeProb >= data.awayProb
      ? { label: home, prob: data.homeProb }
      : { label: away, prob: data.awayProb };
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-surface-2 px-2 py-0.5 text-[11px] font-semibold text-foreground"
      title={`Polymarket: ${away} ${Math.round((data.awayProb ?? 0) * 100)}% / ${home} ${Math.round((data.homeProb ?? 0) * 100)}%`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-accent" />
      {fav.label} {Math.round(fav.prob * 100)}%
    </span>
  );
}

"use client";

import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { LiveGame, MarketOdds, WinProbSeries } from "@/lib/types";

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

function clampPct(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function points(value: number): string {
  return `${Math.abs(Math.round(value))} pts`;
}

function volume(value?: number): string | null {
  if (!value) return null;
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function TeamRow({
  label,
  live,
  market,
}: {
  label: string;
  live: number;
  market: number;
}) {
  return (
    <div className="grid grid-cols-[3.25rem_1fr_4rem] items-center gap-2">
      <span className="text-xs font-bold">{label}</span>
      <div className="flex flex-col gap-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-good" style={{ width: `${clampPct(live)}%` }} />
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent"
            style={{ width: `${clampPct(market)}%` }}
          />
        </div>
      </div>
      <div className="text-right text-[10px] leading-tight text-muted">
        <div>WP {pct(live)}</div>
        <div>Mkt {pct(market)}</div>
      </div>
    </div>
  );
}

export default function MarketRealityPanel({
  game,
  winProb,
}: {
  game: LiveGame;
  winProb: WinProbSeries;
}) {
  const latest = winProb.points.at(-1);
  const isLive = game.status.abstract === "Live";
  const { data } = useSWR<MarketOdds>(
    `/api/polymarket/game?away=${encodeURIComponent(
      game.teams.away.abbr
    )}&home=${encodeURIComponent(game.teams.home.abbr)}&date=${game.officialDate}&gameNumber=${
      game.gameNumber
    }`,
    fetcher,
    { refreshInterval: isLive ? 60_000 : 0, revalidateOnFocus: false }
  );

  if (
    !latest ||
    !data?.matched ||
    data.awayProb === undefined ||
    data.homeProb === undefined
  ) {
    return null;
  }

  const liveHome = latest.homeWP;
  const liveAway = 100 - liveHome;
  const marketAway = data.awayProb * 100;
  const marketHome = data.homeProb * 100;
  const deltaHome = marketHome - liveHome;
  const absDelta = Math.abs(deltaHome);
  const marketSide = deltaHome >= 0 ? game.teams.home.abbr : game.teams.away.abbr;
  const state =
    absDelta >= 12 ? "Market mismatch" : absDelta >= 6 ? "Leaning apart" : "Aligned";
  const summary =
    absDelta < 1
      ? "Market and live WP are nearly identical."
      : `${state}: market is higher on ${marketSide} by ${points(absDelta)}.`;
  const vol = volume(data.volume24hr);

  return (
    <div className="mt-2 border-t border-edge px-1 pt-2">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xs font-bold">Market reality check</h3>
          <p className="mt-0.5 text-[11px] leading-snug text-muted">
            {summary}
          </p>
        </div>
        {vol && (
          <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-[10px] font-semibold text-muted">
            {vol} 24h
          </span>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <TeamRow label={game.teams.away.abbr} live={liveAway} market={marketAway} />
        <TeamRow label={game.teams.home.abbr} live={liveHome} market={marketHome} />
      </div>
      <div className="mt-2 flex gap-3 text-[10px] text-muted">
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-good" />
          Live WP
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-1.5 w-3 rounded-full bg-accent" />
          Polymarket
        </span>
      </div>
    </div>
  );
}

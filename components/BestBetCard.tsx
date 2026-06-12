"use client";

import { useState } from "react";
import useSWR from "swr";
import { addBet } from "@/lib/bets";
import { fetcher, formatGameTime, todayLocal } from "@/lib/fetcher";
import { VISIBLE_REFRESH_MS } from "@/lib/refresh";
import type { BestBetRecommendation, BestBetsResponse } from "@/lib/types";

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function edge(value: number): string {
  return `+${Math.round(value * 100)} pts`;
}

function contextLine(rec: BestBetRecommendation): string {
  const side = rec.pick === "away" ? `@ ${rec.home.abbr}` : `vs ${rec.away.abbr}`;
  return `${formatGameTime(rec.gameDate)} · ${side}`;
}

function trackRecommendation(rec: BestBetRecommendation) {
  addBet([
    {
      gamePk: rec.gamePk,
      officialDate: rec.officialDate,
      gameNumber: rec.gameNumber,
      awayAbbr: rec.away.abbr,
      homeAbbr: rec.home.abbr,
      pick: rec.pick,
      pickTeamId: rec.pickTeamId,
      entryProb: rec.marketProb,
    },
  ]);
}

function AlternateRow({ rec }: { rec: BestBetRecommendation }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface-2 p-2">
      <div className="min-w-0">
        <div className="truncate text-xs font-bold">
          {rec.pickAbbr} ML <span className="font-normal text-muted">{contextLine(rec)}</span>
        </div>
        <div className="mt-0.5 text-[10px] text-muted">
          Model {pct(rec.modelProb)} · Market {pct(rec.marketProb)}
        </div>
      </div>
      <span className="shrink-0 text-xs font-bold tabular-nums text-good">
        {edge(rec.edge)}
      </span>
    </div>
  );
}

export default function BestBetCard() {
  const [trackedPk, setTrackedPk] = useState<number | null>(null);
  const date = todayLocal();
  const { data, isLoading } = useSWR<BestBetsResponse>(
    `/api/bets/best?date=${date}`,
    fetcher,
    { refreshInterval: VISIBLE_REFRESH_MS, revalidateOnFocus: false }
  );
  const top = data?.topPick;

  function onTrack() {
    if (!top) return;
    trackRecommendation(top);
    setTrackedPk(top.gamePk);
  }

  return (
    <section className="mb-3 rounded-xl bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-accent">
            Daily best bet
          </div>
          <h2 className="mt-0.5 text-base font-bold">
            {isLoading && !data
              ? "Scanning moneylines..."
              : top
                ? `${top.pickAbbr} moneyline`
                : "No qualifying pick"}
          </h2>
        </div>
        {top && (
          <span className="shrink-0 rounded-full bg-good/15 px-2 py-1 text-[10px] font-bold text-good">
            {top.confidence}
          </span>
        )}
      </div>

      {top ? (
        <>
          <p className="mt-1 text-xs text-muted">{contextLine(top)}</p>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Model
              </div>
              <div className="mt-1 text-sm font-bold tabular-nums">{pct(top.modelProb)}</div>
            </div>
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
                Market
              </div>
              <div className="mt-1 text-sm font-bold tabular-nums">{pct(top.marketProb)}</div>
            </div>
            <div className="rounded-lg bg-good/10 p-2">
              <div className="text-[10px] font-bold uppercase tracking-wider text-good">
                Edge
              </div>
              <div className="mt-1 text-sm font-bold tabular-nums text-good">
                {edge(top.edge)}
              </div>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1">
            {top.reasons.map((reason) => (
              <span
                key={reason}
                className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted"
              >
                {reason}
              </span>
            ))}
          </div>
          <button
            type="button"
            onClick={onTrack}
            className="mt-3 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white active:opacity-80"
          >
            {trackedPk === top.gamePk ? "Tracked" : "Track Pick"}
          </button>
          {data.alternates.length > 0 && (
            <div className="mt-3 flex flex-col gap-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
                Near misses
              </div>
              {data.alternates.map((rec) => (
                <AlternateRow key={`${rec.gamePk}-${rec.pick}`} rec={rec} />
              ))}
            </div>
          )}
        </>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {data?.noPickReason ??
            "The model is waiting for today's schedule and matched Polymarket prices."}
        </p>
      )}
      {data && (
        <p className="mt-3 text-[10px] text-muted">
          Evaluated {data.candidatesEvaluated} sides · informational only
        </p>
      )}
    </section>
  );
}

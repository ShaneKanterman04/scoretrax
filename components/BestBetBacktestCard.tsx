"use client";

import useSWR from "swr";
import { fetcher, shiftDate, todayLocal } from "@/lib/fetcher";
import { VISIBLE_REFRESH_MS } from "@/lib/refresh";
import type { BestBetBacktestResponse } from "@/lib/types";

function pct(value: number): string {
  return `${Math.round(value * 1000) / 10}%`;
}

export default function BestBetBacktestCard() {
  const endDate = shiftDate(todayLocal(), -1);
  const startDate = shiftDate(endDate, -6);
  const { data } = useSWR<BestBetBacktestResponse>(
    `/api/bets/backtest?startDate=${startDate}&endDate=${endDate}`,
    fetcher,
    { refreshInterval: VISIBLE_REFRESH_MS, revalidateOnFocus: false }
  );

  if (!data) return null;

  return (
    <section className="mb-3 rounded-xl bg-surface p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-muted">
            7-day backtest
          </div>
          <h2 className="mt-0.5 text-base font-bold">
            {data.record.wins}-{data.record.losses}
            {data.record.voids > 0 ? `-${data.record.voids}` : ""}
          </h2>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[10px] font-bold ${
            data.roi >= 0 ? "bg-good/15 text-good" : "bg-live/15 text-live"
          }`}
        >
          ROI {pct(data.roi)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-lg bg-surface-2 p-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Picks
          </div>
          <div className="mt-1 text-sm font-bold">{data.picks.length}</div>
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Avg edge
          </div>
          <div className="mt-1 text-sm font-bold">{pct(data.averageEdge)}</div>
        </div>
        <div className="rounded-lg bg-surface-2 p-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted">
            Skipped
          </div>
          <div className="mt-1 text-sm font-bold">{data.skippedDays.length}</div>
        </div>
      </div>
      <p className="mt-2 text-[10px] leading-snug text-muted">
        Uses historical Polymarket token prices before first pitch and MLB stats available
        before each game.
      </p>
    </section>
  );
}

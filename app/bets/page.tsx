"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import BestBetBacktestCard from "@/components/BestBetBacktestCard";
import BestBetCard from "@/components/BestBetCard";
import BetCard from "@/components/BetCard";
import BetStats from "@/components/BetStats";
import Tabs from "@/components/Tabs";
import { fetcher } from "@/lib/fetcher";
import { useBets } from "@/lib/bets";
import { VISIBLE_REFRESH_MS } from "@/lib/refresh";
import type { ScheduleDay, ScheduleGame } from "@/lib/types";

// Watches one date's schedule and reports its games up for live-state
// display on bet cards. Settlement itself runs globally in BetSettlement
// (mounted in the layout); SWR dedupes the shared schedule fetch.
function ScheduleWatcher({
  date,
  onGames,
}: {
  date: string;
  onGames: (date: string, games: ScheduleGame[]) => void;
}) {
  const { data } = useSWR<ScheduleDay>(`/api/mlb/schedule?date=${date}`, fetcher, {
    refreshInterval: VISIBLE_REFRESH_MS,
    keepPreviousData: true,
  });
  useEffect(() => {
    if (data?.games) onGames(date, data.games);
  }, [date, data, onGames]);
  return null;
}

export default function BetsPage() {
  const { bets } = useBets();
  const [tab, setTab] = useState("Open");
  const [gamesByDate, setGamesByDate] = useState<Record<string, ScheduleGame[]>>({});

  const pendingDates = useMemo(
    () =>
      Array.from(
        new Set(
          bets
            .filter((b) => b.status === "open")
            .flatMap((b) => b.legs)
            .filter((l) => l.result === "pending")
            .map((l) => l.officialDate)
        )
      ),
    [bets]
  );

  const onGames = useCallback((date: string, games: ScheduleGame[]) => {
    setGamesByDate((prev) => ({ ...prev, [date]: games }));
  }, []);

  const gamesByPk = useMemo(
    () =>
      new Map(
        Object.values(gamesByDate)
          .flat()
          .map((g) => [g.gamePk, g])
      ),
    [gamesByDate]
  );

  const shown =
    tab === "Open"
      ? bets.filter((b) => b.status === "open")
      : bets
          .filter((b) => b.status !== "open")
          .sort((a, b) =>
            (b.settledAt ?? b.createdAt).localeCompare(a.settledAt ?? a.createdAt)
          );

  return (
    <main className="mx-auto max-w-5xl px-4 pt-safe">
      {pendingDates.map((date) => (
        <ScheduleWatcher key={date} date={date} onGames={onGames} />
      ))}
      <div className="flex items-center justify-between pb-2">
        <h1 className="text-2xl font-bold">Bets</h1>
        <Link
          href="/bets/new"
          className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white active:opacity-80"
        >
          New Bet
        </Link>
      </div>
      <div className="grid items-start lg:grid-cols-2 lg:gap-3">
        <BestBetCard />
        <BestBetBacktestCard />
      </div>
      <BetStats bets={bets} />
      <Tabs tabs={["Open", "Settled"]} active={tab} onChange={setTab} />
      {shown.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted">
          {tab === "Open"
            ? "No open bets. Build one from a day's games."
            : "No settled bets yet."}
        </div>
      ) : (
        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {shown.map((bet) => (
            <BetCard key={bet.id} bet={bet} gamesByPk={gamesByPk} />
          ))}
        </div>
      )}
    </main>
  );
}

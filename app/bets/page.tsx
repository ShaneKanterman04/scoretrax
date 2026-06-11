"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import BetCard from "@/components/BetCard";
import Tabs from "@/components/Tabs";
import { fetcher } from "@/lib/fetcher";
import { settleFromSchedule, useBets } from "@/lib/bets";
import type { ScheduleDay, ScheduleGame } from "@/lib/types";

// Polls one date's schedule while the page is open: settles pending legs and
// reports the games up for live-state display. One instance per pending date
// keeps hook counts stable.
function ScheduleSettler({
  date,
  onGames,
}: {
  date: string;
  onGames: (date: string, games: ScheduleGame[]) => void;
}) {
  const { data } = useSWR<ScheduleDay>(`/api/mlb/schedule?date=${date}`, fetcher, {
    refreshInterval: (latest) =>
      latest?.games?.some((g) => g.state === "Live") ? 30_000 : 60_000,
    keepPreviousData: true,
  });
  useEffect(() => {
    if (data?.games) {
      settleFromSchedule(date, data.games);
      onGames(date, data.games);
    }
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

  const shown = bets.filter((b) =>
    tab === "Open" ? b.status === "open" : b.status !== "open"
  );

  return (
    <main className="px-4 pt-safe">
      {pendingDates.map((date) => (
        <ScheduleSettler key={date} date={date} onGames={onGames} />
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
      <Tabs tabs={["Open", "Settled"]} active={tab} onChange={setTab} />
      <div className="mt-2 flex flex-col gap-2">
        {shown.length === 0 && (
          <div className="py-16 text-center text-sm text-muted">
            {tab === "Open"
              ? "No open bets. Build one from a day's games."
              : "No settled bets yet."}
          </div>
        )}
        {shown.map((bet) => (
          <BetCard key={bet.id} bet={bet} gamesByPk={gamesByPk} />
        ))}
      </div>
    </main>
  );
}

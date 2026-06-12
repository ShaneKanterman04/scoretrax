"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import DateNav from "@/components/DateNav";
import GameCard from "@/components/GameCard";
import HelpModal from "@/components/HelpModal";
import MyTeamsStrip from "@/components/MyTeamsStrip";
import Tabs from "@/components/Tabs";
import { useBets } from "@/lib/bets";
import { fetcher, todayLocal } from "@/lib/fetcher";
import { useFavorites, usePinnedGames } from "@/lib/favorites";
import { getRedZoneSignal } from "@/lib/redzone";
import type { ScheduleDay } from "@/lib/types";

export default function ScoresPage() {
  const [date, setDate] = useState(todayLocal);
  const [mode, setMode] = useState("Scores");
  const { isFavorite } = useFavorites();
  const { isPinned } = usePinnedGames();
  const { bets } = useBets();
  const { data, isLoading } = useSWR<ScheduleDay>(
    `/api/mlb/schedule?date=${date}`,
    fetcher,
    {
      refreshInterval: (latest) => {
        if (latest?.games?.some((g) => g.state === "Live")) return 10_000;
        return date === todayLocal() ? 30_000 : 0;
      },
      keepPreviousData: true,
      dedupingInterval: 2_000,
      focusThrottleInterval: 5_000,
    }
  );

  const games = data?.games ?? [];
  const openBetCounts = useMemo(() => {
    const counts = new Map<number, number>();
    for (const bet of bets) {
      if (bet.status !== "open") continue;
      for (const leg of bet.legs) {
        if (leg.result !== "pending") continue;
        counts.set(leg.gamePk, (counts.get(leg.gamePk) ?? 0) + 1);
      }
    }
    return counts;
  }, [bets]);
  const pinnedGames = games.filter((g) => isPinned(g.gamePk));
  const unpinned = games.filter((g) => !isPinned(g.gamePk));
  const favGames = unpinned.filter(
    (g) => isFavorite(g.away.id) || isFavorite(g.home.id)
  );
  const restGames = unpinned.filter(
    (g) => !isFavorite(g.away.id) && !isFavorite(g.home.id)
  );
  const redZoneGames = games
    .filter((g) => g.state !== "Final")
    .map((game) => ({ game, signal: getRedZoneSignal(game) }))
    .filter(({ signal }) => signal.score > 0)
    .sort((a, b) => {
      if (b.signal.score !== a.signal.score) return b.signal.score - a.signal.score;
      return new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime();
    });

  return (
    <main className="px-4 pt-safe">
      <div className="flex items-center justify-between gap-3 pb-1">
        <h1 className="text-2xl font-bold">Scores</h1>
        <HelpModal title="Scores help" triggerLabel="Scores help">
          <p>
            Scores keeps pinned games first, then favorite teams, then the rest of the
            league.
          </p>
          <p>
            RedZone ranks unfinished games by live pressure: inning, score margin,
            runners, outs, and walk-off chances.
          </p>
        </HelpModal>
      </div>
      <DateNav date={date} onChange={setDate} />
      <MyTeamsStrip />
      <div className="mt-3">
        <Tabs tabs={["Scores", "RedZone"]} active={mode} onChange={setMode} />
      </div>
      <div className="mt-2 flex flex-col gap-2">
        {isLoading && !data && (
          <div className="py-16 text-center text-sm text-muted">Loading games…</div>
        )}
        {data?.games.length === 0 && (
          <div className="py-16 text-center text-sm text-muted">No games scheduled.</div>
        )}
        {mode === "RedZone" && data && redZoneGames.length === 0 && (
          <div className="py-16 text-center text-sm text-muted">
            No live pressure spots right now.
          </div>
        )}
        {mode === "RedZone" &&
          redZoneGames.map(({ game, signal }, index) => (
            <div key={game.gamePk} className="flex flex-col gap-1">
              {index === 0 && (
                <h2 className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
                  RedZone
                </h2>
              )}
              <GameCard
                game={game}
                redZone={signal}
                betCount={openBetCounts.get(game.gamePk) ?? 0}
              />
            </div>
          ))}
        {mode === "Scores" && pinnedGames.length > 0 && (
          <>
            <h2 className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Pinned
            </h2>
            {pinnedGames.map((g) => (
              <GameCard key={g.gamePk} game={g} betCount={openBetCounts.get(g.gamePk) ?? 0} />
            ))}
          </>
        )}
        {mode === "Scores" && favGames.length > 0 && (
          <>
            <h2 className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              My teams
            </h2>
            {favGames.map((g) => (
              <GameCard key={g.gamePk} game={g} betCount={openBetCounts.get(g.gamePk) ?? 0} />
            ))}
          </>
        )}
        {mode === "Scores" &&
          (pinnedGames.length > 0 || favGames.length > 0) &&
          restGames.length > 0 && (
            <h2 className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Around the league
            </h2>
          )}
        {mode === "Scores" && restGames.map((g) => (
          <GameCard key={g.gamePk} game={g} betCount={openBetCounts.get(g.gamePk) ?? 0} />
        ))}
      </div>
    </main>
  );
}

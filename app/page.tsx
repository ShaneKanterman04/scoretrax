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
import { VISIBLE_REFRESH_MS } from "@/lib/refresh";
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
        if (latest?.games?.some((g) => g.state === "Live")) return VISIBLE_REFRESH_MS;
        return date === todayLocal() ? VISIBLE_REFRESH_MS : 0;
      },
      keepPreviousData: true,
      dedupingInterval: VISIBLE_REFRESH_MS,
      focusThrottleInterval: VISIBLE_REFRESH_MS,
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
  const isEffectivelyPinned = (gamePk: number) =>
    isPinned(gamePk) || openBetCounts.has(gamePk);
  const pinnedGames = games.filter((g) => isEffectivelyPinned(g.gamePk));
  const unpinned = games.filter((g) => !isEffectivelyPinned(g.gamePk));
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

  const labeledRest =
    pinnedGames.length > 0 || favGames.length > 0 ? "Around the league" : undefined;

  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-safe">
      <div className="flex items-center justify-between gap-3 pb-1">
        <h1 className="text-2xl font-bold">Scores</h1>
        <HelpModal title="Scores help" triggerLabel="Scores help">
          <p>
            Scores keeps pinned games and games with open bets first, then favorite
            teams, then the rest of the league.
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
      <div className="mt-3 flex flex-col gap-4">
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
        {mode === "RedZone" && redZoneGames.length > 0 && (
          <GameSection label="RedZone">
            {redZoneGames.map(({ game, signal }) => (
              <GameCard
                key={game.gamePk}
                game={game}
                redZone={signal}
                betCount={openBetCounts.get(game.gamePk) ?? 0}
              />
            ))}
          </GameSection>
        )}
        {mode === "Scores" && pinnedGames.length > 0 && (
          <GameSection label="Pinned">
            {pinnedGames.map((g) => (
              <GameCard key={g.gamePk} game={g} betCount={openBetCounts.get(g.gamePk) ?? 0} />
            ))}
          </GameSection>
        )}
        {mode === "Scores" && favGames.length > 0 && (
          <GameSection label="My teams">
            {favGames.map((g) => (
              <GameCard key={g.gamePk} game={g} betCount={openBetCounts.get(g.gamePk) ?? 0} />
            ))}
          </GameSection>
        )}
        {mode === "Scores" && restGames.length > 0 && (
          <GameSection label={labeledRest}>
            {restGames.map((g) => (
              <GameCard key={g.gamePk} game={g} betCount={openBetCounts.get(g.gamePk) ?? 0} />
            ))}
          </GameSection>
        )}
      </div>
    </main>
  );
}

// A titled group of game cards: single column on mobile, multi-column on
// wider screens. Header is omitted when `label` is undefined.
function GameSection({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-2">
      {label && (
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-muted">
          {label}
        </h2>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {children}
      </div>
    </section>
  );
}

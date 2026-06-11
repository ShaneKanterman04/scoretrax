"use client";

import { useState } from "react";
import useSWR from "swr";
import DateNav from "@/components/DateNav";
import GameCard from "@/components/GameCard";
import MyTeamsStrip from "@/components/MyTeamsStrip";
import { fetcher, todayLocal } from "@/lib/fetcher";
import { useFavorites, usePinnedGames } from "@/lib/favorites";
import type { ScheduleDay } from "@/lib/types";

export default function ScoresPage() {
  const [date, setDate] = useState(todayLocal);
  const { isFavorite } = useFavorites();
  const { isPinned } = usePinnedGames();
  const { data, isLoading } = useSWR<ScheduleDay>(
    `/api/mlb/schedule?date=${date}`,
    fetcher,
    {
      refreshInterval: (latest) =>
        latest?.games?.some((g) => g.state === "Live") ? 30_000 : 60_000,
      keepPreviousData: true,
    }
  );

  const games = data?.games ?? [];
  const pinnedGames = games.filter((g) => isPinned(g.gamePk));
  const unpinned = games.filter((g) => !isPinned(g.gamePk));
  const favGames = unpinned.filter(
    (g) => isFavorite(g.away.id) || isFavorite(g.home.id)
  );
  const restGames = unpinned.filter(
    (g) => !isFavorite(g.away.id) && !isFavorite(g.home.id)
  );

  return (
    <main className="px-4 pt-3">
      <h1 className="pb-1 text-2xl font-bold">Scores</h1>
      <DateNav date={date} onChange={setDate} />
      <MyTeamsStrip />
      <div className="mt-2 flex flex-col gap-2">
        {isLoading && !data && (
          <div className="py-16 text-center text-sm text-muted">Loading games…</div>
        )}
        {data?.games.length === 0 && (
          <div className="py-16 text-center text-sm text-muted">No games scheduled.</div>
        )}
        {pinnedGames.length > 0 && (
          <>
            <h2 className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Pinned
            </h2>
            {pinnedGames.map((g) => (
              <GameCard key={g.gamePk} game={g} />
            ))}
          </>
        )}
        {favGames.length > 0 && (
          <>
            <h2 className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              My teams
            </h2>
            {favGames.map((g) => (
              <GameCard key={g.gamePk} game={g} />
            ))}
          </>
        )}
        {(pinnedGames.length > 0 || favGames.length > 0) &&
          restGames.length > 0 && (
            <h2 className="mt-1 text-[11px] font-bold uppercase tracking-wider text-muted">
              Around the league
            </h2>
          )}
        {restGames.map((g) => (
          <GameCard key={g.gamePk} game={g} />
        ))}
      </div>
    </main>
  );
}

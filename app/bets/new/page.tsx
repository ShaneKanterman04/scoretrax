"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import DateNav from "@/components/DateNav";
import PickRow from "@/components/PickRow";
import { fetcher, todayLocal } from "@/lib/fetcher";
import { addBet, combinedProb } from "@/lib/bets";
import type { BetLeg, ScheduleDay, ScheduleGame } from "@/lib/types";

type SlipLeg = Omit<BetLeg, "result">;

export default function NewBetPage() {
  const router = useRouter();
  const [date, setDate] = useState(todayLocal);
  // Keyed by gamePk; picks survive date navigation so parlays can span days.
  const [slip, setSlip] = useState<Map<number, SlipLeg>>(new Map());
  const { data, isLoading } = useSWR<ScheduleDay>(
    `/api/mlb/schedule?date=${date}`,
    fetcher,
    { keepPreviousData: true }
  );

  // Final games stay pickable so a forgotten bet can be backfilled; the
  // settler grades those legs as soon as the bet is placed.
  const games = data?.games ?? [];

  function togglePick(game: ScheduleGame, side: "away" | "home", entryProb?: number) {
    setSlip((prev) => {
      const next = new Map(prev);
      if (next.get(game.gamePk)?.pick === side) {
        next.delete(game.gamePk);
      } else {
        next.set(game.gamePk, {
          gamePk: game.gamePk,
          officialDate: game.officialDate,
          gameNumber: game.gameNumber,
          awayAbbr: game.away.abbr,
          homeAbbr: game.home.abbr,
          pick: side,
          pickTeamId: side === "away" ? game.away.id : game.home.id,
          entryProb,
        });
      }
      return next;
    });
  }

  function placeBet() {
    addBet(Array.from(slip.values()));
    setSlip(new Map());
    router.push("/bets");
  }

  const legs = Array.from(slip.values());
  const combined = combinedProb(legs.map((l) => l.entryProb));

  return (
    <main className="mx-auto max-w-3xl px-4 pt-safe pb-20">
      <h1 className="pb-1 text-2xl font-bold">New Bet</h1>
      <DateNav date={date} onChange={setDate} />
      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {isLoading && !data && (
          <div className="py-16 text-center text-sm text-muted sm:col-span-2">Loading games…</div>
        )}
        {data && games.length === 0 && (
          <div className="py-16 text-center text-sm text-muted sm:col-span-2">
            No games on this date.
          </div>
        )}
        {games.map((g) => (
          <PickRow
            key={g.gamePk}
            game={g}
            pick={slip.get(g.gamePk)?.pick}
            onPick={(side, prob) => togglePick(g, side, prob)}
          />
        ))}
      </div>
      {legs.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(3.5rem_+_env(safe-area-inset-bottom))] z-40 border-t border-edge bg-surface/95 backdrop-blur lg:bottom-0 lg:pl-56">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
            <span className="text-sm font-semibold">
              {legs.length} leg{legs.length > 1 ? "s" : ""}
              {combined !== undefined && (
                <span className="text-muted">
                  {" "}
                  · combined {Math.round(combined * 100)}%
                </span>
              )}
            </span>
            <button
              onClick={placeBet}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white active:opacity-80"
            >
              Place Bet
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

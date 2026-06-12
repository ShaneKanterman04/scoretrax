"use client";

import useSWR from "swr";
import { fetcher, formatGameTime } from "@/lib/fetcher";
import { VISIBLE_REFRESH_MS } from "@/lib/refresh";
import type { MarketOdds, ScheduleGame, ScheduleTeam } from "@/lib/types";

function SideButton({
  team,
  value,
  selected,
  onTap,
}: {
  team: ScheduleTeam;
  value: string;
  selected: boolean;
  onTap: () => void;
}) {
  return (
    <button
      aria-pressed={selected}
      onClick={onTap}
      className={`flex min-h-11 flex-1 items-center justify-between rounded-lg px-3 text-sm font-semibold transition-colors ${
        selected ? "bg-accent text-white" : "bg-surface-2 active:bg-edge"
      }`}
    >
      <span>
        {team.abbr}{" "}
        <span className={`text-[11px] font-normal ${selected ? "text-white/70" : "text-muted"}`}>
          {team.record}
        </span>
      </span>
      <span className="tabular-nums">{value}</span>
    </button>
  );
}

export default function PickRow({
  game,
  pick,
  onPick,
}: {
  game: ScheduleGame;
  pick?: "away" | "home";
  onPick: (side: "away" | "home", entryProb?: number) => void;
}) {
  // Finished games can still be picked (backfilling a forgotten bet), but a
  // resolved market's price is ~100/0 — useless as entry odds, so skip the
  // fetch and record no entryProb; settlement grades the leg right away.
  const isFinal = game.state === "Final";
  const { data } = useSWR<MarketOdds>(
    isFinal
      ? null
      : `/api/polymarket/game?away=${game.away.abbr}&home=${game.home.abbr}&date=${game.officialDate}&gameNumber=${game.gameNumber}`,
    fetcher,
    { refreshInterval: VISIBLE_REFRESH_MS, revalidateOnFocus: false }
  );
  const awayProb = data?.matched ? data.awayProb : undefined;
  const homeProb = data?.matched ? data.homeProb : undefined;
  const value = (prob?: number, score?: number) =>
    isFinal
      ? String(score ?? "—")
      : prob !== undefined
        ? `${Math.round(prob * 100)}%`
        : "—";

  return (
    <div className="rounded-xl bg-surface p-3">
      <div className="flex items-center justify-between pb-2 text-[11px] text-muted">
        <span className="font-semibold">
          {game.away.abbr} @ {game.home.abbr}
          {game.doubleHeader !== "N" && ` · Gm ${game.gameNumber}`}
        </span>
        <span>
          {game.state === "Live" ? (
            <span className="font-bold text-live">
              {game.isTop ? "▲" : "▼"} {game.inningOrdinal} · {game.away.score}-{game.home.score}
            </span>
          ) : isFinal ? (
            <span className="font-bold">{game.detailedState}</span>
          ) : (
            formatGameTime(game.gameDate)
          )}
        </span>
      </div>
      <div className="flex gap-2">
        <SideButton
          team={game.away}
          value={value(awayProb, game.away.score)}
          selected={pick === "away"}
          onTap={() => onPick("away", awayProb)}
        />
        <SideButton
          team={game.home}
          value={value(homeProb, game.home.score)}
          selected={pick === "home"}
          onTap={() => onPick("home", homeProb)}
        />
      </div>
    </div>
  );
}

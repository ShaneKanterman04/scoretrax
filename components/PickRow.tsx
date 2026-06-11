"use client";

import useSWR from "swr";
import { fetcher, formatGameTime } from "@/lib/fetcher";
import type { MarketOdds, ScheduleGame, ScheduleTeam } from "@/lib/types";

function SideButton({
  team,
  prob,
  selected,
  onTap,
}: {
  team: ScheduleTeam;
  prob?: number;
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
      <span className="tabular-nums">
        {prob !== undefined ? `${Math.round(prob * 100)}%` : "—"}
      </span>
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
  const { data } = useSWR<MarketOdds>(
    `/api/polymarket/game?away=${game.away.abbr}&home=${game.home.abbr}&date=${game.officialDate}&gameNumber=${game.gameNumber}`,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: false }
  );
  const awayProb = data?.matched ? data.awayProb : undefined;
  const homeProb = data?.matched ? data.homeProb : undefined;

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
          ) : (
            formatGameTime(game.gameDate)
          )}
        </span>
      </div>
      <div className="flex gap-2">
        <SideButton
          team={game.away}
          prob={awayProb}
          selected={pick === "away"}
          onTap={() => onPick("away", awayProb)}
        />
        <SideButton
          team={game.home}
          prob={homeProb}
          selected={pick === "home"}
          onTap={() => onPick("home", homeProb)}
        />
      </div>
    </div>
  );
}

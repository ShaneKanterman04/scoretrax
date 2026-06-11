"use client";

import Link from "next/link";
import type { ScheduleGame, ScheduleTeam } from "@/lib/types";
import { formatGameTime } from "@/lib/fetcher";
import type { RedZoneSignal } from "@/lib/redzone";
import BasesDiamond from "./BasesDiamond";
import GameStar from "./GameStar";
import OddsChip from "./OddsChip";

function TeamRow({ team, winner, live }: { team: ScheduleTeam; winner?: boolean; live?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-baseline gap-2">
        <span className={`text-sm font-bold ${winner === false ? "text-muted" : ""}`}>
          {team.abbr}
        </span>
        <span className="text-[11px] text-muted">{team.record}</span>
      </div>
      {team.score !== undefined && (
        <span
          className={`text-lg font-bold tabular-nums ${
            winner === false ? "text-muted" : live ? "text-foreground" : ""
          }`}
        >
          {team.score}
        </span>
      )}
    </div>
  );
}

export default function GameCard({
  game,
  redZone,
}: {
  game: ScheduleGame;
  redZone?: RedZoneSignal;
}) {
  const { state } = game;
  const awayWon =
    state === "Final" ? (game.away.score ?? 0) > (game.home.score ?? 0) : undefined;

  return (
    <Link
      href={`/game/${game.gamePk}`}
      className="flex items-stretch gap-3 rounded-xl bg-surface p-3 active:bg-surface-2"
    >
      <div className="min-w-0 flex-1 flex flex-col justify-center gap-1">
        <TeamRow team={game.away} winner={awayWon} live={state === "Live"} />
        <TeamRow
          team={game.home}
          winner={awayWon === undefined ? undefined : !awayWon}
          live={state === "Live"}
        />
        {redZone && (
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            <span className="rounded bg-live/15 px-1.5 py-0.5 text-[10px] font-bold text-live">
              RZ {redZone.score}
            </span>
            <span className="truncate text-[10px] font-medium text-muted">
              {redZone.label}
              {redZone.reasons.length > 0 ? ` · ${redZone.reasons.join(" · ")}` : ""}
            </span>
          </div>
        )}
      </div>
      <GameStar gamePk={game.gamePk} officialDate={game.officialDate} />
      <div className="flex w-28 shrink-0 flex-col items-end justify-center gap-1 border-l border-edge pl-3 text-right">
        {state === "Preview" && (
          <>
            <span className="text-sm font-semibold">{formatGameTime(game.gameDate)}</span>
            {(game.away.probablePitcher || game.home.probablePitcher) && (
              <span className="text-[10px] leading-tight text-muted">
                {game.away.probablePitcher?.split(" ").at(-1) ?? "TBD"} vs{" "}
                {game.home.probablePitcher?.split(" ").at(-1) ?? "TBD"}
              </span>
            )}
            <OddsChip
              away={game.away.abbr}
              home={game.home.abbr}
              date={game.officialDate}
              gameNumber={game.gameNumber}
            />
          </>
        )}
        {state === "Live" && (
          <>
            <span className="text-xs font-bold text-live">
              {game.isTop ? "▲" : "▼"} {game.inningOrdinal}
            </span>
            <BasesDiamond bases={game.bases} size={44} />
            <span className="text-[10px] text-muted">{game.outs ?? 0} out</span>
          </>
        )}
        {state === "Final" && (
          <span className="text-sm font-bold text-muted">{game.detailedState}</span>
        )}
      </div>
    </Link>
  );
}

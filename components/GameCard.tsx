"use client";

import Link from "next/link";
import type { ScheduleGame, ScheduleTeam } from "@/lib/types";
import { formatGameTime } from "@/lib/fetcher";
import type { RedZoneSignal } from "@/lib/redzone";
import BasesDiamond from "./BasesDiamond";
import FirstPitchCountdown from "./FirstPitchCountdown";
import GameStar from "./GameStar";
import OddsChip from "./OddsChip";

function TeamRow({
  team,
  winner,
  live,
  showScore,
}: {
  team: ScheduleTeam;
  winner?: boolean;
  live?: boolean;
  showScore: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex min-w-0 items-baseline gap-2">
        <span className={`text-sm font-bold ${winner === false ? "text-muted" : ""}`}>
          {team.abbr}
        </span>
        <span className="truncate text-[11px] text-muted">{team.record}</span>
      </div>
      {showScore && team.score !== undefined && (
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

function pitcherLabel(team: ScheduleTeam): string {
  const name = team.probablePitcher?.split(" ").at(-1) ?? "TBD";
  return team.probablePitcherEra ? `${name} ${team.probablePitcherEra} ERA` : name;
}

export default function GameCard({
  game,
  redZone,
  betCount = 0,
}: {
  game: ScheduleGame;
  redZone?: RedZoneSignal;
  betCount?: number;
}) {
  const { state } = game;
  const showScore = state !== "Preview";
  const awayWon =
    state === "Final" ? (game.away.score ?? 0) > (game.home.score ?? 0) : undefined;

  return (
    <Link
      href={`/game/${game.gamePk}`}
      className="flex items-stretch gap-3 rounded-xl bg-surface p-3 ring-1 ring-white/[0.03] active:bg-surface-2"
    >
      <div className="min-w-0 flex flex-1 flex-col justify-center gap-1">
        <TeamRow team={game.away} winner={awayWon} live={state === "Live"} showScore={showScore} />
        <TeamRow
          team={game.home}
          winner={awayWon === undefined ? undefined : !awayWon}
          live={state === "Live"}
          showScore={showScore}
        />
        {(betCount > 0 || redZone) && (
          <div className="mt-1 flex min-w-0 items-center gap-1.5">
            {betCount > 0 && (
              <span className="rounded bg-good/15 px-1.5 py-0.5 text-[10px] font-bold text-good">
                {betCount > 1 ? `${betCount} BETS` : "BET"}
              </span>
            )}
            {redZone && (
              <>
                <span className="rounded bg-live/15 px-1.5 py-0.5 text-[10px] font-bold text-live">
                  RZ {redZone.score}
                </span>
                <span className="truncate text-[10px] font-medium text-muted">
                  {redZone.label}
                  {redZone.reasons.length > 0 ? ` · ${redZone.reasons.join(" · ")}` : ""}
                </span>
              </>
            )}
          </div>
        )}
      </div>
      <GameStar gamePk={game.gamePk} officialDate={game.officialDate} />
      <div className="flex w-32 shrink-0 flex-col items-end justify-center gap-1 border-l border-edge pl-3 text-right">
        {state === "Preview" && (
          <>
            <span className="text-sm font-semibold">{formatGameTime(game.gameDate)}</span>
            <span className="text-[10px] font-semibold uppercase text-muted">First pitch</span>
            <FirstPitchCountdown gameDate={game.gameDate} />
            {(game.away.probablePitcher || game.home.probablePitcher) && (
              <span className="max-w-full text-[10px] leading-tight text-muted">
                {pitcherLabel(game.away)} vs {pitcherLabel(game.home)}
              </span>
            )}
            <OddsChip
              gamePk={game.gamePk}
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

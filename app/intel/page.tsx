"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import useSWR from "swr";
import DateNav from "@/components/DateNav";
import HelpModal from "@/components/HelpModal";
import Tabs from "@/components/Tabs";
import { fetcher, formatGameTime, todayLocal } from "@/lib/fetcher";
import { getMarketGap, getPressureSignal } from "@/lib/live-intel";
import type { LiveGame, MarketOdds, ScheduleDay, ScheduleGame, WinProbSeries } from "@/lib/types";

function inningLabel(game: LiveGame): string {
  const arrow = game.linescore.isTop ? "▲" : "▼";
  return `${arrow} ${game.linescore.ordinal ?? ""}`.trim();
}

function pct(value: number): string {
  return `${Math.round(value)}%`;
}

function LoadingState({ label }: { label: string }) {
  return <div className="py-14 text-center text-sm text-muted">{label}</div>;
}

function useLiveIntel(date: string) {
  const { data: schedule, isLoading } = useSWR<ScheduleDay>(
    `/api/mlb/schedule?date=${date}`,
    fetcher,
    {
      refreshInterval: 30_000,
      keepPreviousData: true,
    }
  );
  const liveSchedule = useMemo(
    () => (schedule?.games ?? []).filter((game) => game.state === "Live"),
    [schedule]
  );
  const upcomingGames = useMemo(
    () =>
      (schedule?.games ?? [])
        .filter((game) => game.state === "Preview")
        .sort((a, b) => new Date(a.gameDate).getTime() - new Date(b.gameDate).getTime()),
    [schedule]
  );
  const liveKey = liveSchedule.map((game) => game.gamePk).join(",");
  const upcomingKey = upcomingGames.map((game) => game.gamePk).join(",");

  const { data: liveGames } = useSWR<LiveGame[]>(
    liveKey ? ["intel-live", liveKey] : null,
    () =>
      Promise.all(
        liveSchedule.map((game) => fetcher(`/api/mlb/game/${game.gamePk}/live`))
      ),
    { refreshInterval: 8_000, keepPreviousData: true }
  );

  const { data: winProbs } = useSWR<(WinProbSeries | undefined)[]>(
    liveGames?.length ? ["intel-winprob", liveKey] : null,
    () =>
      Promise.all(
        liveGames!.map((game) =>
          fetcher(`/api/mlb/game/${game.gamePk}/winprob`).catch(() => undefined)
        )
      ),
    { refreshInterval: 30_000, keepPreviousData: true }
  );

  const { data: odds } = useSWR<(MarketOdds | undefined)[]>(
    liveGames?.length ? ["intel-odds", liveKey] : null,
    () =>
      Promise.all(
        liveGames!.map((game) =>
          fetcher(
            `/api/polymarket/game?away=${encodeURIComponent(
              game.teams.away.abbr
            )}&home=${encodeURIComponent(game.teams.home.abbr)}&date=${
              game.officialDate
            }&gameNumber=${game.gameNumber}`
          ).catch(() => undefined)
        )
      ),
    { refreshInterval: 60_000, keepPreviousData: true, revalidateOnFocus: false }
  );

  const { data: upcomingOdds } = useSWR<(MarketOdds | undefined)[]>(
    upcomingGames.length ? ["intel-upcoming-odds", upcomingKey] : null,
    () =>
      Promise.all(
        upcomingGames.map((game) =>
          fetcher(
            `/api/polymarket/game?away=${encodeURIComponent(
              game.away.abbr
            )}&home=${encodeURIComponent(game.home.abbr)}&date=${game.officialDate}&gameNumber=${
              game.gameNumber
            }`
          ).catch(() => undefined)
        )
      ),
    { refreshInterval: 60_000, keepPreviousData: true, revalidateOnFocus: false }
  );

  return {
    schedule,
    isLoading,
    liveGames: liveSchedule.length === 0 ? [] : liveGames,
    winProbs,
    odds,
    upcomingGames,
    upcomingOdds,
  };
}

function PressureStack({
  liveGames,
  winProbs,
  upcomingGames,
}: {
  liveGames?: LiveGame[];
  winProbs?: (WinProbSeries | undefined)[];
  upcomingGames?: ScheduleGame[];
}) {
  if (!liveGames) return <LoadingState label="Loading live pressure…" />;

  const rows = liveGames
    .map((game, index) => ({
      game,
      signal: getPressureSignal(game, winProbs?.[index]),
    }))
    .filter(({ signal }) => signal.score > 0)
    .sort((a, b) => b.signal.score - a.signal.score)
    .slice(0, 8);

  return (
    <div className="mt-3 flex flex-col gap-2">
      {rows.length === 0 && (upcomingGames?.length ?? 0) === 0 && (
        <LoadingState label="No live at-bats or upcoming games right now." />
      )}
      {rows.map(({ game, signal }, index) => (
        <Link
          key={game.gamePk}
          href={`/game/${game.gamePk}`}
          className="rounded-xl bg-surface p-3 active:bg-surface-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded bg-live/15 text-xs font-bold text-live">
                  {index + 1}
                </span>
                <span className="truncate text-sm font-bold">
                  {game.teams.away.abbr} {game.teams.away.score} · {game.teams.home.abbr}{" "}
                  {game.teams.home.score}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">
                {inningLabel(game)} · {signal.situation}
              </p>
              {game.matchup?.batter && game.matchup?.pitcher && (
                <p className="mt-1 truncate text-[11px] text-muted">
                  {game.matchup.batter.name} vs {game.matchup.pitcher.name}
                </p>
              )}
            </div>
            <div className="shrink-0 text-right">
              <div className="text-lg font-bold tabular-nums text-live">{signal.score}</div>
              <div className="text-[10px] font-semibold text-muted">{signal.label}</div>
            </div>
          </div>
          {signal.reasons.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {signal.reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted"
                >
                  {reason}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
      {(upcomingGames?.length ?? 0) > 0 && (
        <>
          <h2 className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted">
            On deck
          </h2>
          {upcomingGames!.slice(0, 6).map((game) => (
            <Link
              key={game.gamePk}
              href={`/game/${game.gamePk}`}
              className="rounded-xl bg-surface p-3 active:bg-surface-2"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">
                    {game.away.abbr} at {game.home.abbr}
                  </div>
                  <p className="mt-1 text-xs text-muted">
                    {formatGameTime(game.gameDate)} · {game.venue}
                  </p>
                  {(game.away.probablePitcher || game.home.probablePitcher) && (
                    <p className="mt-1 truncate text-[11px] text-muted">
                      {game.away.probablePitcher ?? "TBD"} vs{" "}
                      {game.home.probablePitcher ?? "TBD"}
                    </p>
                  )}
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-2 py-1 text-[10px] font-bold text-muted">
                  Pregame
                </span>
              </div>
            </Link>
          ))}
        </>
      )}
    </div>
  );
}

function MarketBoard({
  liveGames,
  winProbs,
  odds,
  upcomingGames,
  upcomingOdds,
}: {
  liveGames?: LiveGame[];
  winProbs?: (WinProbSeries | undefined)[];
  odds?: (MarketOdds | undefined)[];
  upcomingGames?: ScheduleGame[];
  upcomingOdds?: (MarketOdds | undefined)[];
}) {
  if (!liveGames) return <LoadingState label="Loading market gaps…" />;

  const rows = liveGames
    .map((game, index) => ({
      game,
      gap: getMarketGap(game, odds?.[index], winProbs?.[index]),
    }))
    .filter((row): row is { game: LiveGame; gap: NonNullable<typeof row.gap> } => !!row.gap)
    .sort((a, b) => b.gap.delta - a.gap.delta);
  const pregameRows = (upcomingGames ?? [])
    .map((game, index) => ({ game, odds: upcomingOdds?.[index] }))
    .filter(
      (row): row is { game: ScheduleGame; odds: MarketOdds } =>
        !!row.odds?.matched &&
        row.odds.awayProb !== undefined &&
        row.odds.homeProb !== undefined
    )
    .sort((a, b) => new Date(a.game.gameDate).getTime() - new Date(b.game.gameDate).getTime());

  return (
    <div className="mt-3 flex flex-col gap-2">
      {rows.length === 0 && pregameRows.length === 0 && (
        <LoadingState label="No matched Polymarket games yet." />
      )}
      {rows.map(({ game, gap }) => (
        <Link
          key={game.gamePk}
          href={`/game/${game.gamePk}`}
          className="rounded-xl bg-surface p-3 active:bg-surface-2"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-sm font-bold">
                {game.teams.away.abbr} {game.teams.away.score} · {game.teams.home.abbr}{" "}
                {game.teams.home.score}
              </div>
              <p className="mt-1 text-xs text-muted">
                {gap.label}: market is higher on {gap.side} by {Math.round(gap.delta)} pts
              </p>
            </div>
            <div className="shrink-0 text-right text-[10px] text-muted">
              <div>{inningLabel(game)}</div>
              <div className="mt-0.5 font-bold text-accent">{Math.round(gap.delta)} pts</div>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="font-bold">{game.teams.away.abbr}</div>
              <div className="mt-1 text-muted">
                WP {pct(gap.awayLive)} · Mkt {pct(gap.awayMarket)}
              </div>
            </div>
            <div className="rounded-lg bg-surface-2 p-2">
              <div className="font-bold">{game.teams.home.abbr}</div>
              <div className="mt-1 text-muted">
                WP {pct(gap.homeLive)} · Mkt {pct(gap.homeMarket)}
              </div>
            </div>
          </div>
        </Link>
      ))}
      {pregameRows.length > 0 && (
        <>
          <h2 className="mt-2 text-[11px] font-bold uppercase tracking-wider text-muted">
            Pregame markets
          </h2>
          {pregameRows.slice(0, 8).map(({ game, odds }) => {
            const awayProb = odds.awayProb! * 100;
            const homeProb = odds.homeProb! * 100;
            const favorite =
              homeProb >= awayProb
                ? { abbr: game.home.abbr, prob: homeProb }
                : { abbr: game.away.abbr, prob: awayProb };
            return (
              <Link
                key={game.gamePk}
                href={`/game/${game.gamePk}`}
                className="rounded-xl bg-surface p-3 active:bg-surface-2"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-sm font-bold">
                      {game.away.abbr} at {game.home.abbr}
                    </div>
                    <p className="mt-1 text-xs text-muted">
                      {formatGameTime(game.gameDate)} · market favors {favorite.abbr}{" "}
                      {pct(favorite.prob)}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-accent/15 px-2 py-1 text-[10px] font-bold text-accent">
                    Pregame
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-surface-2 p-2">
                    <div className="font-bold">{game.away.abbr}</div>
                    <div className="mt-1 text-muted">Mkt {pct(awayProb)}</div>
                  </div>
                  <div className="rounded-lg bg-surface-2 p-2">
                    <div className="font-bold">{game.home.abbr}</div>
                    <div className="mt-1 text-muted">Mkt {pct(homeProb)}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </>
      )}
    </div>
  );
}

export default function IntelPage() {
  const [date, setDate] = useState(todayLocal);
  const [tab, setTab] = useState("Pressure");
  const { isLoading, liveGames, winProbs, odds, upcomingGames, upcomingOdds } =
    useLiveIntel(date);

  return (
    <main className="px-4 pt-safe">
      <div className="flex items-center justify-between gap-3 pb-1">
        <h1 className="text-2xl font-bold">Intel</h1>
        <HelpModal title="Intel help" triggerLabel="Intel help">
          <p>
            Pressure ranks the live at-bats most likely to swing a game right now.
            Pregame rows appear when no at-bat data exists yet.
          </p>
          <p>
            Market compares Polymarket prices against live win probability when a game is
            underway, then falls back to pregame market prices before first pitch.
          </p>
        </HelpModal>
      </div>
      <DateNav date={date} onChange={setDate} />
      <div className="mt-3">
        <Tabs tabs={["Pressure", "Market"]} active={tab} onChange={setTab} />
      </div>
      {isLoading && !liveGames ? (
        <LoadingState label="Loading games…" />
      ) : tab === "Pressure" ? (
        <PressureStack
          liveGames={liveGames}
          winProbs={winProbs}
          upcomingGames={upcomingGames}
        />
      ) : (
        <MarketBoard
          liveGames={liveGames}
          winProbs={winProbs}
          odds={odds}
          upcomingGames={upcomingGames}
          upcomingOdds={upcomingOdds}
        />
      )}
    </main>
  );
}

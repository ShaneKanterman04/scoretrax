"use client";

import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import { combinedProb, deleteBet } from "@/lib/bets";
import type { Bet, BetLeg, MarketOdds, ScheduleGame } from "@/lib/types";

const STATUS_STYLE: Record<Bet["status"], string> = {
  open: "bg-accent/15 text-accent",
  won: "bg-good/15 text-good",
  lost: "bg-live/15 text-live",
  void: "bg-surface-2 text-muted",
};

function oddsUrl(leg: BetLeg): string {
  return `/api/polymarket/game?away=${leg.awayAbbr}&home=${leg.homeAbbr}&date=${leg.officialDate}&gameNumber=${leg.gameNumber}`;
}

function pct(p: number): string {
  return `${Math.round(p * 100)}%`;
}

function shortDate(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
}

function legLiveProb(leg: BetLeg, odds?: MarketOdds | null): number | undefined {
  if (leg.result === "won" || leg.result === "void") return 1;
  if (leg.result === "lost") return 0;
  const live = leg.pick === "away" ? odds?.awayProb : odds?.homeProb;
  if (odds?.matched && live !== undefined) return live;
  return leg.entryProb;
}

function LegRow({
  leg,
  game,
  odds,
}: {
  leg: BetLeg;
  game?: ScheduleGame;
  odds?: MarketOdds | null;
}) {
  const pickAbbr = leg.pick === "away" ? leg.awayAbbr : leg.homeAbbr;
  const context =
    leg.pick === "away" ? `@ ${leg.homeAbbr}` : `vs ${leg.awayAbbr}`;
  const liveProb = legLiveProb(leg, odds);

  return (
    <Link
      href={`/game/${leg.gamePk}`}
      className="-mx-1 flex items-center justify-between rounded px-1 py-1.5 active:bg-surface-2"
    >
      <div className="flex items-baseline gap-2">
        <span className="text-sm font-bold">{pickAbbr} ML</span>
        <span className="text-[11px] text-muted">
          {context} · {shortDate(leg.officialDate)}
        </span>
        {game?.state === "Live" && (
          <span className="text-[10px] font-bold text-live">
            {game.isTop ? "▲" : "▼"} {game.inningOrdinal}
          </span>
        )}
      </div>
      {leg.result === "pending" ? (
        <span className="text-sm tabular-nums">
          {leg.entryProb !== undefined && (
            <span className="text-muted">{pct(leg.entryProb)} → </span>
          )}
          {liveProb !== undefined ? (
            <span
              className={`font-semibold ${
                leg.entryProb === undefined || liveProb === leg.entryProb
                  ? ""
                  : liveProb > leg.entryProb
                    ? "text-good"
                    : "text-live"
              }`}
            >
              {pct(liveProb)}
              {leg.entryProb !== undefined &&
                liveProb !== leg.entryProb &&
                (liveProb > leg.entryProb ? " ▲" : " ▼")}
            </span>
          ) : (
            <span className="text-muted">—</span>
          )}
        </span>
      ) : (
        <span className="text-sm font-semibold tabular-nums">
          {leg.result === "won" && <span className="text-good">✓ </span>}
          {leg.result === "lost" && <span className="text-live">✗ </span>}
          {leg.result === "void" && <span className="text-muted">push </span>}
          {leg.finalScore && (
            <span className="text-muted">
              {leg.finalScore.away}-{leg.finalScore.home}
            </span>
          )}
        </span>
      )}
    </Link>
  );
}

export default function BetCard({
  bet,
  gamesByPk,
}: {
  bet: Bet;
  gamesByPk: Map<number, ScheduleGame>;
}) {
  const pendingLegs = bet.legs.filter((l) => l.result === "pending");
  const anyLive = pendingLegs.some(
    (l) => gamesByPk.get(l.gamePk)?.state === "Live"
  );

  const { data: oddsList } = useSWR<(MarketOdds | null)[]>(
    bet.status === "open" && pendingLegs.length > 0
      ? ["bet-odds", bet.id, pendingLegs.map((l) => l.gamePk).join(",")]
      : null,
    () =>
      Promise.all(
        pendingLegs.map((leg) => fetcher(oddsUrl(leg)).catch(() => null))
      ),
    { refreshInterval: anyLive ? 60_000 : 0, revalidateOnFocus: false }
  );
  const oddsByPk = new Map(
    pendingLegs.map((leg, i) => [leg.gamePk, oddsList?.[i]])
  );

  const entryCombined = combinedProb(bet.legs.map((l) => l.entryProb));
  const liveCombined = combinedProb(
    bet.legs.map((l) => legLiveProb(l, oddsByPk.get(l.gamePk)))
  );

  return (
    <div className="rounded-xl bg-surface p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[bet.status]}`}
          >
            {bet.status}
          </span>
          <span className="text-[11px] text-muted">
            {bet.legs.length > 1 && `${bet.legs.length}-leg parlay · `}
            {shortDate(bet.createdAt.slice(0, 10))}
          </span>
        </div>
        <button
          aria-label="Delete bet"
          onClick={() => {
            if (confirm("Delete this bet?")) deleteBet(bet.id);
          }}
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted active:bg-surface-2"
        >
          ✕
        </button>
      </div>
      <div className="mt-1 divide-y divide-edge">
        {bet.legs.map((leg) => (
          <LegRow
            key={leg.gamePk}
            leg={leg}
            game={gamesByPk.get(leg.gamePk)}
            odds={oddsByPk.get(leg.gamePk)}
          />
        ))}
      </div>
      {bet.legs.length > 1 && (
        <div className="mt-1 flex items-center justify-between border-t border-edge pt-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted">
            Combined
          </span>
          {bet.status === "open" ? (
            <span className="text-sm font-bold tabular-nums">
              {entryCombined !== undefined && (
                <span className="font-normal text-muted">
                  {pct(entryCombined)} →{" "}
                </span>
              )}
              {liveCombined !== undefined ? pct(liveCombined) : "—"}
            </span>
          ) : entryCombined !== undefined ? (
            <span className="text-sm tabular-nums text-muted">
              entry {pct(entryCombined)}
            </span>
          ) : (
            <span className="text-sm font-bold capitalize">{bet.status}</span>
          )}
        </div>
      )}
    </div>
  );
}

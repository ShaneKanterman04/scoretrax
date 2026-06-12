import type { LiveGame } from "@/lib/types";
import OddsChip from "./OddsChip";

function inningLabel(g: LiveGame): string {
  if (g.status.abstract === "Final") {
    const n = g.linescore.innings.length;
    return n > 9 ? `Final/${n}` : "Final";
  }
  if (g.status.abstract === "Preview") return g.status.detailed;
  const arrow = g.linescore.isTop ? "▲" : "▼";
  const state = g.linescore.state;
  if (state === "Middle" || state === "End") {
    return `${state} ${g.linescore.ordinal}`;
  }
  return `${arrow} ${g.linescore.ordinal}`;
}

export default function ScoreboardHeader({ game, date }: { game: LiveGame; date: string }) {
  const live = game.status.abstract === "Live";
  const { away, home } = game.teams;
  const rhe = game.linescore.rhe;
  return (
    <div className="sticky top-0 z-40 border-b border-edge bg-background/95 px-4 pb-2 pt-safe backdrop-blur">
      <div className="mx-auto max-w-lg">
        <div className="flex items-center justify-between">
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-muted">{away.abbr}</div>
            <div className="text-4xl font-bold tabular-nums">{away.score}</div>
          </div>
          <div className="flex flex-col items-center gap-1 px-2">
            <span
              className={`text-sm font-semibold ${live ? "text-live" : "text-muted"}`}
            >
              {inningLabel(game)}
            </span>
            <OddsChip
              gamePk={game.gamePk}
              away={away.abbr}
              home={home.abbr}
              date={date}
              gameNumber={game.gameNumber}
              live={live}
            />
          </div>
          <div className="flex-1 text-center">
            <div className="text-sm font-semibold text-muted">{home.abbr}</div>
            <div className="text-4xl font-bold tabular-nums">{home.score}</div>
          </div>
        </div>
        <div className="mt-1 flex justify-center gap-6 text-[11px] tabular-nums text-muted">
          <span>
            {away.abbr} {rhe.away[0]} R · {rhe.away[1]} H · {rhe.away[2]} E
          </span>
          <span>
            {home.abbr} {rhe.home[0]} R · {rhe.home[1]} H · {rhe.home[2]} E
          </span>
        </div>
      </div>
    </div>
  );
}

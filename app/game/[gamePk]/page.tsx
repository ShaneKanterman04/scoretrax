"use client";

import { use, useState } from "react";
import useSWR from "swr";
import BasesDiamond from "@/components/BasesDiamond";
import BoxScoreTable from "@/components/BoxScoreTable";
import CountDots from "@/components/CountDots";
import EventFlash from "@/components/EventFlash";
import LineScore from "@/components/LineScore";
import MatchupCard from "@/components/MatchupCard";
import PitchList from "@/components/PitchList";
import PitchZonePlot from "@/components/PitchZonePlot";
import PlaysFeed from "@/components/PlaysFeed";
import ScoreboardHeader from "@/components/ScoreboardHeader";
import Tabs from "@/components/Tabs";
import WinProbChart from "@/components/WinProbChart";
import { fetcher } from "@/lib/fetcher";
import type { BoxScore, LiveGame, WinProbSeries } from "@/lib/types";

function liveRefresh(data?: LiveGame): number {
  if (!data) return 15_000;
  if (data.status.abstract === "Live") return 8_000;
  if (data.status.abstract === "Preview") return 60_000;
  return 0;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">
      {children}
    </h2>
  );
}

function WinProbSection({ game }: { game: LiveGame }) {
  const isLive = game.status.abstract === "Live";
  const { data } = useSWR<WinProbSeries>(
    `/api/mlb/game/${game.gamePk}/winprob`,
    fetcher,
    { refreshInterval: isLive ? 30_000 : 0, keepPreviousData: true }
  );
  if (!data || data.points.length < 2) return null;
  return (
    <>
      <SectionTitle>Win probability</SectionTitle>
      <div className="rounded-xl bg-surface p-2">
        <WinProbChart
          points={data.points}
          awayAbbr={game.teams.away.abbr}
          homeAbbr={game.teams.home.abbr}
        />
      </div>
    </>
  );
}

function LiveTab({ game }: { game: LiveGame }) {
  const isLive = game.status.abstract === "Live";
  const isPreview = game.status.abstract === "Preview";

  if (isPreview) {
    return (
      <div className="px-4">
        <div className="mt-4 rounded-xl bg-surface p-4 text-center text-sm text-muted">
          {new Date(game.gameDate).toLocaleString([], {
            weekday: "long",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          {game.venue && <div className="mt-1 text-xs">{game.venue}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4">
      {isLive && (
        <>
          <div className="mt-3 flex items-center justify-around rounded-xl bg-surface p-3">
            <BasesDiamond bases={game.bases} size={84} showNames />
            <CountDots {...game.count} />
          </div>
          {game.matchup && (
            <div className="mt-2">
              <MatchupCard matchup={game.matchup} />
            </div>
          )}
          <SectionTitle>Current at-bat</SectionTitle>
          <div className="flex items-start gap-3 rounded-xl bg-surface p-3">
            <PitchZonePlot pitches={game.currentAtBat.pitches} />
            <div className="min-w-0 flex-1">
              <PitchList pitches={game.currentAtBat.pitches} />
              {game.currentAtBat.pitches.length === 0 && game.currentAtBat.lastResult && (
                <p className="mt-2 text-xs leading-snug text-muted">
                  Last: {game.currentAtBat.lastResult}
                </p>
              )}
            </div>
          </div>
        </>
      )}
      <WinProbSection game={game} />
      {game.status.abstract === "Final" && game.decisions && (
        <>
          <SectionTitle>Decisions</SectionTitle>
          <div className="flex flex-col gap-1 rounded-xl bg-surface p-3 text-sm">
            {game.decisions.winner && (
              <div>
                <span className="font-bold text-good">W</span> {game.decisions.winner}
              </div>
            )}
            {game.decisions.loser && (
              <div>
                <span className="font-bold text-live">L</span> {game.decisions.loser}
              </div>
            )}
            {game.decisions.save && (
              <div>
                <span className="font-bold text-accent">SV</span> {game.decisions.save}
              </div>
            )}
          </div>
        </>
      )}
      <SectionTitle>{isLive ? "Recent plays" : "Plays"}</SectionTitle>
      <PlaysFeed plays={game.recentPlays} />
    </div>
  );
}

function BoxTab({ gamePk, live }: { gamePk: string; live: boolean }) {
  const { data } = useSWR<BoxScore>(`/api/mlb/game/${gamePk}/box`, fetcher, {
    refreshInterval: live ? 30_000 : 0,
    keepPreviousData: true,
  });
  if (!data) return <div className="py-12 text-center text-sm text-muted">Loading…</div>;
  return (
    <div className="flex flex-col gap-3 px-4 pt-3">
      <LineScore
        linescore={data.linescore}
        awayAbbr={data.teams.away.abbr}
        homeAbbr={data.teams.home.abbr}
      />
      <BoxScoreTable team={data.teams.away} />
      <BoxScoreTable team={data.teams.home} />
    </div>
  );
}

function PlaysTab({ gamePk, live }: { gamePk: string; live: boolean }) {
  const { data } = useSWR<BoxScore>(`/api/mlb/game/${gamePk}/box`, fetcher, {
    refreshInterval: live ? 30_000 : 0,
    keepPreviousData: true,
  });
  if (!data) return <div className="py-12 text-center text-sm text-muted">Loading…</div>;
  if (data.playsByInning.length === 0)
    return <div className="py-12 text-center text-sm text-muted">No plays yet.</div>;
  return (
    <div className="flex flex-col gap-4 px-4 pt-3">
      {data.playsByInning.map((group) => (
        <section key={`${group.inning}-${group.half}`}>
          <h2 className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
            {group.half === "top" ? "Top" : "Bottom"} {group.inning}
          </h2>
          <PlaysFeed plays={[...group.plays].reverse()} />
        </section>
      ))}
    </div>
  );
}

export default function GamePage({
  params,
}: {
  params: Promise<{ gamePk: string }>;
}) {
  const { gamePk } = use(params);
  const [tab, setTab] = useState("Live");
  const { data: game } = useSWR<LiveGame>(`/api/mlb/game/${gamePk}/live`, fetcher, {
    refreshInterval: (latest) => liveRefresh(latest),
    keepPreviousData: true,
  });

  if (!game) {
    return <div className="py-24 text-center text-sm text-muted">Loading game…</div>;
  }

  const live = game.status.abstract === "Live";
  const date = game.officialDate;

  return (
    <main className="relative">
      <EventFlash game={game} />
      <ScoreboardHeader game={game} date={date} />
      <div className="px-4 pt-3">
        <Tabs tabs={["Live", "Box", "Plays"]} active={tab} onChange={setTab} />
      </div>
      {tab === "Live" && <LiveTab game={game} />}
      {tab === "Box" && <BoxTab gamePk={gamePk} live={live} />}
      {tab === "Plays" && <PlaysTab gamePk={gamePk} live={live} />}
    </main>
  );
}

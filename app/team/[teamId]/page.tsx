"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import GameCard from "@/components/GameCard";
import FavoriteStar from "@/components/FavoriteStar";
import { fetcher } from "@/lib/fetcher";
import type { TeamInfo } from "@/lib/types";

const POSITION_GROUPS: [string, (pos: string) => boolean][] = [
  ["Pitchers", (p) => p === "P"],
  ["Catchers", (p) => p === "C"],
  ["Infielders", (p) => ["1B", "2B", "3B", "SS"].includes(p)],
  ["Outfielders", (p) => ["LF", "CF", "RF", "OF"].includes(p)],
  ["Designated hitters", (p) => p === "DH"],
];

export default function TeamPage({
  params,
}: {
  params: Promise<{ teamId: string }>;
}) {
  const { teamId } = use(params);
  const { data } = useSWR<TeamInfo>(`/api/mlb/team/${teamId}`, fetcher, {
    revalidateOnFocus: false,
  });

  if (!data) {
    return <div className="py-24 text-center text-sm text-muted">Loading team…</div>;
  }

  const grouped = POSITION_GROUPS.map(([label, match]) => ({
    label,
    players: data.roster.filter((r) => match(r.pos)),
  })).filter((g) => g.players.length > 0);

  return (
    <main className="px-4 pt-safe">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{data.name}</h1>
        <FavoriteStar teamId={data.id} className="h-6 w-6" />
      </div>

      {data.upcomingGames.length > 0 && (
        <>
          <h2 className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">
            Upcoming
          </h2>
          <div className="flex flex-col gap-2">
            {data.upcomingGames.map((g) => (
              <GameCard key={g.gamePk} game={g} />
            ))}
          </div>
        </>
      )}

      {data.recentGames.length > 0 && (
        <>
          <h2 className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">
            Recent
          </h2>
          <div className="flex flex-col gap-2">
            {data.recentGames.map((g) => (
              <GameCard key={g.gamePk} game={g} />
            ))}
          </div>
        </>
      )}

      <h2 className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">
        Roster
      </h2>
      <div className="flex flex-col gap-3 pb-4">
        {grouped.map((group) => (
          <section key={group.label} className="rounded-xl bg-surface">
            <h3 className="border-b border-edge px-3 py-2 text-xs font-bold text-muted">
              {group.label}
            </h3>
            <ul>
              {group.players.map((p) => (
                <li key={p.id} className="border-t border-edge/60 first:border-t-0">
                  <Link
                    href={`/player/${p.id}`}
                    className="flex min-h-11 items-center justify-between px-3 py-1.5 text-sm active:bg-surface-2"
                  >
                    <span className="font-medium">{p.name}</span>
                    <span className="text-xs text-muted">
                      #{p.number ?? "—"} · {p.pos}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}

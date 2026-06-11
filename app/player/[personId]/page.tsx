"use client";

import { use } from "react";
import Link from "next/link";
import useSWR from "swr";
import { fetcher } from "@/lib/fetcher";
import type { PlayerInfo } from "@/lib/types";

export default function PlayerPage({
  params,
}: {
  params: Promise<{ personId: string }>;
}) {
  const { personId } = use(params);
  const { data } = useSWR<PlayerInfo>(`/api/mlb/player/${personId}`, fetcher, {
    revalidateOnFocus: false,
  });

  if (!data) {
    return <div className="py-24 text-center text-sm text-muted">Loading player…</div>;
  }

  const seasonEntries = Object.entries(data.season);
  const logCols = data.gameLog[0] ? Object.keys(data.gameLog[0].line) : [];

  return (
    <main className="px-4 pt-3">
      <h1 className="text-2xl font-bold">{data.name}</h1>
      <div className="mt-0.5 text-sm text-muted">
        #{data.number ?? "—"} · {data.pos}
        {data.group === "hitting" && data.batSide && ` · Bats ${data.batSide}`}
        {data.group === "pitching" && data.pitchHand && ` · Throws ${data.pitchHand}`}
        {data.team && (
          <>
            {" · "}
            <Link href={`/team/${data.team.id}`} className="text-accent">
              {data.team.name}
            </Link>
          </>
        )}
      </div>

      <h2 className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">
        Season
      </h2>
      {seasonEntries.length === 0 ? (
        <div className="rounded-xl bg-surface p-4 text-center text-sm text-muted">
          No stats this season.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {seasonEntries.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-surface p-3 text-center">
              <div className="text-lg font-bold tabular-nums">{value}</div>
              <div className="text-[10px] font-semibold uppercase text-muted">{label}</div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-1.5 mt-4 text-[11px] font-bold uppercase tracking-wider text-muted">
        Last 10 games
      </h2>
      {data.gameLog.length === 0 ? (
        <div className="rounded-xl bg-surface p-4 text-center text-sm text-muted">
          No recent games.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface pb-2">
          <table className="w-full min-w-max text-xs tabular-nums">
            <thead>
              <tr className="text-muted">
                <th className="px-3 py-2 text-left font-medium">Date</th>
                <th className="px-2 py-2 text-left font-medium">Opp</th>
                {logCols.map((c) => (
                  <th key={c} className="px-2 py-2 text-right font-medium">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.gameLog.map((g, i) => (
                <tr key={`${g.date}-${i}`} className="border-t border-edge/60">
                  <td className="px-3 py-1.5">{g.date.slice(5)}</td>
                  <td className="px-2 py-1.5 text-muted">
                    {g.opponent?.split(" ").at(-1) ?? "—"}
                  </td>
                  {logCols.map((c) => (
                    <td key={c} className="px-2 py-1.5 text-right">
                      {g.line[c] ?? "-"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}

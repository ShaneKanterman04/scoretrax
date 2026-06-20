"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import Tabs from "@/components/Tabs";
import { fetcher } from "@/lib/fetcher";
import type { StandingsData, StandingsRow } from "@/lib/types";

// x = clinched playoff berth, y = division, z = best league record, e = eliminated
function TeamCell({ row }: { row: StandingsRow }) {
  return (
    <td className="px-3 py-2">
      <Link href={`/team/${row.teamId}`} className="font-semibold">
        {row.abbr}
      </Link>
      {row.clinch && (
        <sup
          className={`ml-0.5 font-bold ${
            row.clinch === "e" ? "text-muted" : "text-accent"
          }`}
        >
          {row.clinch}
        </sup>
      )}
    </td>
  );
}

export default function StandingsPage() {
  const [league, setLeague] = useState("AL");
  const { data } = useSWR<StandingsData>("/api/mlb/standings", fetcher, {
    revalidateOnFocus: false,
  });

  const divisions = data?.divisions.filter((d) => d.league === league) ?? [];
  const wildCard = data?.wildCards?.find((w) => w.league === league);

  return (
    <main className="mx-auto max-w-4xl px-4 pt-safe">
      <h1 className="pb-2 text-2xl font-bold">Standings</h1>
      <Tabs tabs={["AL", "NL"]} active={league} onChange={setLeague} />
      {!data && <div className="py-16 text-center text-sm text-muted">Loading…</div>}
      <div className="mt-3 grid gap-4 pb-4 lg:grid-cols-2">
        {divisions.map((div) => (
          <section key={div.division} className="rounded-xl bg-surface">
            <h2 className="border-b border-edge px-3 py-2 text-sm font-bold">
              {div.division}
            </h2>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-muted">
                  <th className="px-3 py-1.5 text-left font-medium">Team</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">W</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">L</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">PCT</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">GB</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">STRK</th>
                  <th className="px-2 py-1.5 text-right font-medium">L10</th>
                </tr>
              </thead>
              <tbody>
                {div.rows.map((row) => (
                  <tr key={row.teamId} className="border-t border-edge/60">
                    <TeamCell row={row} />
                    <td className="px-1.5 py-2 text-right">{row.w}</td>
                    <td className="px-1.5 py-2 text-right">{row.l}</td>
                    <td className="px-1.5 py-2 text-right">{row.pct}</td>
                    <td className="px-1.5 py-2 text-right">{row.gb}</td>
                    <td className="px-1.5 py-2 text-right">{row.streak}</td>
                    <td className="px-2 py-2 text-right">{row.lastTen}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        ))}

        {wildCard && wildCard.rows.length > 0 && (
          <section className="rounded-xl bg-surface lg:col-span-2">
            <h2 className="border-b border-edge px-3 py-2 text-sm font-bold">
              {league} Wild Card
            </h2>
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="text-muted">
                  <th className="px-3 py-1.5 text-left font-medium">Team</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">W</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">L</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">PCT</th>
                  <th className="px-1.5 py-1.5 text-right font-medium">WCGB</th>
                  <th className="px-2 py-1.5 text-right font-medium">E#</th>
                </tr>
              </thead>
              <tbody>
                {wildCard.rows.map((row, i) => (
                  <tr
                    key={row.teamId}
                    className={
                      i === 3
                        ? "border-t-2 border-accent/40"
                        : "border-t border-edge/60"
                    }
                  >
                    <TeamCell row={row} />
                    <td className="px-1.5 py-2 text-right">{row.w}</td>
                    <td className="px-1.5 py-2 text-right">{row.l}</td>
                    <td className="px-1.5 py-2 text-right">{row.pct}</td>
                    <td className="px-1.5 py-2 text-right">{row.wcGb ?? "-"}</td>
                    <td className="px-2 py-2 text-right">{row.wcElim ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="border-t border-edge px-3 py-2 text-[10px] text-muted">
              Top 3 make the playoffs · x clinched berth · y won division · z best
              record · e eliminated
            </p>
          </section>
        )}
      </div>
    </main>
  );
}

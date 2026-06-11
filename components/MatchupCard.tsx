"use client";

import Link from "next/link";
import useSWR from "swr";
import HotColdZoneGrid from "@/components/HotColdZoneGrid";
import { fetcher } from "@/lib/fetcher";
import type { LiveGame, MatchupSplits } from "@/lib/types";

function vsLine(vs: NonNullable<MatchupSplits["vsCareer"]>): string {
  const extras: string[] = [];
  if (vs.hr) extras.push(`${vs.hr} HR`);
  if (vs.bb) extras.push(`${vs.bb} BB`);
  if (vs.k) extras.push(`${vs.k} K`);
  const tail = extras.length ? `, ${extras.join(", ")}` : "";
  return `${vs.h}-${vs.ab}${tail} (${vs.avg} / ${vs.ops} OPS)`;
}

export default function MatchupCard({ matchup }: { matchup: NonNullable<LiveGame["matchup"]> }) {
  const { batter, pitcher, onDeck, inHole } = matchup;
  const { data: splits } = useSWR<MatchupSplits>(
    batter && pitcher
      ? `/api/mlb/matchup?batterId=${batter.id}&pitcherId=${pitcher.id}`
      : null,
    fetcher,
    { revalidateOnFocus: false }
  );
  return (
    <div className="rounded-xl bg-surface p-3">
      <div className="flex items-stretch">
        <div className="flex-1">
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted">At bat</div>
          {batter && (
            <Link href={`/player/${batter.id}`} className="block">
              <div className="text-sm font-semibold">
                {batter.name}
                {batter.side && <span className="ml-1 text-xs text-muted">({batter.side})</span>}
              </div>
              <div className="text-xs text-muted">
                {[batter.gameLine, batter.seasonLine].filter(Boolean).join(" · ") || "—"}
              </div>
            </Link>
          )}
        </div>
        <div className="flex items-center px-2 text-xs font-bold text-muted">vs</div>
        <div className="flex-1 text-right">
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted">Pitching</div>
          {pitcher && (
            <Link href={`/player/${pitcher.id}`} className="block">
              <div className="text-sm font-semibold">
                {pitcher.name}
                {pitcher.side && <span className="ml-1 text-xs text-muted">({pitcher.side})</span>}
              </div>
              <div className="text-xs text-muted">
                {[
                  pitcher.gameLine,
                  pitcher.pitchCount !== undefined ? `${pitcher.pitchCount} P` : undefined,
                ]
                  .filter(Boolean)
                  .join(" · ") || "—"}
              </div>
            </Link>
          )}
        </div>
      </div>
      {splits && batter && pitcher && (
        <div className="mt-2 flex items-center gap-3 border-t border-edge pt-2">
          {splits.zones && <HotColdZoneGrid zones={splits.zones} />}
          <div className="min-w-0 flex-1 text-[11px] text-muted">
            {splits.vsCareer ? (
              <>
                <span className="font-semibold text-foreground">
                  Career vs {pitcher.name.split(" ").at(-1)}:
                </span>{" "}
                {vsLine(splits.vsCareer)}
              </>
            ) : (
              <span>First career matchup</span>
            )}
            {splits.zones && (
              <div className="mt-1 text-[10px]">AVG by zone (season)</div>
            )}
          </div>
        </div>
      )}
      {(onDeck || inHole) && (
        <div className="mt-2 border-t border-edge pt-1.5 text-[11px] text-muted">
          {onDeck && <span>On deck: {onDeck}</span>}
          {onDeck && inHole && <span> · </span>}
          {inHole && <span>In hole: {inHole}</span>}
        </div>
      )}
    </div>
  );
}

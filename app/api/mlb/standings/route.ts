import { NextResponse } from "next/server";
import { currentSeason, fetchStandings } from "@/lib/mlb";
import { abbrFor } from "@/lib/teams";
import type {
  StandingsDivision,
  StandingsRow,
  WildCardStandings,
} from "@/lib/types";

const DIVISION_NAMES: Record<number, string> = {
  200: "AL West",
  201: "AL East",
  202: "AL Central",
  203: "NL West",
  204: "NL East",
  205: "NL Central",
};

function opt(v: unknown): string | undefined {
  return v == null || v === "-" ? undefined : String(v);
}

function toRow(tr: any): StandingsRow {
  const lastTen = (tr.records?.splitRecords ?? []).find(
    (s: any) => s.type === "lastTen"
  );
  const wcRank = Number(tr.wildCardRank);
  return {
    teamId: tr.team?.id,
    abbr: abbrFor(tr.team?.id, tr.team?.name),
    name: tr.team?.name ?? "",
    w: tr.wins,
    l: tr.losses,
    pct: tr.winningPercentage ?? "-",
    gb: tr.gamesBack ?? "-",
    streak: tr.streak?.streakCode ?? "-",
    lastTen: lastTen ? `${lastTen.wins}-${lastTen.losses}` : "-",
    clinch: opt(tr.clinchIndicator),
    magic: opt(tr.magicNumber),
    elim: opt(tr.eliminationNumber),
    wcGb: opt(tr.wildCardGamesBack),
    wcElim: opt(tr.wildCardEliminationNumber),
    ...(Number.isFinite(wcRank) ? { wcRank } : {}),
  };
}

export async function GET() {
  try {
    const raw = await fetchStandings(currentSeason());
    const records: any[] = raw.records ?? [];
    const divisions: StandingsDivision[] = records
      .filter((rec) => rec.standingsType === "regularSeason")
      .map((rec) => ({
        division: DIVISION_NAMES[rec.division?.id] ?? `Division ${rec.division?.id}`,
        league: rec.league?.id === 103 ? "AL" : "NL",
        rows: (rec.teamRecords ?? []).map(toRow),
      }));
    const wildCards: WildCardStandings[] = records
      .filter((rec) => rec.standingsType === "wildCard")
      .map((rec) => ({
        league: rec.league?.id === 103 ? ("AL" as const) : ("NL" as const),
        rows: (rec.teamRecords ?? []).map(toRow),
      }));
    return NextResponse.json({ divisions, wildCards });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

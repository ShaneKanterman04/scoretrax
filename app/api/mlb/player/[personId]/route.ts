import { NextResponse } from "next/server";
import { currentSeason, fetchPlayer } from "@/lib/mlb";
import type { PlayerInfo } from "@/lib/types";

const HITTING_KEYS: [string, string][] = [
  ["avg", "AVG"],
  ["homeRuns", "HR"],
  ["rbi", "RBI"],
  ["runs", "R"],
  ["hits", "H"],
  ["stolenBases", "SB"],
  ["obp", "OBP"],
  ["slg", "SLG"],
  ["ops", "OPS"],
];

const PITCHING_KEYS: [string, string][] = [
  ["wins", "W"],
  ["losses", "L"],
  ["era", "ERA"],
  ["inningsPitched", "IP"],
  ["strikeOuts", "K"],
  ["baseOnBalls", "BB"],
  ["whip", "WHIP"],
  ["saves", "SV"],
];

const HIT_LOG: [string, string][] = [
  ["atBats", "AB"], ["hits", "H"], ["runs", "R"], ["rbi", "RBI"],
  ["homeRuns", "HR"], ["strikeOuts", "K"],
];
const PITCH_LOG: [string, string][] = [
  ["inningsPitched", "IP"], ["hits", "H"], ["earnedRuns", "ER"],
  ["baseOnBalls", "BB"], ["strikeOuts", "K"],
];

function pick(stat: any, keys: [string, string][]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [key, label] of keys) {
    if (stat?.[key] !== undefined) out[label] = stat[key];
  }
  return out;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ personId: string }> }
) {
  const { personId } = await params;
  try {
    const raw = await fetchPlayer(personId, currentSeason());
    const p = raw.people?.[0];
    if (!p) return NextResponse.json({ error: "player not found" }, { status: 404 });

    const isPitcher = p.primaryPosition?.abbreviation === "P";
    const group = isPitcher ? "pitching" : "hitting";
    const statKeys = isPitcher ? PITCHING_KEYS : HITTING_KEYS;
    const logKeys = isPitcher ? PITCH_LOG : HIT_LOG;

    const find = (type: string) =>
      (p.stats ?? []).find(
        (s: any) => s.type?.displayName === type && s.group?.displayName === group
      );

    const season = find("season")?.splits?.[0]?.stat ?? {};
    const gameLog = (find("gameLog")?.splits ?? [])
      .slice(-10)
      .reverse()
      .map((s: any) => ({
        date: s.date,
        opponent: s.opponent?.name,
        line: pick(s.stat, logKeys),
      }));

    const info: PlayerInfo = {
      id: p.id,
      name: p.fullName ?? "",
      number: p.primaryNumber,
      pos: p.primaryPosition?.abbreviation ?? "",
      batSide: p.batSide?.code,
      pitchHand: p.pitchHand?.code,
      team: p.currentTeam ? { id: p.currentTeam.id, name: p.currentTeam.name } : undefined,
      group,
      season: pick(season, statKeys),
      gameLog,
    };
    return NextResponse.json(info, {
      headers: { "cache-control": "public, max-age=600" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

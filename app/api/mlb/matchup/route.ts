import { NextRequest, NextResponse } from "next/server";
import { currentSeason, fetchHotColdZones, fetchVsPlayer } from "@/lib/mlb";
import type { MatchupSplits } from "@/lib/types";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const batterId = Number(sp.get("batterId"));
  const pitcherId = Number(sp.get("pitcherId"));
  if (!Number.isInteger(batterId) || !Number.isInteger(pitcherId) || batterId <= 0 || pitcherId <= 0) {
    return NextResponse.json(
      { error: "numeric batterId and pitcherId required" },
      { status: 400 }
    );
  }
  const season = Number(sp.get("season")) || currentSeason();

  const [vs, zonesRes] = await Promise.allSettled([
    fetchVsPlayer(batterId, pitcherId),
    fetchHotColdZones(batterId, season),
  ]);

  const out: MatchupSplits = {};

  if (vs.status === "fulfilled") {
    const total = (vs.value.stats ?? []).find(
      (s: any) => s.type?.displayName === "vsPlayerTotal"
    )?.splits?.[0]?.stat;
    if (total) {
      out.vsCareer = {
        pa: total.plateAppearances ?? 0,
        ab: total.atBats ?? 0,
        h: total.hits ?? 0,
        hr: total.homeRuns ?? 0,
        bb: total.baseOnBalls ?? 0,
        k: total.strikeOuts ?? 0,
        avg: total.avg ?? "-",
        ops: total.ops ?? "-",
      };
    }
  }

  if (zonesRes.status === "fulfilled") {
    const zones = (zonesRes.value.stats ?? [])
      .flatMap((s: any) => s.splits ?? [])
      .find((sp: any) => sp.stat?.name === "battingAverage")?.stat?.zones;
    if (Array.isArray(zones) && zones.length > 0) {
      out.zones = zones.map((z: any) => ({
        zone: z.zone,
        value: z.value,
        color: z.color,
        temp: z.temp,
      }));
    }
  }

  return NextResponse.json(out, {
    headers: { "cache-control": "public, max-age=120" },
  });
}

import { NextRequest, NextResponse } from "next/server";
import { currentSeason, fetchPitcherSeasonStats, fetchSchedule } from "@/lib/mlb";
import { transformSchedule } from "@/lib/transform";

function probablePitcherIds(raw: any): number[] {
  const ids = new Set<number>();
  for (const game of raw.dates?.[0]?.games ?? []) {
    for (const side of ["away", "home"] as const) {
      const id = game.teams?.[side]?.probablePitcher?.id;
      if (typeof id === "number") ids.add(id);
    }
  }
  return Array.from(ids);
}

function pitcherEra(raw: any): string | undefined {
  const stats = raw.people?.[0]?.stats ?? [];
  const season = stats.find((entry: any) =>
    entry.splits?.some((split: any) => split?.stat?.era !== undefined)
  );
  const era = season?.splits?.[0]?.stat?.era;
  return typeof era === "string" && era !== "-.--" ? era : undefined;
}

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date=YYYY-MM-DD required" }, { status: 400 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const isLiveSchedule = date >= today;
  const revalidate = date < today ? 3600 : false;
  try {
    const raw = await fetchSchedule(date, revalidate);
    const season = Number(date.slice(0, 4)) || currentSeason();
    const pitcherEras = await Promise.all(
      probablePitcherIds(raw).map(async (id) => {
        try {
          return [id, pitcherEra(await fetchPitcherSeasonStats(id, season))] as const;
        } catch {
          return [id, undefined] as const;
        }
      })
    );
    const eraById = new Map(
      pitcherEras.filter(
        (entry): entry is readonly [number, string] => entry[1] !== undefined
      )
    );
    return NextResponse.json(transformSchedule(raw, eraById), {
      headers: {
        "cache-control": isLiveSchedule ? "no-store" : "public, max-age=3600",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

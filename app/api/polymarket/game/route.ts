import { NextRequest, NextResponse } from "next/server";
import { fetchGameOdds } from "@/lib/polymarket";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const away = sp.get("away");
  const home = sp.get("home");
  const date = sp.get("date");
  const gameNumber = Number(sp.get("gameNumber") ?? "1");
  if (!away || !home || !date) {
    return NextResponse.json(
      { error: "away, home, date required" },
      { status: 400 }
    );
  }
  const odds = await fetchGameOdds(away, home, date, gameNumber);
  return NextResponse.json(odds, {
    headers: {
      "cache-control": odds.matched ? "public, max-age=30" : "public, max-age=300",
    },
  });
}

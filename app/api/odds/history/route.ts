import { NextRequest, NextResponse } from "next/server";
import { getOddsHistory } from "@/lib/odds-history";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const date = sp.get("date");
  const gamePk = sp.get("gamePk");
  if (!date) {
    return NextResponse.json({ error: "date=YYYY-MM-DD required" }, { status: 400 });
  }
  const parsedGamePk = gamePk ? Number(gamePk) : undefined;
  if (gamePk && !Number.isFinite(parsedGamePk)) {
    return NextResponse.json({ error: "gamePk must be numeric" }, { status: 400 });
  }
  const history = await getOddsHistory(date, parsedGamePk);
  return NextResponse.json(history, {
    headers: { "cache-control": "no-store" },
  });
}

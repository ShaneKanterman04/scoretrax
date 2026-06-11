import { NextRequest, NextResponse } from "next/server";
import { getBestBets } from "@/lib/best-bets";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date=YYYY-MM-DD required" }, { status: 400 });
  }

  try {
    const bestBets = await getBestBets(date);
    return NextResponse.json(bestBets, {
      headers: { "cache-control": "public, max-age=300" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

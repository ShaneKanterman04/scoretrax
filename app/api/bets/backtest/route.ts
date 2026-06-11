import { NextRequest, NextResponse } from "next/server";
import { backtestBestBets } from "@/lib/best-bets";

function daysBetween(startDate: string, endDate: string): number {
  const start = new Date(`${startDate}T12:00:00Z`).getTime();
  const end = new Date(`${endDate}T12:00:00Z`).getTime();
  return Math.floor((end - start) / 86_400_000) + 1;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const startDate = sp.get("startDate");
  const endDate = sp.get("endDate");

  if (
    !startDate ||
    !endDate ||
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate)
  ) {
    return NextResponse.json(
      { error: "startDate and endDate must be YYYY-MM-DD" },
      { status: 400 }
    );
  }

  const days = daysBetween(startDate, endDate);
  if (days < 1 || days > 14) {
    return NextResponse.json(
      { error: "Backtest range must be 1 to 14 days." },
      { status: 400 }
    );
  }

  try {
    const result = await backtestBestBets(startDate, endDate);
    return NextResponse.json(result, {
      headers: { "cache-control": "public, max-age=3600" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

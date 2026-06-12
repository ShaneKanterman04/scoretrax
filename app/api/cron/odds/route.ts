import { NextRequest, NextResponse } from "next/server";
import { runOddsHistorySweep } from "@/lib/odds-history";

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const date = req.nextUrl.searchParams.get("date") ?? undefined;
  const result = await runOddsHistorySweep(date);
  return NextResponse.json(result);
}

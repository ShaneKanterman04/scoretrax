import { NextRequest, NextResponse } from "next/server";
import { runNotifySweep } from "@/lib/notify";

// Manual/external trigger for the notification sweep. Self-hosted deployments
// normally rely on the in-process poller (instrumentation.ts) instead; this
// route remains for external cron setups and testing.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runNotifySweep();
  return NextResponse.json(result);
}

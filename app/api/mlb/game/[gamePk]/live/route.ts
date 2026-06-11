import { NextResponse } from "next/server";
import { fetchLiveFeed } from "@/lib/mlb";
import { transformLiveFeed } from "@/lib/transform";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gamePk: string }> }
) {
  const { gamePk } = await params;
  try {
    const raw = await fetchLiveFeed(gamePk);
    return NextResponse.json(transformLiveFeed(raw), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

import { NextResponse } from "next/server";
import { fetchLiveFeed } from "@/lib/mlb";
import { transformBoxScore } from "@/lib/transform";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gamePk: string }> }
) {
  const { gamePk } = await params;
  try {
    const raw = await fetchLiveFeed(gamePk);
    return NextResponse.json(transformBoxScore(raw), {
      headers: { "cache-control": "public, max-age=15" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

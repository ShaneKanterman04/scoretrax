import { NextResponse } from "next/server";
import { fetchWinProbability } from "@/lib/mlb";
import { transformWinProbability } from "@/lib/transform";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ gamePk: string }> }
) {
  const { gamePk } = await params;
  try {
    const raw = await fetchWinProbability(gamePk);
    return NextResponse.json(transformWinProbability(raw, Number(gamePk)), {
      headers: { "cache-control": "no-store" },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

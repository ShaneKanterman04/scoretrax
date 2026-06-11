import { NextRequest, NextResponse } from "next/server";
import { fetchSchedule } from "@/lib/mlb";
import { transformSchedule } from "@/lib/transform";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date=YYYY-MM-DD required" }, { status: 400 });
  }
  const today = new Date().toISOString().slice(0, 10);
  const isToday = date === today;
  const revalidate = date < today ? 3600 : isToday ? false : 60;
  try {
    const raw = await fetchSchedule(date, revalidate);
    return NextResponse.json(transformSchedule(raw), {
      headers: {
        "cache-control": isToday ? "no-store" : "public, max-age=60",
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 502 });
  }
}

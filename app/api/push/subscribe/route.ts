import { NextRequest, NextResponse } from "next/server";
import { getPushStore } from "@/lib/push-store";

export async function POST(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  const sub = body?.subscription;
  const teamIds = body?.teamIds;
  if (
    typeof sub?.endpoint !== "string" ||
    typeof sub?.keys?.p256dh !== "string" ||
    typeof sub?.keys?.auth !== "string" ||
    !Array.isArray(teamIds)
  ) {
    return NextResponse.json(
      { error: "subscription with endpoint/keys and teamIds[] required" },
      { status: 400 }
    );
  }
  await getPushStore().upsertSub({
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    teamIds: teamIds.filter((n: unknown) => typeof n === "number"),
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  let body: any;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }
  if (typeof body?.endpoint !== "string") {
    return NextResponse.json({ error: "endpoint required" }, { status: 400 });
  }
  await getPushStore().deleteSub(body.endpoint);
  return NextResponse.json({ ok: true });
}

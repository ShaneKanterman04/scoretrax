import { NextRequest, NextResponse } from "next/server";
import { fetchSchedule } from "@/lib/mlb";
import { transformSchedule } from "@/lib/transform";
import { getPushStore, type GameSnapshot } from "@/lib/push-store";
import { sendToAll, type PushPayload } from "@/lib/push";
import type { ScheduleGame } from "@/lib/types";

// Polled by a cron/pinger. Diffs each subscribed team's games against the
// stored snapshot and notifies on: game start, lead change, final score.
// Snapshot-diffing makes runs idempotent — a missed tick coalesces events.

function leader(snap: GameSnapshot): "away" | "home" | "tie" {
  if (snap.away === snap.home) return "tie";
  return snap.away > snap.home ? "away" : "home";
}

function eventsFor(
  game: ScheduleGame,
  prev: GameSnapshot | null,
  next: GameSnapshot
): Omit<PushPayload, "gamePk" | "tag">[] {
  const matchupLabel = `${game.away.abbr} @ ${game.home.abbr}`;
  const score = `${game.home.abbr} ${next.home}, ${game.away.abbr} ${next.away}`;
  const out: Omit<PushPayload, "gamePk" | "tag">[] = [];

  if (next.state === "Live" && (!prev || prev.state === "Preview")) {
    out.push({ title: `⚾ ${matchupLabel} is underway`, body: "Tap to follow live." });
  }
  if (prev && next.state === "Live" && prev.state === "Live") {
    const was = leader(prev);
    const now = leader(next);
    if (now !== was && now !== "tie") {
      const inning = game.inningOrdinal
        ? `, ${game.isTop ? "Top" : "Bot"} ${game.inningOrdinal}`
        : "";
      out.push({ title: `Lead change: ${matchupLabel}`, body: `${score}${inning}` });
    }
  }
  if (next.state === "Final" && (!prev || prev.state !== "Final")) {
    out.push({ title: `Final: ${matchupLabel}`, body: score });
  }
  return out;
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const store = getPushStore();
  const subs = await store.listSubs();
  if (subs.length === 0) {
    return NextResponse.json({ sent: 0, reason: "no subscribers" });
  }
  const subscribedTeams = new Set(subs.flatMap((s) => s.teamIds));

  const todayET = new Date().toLocaleDateString("en-CA", {
    timeZone: "America/New_York",
  });
  const raw = await fetchSchedule(todayET, 0);
  const { games } = transformSchedule(raw);

  let sent = 0;
  for (const game of games) {
    if (!subscribedTeams.has(game.away.id) && !subscribedTeams.has(game.home.id)) {
      continue;
    }
    const next: GameSnapshot = {
      state: game.state,
      away: game.away.score ?? 0,
      home: game.home.score ?? 0,
    };
    const prev = await store.getGameState(game.gamePk);
    const events = eventsFor(game, prev, next);
    if (prev?.state !== next.state || prev?.away !== next.away || prev?.home !== next.home) {
      await store.setGameState(game.gamePk, next);
    }
    if (events.length === 0) continue;
    const targets = subs.filter(
      (s) => s.teamIds.includes(game.away.id) || s.teamIds.includes(game.home.id)
    );
    for (const ev of events) {
      await sendToAll(targets, {
        ...ev,
        gamePk: game.gamePk,
        tag: `game-${game.gamePk}`,
      });
      sent += targets.length;
    }
  }

  return NextResponse.json({ sent, games: games.length });
}

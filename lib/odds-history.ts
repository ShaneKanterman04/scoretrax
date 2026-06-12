import { fetchSchedule } from "@/lib/mlb";
import { fetchGameOdds } from "@/lib/polymarket";
import { getOddsHistoryStore } from "@/lib/odds-history-store";
import { transformSchedule } from "@/lib/transform";
import type { GameOddsHistory, OddsSample, ScheduleGame } from "@/lib/types";

const BUCKET_MS = 5 * 60 * 1000;

function todayMlb(): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: process.env.ODDS_SCHEDULE_TIME_ZONE ?? "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (type: string) => parts.find((part) => part.type === type)?.value;
  return `${value("year")}-${value("month")}-${value("day")}`;
}

function bucketIso(now = Date.now()): string {
  return new Date(Math.floor(now / BUCKET_MS) * BUCKET_MS).toISOString();
}

function baseHistory(game: ScheduleGame): Omit<GameOddsHistory, "first" | "latest"> {
  return {
    gamePk: game.gamePk,
    officialDate: game.officialDate,
    gameDate: game.gameDate,
    gameNumber: game.gameNumber,
    awayAbbr: game.away.abbr,
    homeAbbr: game.home.abbr,
    samples: [],
  };
}

export async function runOddsHistorySweep(date = todayMlb()) {
  const store = getOddsHistoryStore();
  const raw = await fetchSchedule(date, false);
  const schedule = transformSchedule(raw);
  const sampleTs = bucketIso();
  let sampled = 0;
  let matched = 0;
  let skipped = 0;

  const pregame = schedule.games.filter((game) => game.state === "Preview");
  await Promise.all(
    pregame.map(async (game) => {
      sampled++;
      const odds = await fetchGameOdds(
        game.away.abbr,
        game.home.abbr,
        game.officialDate,
        game.gameNumber
      );
      if (!odds.matched || odds.awayProb === undefined || odds.homeProb === undefined) {
        skipped++;
        return;
      }
      const sample: OddsSample = {
        ts: sampleTs,
        awayProb: odds.awayProb,
        homeProb: odds.homeProb,
      };
      await store.appendSample(baseHistory(game), sample);
      matched++;
    })
  );
  await store.prune(date);
  return {
    date,
    sampled,
    matched,
    skipped,
    sampleTs,
  };
}

export async function getOddsHistory(date: string, gamePk?: number) {
  const store = getOddsHistoryStore();
  if (gamePk !== undefined) return store.getGame(date, gamePk);
  return store.listDate(date);
}

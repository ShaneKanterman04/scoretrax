import {
  fetchPitcherSeasonStats,
  fetchPitcherStatsRange,
  fetchSchedule,
  fetchStandings,
  fetchTeamSeasonStats,
  fetchTeamStatsRange,
} from "./mlb";
import { fetchGameMarket, fetchGameOdds, fetchHistoricalTokenPrice } from "./polymarket";
import { abbrFor } from "./teams";
import type {
  BestBetBacktestPick,
  BestBetBacktestResponse,
  BestBetConfidence,
  BestBetRecommendation,
  BestBetsResponse,
  BestBetSide,
  MarketOdds,
} from "./types";

interface TeamModelInput {
  id: number;
  abbr: string;
  name: string;
  recordPct: number;
  venuePct?: number;
  lastTenPct?: number;
  handPct?: number;
  streak?: number;
  pitcherName?: string;
  pitcherHand?: string;
  starterRating: number;
  offenseRating: number;
  staffRating: number;
  isHome: boolean;
}

interface CandidateContext {
  game: any;
  away: TeamModelInput;
  home: TeamModelInput;
  odds: MarketOdds;
}

interface RecommendationRun {
  contexts: CandidateContext[];
  recommendations: BestBetRecommendation[];
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function parsePct(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function recordPct(record: any): number {
  const parsed = parsePct(record?.pct);
  if (parsed !== undefined) return parsed;
  const wins = Number(record?.wins);
  const losses = Number(record?.losses);
  if (wins + losses > 0) return wins / (wins + losses);
  return 0.5;
}

function inningsToNumber(ip: unknown): number {
  if (typeof ip === "number") return ip;
  if (typeof ip !== "string") return 0;
  const [whole, outs] = ip.split(".");
  return Number(whole || 0) + Number(outs || 0) / 3;
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function seasonStart(season: number): string {
  return `${season}-03-01`;
}

function splitPct(row: any, type: string): number | undefined {
  const split = (row?.records?.splitRecords ?? []).find((r: any) => r.type === type);
  return parsePct(split?.pct);
}

function streakValue(row: any): number {
  const type = row?.streak?.streakType;
  const count = Number(row?.streak?.streakNumber ?? 0);
  if (!Number.isFinite(count)) return 0;
  if (type === "wins") return clamp(count, 0, 5);
  if (type === "losses") return -clamp(count, 0, 5);
  return 0;
}

function pitcherStat(raw: any): any | undefined {
  if (raw?.stats?.[0]?.splits?.[0]?.stat) return raw.stats[0].splits[0].stat;
  return raw?.people?.[0]?.stats?.[0]?.splits?.[0]?.stat;
}

function pitcherHand(raw: any): string | undefined {
  return raw?.people?.[0]?.pitchHand?.code;
}

function starterRating(stat: any): number {
  if (!stat) return 0;
  const ip = inningsToNumber(stat.inningsPitched);
  if (ip < 5) return 0;

  const era = Number(stat.era);
  const whip = Number(stat.whip);
  const kbb = Number(stat.strikeoutWalkRatio);
  let rating = 0;

  if (Number.isFinite(era)) rating += (4.2 - era) * 0.035;
  if (Number.isFinite(whip)) rating += (1.3 - whip) * 0.08;
  if (Number.isFinite(kbb)) rating += (kbb - 2.4) * 0.025;

  const sample = clamp(ip / 45, 0.25, 1);
  return clamp(rating * sample, -0.12, 0.12);
}

function teamStat(raw: any, group: "hitting" | "pitching"): any | undefined {
  return (raw?.stats ?? []).find((s: any) => s.group?.displayName === group)?.splits?.[0]?.stat;
}

function offenseRating(stat: any): number {
  if (!stat) return 0;
  const ops = Number(stat.ops);
  const obp = Number(stat.obp);
  const slg = Number(stat.slg);
  let rating = 0;
  if (Number.isFinite(ops)) rating += (ops - 0.71) * 0.45;
  if (Number.isFinite(obp)) rating += (obp - 0.32) * 0.35;
  if (Number.isFinite(slg)) rating += (slg - 0.39) * 0.25;
  return clamp(rating, -0.1, 0.1);
}

function staffRating(stat: any): number {
  if (!stat) return 0;
  const era = Number(stat.era);
  const whip = Number(stat.whip);
  const kbb = Number(stat.strikeoutWalkRatio);
  let rating = 0;
  if (Number.isFinite(era)) rating += (4.2 - era) * 0.02;
  if (Number.isFinite(whip)) rating += (1.3 - whip) * 0.06;
  if (Number.isFinite(kbb)) rating += (kbb - 2.4) * 0.018;
  return clamp(rating, -0.08, 0.08);
}

function teamRating(input: TeamModelInput): number {
  let rating = (input.recordPct - 0.5) * 0.9;
  if (input.venuePct !== undefined) rating += (input.venuePct - 0.5) * 0.28;
  if (input.lastTenPct !== undefined) rating += (input.lastTenPct - 0.5) * 0.18;
  if (input.handPct !== undefined) rating += (input.handPct - 0.5) * 0.18;
  rating += input.starterRating;
  rating += input.offenseRating;
  rating += input.staffRating;
  rating += input.streak ? input.streak * 0.01 : 0;
  if (input.isHome) rating += 0.035;
  return rating;
}

function logistic(value: number): number {
  return 1 / (1 + Math.exp(-value));
}

function confidence(edge: number, modelProb: number): BestBetConfidence {
  if (edge >= 0.07 && modelProb >= 0.52) return "Strong";
  if (edge >= 0.04) return "Standard";
  return "Lean";
}

function reasonList(
  pick: TeamModelInput,
  opponent: TeamModelInput,
  edge: number
): string[] {
  const reasons = [`${Math.round(edge * 100)} pt model edge`];
  if (pick.starterRating - opponent.starterRating >= 0.035 && pick.pitcherName) {
    reasons.push(`Starter edge with ${pick.pitcherName}`);
  }
  if (pick.offenseRating - opponent.offenseRating >= 0.025) {
    reasons.push("Better lineup profile");
  }
  if (pick.staffRating - opponent.staffRating >= 0.025) {
    reasons.push("Better run-prevention profile");
  }
  if ((pick.venuePct ?? 0.5) - (opponent.venuePct ?? 0.5) >= 0.08) {
    reasons.push(pick.isHome ? "Strong home split" : "Strong road split");
  }
  if ((pick.lastTenPct ?? 0.5) - (opponent.lastTenPct ?? 0.5) >= 0.15) {
    reasons.push("Better recent form");
  }
  if ((pick.handPct ?? 0.5) - (opponent.handPct ?? 0.5) >= 0.12) {
    reasons.push(`Better split vs ${opponent.pitcherHand === "L" ? "LHP" : "RHP"}`);
  }
  if (reasons.length === 1) reasons.push("Market price trails model");
  return reasons.slice(0, 4);
}

function buildRecommendation(
  ctx: CandidateContext,
  side: BestBetSide,
  modelProb: number,
  marketProb: number
): BestBetRecommendation | null {
  const edge = modelProb - marketProb;
  if (edge < 0.03 || modelProb < 0.45 || marketProb < 0.2 || marketProb > 0.85) {
    return null;
  }

  const pick = side === "away" ? ctx.away : ctx.home;
  const opponent = side === "away" ? ctx.home : ctx.away;
  const score = Math.round(edge * 1000 + Math.max(0, modelProb - 0.5) * 120);

  return {
    gamePk: ctx.game.gamePk,
    officialDate: ctx.game.officialDate,
    gameDate: ctx.game.gameDate,
    gameNumber: ctx.game.gameNumber ?? 1,
    venue: ctx.game.venue?.name ?? "",
    away: {
      id: ctx.away.id,
      abbr: ctx.away.abbr,
      name: ctx.away.name,
      probablePitcher: ctx.away.pitcherName,
    },
    home: {
      id: ctx.home.id,
      abbr: ctx.home.abbr,
      name: ctx.home.name,
      probablePitcher: ctx.home.pitcherName,
    },
    pick: side,
    pickTeamId: pick.id,
    pickAbbr: pick.abbr,
    opponentAbbr: opponent.abbr,
    modelProb,
    marketProb,
    edge,
    score,
    confidence: confidence(edge, modelProb),
    reasons: reasonList(pick, opponent, edge),
  };
}

async function pitcherModel(probablePitcher: any, season: number, asOfDate?: string) {
  if (!probablePitcher?.id) {
    return { name: probablePitcher?.fullName, hand: undefined, rating: 0 };
  }
  try {
    const raw = asOfDate
      ? await fetchPitcherStatsRange(
          probablePitcher.id,
          season,
          seasonStart(season),
          shiftDate(asOfDate, -1)
        )
      : await fetchPitcherSeasonStats(probablePitcher.id, season);
    const profile = asOfDate ? await fetchPitcherSeasonStats(probablePitcher.id, season) : raw;
    return {
      name: probablePitcher.fullName,
      hand: pitcherHand(profile),
      rating: starterRating(pitcherStat(raw)),
    };
  } catch {
    return { name: probablePitcher.fullName, hand: undefined, rating: 0 };
  }
}

async function teamModel(teamId: number, season: number, asOfDate?: string) {
  try {
    const raw = asOfDate
      ? await fetchTeamStatsRange(teamId, season, seasonStart(season), shiftDate(asOfDate, -1))
      : await fetchTeamSeasonStats(teamId, season);
    return {
      offenseRating: offenseRating(teamStat(raw, "hitting")),
      staffRating: staffRating(teamStat(raw, "pitching")),
    };
  } catch {
    return { offenseRating: 0, staffRating: 0 };
  }
}

async function historicalOdds(
  awayAbbr: string,
  homeAbbr: string,
  date: string,
  gameNumber: number,
  gameDate: string
): Promise<MarketOdds> {
  const market = await fetchGameMarket(awayAbbr, homeAbbr, date, gameNumber);
  if (!market.matched || !market.awayTokenId || !market.homeTokenId) return { matched: false };
  const targetTs = Math.floor(new Date(gameDate).getTime() / 1000) - 15 * 60;
  const [awayProb, homeProb] = await Promise.all([
    fetchHistoricalTokenPrice(market.awayTokenId, targetTs),
    fetchHistoricalTokenPrice(market.homeTokenId, targetTs),
  ]);
  if (awayProb === undefined || homeProb === undefined) return { matched: false };
  return {
    ...market,
    awayProb,
    homeProb,
  };
}

function standingRows(raw: any): Map<number, any> {
  const rows = new Map<number, any>();
  for (const record of raw?.records ?? []) {
    for (const row of record.teamRecords ?? []) {
      rows.set(row.team?.id, row);
    }
  }
  return rows;
}

function handSplitType(hand?: string, isHome?: boolean): string | undefined {
  if (hand !== "L" && hand !== "R") return undefined;
  const prefix = hand === "L" ? "left" : "right";
  if (isHome === true) return `${prefix}Home`;
  if (isHome === false) return `${prefix}Away`;
  return prefix;
}

async function buildContext(
  game: any,
  standings: Map<number, any>,
  season: number,
  mode: "current" | "historical" = "current"
): Promise<CandidateContext | null> {
  const awayTeam = game.teams?.away ?? {};
  const homeTeam = game.teams?.home ?? {};
  const awayId = awayTeam.team?.id;
  const homeId = homeTeam.team?.id;
  const awayAbbr = abbrFor(awayId, awayTeam.team?.name);
  const homeAbbr = abbrFor(homeId, homeTeam.team?.name);

  const [odds, awayPitcher, homePitcher, awayTeamModel, homeTeamModel] = await Promise.all([
    mode === "historical"
      ? historicalOdds(awayAbbr, homeAbbr, game.officialDate, game.gameNumber ?? 1, game.gameDate)
      : fetchGameOdds(awayAbbr, homeAbbr, game.officialDate, game.gameNumber ?? 1),
    pitcherModel(awayTeam.probablePitcher, season, mode === "historical" ? game.officialDate : undefined),
    pitcherModel(homeTeam.probablePitcher, season, mode === "historical" ? game.officialDate : undefined),
    teamModel(awayId, season, mode === "historical" ? game.officialDate : undefined),
    teamModel(homeId, season, mode === "historical" ? game.officialDate : undefined),
  ]);

  if (
    !odds.matched ||
    odds.awayProb === undefined ||
    odds.homeProb === undefined
  ) {
    return null;
  }

  const awayStanding = standings.get(awayId);
  const homeStanding = standings.get(homeId);
  const awayHandSplit = handSplitType(homePitcher.hand, false);
  const homeHandSplit = handSplitType(awayPitcher.hand, true);

  return {
    game,
    odds,
    away: {
      id: awayId,
      abbr: awayAbbr,
      name: awayTeam.team?.name ?? "",
      recordPct: recordPct(awayTeam.leagueRecord),
      venuePct: splitPct(awayStanding, "away"),
      lastTenPct: splitPct(awayStanding, "lastTen"),
      handPct: awayHandSplit ? splitPct(awayStanding, awayHandSplit) : undefined,
      streak: streakValue(awayStanding),
      pitcherName: awayPitcher.name,
      pitcherHand: awayPitcher.hand,
      starterRating: awayPitcher.rating,
      offenseRating: awayTeamModel.offenseRating,
      staffRating: awayTeamModel.staffRating,
      isHome: false,
    },
    home: {
      id: homeId,
      abbr: homeAbbr,
      name: homeTeam.team?.name ?? "",
      recordPct: recordPct(homeTeam.leagueRecord),
      venuePct: splitPct(homeStanding, "home"),
      lastTenPct: splitPct(homeStanding, "lastTen"),
      handPct: homeHandSplit ? splitPct(homeStanding, homeHandSplit) : undefined,
      streak: streakValue(homeStanding),
      pitcherName: homePitcher.name,
      pitcherHand: homePitcher.hand,
      starterRating: homePitcher.rating,
      offenseRating: homeTeamModel.offenseRating,
      staffRating: homeTeamModel.staffRating,
      isHome: true,
    },
  };
}

async function runRecommendations(
  date: string,
  mode: "current" | "historical" = "current"
): Promise<RecommendationRun> {
  const season = Number(date.slice(0, 4));
  const [scheduleRaw, standingsRaw] = await Promise.all([
    fetchSchedule(date, 60),
    fetchStandings(season),
  ]);
  const games: any[] = scheduleRaw?.dates?.[0]?.games ?? [];
  const eligibleGames = games.filter((game) =>
    mode === "historical"
      ? game.status?.abstractGameState === "Final"
      : game.status?.abstractGameState === "Preview"
  );
  const standings = standingRows(standingsRaw);

  const contexts = (
    await Promise.all(eligibleGames.map((game) => buildContext(game, standings, season, mode)))
  ).filter((ctx): ctx is CandidateContext => !!ctx);

  const recommendations: BestBetRecommendation[] = [];
  for (const ctx of contexts) {
    const awayRating = teamRating(ctx.away);
    const homeRating = teamRating(ctx.home);
    const rawHomeModel = logistic((homeRating - awayRating) * 3.2);
    const homeModel = 0.5 + (rawHomeModel - 0.5) * 0.45;
    const awayModel = 1 - homeModel;

    const awayRec = buildRecommendation(ctx, "away", awayModel, ctx.odds.awayProb!);
    const homeRec = buildRecommendation(ctx, "home", homeModel, ctx.odds.homeProb!);
    if (awayRec) recommendations.push(awayRec);
    if (homeRec) recommendations.push(homeRec);
  }

  recommendations.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.edge - a.edge;
  });

  return { contexts, recommendations };
}

export async function getBestBets(date: string): Promise<BestBetsResponse> {
  const { contexts, recommendations } = await runRecommendations(date);

  return {
    date,
    generatedAt: new Date().toISOString(),
    candidatesEvaluated: contexts.length * 2,
    topPick: recommendations[0] ?? null,
    alternates: recommendations.slice(1, 4),
    noPickReason:
      recommendations.length === 0
        ? contexts.length === 0
          ? "No matched pregame moneyline markets found."
          : "No pick cleared the edge and confidence thresholds."
        : undefined,
  };
}

function eachDate(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDate}T12:00:00Z`);
  const end = new Date(`${endDate}T12:00:00Z`);
  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

function gradePick(rec: BestBetRecommendation, game: any): BestBetBacktestPick {
  const awayScore = Number(game.teams?.away?.score ?? 0);
  const homeScore = Number(game.teams?.home?.score ?? 0);
  const result =
    awayScore === homeScore
      ? "void"
      : rec.pick === "away"
        ? awayScore > homeScore
          ? "won"
          : "lost"
        : homeScore > awayScore
          ? "won"
          : "lost";
  const profit =
    result === "won" ? 1 / rec.marketProb - 1 : result === "lost" ? -1 : 0;
  return {
    ...rec,
    result,
    finalScore: { away: awayScore, home: homeScore },
    profit,
  };
}

export async function backtestBestBets(
  startDate: string,
  endDate: string
): Promise<BestBetBacktestResponse> {
  const dates = eachDate(startDate, endDate);
  const picks: BestBetBacktestPick[] = [];
  const skippedDays: { date: string; reason: string }[] = [];

  for (const date of dates) {
    try {
      const run = await runRecommendations(date, "historical");
      const topPick = run.recommendations[0];
      if (!topPick) {
        skippedDays.push({
          date,
          reason:
            run.contexts.length === 0
              ? "No historical pregame market prices found."
              : "No pick cleared the edge and confidence thresholds.",
        });
        continue;
      }
      const context = run.contexts.find((ctx) => ctx.game.gamePk === topPick.gamePk);
      if (!context) {
        skippedDays.push({ date, reason: "Recommended game was not found in context." });
        continue;
      }
      picks.push(gradePick(topPick, context.game));
    } catch (e) {
      skippedDays.push({ date, reason: String(e) });
    }
  }

  const wins = picks.filter((pick) => pick.result === "won").length;
  const losses = picks.filter((pick) => pick.result === "lost").length;
  const voids = picks.filter((pick) => pick.result === "void").length;
  const totalProfit = picks.reduce((sum, pick) => sum + pick.profit, 0);
  const activePicks = picks.filter((pick) => pick.result !== "void");
  const average = (values: number[]) =>
    values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  return {
    startDate,
    endDate,
    generatedAt: new Date().toISOString(),
    daysTested: dates.length,
    picks,
    skippedDays,
    record: { wins, losses, voids },
    roi: activePicks.length ? totalProfit / activePicks.length : 0,
    averageEdge: average(picks.map((pick) => pick.edge)),
    averageMarketProb: average(picks.map((pick) => pick.marketProb)),
    averageModelProb: average(picks.map((pick) => pick.modelProb)),
  };
}

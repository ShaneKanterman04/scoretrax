import type { LiveGame, MarketOdds, WinProbSeries } from "./types";

export interface PressureSignal {
  score: number;
  label: string;
  reasons: string[];
  situation: string;
}

export interface MarketGap {
  awayLive: number;
  homeLive: number;
  awayMarket: number;
  homeMarket: number;
  delta: number;
  side: string;
  label: string;
}

function runnersOn(game: LiveGame): number {
  return Number(game.bases.first) + Number(game.bases.second) + Number(game.bases.third);
}

function hasRisp(game: LiveGame): boolean {
  return game.bases.second || game.bases.third;
}

function margin(game: LiveGame): number {
  return Math.abs(game.teams.away.score - game.teams.home.score);
}

function labelFor(score: number): string {
  if (score >= 90) return "Drop in now";
  if (score >= 75) return "At-bat pressure";
  if (score >= 60) return "Threat live";
  if (score >= 45) return "Developing";
  return "Live";
}

export function getLatestHomeWinProb(series?: WinProbSeries): number | undefined {
  return series?.points.at(-1)?.homeWP;
}

export function getPressureSignal(game: LiveGame, winProb?: WinProbSeries): PressureSignal {
  const reasons: string[] = [];
  let score = 0;

  if (game.status.abstract !== "Live") {
    return { score: 0, label: "Idle", reasons: [], situation: game.status.detailed };
  }

  score += 30;
  const inning = game.linescore.inning ?? 1;
  const runners = runnersOn(game);
  const gameMargin = margin(game);
  const outs = game.count.outs;
  const balls = game.count.balls;
  const strikes = game.count.strikes;

  if (inning >= 10) {
    score += 24;
    reasons.push("extras");
  } else if (inning >= 9) {
    score += 21;
    reasons.push("9th");
  } else if (inning >= 7) {
    score += 14;
    reasons.push("late");
  } else if (inning >= 5) {
    score += 6;
  }

  if (gameMargin === 0) {
    score += 17;
    reasons.push("tie");
  } else if (gameMargin === 1) {
    score += 15;
    reasons.push("one-run");
  } else if (gameMargin === 2) {
    score += 8;
    reasons.push("two-run");
  }

  if (runners === 3) {
    score += 20;
    reasons.push("loaded");
  } else if (hasRisp(game)) {
    score += 13;
    reasons.push("RISP");
  } else if (runners > 0) {
    score += 6;
    reasons.push("runner on");
  }

  if (balls === 3 && strikes === 2) {
    score += 8;
    reasons.push("full count");
  } else if (strikes === 2 && runners > 0) {
    score += 4;
  }

  if (runners > 0 && outs === 2) {
    score += 5;
    reasons.push("two outs");
  } else if (runners > 0 && outs === 0) {
    score += 4;
  }

  const homeBatting = game.linescore.isTop === false;
  const homeCanWalkOff =
    homeBatting &&
    inning >= 9 &&
    game.teams.home.score <= game.teams.away.score &&
    game.teams.away.score - game.teams.home.score <= runners + 1;
  if (homeCanWalkOff) {
    score += 16;
    reasons.push("walk-off in play");
  }

  const homeWP = getLatestHomeWinProb(winProb);
  if (homeWP !== undefined) {
    const neutral = Math.abs(homeWP - 50);
    if (neutral <= 8) {
      score += 10;
      reasons.push("coin flip");
    } else if (neutral <= 18) {
      score += 5;
    }
  }

  const batting = game.linescore.isTop ? game.teams.away.abbr : game.teams.home.abbr;
  const result = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: result,
    label: labelFor(result),
    reasons: reasons.slice(0, 4),
    situation: `${batting} batting, ${balls}-${strikes}, ${outs} out`,
  };
}

export function getMarketGap(
  game: LiveGame,
  odds?: MarketOdds,
  winProb?: WinProbSeries
): MarketGap | null {
  const latestHome = getLatestHomeWinProb(winProb);
  if (
    latestHome === undefined ||
    !odds?.matched ||
    odds.awayProb === undefined ||
    odds.homeProb === undefined
  ) {
    return null;
  }

  const homeLive = latestHome;
  const awayLive = 100 - latestHome;
  const awayMarket = odds.awayProb * 100;
  const homeMarket = odds.homeProb * 100;
  const homeDelta = homeMarket - homeLive;
  const awayDelta = awayMarket - awayLive;
  const useHome = Math.abs(homeDelta) >= Math.abs(awayDelta);
  const delta = useHome ? homeDelta : awayDelta;
  const absDelta = Math.abs(delta);

  return {
    awayLive,
    homeLive,
    awayMarket,
    homeMarket,
    delta: absDelta,
    side: useHome ? game.teams.home.abbr : game.teams.away.abbr,
    label: absDelta >= 12 ? "Mismatch" : absDelta >= 6 ? "Lean" : "Aligned",
  };
}

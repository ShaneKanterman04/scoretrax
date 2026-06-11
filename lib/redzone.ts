import type { ScheduleGame } from "./types";

export interface RedZoneSignal {
  score: number;
  label: string;
  reasons: string[];
}

function scoreMargin(game: ScheduleGame): number | undefined {
  if (game.away.score === undefined || game.home.score === undefined) return undefined;
  return Math.abs(game.away.score - game.home.score);
}

function runnersOn(game: ScheduleGame): number {
  const bases = game.bases;
  if (!bases) return 0;
  return Number(bases.first) + Number(bases.second) + Number(bases.third);
}

function hasRisp(game: ScheduleGame): boolean {
  return !!game.bases?.second || !!game.bases?.third;
}

function startsInMinutes(game: ScheduleGame): number {
  return Math.round((new Date(game.gameDate).getTime() - Date.now()) / 60_000);
}

function pressureLabel(score: number): string {
  if (score >= 85) return "Must-watch";
  if (score >= 70) return "High leverage";
  if (score >= 55) return "Heating up";
  if (score >= 35) return "Worth tracking";
  return "On deck";
}

export function getRedZoneSignal(game: ScheduleGame): RedZoneSignal {
  const reasons: string[] = [];
  let score = 0;

  if (game.state === "Live") {
    score += 35;
    reasons.push("Live");

    const inning = game.inning ?? 1;
    if (inning >= 10) {
      score += 25;
      reasons.push("Extras");
    } else if (inning >= 9) {
      score += 22;
      reasons.push("9th inning");
    } else if (inning >= 7) {
      score += 14;
      reasons.push("Late innings");
    } else if (inning >= 5) {
      score += 6;
    }

    const margin = scoreMargin(game);
    if (margin !== undefined) {
      if (margin === 0) {
        score += 18;
        reasons.push("Tie game");
      } else if (margin === 1) {
        score += 16;
        reasons.push("One-run game");
      } else if (margin === 2) {
        score += 10;
        reasons.push("Two-run game");
      } else if (margin <= 4 && inning >= 7) {
        score += 5;
        reasons.push("Late comeback range");
      }
    }

    const runners = runnersOn(game);
    if (runners === 3) {
      score += 20;
      reasons.push("Bases loaded");
    } else if (hasRisp(game)) {
      score += 13;
      reasons.push("Runner in scoring position");
    } else if (runners > 0) {
      score += 6;
      reasons.push("Runner aboard");
    }

    const outs = game.outs ?? 0;
    if (runners > 0 && outs === 2) {
      score += 5;
      reasons.push("Two-out pressure");
    } else if (runners > 0 && outs === 0) {
      score += 4;
      reasons.push("Threat building");
    }

    const battingHome = game.isTop === false;
    const homeRuns = game.home.score ?? 0;
    const awayRuns = game.away.score ?? 0;
    const homeCanWalkOff =
      battingHome && inning >= 9 && homeRuns <= awayRuns && awayRuns - homeRuns <= runners + 1;
    if (homeCanWalkOff) {
      score += 16;
      reasons.push("Walk-off chance");
    }
  } else if (game.state === "Preview") {
    const minutes = startsInMinutes(game);
    if (minutes >= 0 && minutes <= 30) {
      score += 24;
      reasons.push("Starting soon");
    } else if (minutes > 30 && minutes <= 90) {
      score += 14;
      reasons.push("On deck");
    } else {
      score += 6;
      reasons.push("Upcoming");
    }
    if (game.away.probablePitcher && game.home.probablePitcher) {
      score += 4;
      reasons.push("Pitchers set");
    }
  }

  const finalScore = Math.max(0, Math.min(100, Math.round(score)));
  return {
    score: finalScore,
    label: pressureLabel(finalScore),
    reasons: reasons.slice(0, 3),
  };
}

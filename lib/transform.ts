// Transforms the raw MLB Stats API live feed (~787 KB) into slim DTOs.

import { abbrFor } from "./teams";
import type {
  Bases,
  BoxBatter,
  BoxPitcher,
  BoxScore,
  BoxTeam,
  GameState,
  LiveGame,
  LivePlayer,
  Pitch,
  PlayByInning,
  RecentPlay,
  ScheduleDay,
  ScheduleGame,
  WinProbPoint,
  WinProbSeries,
} from "./types";

function lastName(fullName?: string): string | undefined {
  return fullName?.split(" ").slice(1).join(" ") || fullName;
}

function recordOf(lr: any): string | undefined {
  return lr ? `${lr.wins}-${lr.losses}` : undefined;
}

function playToRecent(p: any): RecentPlay {
  return {
    atBatIndex: p.about?.atBatIndex ?? 0,
    inning: p.about?.inning ?? 0,
    half: p.about?.halfInning ?? "",
    event: p.result?.event ?? "",
    description: p.result?.description ?? "",
    isScoring: !!p.about?.isScoringPlay,
    awayScore: p.result?.awayScore ?? 0,
    homeScore: p.result?.homeScore ?? 0,
  };
}

function basesFromLinescore(linescore: any): Bases {
  const off = linescore?.offense ?? {};
  return {
    first: !!off.first,
    second: !!off.second,
    third: !!off.third,
    runnerNames: {
      first: lastName(off.first?.fullName),
      second: lastName(off.second?.fullName),
      third: lastName(off.third?.fullName),
    },
  };
}

export function transformSchedule(raw: any): ScheduleDay {
  const day = raw.dates?.[0];
  const games: ScheduleGame[] = (day?.games ?? []).map((g: any) => {
    const mk = (side: "away" | "home") => {
      const t = g.teams?.[side] ?? {};
      return {
        id: t.team?.id,
        abbr: abbrFor(t.team?.id, t.team?.name),
        name: t.team?.name ?? "",
        score: t.score,
        record: recordOf(t.leagueRecord),
        probablePitcher: t.probablePitcher?.fullName,
      };
    };
    const game: ScheduleGame = {
      gamePk: g.gamePk,
      gameDate: g.gameDate,
      officialDate: g.officialDate,
      state: (g.status?.abstractGameState ?? "Preview") as GameState,
      detailedState: g.status?.detailedState ?? "",
      away: mk("away"),
      home: mk("home"),
      venue: g.venue?.name ?? "",
      doubleHeader: g.doubleHeader ?? "N",
      gameNumber: g.gameNumber ?? 1,
    };
    if (game.state === "Live" && g.linescore) {
      game.inning = g.linescore.currentInning;
      game.inningOrdinal = g.linescore.currentInningOrdinal;
      game.isTop = g.linescore.isTopInning;
      game.outs = g.linescore.outs;
      game.bases = basesFromLinescore(g.linescore);
    }
    return game;
  });
  return { date: day?.date ?? "", games };
}

function transformLinescore(ls: any): LiveGame["linescore"] {
  return {
    inning: ls?.currentInning,
    ordinal: ls?.currentInningOrdinal,
    state: ls?.inningState,
    isTop: ls?.isTopInning,
    innings: (ls?.innings ?? []).map((i: any) => ({
      num: i.num,
      away: i.away?.runs,
      home: i.home?.runs,
    })),
    rhe: {
      away: [ls?.teams?.away?.runs ?? 0, ls?.teams?.away?.hits ?? 0, ls?.teams?.away?.errors ?? 0],
      home: [ls?.teams?.home?.runs ?? 0, ls?.teams?.home?.hits ?? 0, ls?.teams?.home?.errors ?? 0],
    },
  };
}

function pitcherGameLine(stats: any): string | undefined {
  if (!stats) return undefined;
  const ip = stats.inningsPitched;
  if (ip === undefined) return undefined;
  return `${ip} IP, ${stats.earnedRuns ?? 0} ER, ${stats.strikeOuts ?? 0} K`;
}

function batterGameLine(stats: any): string | undefined {
  if (!stats || stats.atBats === undefined) return undefined;
  let line = `${stats.hits ?? 0}-${stats.atBats}`;
  const extras: string[] = [];
  if (stats.homeRuns) extras.push(`${stats.homeRuns > 1 ? stats.homeRuns + " " : ""}HR`);
  if (stats.rbi) extras.push(`${stats.rbi} RBI`);
  if (extras.length) line += `, ${extras.join(", ")}`;
  return line;
}

export function transformLiveFeed(raw: any): LiveGame {
  const gd = raw.gameData ?? {};
  const ld = raw.liveData ?? {};
  const ls = ld.linescore ?? {};
  const current = ld.plays?.currentPlay;
  const allPlays: any[] = ld.plays?.allPlays ?? [];
  const abstract = (gd.status?.abstractGameState ?? "Preview") as GameState;

  const teamDTO = (side: "away" | "home") => {
    const t = gd.teams?.[side] ?? {};
    return {
      id: t.id,
      abbr: t.abbreviation ?? abbrFor(t.id, t.name),
      name: t.name ?? "",
      score: ls.teams?.[side]?.runs ?? 0,
    };
  };

  // boxscore player entries keyed "ID{personId}"
  const boxPlayers = (side: "away" | "home") => ld.boxscore?.teams?.[side]?.players ?? {};
  const isTop = !!ls.isTopInning;
  const battingSide: "away" | "home" = isTop ? "away" : "home";
  const fieldingSide: "away" | "home" = isTop ? "home" : "away";

  let matchup: LiveGame["matchup"];
  const m = current?.matchup;
  if (m?.batter && m?.pitcher) {
    const batterBox = boxPlayers(battingSide)[`ID${m.batter.id}`];
    const pitcherBox = boxPlayers(fieldingSide)[`ID${m.pitcher.id}`];
    const batter: LivePlayer = {
      id: m.batter.id,
      name: m.batter.fullName,
      side: m.batSide?.code,
      gameLine: batterGameLine(batterBox?.stats?.batting),
      seasonLine: batterBox?.seasonStats?.batting?.avg
        ? `.${String(batterBox.seasonStats.batting.avg).replace(/^0?\./, "")} AVG`
        : undefined,
    };
    const pitcher: LivePlayer = {
      id: m.pitcher.id,
      name: m.pitcher.fullName,
      side: m.pitchHand?.code,
      gameLine: pitcherGameLine(pitcherBox?.stats?.pitching),
      pitchCount: pitcherBox?.stats?.pitching?.numberOfPitches,
    };
    matchup = {
      batter,
      pitcher,
      onDeck: ls.offense?.onDeck?.fullName,
      inHole: ls.offense?.inHole?.fullName,
    };
  }

  const pitches: Pitch[] = (current?.playEvents ?? [])
    .filter((e: any) => e.isPitch)
    .map((e: any) => ({
      n: e.pitchNumber,
      callDesc: e.details?.description ?? e.details?.call?.description ?? "",
      typeDesc: e.details?.type?.description,
      typeCode: e.details?.type?.code,
      mph: e.pitchData?.startSpeed,
      isBall: !!e.details?.isBall,
      isStrike: !!e.details?.isStrike,
      isInPlay: !!e.details?.isInPlay,
      px: e.pitchData?.coordinates?.pX,
      pz: e.pitchData?.coordinates?.pZ,
      szTop: e.pitchData?.strikeZoneTop,
      szBot: e.pitchData?.strikeZoneBottom,
    }));

  const completePlays = allPlays.filter((p) => p.about?.isComplete);
  const recentPlays = completePlays.slice(-10).reverse().map(playToRecent);
  const lastResult =
    current?.about?.isComplete
      ? current.result?.description
      : completePlays.at(-1)?.result?.description;

  const decisionsRaw = ld.decisions;
  const decisions = decisionsRaw
    ? {
        winner: decisionsRaw.winner?.fullName,
        loser: decisionsRaw.loser?.fullName,
        save: decisionsRaw.save?.fullName,
      }
    : undefined;

  return {
    gamePk: raw.gamePk ?? gd.game?.pk,
    status: { abstract, detailed: gd.status?.detailedState ?? "" },
    teams: { away: teamDTO("away"), home: teamDTO("home") },
    linescore: transformLinescore(ls),
    count: {
      balls: ls.balls ?? current?.count?.balls ?? 0,
      strikes: ls.strikes ?? current?.count?.strikes ?? 0,
      outs: ls.outs ?? current?.count?.outs ?? 0,
    },
    bases: basesFromLinescore(ls),
    matchup,
    currentAtBat: { pitches, lastResult },
    recentPlays,
    decisions,
    gameDate: gd.datetime?.dateTime ?? "",
    officialDate: gd.datetime?.officialDate ?? (gd.datetime?.dateTime ?? "").slice(0, 10),
    gameNumber: gd.game?.gameNumber ?? gd.game?.number ?? 1,
    venue: gd.venue?.name,
  };
}

function transformBoxTeam(raw: any, side: "away" | "home"): BoxTeam {
  const team = raw.liveData?.boxscore?.teams?.[side] ?? {};
  const players = team.players ?? {};
  const batters: BoxBatter[] = (team.batters ?? [])
    .map((id: number) => players[`ID${id}`])
    .filter((p: any) => p?.stats?.batting && p.stats.batting.atBats !== undefined)
    .map((p: any) => ({
      id: p.person?.id,
      name: p.person?.fullName ?? "",
      pos: p.position?.abbreviation ?? "",
      order: p.battingOrder ? Number(p.battingOrder) : undefined,
      ab: p.stats.batting.atBats ?? 0,
      r: p.stats.batting.runs ?? 0,
      h: p.stats.batting.hits ?? 0,
      rbi: p.stats.batting.rbi ?? 0,
      bb: p.stats.batting.baseOnBalls ?? 0,
      k: p.stats.batting.strikeOuts ?? 0,
      avg: p.seasonStats?.batting?.avg ?? "-",
    }));
  const pitchers: BoxPitcher[] = (team.pitchers ?? [])
    .map((id: number) => players[`ID${id}`])
    .filter((p: any) => p?.stats?.pitching)
    .map((p: any) => ({
      id: p.person?.id,
      name: p.person?.fullName ?? "",
      ip: p.stats.pitching.inningsPitched ?? "0.0",
      h: p.stats.pitching.hits ?? 0,
      r: p.stats.pitching.runs ?? 0,
      er: p.stats.pitching.earnedRuns ?? 0,
      bb: p.stats.pitching.baseOnBalls ?? 0,
      k: p.stats.pitching.strikeOuts ?? 0,
      pitches: p.stats.pitching.numberOfPitches,
      note: p.stats.pitching.note,
    }));
  const t = raw.gameData?.teams?.[side] ?? {};
  return {
    abbr: t.abbreviation ?? abbrFor(t.id, t.name),
    name: t.name ?? "",
    batters,
    pitchers,
  };
}

export function transformBoxScore(raw: any): BoxScore {
  const ld = raw.liveData ?? {};
  const allPlays: any[] = ld.plays?.allPlays ?? [];
  const byInning: PlayByInning[] = [];
  for (const p of allPlays) {
    if (!p.about?.isComplete) continue;
    const last = byInning.at(-1);
    if (last && last.inning === p.about.inning && last.half === p.about.halfInning) {
      last.plays.push(playToRecent(p));
    } else {
      byInning.push({
        inning: p.about.inning,
        half: p.about.halfInning,
        plays: [playToRecent(p)],
      });
    }
  }
  return {
    gamePk: raw.gamePk,
    status: {
      abstract: (raw.gameData?.status?.abstractGameState ?? "Preview") as GameState,
      detailed: raw.gameData?.status?.detailedState ?? "",
    },
    linescore: transformLinescore(ld.linescore),
    teams: {
      away: transformBoxTeam(raw, "away"),
      home: transformBoxTeam(raw, "home"),
    },
    playsByInning: byInning.reverse(),
  };
}

export function transformWinProbability(
  raw: any[],
  gamePk: number
): WinProbSeries {
  const points: WinProbPoint[] = (raw ?? [])
    .filter((p) => p.about?.isComplete && typeof p.homeTeamWinProbability === "number")
    .map((p) => ({
      atBatIndex: p.atBatIndex ?? p.about?.atBatIndex ?? 0,
      inning: p.about?.inning ?? 0,
      half: p.about?.halfInning ?? "top",
      homeWP: p.homeTeamWinProbability,
      event: p.result?.event,
      isScoring: p.about?.isScoringPlay ?? false,
      awayScore: p.result?.awayScore ?? 0,
      homeScore: p.result?.homeScore ?? 0,
    }));
  return { gamePk, points };
}

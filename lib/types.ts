// Slim DTOs shared between API routes (server) and pages (client).

export type GameState = "Preview" | "Live" | "Final";

export interface ScheduleGame {
  gamePk: number;
  gameDate: string; // UTC ISO
  officialDate: string; // YYYY-MM-DD
  state: GameState;
  detailedState: string;
  away: ScheduleTeam;
  home: ScheduleTeam;
  venue: string;
  doubleHeader: string;
  gameNumber: number;
  // live extras (present when state === "Live")
  inning?: number;
  inningOrdinal?: string;
  isTop?: boolean;
  outs?: number;
  bases?: Bases;
}

export interface ScheduleTeam {
  id: number;
  abbr: string;
  name: string;
  score?: number;
  record?: string; // "40-25"
  probablePitcher?: string;
}

export interface ScheduleDay {
  date: string;
  games: ScheduleGame[];
}

export interface Bases {
  first: boolean;
  second: boolean;
  third: boolean;
  runnerNames?: { first?: string; second?: string; third?: string };
}

export interface Pitch {
  n: number;
  callDesc: string; // "Called Strike"
  typeDesc?: string; // "Sinker"
  typeCode?: string; // "SI"
  mph?: number;
  isBall: boolean;
  isStrike: boolean;
  isInPlay: boolean;
  px?: number; // ft, catcher's view, + = right
  pz?: number; // ft above plate
  szTop?: number;
  szBot?: number;
}

export interface LivePlayer {
  id: number;
  name: string;
  side?: string; // bat side or pitch hand code: L/R/S
  gameLine?: string; // batter "1-3, HR" / pitcher "5.1 IP, 2 ER"
  seasonLine?: string; // batter ".287 AVG" etc.
  pitchCount?: number;
}

export interface RecentPlay {
  atBatIndex: number;
  inning: number;
  half: string; // "top" | "bottom"
  event: string;
  description: string;
  isScoring: boolean;
  awayScore: number;
  homeScore: number;
}

export interface LiveGame {
  gamePk: number;
  status: { abstract: GameState; detailed: string };
  teams: {
    away: { id: number; abbr: string; name: string; score: number };
    home: { id: number; abbr: string; name: string; score: number };
  };
  linescore: {
    inning?: number;
    ordinal?: string;
    state?: string; // Top/Bottom/Middle/End
    isTop?: boolean;
    innings: { num: number; away?: number; home?: number }[];
    rhe: { away: [number, number, number]; home: [number, number, number] };
  };
  count: { balls: number; strikes: number; outs: number };
  bases: Bases;
  matchup?: {
    batter?: LivePlayer;
    pitcher?: LivePlayer;
    onDeck?: string;
    inHole?: string;
  };
  currentAtBat: { pitches: Pitch[]; lastResult?: string };
  recentPlays: RecentPlay[];
  decisions?: { winner?: string; loser?: string; save?: string };
  gameDate: string;
  officialDate: string; // YYYY-MM-DD
  venue?: string;
}

export interface BoxBatter {
  id: number;
  name: string;
  pos: string;
  order?: number; // battingOrder e.g. 100, 101
  ab: number; r: number; h: number; rbi: number; bb: number; k: number;
  avg: string;
}

export interface BoxPitcher {
  id: number;
  name: string;
  ip: string; h: number; r: number; er: number; bb: number; k: number;
  pitches?: number;
  note?: string; // (W, 7-2) etc.
}

export interface BoxTeam {
  abbr: string;
  name: string;
  batters: BoxBatter[];
  pitchers: BoxPitcher[];
}

export interface PlayByInning {
  inning: number;
  half: string;
  plays: RecentPlay[];
}

export interface BoxScore {
  gamePk: number;
  status: { abstract: GameState; detailed: string };
  linescore: LiveGame["linescore"];
  teams: { away: BoxTeam; home: BoxTeam };
  playsByInning: PlayByInning[];
}

export interface StandingsRow {
  teamId: number;
  abbr: string;
  name: string;
  w: number;
  l: number;
  pct: string;
  gb: string;
  streak: string;
  lastTen: string;
  // playoff race extras (absent until applicable; API returns "-" for n/a)
  clinch?: string; // x/y/z/e clinch indicator
  magic?: string; // magic number
  elim?: string; // elimination number
  wcGb?: string; // wild card games back, e.g. "+3.0" / "1.5"
  wcElim?: string; // wild card elimination number
  wcRank?: number;
}

export interface StandingsDivision {
  division: string;
  league: "AL" | "NL";
  rows: StandingsRow[];
}

export interface WildCardStandings {
  league: "AL" | "NL";
  rows: StandingsRow[];
}

export interface StandingsData {
  divisions: StandingsDivision[];
  wildCards: WildCardStandings[];
}

export interface TeamInfo {
  id: number;
  name: string;
  abbr: string;
  record?: string;
  roster: { id: number; name: string; number?: string; pos: string }[];
  recentGames: ScheduleGame[];
  upcomingGames: ScheduleGame[];
}

export interface PlayerInfo {
  id: number;
  name: string;
  number?: string;
  pos: string;
  batSide?: string;
  pitchHand?: string;
  team?: { id: number; name: string };
  group: "hitting" | "pitching";
  season: Record<string, string | number>;
  gameLog: { date: string; opponent?: string; line: Record<string, string | number> }[];
}

export interface WinProbPoint {
  atBatIndex: number;
  inning: number;
  half: string; // "top" | "bottom"
  homeWP: number; // 0..100
  event?: string;
  isScoring?: boolean;
  awayScore: number;
  homeScore: number;
}

export interface WinProbSeries {
  gamePk: number;
  points: WinProbPoint[];
}

export interface HotColdZone {
  zone: string; // "01".."09" in-zone 3x3 grid, "11".."14" outside corners
  value: string; // e.g. ".300"
  color: string; // rgba literal from the API
  temp: string; // hot | lukewarm | cool
}

export interface MatchupSplits {
  vsCareer?: {
    pa: number;
    ab: number;
    h: number;
    hr: number;
    bb: number;
    k: number;
    avg: string;
    ops: string;
  };
  zones?: HotColdZone[];
}

export interface MarketOdds {
  matched: boolean;
  awayProb?: number; // 0..1
  homeProb?: number;
  awayLabel?: string;
  homeLabel?: string;
  volume24hr?: number;
  title?: string;
}

export type LegResult = "pending" | "won" | "lost" | "void";
export type BetStatus = "open" | "won" | "lost" | "void";

export interface BetLeg {
  gamePk: number;
  officialDate: string; // YYYY-MM-DD, used for settlement schedule lookup
  gameNumber: number; // doubleheader disambiguation for the Polymarket slug
  awayAbbr: string;
  homeAbbr: string;
  pick: "away" | "home";
  pickTeamId: number;
  entryProb?: number; // 0..1 Polymarket implied prob at entry; undefined if unmatched
  result: LegResult;
  finalScore?: { away: number; home: number };
}

export interface Bet {
  id: string;
  createdAt: string; // ISO
  legs: BetLeg[]; // 1..N (parlay when >1)
  status: BetStatus;
  settledAt?: string;
}

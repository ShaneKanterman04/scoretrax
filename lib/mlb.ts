// Server-only client for the public MLB Stats API (statsapi.mlb.com).

const BASE = "https://statsapi.mlb.com";

export async function mlbFetch<T>(path: string, revalidate: number | false): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
    headers: { accept: "application/json" },
  });
  if (!res.ok) {
    throw new Error(`MLB API ${res.status} for ${path}`);
  }
  return res.json() as Promise<T>;
}

export function fetchSchedule(date: string, revalidate: number) {
  return mlbFetch<any>(
    `/api/v1/schedule?sportId=1&date=${date}&hydrate=probablePitcher,linescore`,
    revalidate
  );
}

export function fetchLiveFeed(gamePk: string | number) {
  return mlbFetch<any>(`/api/v1.1/game/${gamePk}/feed/live`, false);
}

export function fetchWinProbability(gamePk: string | number) {
  return mlbFetch<any[]>(
    `/api/v1/game/${gamePk}/winProbability?fields=atBatIndex,homeTeamWinProbability,about,inning,halfInning,isComplete,isScoringPlay,result,event,awayScore,homeScore`,
    false
  );
}

export function fetchStandings(season: number) {
  return mlbFetch<any>(
    `/api/v1/standings?leagueId=103,104&season=${season}&standingsTypes=regularSeason,wildCard`,
    300
  );
}

export function fetchPitcherSeasonStats(personId: string | number, season: number) {
  return mlbFetch<any>(
    `/api/v1/people/${personId}?hydrate=stats(group=[pitching],type=[season],season=${season})`,
    3600
  );
}

export function fetchPitcherStatsRange(
  personId: string | number,
  season: number,
  startDate: string,
  endDate: string
) {
  return mlbFetch<any>(
    `/api/v1/people/${personId}/stats?stats=byDateRange&group=pitching&season=${season}&startDate=${startDate}&endDate=${endDate}`,
    86400
  );
}

export function fetchTeamSeasonStats(teamId: string | number, season: number) {
  return mlbFetch<any>(
    `/api/v1/teams/${teamId}/stats?stats=season&group=hitting,pitching&season=${season}`,
    3600
  );
}

export function fetchTeamStatsRange(
  teamId: string | number,
  season: number,
  startDate: string,
  endDate: string
) {
  return mlbFetch<any>(
    `/api/v1/teams/${teamId}/stats?stats=byDateRange&group=hitting,pitching&season=${season}&startDate=${startDate}&endDate=${endDate}`,
    86400
  );
}

export function fetchTeam(teamId: string | number) {
  return mlbFetch<any>(`/api/v1/teams/${teamId}`, 600);
}

export function fetchRoster(teamId: string | number) {
  return mlbFetch<any>(`/api/v1/teams/${teamId}/roster?rosterType=active`, 600);
}

export function fetchTeamSchedule(teamId: string | number, startDate: string, endDate: string) {
  return mlbFetch<any>(
    `/api/v1/schedule?sportId=1&teamId=${teamId}&startDate=${startDate}&endDate=${endDate}`,
    600
  );
}

export function fetchPlayer(personId: string | number, season: number) {
  return mlbFetch<any>(
    `/api/v1/people/${personId}?hydrate=stats(group=[hitting,pitching],type=[season,gameLog],season=${season}),currentTeam`,
    600
  );
}

export function fetchVsPlayer(batterId: string | number, pitcherId: string | number) {
  return mlbFetch<any>(
    `/api/v1/people/${batterId}/stats?stats=vsPlayer&group=hitting&opposingPlayerId=${pitcherId}`,
    300
  );
}

export function fetchHotColdZones(personId: string | number, season: number) {
  return mlbFetch<any>(
    `/api/v1/people/${personId}/stats?stats=hotColdZones&group=hitting&season=${season}`,
    3600
  );
}

export function currentSeason(): number {
  return new Date().getFullYear();
}

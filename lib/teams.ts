// Static MLB team table: statsapi team id -> abbreviation, names, and the
// lowercase code Polymarket uses in event slugs (diverges for ATH and AZ).

export interface TeamEntry {
  id: number;
  abbr: string;
  name: string;
  teamName: string; // nickname, e.g. "Mets"
  polymarketCode: string;
}

export const TEAMS: TeamEntry[] = [
  { id: 108, abbr: "LAA", name: "Los Angeles Angels", teamName: "Angels", polymarketCode: "laa" },
  { id: 109, abbr: "AZ", name: "Arizona Diamondbacks", teamName: "D-backs", polymarketCode: "ari" },
  { id: 110, abbr: "BAL", name: "Baltimore Orioles", teamName: "Orioles", polymarketCode: "bal" },
  { id: 111, abbr: "BOS", name: "Boston Red Sox", teamName: "Red Sox", polymarketCode: "bos" },
  { id: 112, abbr: "CHC", name: "Chicago Cubs", teamName: "Cubs", polymarketCode: "chc" },
  { id: 113, abbr: "CIN", name: "Cincinnati Reds", teamName: "Reds", polymarketCode: "cin" },
  { id: 114, abbr: "CLE", name: "Cleveland Guardians", teamName: "Guardians", polymarketCode: "cle" },
  { id: 115, abbr: "COL", name: "Colorado Rockies", teamName: "Rockies", polymarketCode: "col" },
  { id: 116, abbr: "DET", name: "Detroit Tigers", teamName: "Tigers", polymarketCode: "det" },
  { id: 117, abbr: "HOU", name: "Houston Astros", teamName: "Astros", polymarketCode: "hou" },
  { id: 118, abbr: "KC", name: "Kansas City Royals", teamName: "Royals", polymarketCode: "kc" },
  { id: 119, abbr: "LAD", name: "Los Angeles Dodgers", teamName: "Dodgers", polymarketCode: "lad" },
  { id: 120, abbr: "WSH", name: "Washington Nationals", teamName: "Nationals", polymarketCode: "wsh" },
  { id: 121, abbr: "NYM", name: "New York Mets", teamName: "Mets", polymarketCode: "nym" },
  { id: 133, abbr: "ATH", name: "Athletics", teamName: "Athletics", polymarketCode: "oak" },
  { id: 134, abbr: "PIT", name: "Pittsburgh Pirates", teamName: "Pirates", polymarketCode: "pit" },
  { id: 135, abbr: "SD", name: "San Diego Padres", teamName: "Padres", polymarketCode: "sd" },
  { id: 136, abbr: "SEA", name: "Seattle Mariners", teamName: "Mariners", polymarketCode: "sea" },
  { id: 137, abbr: "SF", name: "San Francisco Giants", teamName: "Giants", polymarketCode: "sf" },
  { id: 138, abbr: "STL", name: "St. Louis Cardinals", teamName: "Cardinals", polymarketCode: "stl" },
  { id: 139, abbr: "TB", name: "Tampa Bay Rays", teamName: "Rays", polymarketCode: "tb" },
  { id: 140, abbr: "TEX", name: "Texas Rangers", teamName: "Rangers", polymarketCode: "tex" },
  { id: 141, abbr: "TOR", name: "Toronto Blue Jays", teamName: "Blue Jays", polymarketCode: "tor" },
  { id: 142, abbr: "MIN", name: "Minnesota Twins", teamName: "Twins", polymarketCode: "min" },
  { id: 143, abbr: "PHI", name: "Philadelphia Phillies", teamName: "Phillies", polymarketCode: "phi" },
  { id: 144, abbr: "ATL", name: "Atlanta Braves", teamName: "Braves", polymarketCode: "atl" },
  { id: 145, abbr: "CWS", name: "Chicago White Sox", teamName: "White Sox", polymarketCode: "cws" },
  { id: 146, abbr: "MIA", name: "Miami Marlins", teamName: "Marlins", polymarketCode: "mia" },
  { id: 147, abbr: "NYY", name: "New York Yankees", teamName: "Yankees", polymarketCode: "nyy" },
  { id: 158, abbr: "MIL", name: "Milwaukee Brewers", teamName: "Brewers", polymarketCode: "mil" },
];

const byId = new Map(TEAMS.map((t) => [t.id, t]));
const byAbbr = new Map(TEAMS.map((t) => [t.abbr, t]));

export function teamById(id: number): TeamEntry | undefined {
  return byId.get(id);
}

export function teamByAbbr(abbr: string): TeamEntry | undefined {
  return byAbbr.get(abbr.toUpperCase());
}

export function abbrFor(id: number, fallbackName?: string): string {
  return byId.get(id)?.abbr ?? fallbackName?.slice(0, 3).toUpperCase() ?? "???";
}

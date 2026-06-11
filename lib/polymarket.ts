// Polymarket Gamma API client: find the moneyline market for an MLB game and
// turn outcome prices into win probabilities. Free, read-only, no key.
//
// Upgrade path for true realtime prices (not needed for MVP): the moneyline
// market's clobTokenIds can be fed to GET https://clob.polymarket.com/midpoint
// ?token_id={id} -> {"mid":"0.445"}.

import { teamByAbbr } from "./teams";
import type { MarketOdds } from "./types";

const GAMMA = "https://gamma-api.polymarket.com";
const CLOB = "https://clob.polymarket.com";

const NOT_FOUND: MarketOdds = { matched: false };

async function gammaFetch(path: string, revalidate: number): Promise<any> {
  const res = await fetch(`${GAMMA}${path}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`Polymarket ${res.status} for ${path}`);
  return res.json();
}

function buildSlug(awayAbbr: string, homeAbbr: string, date: string, gameNumber = 1): string | null {
  const away = teamByAbbr(awayAbbr)?.polymarketCode;
  const home = teamByAbbr(homeAbbr)?.polymarketCode;
  if (!away || !home) return null;
  const base = `mlb-${away}-${home}-${date}`;
  return gameNumber > 1 ? `${base}-${gameNumber}` : base;
}

function extractMoneyline(event: any, awayAbbr: string, homeAbbr: string): MarketOdds {
  const market = (event?.markets ?? []).find((m: any) => m.sportsMarketType === "moneyline");
  if (!market?.outcomes || !market?.outcomePrices) return NOT_FOUND;

  let outcomes: string[];
  let prices: number[];
  let tokenIds: string[] = [];
  try {
    outcomes = JSON.parse(market.outcomes);
    prices = JSON.parse(market.outcomePrices).map(Number);
    tokenIds = market.clobTokenIds ? JSON.parse(market.clobTokenIds) : [];
  } catch {
    return NOT_FOUND;
  }
  if (outcomes.length !== 2 || prices.length !== 2) return NOT_FOUND;

  // Prefer live mid over last trade when an order book exists.
  const bid = Number(market.bestBid);
  const ask = Number(market.bestAsk);
  const hasMid = bid > 0 && ask > 0 && ask <= 1;

  const awayTeam = teamByAbbr(awayAbbr);
  const idxOf = (team?: { name: string; teamName: string }) =>
    outcomes.findIndex(
      (o) => team && (o === team.name || o.includes(team.teamName))
    );
  let awayIdx = idxOf(awayTeam);
  if (awayIdx === -1) awayIdx = 0; // gamma convention: first outcome = away
  const homeIdx = awayIdx === 0 ? 1 : 0;

  let awayProb = prices[awayIdx];
  let homeProb = prices[homeIdx];
  if (hasMid) {
    // mid is for outcome[0]'s token; apply to whichever side that is
    const mid = (bid + ask) / 2;
    if (awayIdx === 0) {
      awayProb = mid;
      homeProb = 1 - mid;
    } else {
      homeProb = mid;
      awayProb = 1 - mid;
    }
  }

  return {
    matched: true,
    awayProb,
    homeProb,
    awayTokenId: tokenIds[awayIdx],
    homeTokenId: tokenIds[homeIdx],
    awayLabel: awayAbbr,
    homeLabel: homeAbbr,
    volume24hr: Number(market.volume24hr) || undefined,
    title: event.title,
  };
}

export async function fetchGameOdds(
  awayAbbr: string,
  homeAbbr: string,
  date: string,
  gameNumber = 1
): Promise<MarketOdds> {
  return fetchGameMarket(awayAbbr, homeAbbr, date, gameNumber);
}

export async function fetchGameMarket(
  awayAbbr: string,
  homeAbbr: string,
  date: string,
  gameNumber = 1
): Promise<MarketOdds> {
  const slug = buildSlug(awayAbbr, homeAbbr, date, gameNumber);
  if (!slug) return NOT_FOUND;

  try {
    const events = await gammaFetch(`/events?slug=${slug}`, 30);
    if (Array.isArray(events) && events.length > 0) {
      const odds = extractMoneyline(events[0], awayAbbr, homeAbbr);
      if (odds.matched) return odds;
    }

    // Fallback: scan open MLB events for this date and match team nicknames.
    const away = teamByAbbr(awayAbbr);
    const home = teamByAbbr(homeAbbr);
    if (!away || !home) return NOT_FOUND;
    const open = await gammaFetch(`/events?tag_slug=mlb&closed=false&limit=100`, 300);
    if (Array.isArray(open)) {
      const match = open.find(
        (e: any) =>
          typeof e.slug === "string" &&
          e.slug.includes(date) &&
          typeof e.title === "string" &&
          e.title.includes(away.teamName) &&
          e.title.includes(home.teamName)
      );
      if (match) return extractMoneyline(match, awayAbbr, homeAbbr);
    }
  } catch {
    // network/API failure -> degrade silently
  }
  return NOT_FOUND;
}

export async function fetchHistoricalTokenPrice(
  tokenId: string,
  targetTs: number,
  lookbackHours = 24
): Promise<number | undefined> {
  const startTs = targetTs - lookbackHours * 60 * 60;
  const params = new URLSearchParams({
    market: tokenId,
    startTs: String(startTs),
    endTs: String(targetTs),
    fidelity: "60",
  });
  try {
    const res = await fetch(`${CLOB}/prices-history?${params}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return undefined;
    const data = await res.json();
    const history = Array.isArray(data.history) ? data.history : [];
    const points = history
      .map((point: any) => ({ t: Number(point.t), p: Number(point.p) }))
      .filter((point: { t: number; p: number }) => Number.isFinite(point.t) && Number.isFinite(point.p))
      .filter((point: { t: number; p: number }) => point.t <= targetTs)
      .sort((a: { t: number }, b: { t: number }) => a.t - b.t);
    return points.at(-1)?.p;
  } catch {
    return undefined;
  }
}

"use client";

// Bet slips (picks + parlays) persisted in localStorage. Same store pattern
// as lib/favorites.ts: a module-level snapshot + emitter keeps subscribed
// components in sync within the tab; the `storage` event syncs across tabs.

import { useSyncExternalStore } from "react";
import { pinGame } from "@/lib/favorites";
import type { Bet, BetLeg, BetStatus, LegResult, ScheduleGame } from "@/lib/types";

const KEY = "scoretrax:bets";
const EMPTY: Bet[] = [];

let snapshot: Bet[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): Bet[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter(
          (b) => b && typeof b.id === "string" && Array.isArray(b.legs)
        )
      : [];
  } catch {
    return [];
  }
}

function ensureLoaded() {
  if (!loaded && typeof window !== "undefined") {
    snapshot = read();
    loaded = true;
  }
}

function emit() {
  for (const fn of listeners) fn();
}

function persist(next: Bet[]) {
  snapshot = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // storage full/blocked: keep the in-memory state for this tab
  }
  emit();
}

function subscribe(fn: () => void) {
  listeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      snapshot = read();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function getSnapshot(): Bet[] {
  ensureLoaded();
  return snapshot;
}

function getServerSnapshot(): Bet[] {
  return EMPTY;
}

export function addBet(legs: Omit<BetLeg, "result">[]): Bet {
  ensureLoaded();
  for (const leg of legs) {
    pinGame(leg.gamePk, leg.officialDate);
  }
  const bet: Bet = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    legs: legs.map((leg) => ({ ...leg, result: "pending" as const })),
    status: "open",
  };
  persist([bet, ...snapshot]);
  return bet;
}

export function deleteBet(id: string) {
  ensureLoaded();
  persist(snapshot.filter((b) => b.id !== id));
}

export function useBets() {
  const bets = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return { bets, remove: deleteBet };
}

// --- Grading --------------------------------------------------------------

export function gradeLeg(leg: BetLeg, game: ScheduleGame): LegResult {
  if (game.state !== "Final") return "pending";
  if (/postponed|cancelled/i.test(game.detailedState)) return "void";
  const away = game.away.score;
  const home = game.home.score;
  if (away === undefined || home === undefined || away === home) return "void";
  const pickedWon = leg.pick === "away" ? away > home : home > away;
  return pickedWon ? "won" : "lost";
}

export function betStatus(legs: BetLeg[]): BetStatus {
  if (legs.some((l) => l.result === "lost")) return "lost";
  if (legs.some((l) => l.result === "pending")) return "open";
  if (legs.every((l) => l.result === "void")) return "void";
  return "won";
}

// Parlay probability: product of leg probs (independent events). Undefined
// if any leg's probability is unknown.
export function combinedProb(
  probs: (number | undefined)[]
): number | undefined {
  let product = 1;
  for (const p of probs) {
    if (p === undefined) return undefined;
    product *= p;
  }
  return product;
}

export interface BetRecord {
  wins: number;
  losses: number;
  voids: number;
  legWins: number;
  legLosses: number;
  winRate?: number; // wins / (wins + losses)
  streak?: { result: "won" | "lost"; count: number };
  longestShot?: number; // lowest entry combined prob among won bets
}

export function betStats(bets: Bet[]): BetRecord {
  const stats: BetRecord = { wins: 0, losses: 0, voids: 0, legWins: 0, legLosses: 0 };
  for (const bet of bets) {
    if (bet.status === "won") stats.wins++;
    else if (bet.status === "lost") stats.losses++;
    else if (bet.status === "void") stats.voids++;
    for (const leg of bet.legs) {
      if (leg.result === "won") stats.legWins++;
      else if (leg.result === "lost") stats.legLosses++;
    }
    if (bet.status === "won") {
      const entry = combinedProb(bet.legs.map((l) => l.entryProb));
      if (entry !== undefined) {
        stats.longestShot =
          stats.longestShot === undefined ? entry : Math.min(stats.longestShot, entry);
      }
    }
  }
  const decided = stats.wins + stats.losses;
  if (decided > 0) stats.winRate = stats.wins / decided;
  const recent = bets
    .filter((b) => b.status === "won" || b.status === "lost")
    .sort((a, b) =>
      (b.settledAt ?? b.createdAt).localeCompare(a.settledAt ?? a.createdAt)
    );
  if (recent.length > 0) {
    const result = recent[0].status as "won" | "lost";
    let count = 0;
    for (const b of recent) {
      if (b.status !== result) break;
      count++;
    }
    stats.streak = { result, count };
  }
  return stats;
}

// Grade pending legs whose officialDate matches `date` against that day's
// schedule. Idempotent and change-gated, so it's safe to call on every SWR
// revalidation without write churn.
export function settleFromSchedule(date: string, games: ScheduleGame[]) {
  ensureLoaded();
  const byPk = new Map(games.map((g) => [g.gamePk, g]));
  let changed = false;
  const next = snapshot.map((bet) => {
    if (bet.status !== "open") return bet;
    let betChanged = false;
    const legs = bet.legs.map((leg) => {
      if (leg.result !== "pending" || leg.officialDate !== date) return leg;
      const game = byPk.get(leg.gamePk);
      if (!game) return leg;
      const result = gradeLeg(leg, game);
      if (result === "pending") return leg;
      betChanged = true;
      return {
        ...leg,
        result,
        finalScore: { away: game.away.score ?? 0, home: game.home.score ?? 0 },
      };
    });
    if (!betChanged) return bet;
    changed = true;
    const status = betStatus(legs);
    return {
      ...bet,
      legs,
      status,
      settledAt:
        status !== "open" ? bet.settledAt ?? new Date().toISOString() : undefined,
    };
  });
  if (changed) persist(next);
}

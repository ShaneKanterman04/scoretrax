"use client";

// Favorite team ids persisted in localStorage. A module-level snapshot +
// emitter keeps every subscribed component in sync within the tab; the
// `storage` event syncs across tabs.

import { useSyncExternalStore, useCallback } from "react";

const KEY = "scoretrax:favTeams";
const EMPTY: number[] = [];

let snapshot: number[] = EMPTY;
let loaded = false;
const listeners = new Set<() => void>();

function read(): number[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === "number") : [];
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

function getSnapshot(): number[] {
  ensureLoaded();
  return snapshot;
}

function getServerSnapshot(): number[] {
  return EMPTY;
}

export function getFavoriteIds(): number[] {
  ensureLoaded();
  return snapshot;
}

export function toggleFavorite(id: number) {
  ensureLoaded();
  snapshot = snapshot.includes(id)
    ? snapshot.filter((x) => x !== id)
    : [...snapshot, id];
  try {
    localStorage.setItem(KEY, JSON.stringify(snapshot));
  } catch {
    // storage full/blocked: keep the in-memory state for this tab
  }
  emit();
}

export function onFavoritesChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function useFavorites() {
  const ids = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isFavorite = useCallback((id: number) => ids.includes(id), [ids]);
  return { ids, isFavorite, toggle: toggleFavorite };
}

// --- Pinned games -----------------------------------------------------------
// gamePk -> officialDate (YYYY-MM-DD). Entries older than 2 days are pruned
// on load so stale gamePks don't accumulate.

const GAMES_KEY = "scoretrax:favGames";
const EMPTY_GAMES: Record<string, string> = {};

let gamesSnapshot: Record<string, string> = EMPTY_GAMES;
let gamesLoaded = false;
const gameListeners = new Set<() => void>();

function readGames(): Record<string, string> {
  try {
    const raw = localStorage.getItem(GAMES_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    const cutoff = new Date(Date.now() - 2 * 24 * 3600 * 1000)
      .toISOString()
      .slice(0, 10);
    const fresh: Record<string, string> = {};
    for (const [pk, date] of Object.entries(parsed)) {
      if (typeof date === "string" && date >= cutoff) fresh[pk] = date;
    }
    return fresh;
  } catch {
    return {};
  }
}

function ensureGamesLoaded() {
  if (!gamesLoaded && typeof window !== "undefined") {
    gamesSnapshot = readGames();
    gamesLoaded = true;
  }
}

function emitGames() {
  for (const fn of gameListeners) fn();
}

function subscribeGames(fn: () => void) {
  gameListeners.add(fn);
  const onStorage = (e: StorageEvent) => {
    if (e.key === GAMES_KEY) {
      gamesSnapshot = readGames();
      emitGames();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    gameListeners.delete(fn);
    window.removeEventListener("storage", onStorage);
  };
}

function getGamesSnapshot(): Record<string, string> {
  ensureGamesLoaded();
  return gamesSnapshot;
}

export function togglePinnedGame(gamePk: number, officialDate: string) {
  ensureGamesLoaded();
  const key = String(gamePk);
  if (key in gamesSnapshot) {
    const { [key]: _, ...rest } = gamesSnapshot;
    gamesSnapshot = rest;
  } else {
    gamesSnapshot = { ...gamesSnapshot, [key]: officialDate };
  }
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(gamesSnapshot));
  } catch {
    // storage full/blocked: keep the in-memory state for this tab
  }
  emitGames();
}

export function pinGame(gamePk: number, officialDate: string) {
  ensureGamesLoaded();
  const key = String(gamePk);
  if (gamesSnapshot[key] === officialDate) return;
  gamesSnapshot = { ...gamesSnapshot, [key]: officialDate };
  try {
    localStorage.setItem(GAMES_KEY, JSON.stringify(gamesSnapshot));
  } catch {
    // storage full/blocked: keep the in-memory state for this tab
  }
  emitGames();
}

export function usePinnedGames() {
  const games = useSyncExternalStore(
    subscribeGames,
    getGamesSnapshot,
    () => EMPTY_GAMES
  );
  const isPinned = useCallback(
    (gamePk: number) => String(gamePk) in games,
    [games]
  );
  return { isPinned, toggle: togglePinnedGame };
}

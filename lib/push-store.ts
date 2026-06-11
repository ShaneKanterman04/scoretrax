// Server-side store for push subscriptions and per-game notification
// snapshots. Uses Upstash Redis when UPSTASH_REDIS_REST_URL/TOKEN are set;
// otherwise falls back to an in-memory map (dev only — wiped on restart and
// not shared across serverless instances).

import { Redis } from "@upstash/redis";

export interface StoredSub {
  endpoint: string;
  keys: { p256dh: string; auth: string };
  teamIds: number[];
}

export interface GameSnapshot {
  state: string; // GameState
  away: number; // away score
  home: number; // home score
}

export interface PushStore {
  upsertSub(sub: StoredSub): Promise<void>;
  deleteSub(endpoint: string): Promise<void>;
  listSubs(): Promise<StoredSub[]>;
  getGameState(gamePk: number): Promise<GameSnapshot | null>;
  setGameState(gamePk: number, snap: GameSnapshot): Promise<void>;
}

const SUBS_KEY = "push:subs";
const GAME_TTL_SECS = 12 * 3600;

function upstashStore(): PushStore {
  const redis = Redis.fromEnv();
  return {
    async upsertSub(sub) {
      await redis.hset(SUBS_KEY, { [sub.endpoint]: JSON.stringify(sub) });
    },
    async deleteSub(endpoint) {
      await redis.hdel(SUBS_KEY, endpoint);
    },
    async listSubs() {
      const all = await redis.hgetall<Record<string, StoredSub>>(SUBS_KEY);
      // @upstash/redis auto-deserializes JSON values
      return all ? Object.values(all) : [];
    },
    async getGameState(gamePk) {
      return (await redis.get<GameSnapshot>(`push:game:${gamePk}`)) ?? null;
    },
    async setGameState(gamePk, snap) {
      await redis.set(`push:game:${gamePk}`, snap, { ex: GAME_TTL_SECS });
    },
  };
}

function memoryStore(): PushStore {
  console.warn(
    "[push-store] UPSTASH_REDIS_REST_URL not set — using in-memory store (dev only)"
  );
  const subs = new Map<string, StoredSub>();
  const games = new Map<number, GameSnapshot>();
  return {
    async upsertSub(sub) {
      subs.set(sub.endpoint, sub);
    },
    async deleteSub(endpoint) {
      subs.delete(endpoint);
    },
    async listSubs() {
      return [...subs.values()];
    },
    async getGameState(gamePk) {
      return games.get(gamePk) ?? null;
    },
    async setGameState(gamePk, snap) {
      games.set(gamePk, snap);
    },
  };
}

let store: PushStore | undefined;

export function getPushStore(): PushStore {
  if (!store) {
    store =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? upstashStore()
        : memoryStore();
  }
  return store;
}

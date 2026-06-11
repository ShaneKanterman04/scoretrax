// Server-side store for push subscriptions and per-game notification
// snapshots. Defaults to a JSON file on disk (right fit for a single
// self-hosted server process); set UPSTASH_REDIS_REST_URL/TOKEN to use
// Upstash Redis instead (for serverless/multi-instance deployments).

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
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
const GAME_TTL_MS = 12 * 3600 * 1000;

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
      await redis.set(`push:game:${gamePk}`, snap, {
        ex: GAME_TTL_MS / 1000,
      });
    },
  };
}

interface FileData {
  subs: Record<string, StoredSub>;
  games: Record<string, { snap: GameSnapshot; ts: number }>;
}

function fileStore(): PushStore {
  const path = resolve(process.env.PUSH_STORE_FILE ?? ".push-store.json");
  let data: FileData | undefined;
  // serialize all mutations so concurrent requests can't interleave writes
  let queue: Promise<unknown> = Promise.resolve();

  async function load(): Promise<FileData> {
    if (data) return data;
    try {
      const parsed = JSON.parse(await readFile(path, "utf8"));
      data = { subs: parsed.subs ?? {}, games: parsed.games ?? {} };
    } catch {
      data = { subs: {}, games: {} };
    }
    return data;
  }

  async function save() {
    if (!data) return;
    const cutoff = Date.now() - GAME_TTL_MS;
    for (const [pk, entry] of Object.entries(data.games)) {
      if (entry.ts < cutoff) delete data.games[pk];
    }
    await mkdir(dirname(path), { recursive: true });
    const tmp = `${path}.tmp`;
    await writeFile(tmp, JSON.stringify(data), "utf8");
    await rename(tmp, path);
  }

  function enqueue<T>(fn: () => Promise<T>): Promise<T> {
    const next = queue.then(fn);
    queue = next.catch(() => {});
    return next;
  }

  return {
    upsertSub(sub) {
      return enqueue(async () => {
        const d = await load();
        d.subs[sub.endpoint] = sub;
        await save();
      });
    },
    deleteSub(endpoint) {
      return enqueue(async () => {
        const d = await load();
        delete d.subs[endpoint];
        await save();
      });
    },
    listSubs() {
      return enqueue(async () => Object.values((await load()).subs));
    },
    getGameState(gamePk) {
      return enqueue(async () => {
        const entry = (await load()).games[String(gamePk)];
        if (!entry || entry.ts < Date.now() - GAME_TTL_MS) return null;
        return entry.snap;
      });
    },
    setGameState(gamePk, snap) {
      return enqueue(async () => {
        const d = await load();
        d.games[String(gamePk)] = { snap, ts: Date.now() };
        await save();
      });
    },
  };
}

let store: PushStore | undefined;

export function getPushStore(): PushStore {
  if (!store) {
    store =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? upstashStore()
        : fileStore();
  }
  return store;
}

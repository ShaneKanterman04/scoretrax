// Server-side pregame odds history. Uses Upstash Redis when configured, with a
// Hostlet-friendly JSON file fallback under /data in production.

import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { Redis } from "@upstash/redis";
import type { GameOddsHistory, OddsSample } from "@/lib/types";

const RETAIN_DAYS = 3;
const MAX_SAMPLES = 288;

type StoredHistory = Omit<GameOddsHistory, "first" | "latest">;

interface FileData {
  dates: Record<string, Record<string, StoredHistory>>;
}

export interface OddsHistoryStore {
  appendSample(history: StoredHistory, sample: OddsSample): Promise<GameOddsHistory>;
  getGame(date: string, gamePk: number): Promise<GameOddsHistory | null>;
  listDate(date: string): Promise<GameOddsHistory[]>;
  prune(today: string): Promise<void>;
}

function withEdges(history: StoredHistory): GameOddsHistory {
  const samples = history.samples.slice().sort((a, b) => a.ts.localeCompare(b.ts));
  return {
    ...history,
    samples,
    first: samples[0],
    latest: samples.at(-1),
  };
}

function mergeSample(samples: OddsSample[], sample: OddsSample): OddsSample[] {
  const next = samples.filter((s) => s.ts !== sample.ts);
  next.push(sample);
  next.sort((a, b) => a.ts.localeCompare(b.ts));
  return next.slice(-MAX_SAMPLES);
}

function cutoffDate(today: string): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - RETAIN_DAYS);
  return d.toISOString().slice(0, 10);
}

function redisStore(): OddsHistoryStore {
  const redis = Redis.fromEnv();
  const datesKey = "odds:history:dates";
  const indexKey = (date: string) => `odds:history:${date}`;
  const gameKey = (date: string, gamePk: number) => `odds:history:${date}:${gamePk}`;

  return {
    async appendSample(history, sample) {
      const existing = await redis.get<StoredHistory>(
        gameKey(history.officialDate, history.gamePk)
      );
      const next: StoredHistory = {
        ...history,
        samples: mergeSample(existing?.samples ?? history.samples, sample),
      };
      await Promise.all([
        redis.set(gameKey(next.officialDate, next.gamePk), next),
        redis.sadd(indexKey(next.officialDate), String(next.gamePk)),
        redis.sadd(datesKey, next.officialDate),
      ]);
      return withEdges(next);
    },
    async getGame(date, gamePk) {
      const history = await redis.get<StoredHistory>(gameKey(date, gamePk));
      return history ? withEdges(history) : null;
    },
    async listDate(date) {
      const ids = await redis.smembers<string[]>(indexKey(date));
      if (!ids.length) return [];
      const histories = await Promise.all(
        ids.map((id) => redis.get<StoredHistory>(gameKey(date, Number(id))))
      );
      return histories
        .filter((h): h is StoredHistory => !!h)
        .map(withEdges)
        .sort((a, b) => a.gameDate.localeCompare(b.gameDate));
    },
    async prune(today) {
      const cutoff = cutoffDate(today);
      const dates = await redis.smembers<string[]>(datesKey);
      const stale = dates.filter((date) => date < cutoff);
      await Promise.all(
        stale.map(async (date) => {
          const ids = await redis.smembers<string[]>(indexKey(date));
          const keys = ids.map((id) => gameKey(date, Number(id)));
          if (keys.length > 0) await redis.del(...keys);
          await Promise.all([redis.del(indexKey(date)), redis.srem(datesKey, date)]);
        })
      );
    },
  };
}

function defaultFilePath(): string {
  if (process.env.ODDS_HISTORY_FILE) return process.env.ODDS_HISTORY_FILE;
  if (process.env.NODE_ENV === "production") return "/data/scoretrax-odds-history.json";
  return ".odds-history.json";
}

function fileStore(): OddsHistoryStore {
  const path = resolve(defaultFilePath());
  let data: FileData | undefined;
  let queue: Promise<unknown> = Promise.resolve();

  async function load(): Promise<FileData> {
    if (data) return data;
    try {
      const parsed = JSON.parse(await readFile(path, "utf8"));
      data = { dates: parsed.dates ?? {} };
    } catch {
      data = { dates: {} };
    }
    return data;
  }

  async function save() {
    if (!data) return;
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
    appendSample(history, sample) {
      return enqueue(async () => {
        const d = await load();
        const date = history.officialDate;
        const key = String(history.gamePk);
        const existing = d.dates[date]?.[key];
        const next: StoredHistory = {
          ...history,
          samples: mergeSample(existing?.samples ?? history.samples, sample),
        };
        d.dates[date] = { ...(d.dates[date] ?? {}), [key]: next };
        await save();
        return withEdges(next);
      });
    },
    getGame(date, gamePk) {
      return enqueue(async () => {
        const history = (await load()).dates[date]?.[String(gamePk)];
        return history ? withEdges(history) : null;
      });
    },
    listDate(date) {
      return enqueue(async () =>
        Object.values((await load()).dates[date] ?? {})
          .map(withEdges)
          .sort((a, b) => a.gameDate.localeCompare(b.gameDate))
      );
    },
    prune(today) {
      return enqueue(async () => {
        const d = await load();
        const cutoff = cutoffDate(today);
        for (const date of Object.keys(d.dates)) {
          if (date < cutoff) delete d.dates[date];
        }
        await save();
      });
    },
  };
}

let store: OddsHistoryStore | undefined;

export function getOddsHistoryStore(): OddsHistoryStore {
  if (!store) {
    store =
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
        ? redisStore()
        : fileStore();
  }
  return store;
}

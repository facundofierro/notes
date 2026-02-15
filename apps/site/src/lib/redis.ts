import Redis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redisClient: Redis | undefined;
}

function createRedisClient() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL environment variable is not set");
  }
  const client = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  });
  client.on("error", (err) => {
    console.error("[Redis] connection error:", err);
  });
  return client;
}

export const redis =
  process.env.NODE_ENV === "development"
    ? (globalThis.__redisClient ??= createRedisClient())
    : createRedisClient();

if (process.env.NODE_ENV === "development") {
  globalThis.__redisClient = redis;
}

// Cache helpers
export const CACHE_TTL = {
  USER: 60 * 5, // 5 minutes
  INBOX: 60 * 1, // 1 minute
} as const;

export async function cacheGet<T>(key: string): Promise<T | null> {
  try {
    const value = await redis.get(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(
  key: string,
  value: unknown,
  ttl: number
): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), "EX", ttl);
  } catch {
    // Non-fatal: cache is best-effort
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    await redis.del(key);
  } catch {
    // Non-fatal
  }
}

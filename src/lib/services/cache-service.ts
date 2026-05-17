import { Redis } from "@upstash/redis";

interface CacheEntry {
  value: unknown;
  expiresAt: number;
}

const memoryCache = new Map<string, CacheEntry>();

let redis: Redis | null = null;

try {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redis = new Redis({
      url,
      token,
    });
  } else {
    if (process.env.NODE_ENV !== "test" && 
        process.env.SUPPRESS_CACHE_WARNING !== "true" &&
        !process.argv.some(arg => arg.includes("test-workflows") || arg.includes("seed-demo"))) {
      console.warn(
        "[Cache] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN missing in environment variables. Using in-memory fallback cache."
      );
    }
  }
} catch (error: unknown) {
  const err = error as Error;
  console.error("[Cache] Failed to initialize Upstash Redis client:", err.message);
}

// Fail fast in production if Redis is not available
if (process.env.NODE_ENV === "production" && !redis) {
  throw new Error(
    "[FATAL] Redis is required in production. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables."
  );
}

export class CacheService {
  private static readonly prefix = "atomquest:";

  private static key(key: string) {
    return `${this.prefix}${key}`;
  }

  /**
   * Retrieves a value from the cache (Redis or in-memory fallback)
   */
  static async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.key(key);
    if (redis) {
      try {
        // Upstash redis client automatically parses JSON responses
        const data = await redis.get<T>(cacheKey);
        if (data !== null) {
          return data;
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`[Cache] Redis GET error for key: ${cacheKey}. Falling back to memory:`, err.message);
      }
    }

    // Fallback to in-memory cache
    const entry = memoryCache.get(cacheKey);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        return entry.value as T;
      } else {
        memoryCache.delete(cacheKey);
      }
    }

    return null;
  }

  /**
   * Stores a value in the cache with a specified TTL
   */
  static async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    const cacheKey = this.key(key);
    if (redis) {
      try {
        await redis.set(cacheKey, value, { ex: ttlSeconds });
        return;
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`[Cache] Redis SET error for key: ${cacheKey}. Falling back to memory:`, err.message);
      }
    }

    // Fallback to in-memory cache
    memoryCache.set(cacheKey, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  static async increment(key: string, ttlSeconds: number): Promise<number> {
    const cacheKey = this.key(key);
    if (redis) {
      try {
        const value = await redis.incr(cacheKey);
        if (value === 1) {
          await redis.expire(cacheKey, ttlSeconds);
        }
        return value;
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`[Cache] Redis INCR error for key: ${cacheKey}. Falling back to memory:`, err.message);
      }
    }

    const entry = memoryCache.get(cacheKey);
    if (!entry || entry.expiresAt <= Date.now()) {
      memoryCache.set(cacheKey, {
        value: 1,
        expiresAt: Date.now() + ttlSeconds * 1000,
      });
      return 1;
    }

    const next = Number(entry.value) + 1;
    memoryCache.set(cacheKey, { ...entry, value: next });
    return next;
  }

  /**
   * Invalidates a specific key
   */
  static async invalidate(key: string): Promise<void> {
    const cacheKey = this.key(key);
    if (redis) {
      try {
        await redis.del(cacheKey);
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`[Cache] Redis DEL error for key: ${cacheKey}:`, err.message);
      }
    }

    memoryCache.delete(cacheKey);
  }

  /**
   * Invalidates specific analytics and stats cache keys for a given cycle and optional quarter
   */
  static async invalidateAnalytics(cycleId: string, quarter?: number): Promise<void> {
    const keys = [
      `analytics:qoq:${cycleId}`,
      `analytics:completion:${cycleId}`,
      `admin:stats:${cycleId}`,
    ];

    if (quarter !== undefined) {
      keys.push(`analytics:manager:${cycleId}:${quarter}`);
      keys.push(`analytics:dept:${cycleId}:${quarter}`);
    } else {
      // Invalidate all quarters if none specified
      for (let q = 1; q <= 4; q++) {
        keys.push(`analytics:manager:${cycleId}:${q}`);
        keys.push(`analytics:dept:${cycleId}:${q}`);
      }
    }

    for (const key of keys) {
      await this.invalidate(key);
    }
  }

  /**
   * Attempts to acquire a distributed lock.
   * Returns true if lock was acquired, false otherwise.
   */
  static async tryAcquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    const lockKey = `lock:${key}`;
    const cacheKey = this.key(lockKey);
    if (redis) {
      try {
        const result = await redis.set(cacheKey, "locked", { nx: true, ex: ttlSeconds });
        return result === "OK";
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`[Cache] Redis Lock error for key: ${cacheKey}:`, err.message);
      }
    }
    return false;
  }

  /**
   * Releases a distributed lock.
   */
  static async releaseLock(key: string): Promise<void> {
    const lockKey = `lock:${key}`;
    await this.invalidate(lockKey);
  }

  /**
   * Clears all cache entries (flushes entire cache)
   */
  static async clearAll(): Promise<void> {
    if (redis) {
      try {
        const keys = await redis.keys(`${this.prefix}*`);
        if (keys.length > 0) {
          await redis.del(...keys);
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.warn("[Cache] Redis scoped clear error:", err.message);
      }
    }

    for (const key of memoryCache.keys()) {
      if (key.startsWith(this.prefix)) {
        memoryCache.delete(key);
      }
    }
  }
}

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
    console.log("[Cache] Upstash Redis initialized successfully.");
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

export class CacheService {
  /**
   * Retrieves a value from the cache (Redis or in-memory fallback)
   */
  static async get<T>(key: string): Promise<T | null> {
    if (redis) {
      try {
        // Upstash redis client automatically parses JSON responses
        const data = await redis.get<T>(key);
        if (data !== null) {
          return data;
        }
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`[Cache] Redis GET error for key: ${key}. Falling back to memory:`, err.message);
      }
    }

    // Fallback to in-memory cache
    const entry = memoryCache.get(key);
    if (entry) {
      if (entry.expiresAt > Date.now()) {
        return entry.value as T;
      } else {
        memoryCache.delete(key);
      }
    }

    return null;
  }

  /**
   * Stores a value in the cache with a specified TTL
   */
  static async set<T>(key: string, value: T, ttlSeconds: number = 300): Promise<void> {
    if (redis) {
      try {
        await redis.set(key, value, { ex: ttlSeconds });
        return;
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`[Cache] Redis SET error for key: ${key}. Falling back to memory:`, err.message);
      }
    }

    // Fallback to in-memory cache
    memoryCache.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  /**
   * Invalidates a specific key
   */
  static async invalidate(key: string): Promise<void> {
    if (redis) {
      try {
        await redis.del(key);
      } catch (error: unknown) {
        const err = error as Error;
        console.warn(`[Cache] Redis DEL error for key: ${key}:`, err.message);
      }
    }

    memoryCache.delete(key);
  }

  /**
   * Clears all cache entries (flushes entire cache)
   */
  static async clearAll(): Promise<void> {
    if (redis) {
      try {
        // flushdb removes all keys from the current database
        await redis.flushdb();
      } catch (error: unknown) {
        const err = error as Error;
        console.warn("[Cache] Redis FLUSHDB error:", err.message);
      }
    }

    memoryCache.clear();
  }
}

import { CacheService } from "./cache-service";

export class RateLimitService {
  static async hit(key: string, limit: number, windowSeconds: number) {
    const cacheKey = `rate:${key}`;
    const current = await CacheService.increment(cacheKey, windowSeconds);

    return {
      allowed: current <= limit,
      remaining: Math.max(0, limit - current),
    };
  }
}

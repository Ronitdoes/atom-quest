import { RateLimitService } from "@/lib/services/rate-limit-service";
import { TooManyRequestsError } from "./api";

export async function assertRateLimit(key: string, limit = 30, windowSeconds = 60) {
  const result = await RateLimitService.hit(key, limit, windowSeconds);
  if (!result.allowed) {
    throw new TooManyRequestsError("Too many requests. Please try again later.");
  }
}

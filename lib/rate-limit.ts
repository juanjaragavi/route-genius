/**
 * Rate limiting via Cloud SQL PostgreSQL.
 * Uses the `rate_limits` table and `check_rate_limit()` PG function.
 *
 * @module lib/rate-limit
 */

import { getPool } from "./db";

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
}

/**
 * Check whether a request identified by `identifier` is within rate limits.
 *
 * Uses a sliding-window counter stored in PostgreSQL.
 * Fails open — if the database call fails, the request is allowed through
 * so legitimate traffic is never blocked by infrastructure issues.
 *
 * @param identifier - Unique key for the rate limit (e.g. `redirect:<ip>`)
 * @param windowSeconds - Sliding window duration in seconds (default: 10)
 * @param maxRequests - Maximum requests allowed per window (default: 100)
 */
export async function checkRateLimit(
  identifier: string,
  windowSeconds: number = 10,
  maxRequests: number = 100,
): Promise<RateLimitResult> {
  // Skip in development if configured
  if (process.env.DISABLE_RATE_LIMITING === "true") {
    return { allowed: true, limit: maxRequests, remaining: maxRequests };
  }

  try {
    const { rows } = await getPool().query(
      `SELECT check_rate_limit($1, $2, $3) AS allowed`,
      [identifier, windowSeconds, maxRequests],
    );

    const allowed = rows[0]?.allowed as boolean;

    return {
      allowed,
      limit: maxRequests,
      remaining: allowed ? maxRequests : 0,
    };
  } catch (err) {
    // Fail open — never block legitimate traffic on DB errors
    console.error("[RouteGenius] Rate limit check failed:", err);
    return { allowed: true, limit: maxRequests, remaining: maxRequests };
  }
}

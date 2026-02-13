/**
 * Rate limiting via Supabase PostgreSQL.
 * Replaces Upstash Redis — uses existing Supabase instance.
 *
 * Requires the `rate_limits` table and `check_rate_limit()` PG function
 * to be created in the Supabase SQL Editor (see PHASE-2E-GCP-ALTERNATIVES-REPORT.md).
 *
 * @module lib/rate-limit
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/**
 * Lazily initialised Supabase client with service-role key.
 * Service role bypasses RLS, which is required for the rate-limit table.
 */
let _client: ReturnType<typeof createClient> | null = null;

function getClient() {
  if (!_client) {
    _client = createClient(supabaseUrl, supabaseServiceKey);
  }
  return _client;
}

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
}

/**
 * Check whether a request identified by `identifier` is within rate limits.
 *
 * Uses a sliding-window counter stored in Supabase PostgreSQL.
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
    const supabase = getClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase.rpc as any)("check_rate_limit", {
      p_key: identifier,
      p_window_seconds: windowSeconds,
      p_max_requests: maxRequests,
    });

    if (error) throw error;

    return {
      allowed: data as boolean,
      limit: maxRequests,
      remaining: data ? maxRequests : 0,
    };
  } catch (err) {
    // Fail open — never block legitimate traffic on DB errors
    console.error("[RouteGenius] Rate limit check failed:", err);
    return { allowed: true, limit: maxRequests, remaining: maxRequests };
  }
}

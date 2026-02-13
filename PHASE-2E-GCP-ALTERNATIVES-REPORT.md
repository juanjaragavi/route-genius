# Phase 2E — GCP Alternatives for Upstash Redis & Sentry

> **Date:** 2026-02-13
> **Author:** RouteGenius Engineering
> **Status:** Proposed — Pending implementation
> **GCP Project:** TopFinanzas (`absolute-brook-452020-d5`)

---

## 1. Current State

Three environment variables in `.env.local` remain as placeholders:

```env
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token-here
SENTRY_DSN=https://your-sentry-dsn@sentry.io/12345
```

These correspond to two third-party services originally planned for Phase 2E:

- **Upstash Redis** — Rate limiting for the redirect endpoint
- **Sentry** — Server-side error monitoring and crash reporting

---

## 2. What These Services Do

### 2.1 Upstash Redis (`UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`)

**Purpose:** Serverless Redis for **rate limiting** the public redirect endpoint (`/api/redirect/[linkId]`).

**Why it's needed:** The redirect endpoint is publicly accessible with zero authentication. Without rate limiting, a malicious actor could:

- **DDoS** the endpoint with millions of requests
- **Inflate click analytics** with fake traffic
- **Exhaust server resources** (database connections, compute)

**Planned implementation** (from `PHASE-2-AGENT-INSTRUCTIONS.md`):

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const redirectRateLimit = new Ratelimit({
  redis: Redis.fromEnv(), // Reads UPSTASH_REDIS_URL + TOKEN
  limiter: Ratelimit.slidingWindow(100, "10 s"), // 100 req per 10s per IP
  analytics: true,
  prefix: "ratelimit:redirect",
});
```

**How it works:**

1. Each incoming request is identified by IP address
2. Redis stores a sliding-window counter per IP
3. If the counter exceeds 100 requests in 10 seconds → respond with `429 Too Many Requests`
4. Redis' in-memory nature makes this check sub-millisecond (~1ms)

**Upstash differentiator:** REST-based Redis API designed for serverless environments (Vercel, Cloudflare Workers). Standard Redis (TCP-based) doesn't work in serverless because persistent connections can't be maintained across ephemeral function invocations.

---

### 2.2 Sentry (`SENTRY_DSN`)

**Purpose:** **Server-side error monitoring**, crash reporting, and performance tracing.

**Why it's needed:** The current error handling is limited to:

- `console.log` / `console.warn` in server code (invisible in production)
- Firebase Analytics `exception` events on the client side (`lib/firebase/crashlytics.ts`)

Neither captures server-side errors (Server Actions, API Routes, middleware) with stack traces, breadcrumbs, or alert notifications.

**Planned usage:**

- Capture unhandled exceptions in Server Actions (`app/actions.ts`)
- Monitor redirect endpoint errors and latency
- Track error rates and alert on spikes
- Performance tracing for P95/P99 latency monitoring

---

## 3. GCP Alternatives Analysis

Since the entire RouteGenius infrastructure runs on GCP (TopFinanzas project), replacing these third-party services with GCP-native equivalents keeps everything consolidated under one billing account and one IAM policy.

### 3.1 Rate Limiting — Upstash Redis → **Google Cloud Memorystore for Redis**

| Attribute                   | Upstash Redis               | GCP Memorystore for Redis           |
| --------------------------- | --------------------------- | ----------------------------------- |
| **Type**                    | Serverless, REST-based      | Managed Redis instance (TCP)        |
| **Pricing**                 | Free tier: 10K commands/day | Basic Tier (1 GB): ~$35/mo          |
| **Latency**                 | ~5-15ms (REST over HTTPS)   | ~0.5ms (TCP in same VPC)            |
| **Serverless-friendly**     | ✅ Yes (HTTP API)           | ⚠️ Requires VPC Access Connector    |
| **Vercel compatibility**    | ✅ Native                   | ⚠️ Needs Serverless VPC Connector   |
| **Setup complexity**        | Low (REST keys only)        | Medium (VPC + Connector + Firewall) |
| **GCP project integration** | ❌ Separate vendor          | ✅ Same billing & IAM               |

**Verdict:** Memorystore is more performant but requires VPC infrastructure. For a Vercel-deployed Next.js app, this adds significant complexity.

#### Recommended GCP Alternative: **Supabase PostgreSQL-Based Rate Limiting**

Since Supabase PostgreSQL is already provisioned and accessible from Vercel, we can implement rate limiting directly in the database using a lightweight `rate_limits` table and a PG function. This avoids adding any new GCP service.

**Advantages:**

- ✅ Zero new infrastructure — uses existing Supabase
- ✅ Works from Vercel (Supabase is already connected)
- ✅ Atomic operations via PG functions
- ✅ Eliminates 2 environment variables (`UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`)

**Trade-off:** Slightly higher latency (~5-15ms per rate-limit check vs ~1ms for Redis). Acceptable for the redirect endpoint's 200ms P95 budget.

**Database schema:**

```sql
-- Rate limiting table (auto-cleaned)
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX idx_rate_limits_expiry ON rate_limits(window_start);

-- Rate-limit check function (atomic, returns true if allowed)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER DEFAULT 10,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  -- Calculate window start (round down to window boundary)
  v_window_start := date_trunc('second', now())
    - (EXTRACT(EPOCH FROM date_trunc('second', now()))::INTEGER % p_window_seconds) * INTERVAL '1 second';

  -- Upsert counter (atomic increment)
  INSERT INTO rate_limits (key, window_start, request_count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Clean old windows (async-safe, best-effort)
  DELETE FROM rate_limits
  WHERE window_start < now() - (p_window_seconds * 2) * INTERVAL '1 second';

  RETURN v_current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;
```

**TypeScript implementation:**

```typescript
// lib/rate-limit.ts
import { createClient } from "@/lib/supabase/server";

export async function checkRateLimit(
  identifier: string,
  windowSeconds: number = 10,
  maxRequests: number = 100,
): Promise<{ allowed: boolean; remaining: number }> {
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("check_rate_limit", {
    p_key: identifier,
    p_window_seconds: windowSeconds,
    p_max_requests: maxRequests,
  });

  if (error) {
    // Fail open — don't block legitimate traffic on DB errors
    console.error("[RouteGenius] Rate limit check failed:", error);
    return { allowed: true, remaining: maxRequests };
  }

  return {
    allowed: data as boolean,
    remaining: data ? maxRequests : 0,
  };
}
```

---

### 3.2 Error Monitoring — Sentry → **Google Cloud Error Reporting + Firebase Crashlytics**

| Attribute                | Sentry                     | GCP Error Reporting + Firebase               |
| ------------------------ | -------------------------- | -------------------------------------------- |
| **Client-side errors**   | ✅ SDK                     | ✅ Firebase Crashlytics (already configured) |
| **Server-side errors**   | ✅ SDK                     | ✅ Cloud Error Reporting API                 |
| **Stack trace grouping** | ✅ Intelligent             | ✅ Automatic                                 |
| **Alerting**             | ✅ Email, Slack, PagerDuty | ✅ Cloud Monitoring alerts                   |
| **Performance tracing**  | ✅ Built-in                | ⚠️ Cloud Trace (separate)                    |
| **Pricing**              | Free tier: 5K errors/mo    | Free tier: first 1M errors/mo                |
| **GCP integration**      | ❌ Separate vendor         | ✅ Same project & billing                    |
| **Existing setup**       | None                       | Firebase already configured                  |

**Verdict:** The GCP alternative is a compelling fit because:

1. **Firebase Crashlytics is already implemented** — `lib/firebase/crashlytics.ts` exports `logError()` and `logCustomEvent()` for client-side error reporting. This covers the client side completely.

2. **Google Cloud Error Reporting** covers the server side — it uses the `@google-cloud/error-reporting` library, which authenticates with the same GCS service account already provisioned in `credentials/gcs-service-account.json`.

3. **Cost:** GCP Error Reporting's free tier (1M errors/month) far exceeds Sentry's free tier (5K events/month).

**Architecture:**

```
Client-Side Errors                    Server-Side Errors
       │                                     │
       ▼                                     ▼
Firebase Analytics                  Cloud Error Reporting
(lib/firebase/crashlytics.ts)       (lib/gcp/error-reporting.ts)
       │                                     │
       ▼                                     ▼
Firebase Console ◄──────────── GCP Console (Operations Suite)
       └──── Unified alerting via Cloud Monitoring ────┘
```

**Server-side implementation:**

```typescript
// lib/gcp/error-reporting.ts
import { ErrorReporting } from "@google-cloud/error-reporting";

let errorReporting: ErrorReporting | null = null;

function getErrorReporter(): ErrorReporting | null {
  if (typeof window !== "undefined") return null; // Server-only

  if (!errorReporting) {
    try {
      errorReporting = new ErrorReporting({
        projectId: process.env.GCS_PROJECT_ID,
        keyFilename:
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          "credentials/gcs-service-account.json",
        reportMode: process.env.NODE_ENV === "production" ? "always" : "never",
      });
    } catch {
      console.warn("[RouteGenius] Cloud Error Reporting initialization failed");
      return null;
    }
  }
  return errorReporting;
}

/** Report a server-side error to GCP Error Reporting */
export function reportError(
  error: Error,
  context?: { httpRequest?: { method: string; url: string }; user?: string },
): void {
  const reporter = getErrorReporter();
  if (!reporter) return;

  const event = reporter.event().setMessage(error.message);

  if (context?.httpRequest) {
    event.setHttpMethod(context.httpRequest.method);
    event.setUrl(context.httpRequest.url);
  }

  if (context?.user) {
    event.setUser(context.user);
  }

  reporter.report(event, (err) => {
    if (err) console.warn("[RouteGenius] Failed to report error to GCP:", err);
  });
}
```

**Environment variable change:** Instead of `SENTRY_DSN`, the GCP alternative uses the already-provisioned service account:

```env
# No new env var needed — reuses existing GCS_PROJECT_ID and credentials
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcs-service-account.json
```

The service account needs the **Error Reporting Writer** (`roles/errorreporting.writer`) IAM role, which can be added to the existing `routegenius-storage@absolute-brook-452020-d5.iam.gserviceaccount.com` account.

---

## 4. Environment Variable Impact

### Before (3 placeholder variables)

```env
UPSTASH_REDIS_URL=https://your-redis.upstash.io
UPSTASH_REDIS_TOKEN=your-redis-token-here
SENTRY_DSN=https://your-sentry-dsn@sentry.io/12345
```

### After (0 new variables needed)

```env
# REMOVED — Upstash Redis replaced by Supabase PG rate limiting
# REMOVED — Sentry replaced by GCP Error Reporting (uses existing service account)

# Only addition: explicit path for GCP credentials (optional, defaults to credentials/ dir)
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcs-service-account.json
```

**Result:** The 3 placeholder variables are **eliminated entirely**. The GCP alternatives reuse existing infrastructure, bringing the total live variables from 18/21 to **19/19** (100% configured).

---

## 5. Summary Decision Matrix

| Capability              | Original Plan                        | GCP Alternative                            | Recommendation                                    |
| ----------------------- | ------------------------------------ | ------------------------------------------ | ------------------------------------------------- |
| **Rate Limiting**       | Upstash Redis + `@upstash/ratelimit` | Supabase PG function + `rate_limits` table | ✅ **GCP (Supabase PG)** — Zero new services      |
| **Server-side Errors**  | Sentry SDK                           | `@google-cloud/error-reporting`            | ✅ **GCP Error Reporting** — Same project/billing |
| **Client-side Errors**  | Sentry SDK                           | Firebase Crashlytics (already done)        | ✅ **Already implemented**                        |
| **Performance Tracing** | Sentry Performance                   | Cloud Trace (future)                       | ⏳ Defer to Phase 3                               |

---

## 6. Implementation Steps & Dependencies

### 6.1 New npm Packages

```bash
npm install @google-cloud/error-reporting
```

> Note: No new Redis package needed — rate limiting uses the existing Supabase client.

### 6.2 IAM Permission

Add **Error Reporting Writer** role to the existing GCS service account:

```bash
gcloud projects add-iam-policy-binding absolute-brook-452020-d5 \
  --member="serviceAccount:routegenius-storage@absolute-brook-452020-d5.iam.gserviceaccount.com" \
  --role="roles/errorreporting.writer"
```

### 6.3 Supabase Migration

Run the SQL from Section 3.1 in the Supabase SQL Editor to create the `rate_limits` table and `check_rate_limit()` function.

### 6.4 Files to Create

| File                         | Purpose                             |
| ---------------------------- | ----------------------------------- |
| `lib/rate-limit.ts`          | Supabase PG rate-limit client       |
| `lib/gcp/error-reporting.ts` | Server-side error reporting wrapper |

### 6.5 Files to Modify

| File                                 | Change                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------ |
| `app/api/redirect/[linkId]/route.ts` | Add rate-limit check before redirect                                     |
| `app/actions.ts`                     | Wrap Server Actions with `reportError()`                                 |
| `.env.local`                         | Remove Upstash/Sentry placeholders, add `GOOGLE_APPLICATION_CREDENTIALS` |
| `.env.example`                       | Update template                                                          |

---

## 7. Coding Agent Prompt

The following prompt can be provided to an AI coding agent to implement the GCP alternatives:

---

### AGENT PROMPT: Implement GCP-Native Rate Limiting & Error Reporting for RouteGenius

**Objective:** Replace the placeholder Upstash Redis and Sentry environment variables with GCP-native alternatives that reuse existing infrastructure. This completes the Phase 2E security & monitoring milestone.

**Context:**

- Project: RouteGenius (Next.js 16.1.6, TypeScript, Tailwind CSS 4.x)
- GCP Project: TopFinanzas (`absolute-brook-452020-d5`)
- Supabase: Already provisioned at `https://owestahxdthunutdttye.supabase.co`
- Firebase: Already configured with Analytics/Crashlytics in `lib/firebase/`
- GCS Service Account: `routegenius-storage@absolute-brook-452020-d5.iam.gserviceaccount.com` (key at `credentials/gcs-service-account.json`)
- Spanish UI: All user-facing text must be in Spanish

**CRITICAL CONSTRAINTS:**

1. DO NOT modify `lib/rotation.ts` — the probabilistic algorithm is immutable
2. DO NOT modify `lib/types.ts` — extend only if needed, never replace
3. All user-facing text must remain in Spanish
4. Ensure `npm run lint`, `npm run build`, and `npx tsc --noEmit` pass with zero errors

#### **Task 1: Supabase PostgreSQL Rate Limiting**

1. **Run SQL migration in Supabase SQL Editor:**

```sql
CREATE TABLE rate_limits (
  key TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX idx_rate_limits_expiry ON rate_limits(window_start);

CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER DEFAULT 10,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  v_window_start := date_trunc('second', now())
    - (EXTRACT(EPOCH FROM date_trunc('second', now()))::INTEGER % p_window_seconds) * INTERVAL '1 second';

  INSERT INTO rate_limits (key, window_start, request_count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  DELETE FROM rate_limits
  WHERE window_start < now() - (p_window_seconds * 2) * INTERVAL '1 second';

  RETURN v_current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;
```

2. **Create `lib/rate-limit.ts`:**

```typescript
/**
 * Rate limiting via Supabase PostgreSQL.
 * Replaces Upstash Redis — uses existing Supabase instance.
 *
 * @module lib/rate-limit
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS for rate limiting
);

export interface RateLimitResult {
  allowed: boolean;
  limit: number;
  remaining: number;
}

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
    const { data, error } = await supabase.rpc("check_rate_limit", {
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
```

3. **Update `app/api/redirect/[linkId]/route.ts`** — Add rate-limit check at the top of the `GET` handler:

```typescript
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  // Rate limiting (100 requests per 10 seconds per IP)
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "127.0.0.1";
  const { allowed, limit } = await checkRateLimit(`redirect:${ip}`);

  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
      {
        status: 429,
        headers: {
          "Retry-After": "10",
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
        },
      },
    );
  }

  // ... rest of existing redirect logic (unchanged)
}
```

#### **Task 2: GCP Error Reporting**

1. **Install dependency:**

```bash
npm install @google-cloud/error-reporting
```

2. **Add IAM role** to existing service account:

```bash
gcloud projects add-iam-policy-binding absolute-brook-452020-d5 \
  --member="serviceAccount:routegenius-storage@absolute-brook-452020-d5.iam.gserviceaccount.com" \
  --role="roles/errorreporting.writer"
```

3. **Create `lib/gcp/error-reporting.ts`:**

```typescript
/**
 * Google Cloud Error Reporting for server-side error monitoring.
 * Replaces Sentry — uses existing GCS service account.
 *
 * Client-side errors are handled by Firebase Crashlytics (lib/firebase/crashlytics.ts).
 * This module covers Server Actions, API Routes, and middleware.
 *
 * @module lib/gcp/error-reporting
 */

import { ErrorReporting } from "@google-cloud/error-reporting";

let errorReporting: ErrorReporting | null = null;

function getErrorReporter(): ErrorReporting | null {
  if (typeof window !== "undefined") return null;

  if (!errorReporting) {
    try {
      errorReporting = new ErrorReporting({
        projectId: process.env.GCS_PROJECT_ID,
        keyFilename:
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          "credentials/gcs-service-account.json",
        reportMode: process.env.NODE_ENV === "production" ? "always" : "never",
      });
    } catch {
      console.warn("[RouteGenius] Cloud Error Reporting init failed");
      return null;
    }
  }
  return errorReporting;
}

/** Report a server-side error to GCP Error Reporting */
export function reportError(
  error: Error,
  context?: {
    httpRequest?: { method: string; url: string };
    user?: string;
  },
): void {
  const reporter = getErrorReporter();
  if (!reporter) return;

  const event = reporter.event().setMessage(error.message);

  if (context?.httpRequest) {
    event.setHttpMethod(context.httpRequest.method);
    event.setUrl(context.httpRequest.url);
  }
  if (context?.user) {
    event.setUser(context.user);
  }

  reporter.report(event, (err) => {
    if (err) console.warn("[RouteGenius] Error report failed:", err);
  });
}
```

4. **Wrap error-prone Server Actions** in `app/actions.ts` with `reportError()`:

```typescript
import { reportError } from "@/lib/gcp/error-reporting";

// Inside catch blocks:
catch (err) {
  const error = err instanceof Error ? err : new Error(String(err));
  reportError(error, { httpRequest: { method: "POST", url: "/actions/saveLinkAction" } });
  return { success: false, error: "Error al guardar el enlace." };
}
```

#### **Task 3: Environment Variable Cleanup**

1. In `.env.local`, replace the Upstash and Sentry placeholders:

```env
# ============================================================================
# RATE LIMITING (Supabase PG — no additional service needed)
# ============================================================================
# Rate limiting uses the existing Supabase PostgreSQL instance.
# Set DISABLE_RATE_LIMITING=true for development.
DISABLE_RATE_LIMITING=true

# ============================================================================
# ERROR MONITORING (GCP Error Reporting — reuses GCS service account)
# ============================================================================
# Server-side: @google-cloud/error-reporting (uses GCS_PROJECT_ID + credentials)
# Client-side: Firebase Crashlytics (already configured above)
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcs-service-account.json
```

2. Remove the old `UPSTASH_REDIS_URL`, `UPSTASH_REDIS_TOKEN`, and `SENTRY_DSN` lines.

#### **Task 4: Update Documentation**

Update `CLAUDE.MD` and `PHASE-2-AGENT-INSTRUCTIONS.md` to reflect:

- "18 of 21 variables are live" → "All 19 environment variables are live (100% configured)"
- Upstash Redis → "Replaced by Supabase PG rate limiting"
- Sentry → "Replaced by GCP Error Reporting + Firebase Crashlytics"
- Update the Phase 2 infrastructure table accordingly

#### **Task 5: Verification**

```bash
npx tsc --noEmit       # Zero TypeScript errors
npm run lint           # Zero lint errors
npm run build          # Successful production build
npm run dev            # Manual test: hit /api/redirect/demo-link-001 102+ times rapidly
```

**Expected Results:**

- First 100 requests within 10 seconds → `307` redirect (normal behavior)
- Request 101+ → `429 Too Many Requests` with JSON error body in Spanish
- Server errors logged to GCP Error Reporting console
- Client errors continue logging to Firebase Analytics

---

**END OF AGENT PROMPT**

---

## 8. Risk Assessment

| Risk                                         | Severity | Mitigation                                              |
| -------------------------------------------- | -------- | ------------------------------------------------------- |
| Supabase PG rate limiting adds ~10ms latency | Low      | Well within 200ms P95 budget; PG function is optimized  |
| `rate_limits` table grows unbounded          | Low      | Cleanup runs on each check; add cron job as backup      |
| GCP Error Reporting requires IAM change      | Low      | Single `gcloud` command; same service account           |
| Service account key in `credentials/` dir    | Medium   | Already gitignored; use Workload Identity in production |

---

## 9. Cost Comparison

| Service                   | Third-Party Cost         | GCP Alternative Cost          |
| ------------------------- | ------------------------ | ----------------------------- |
| Upstash Redis (Free tier) | $0/mo (10K commands/day) | $0 (included in Supabase)     |
| Upstash Redis (Pro)       | $10/mo                   | $0                            |
| Sentry (Free tier)        | $0/mo (5K events)        | $0 (1M errors/mo free on GCP) |
| Sentry (Team)             | $26/mo                   | $0                            |
| **Total saved**           | **$0–$36/mo**            | **$0**                        |

**Bottom line:** The GCP alternatives are free at RouteGenius's expected scale and eliminate two external vendor dependencies.

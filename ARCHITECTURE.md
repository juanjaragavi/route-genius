# RouteGenius Application Architecture

**Version**: 2.2.0
**Date**: February 18, 2026
**Status**: Production

## 1. System Overview

RouteGenius is a multi-tenant SaaS platform for probabilistic traffic distribution. It allows users to create projects and tracking links, configure weighted rotation rules, and analyze traffic performance in real-time. All data is persisted in Supabase PostgreSQL with Row Level Security (RLS) for defense-in-depth.

### Key Capabilities

- **Traffic Rotation**: Weighted random distribution algorithm (validated via Monte Carlo simulation).
- **Multi-Tenancy**: Strict data isolation per user account via `user_id` filtering + RLS.
- **Real-Time Analytics**: Dashboard with live click tracking and aggregated metrics (4 chart types).
- **UTM Tracking**: End-to-end UTM parameter propagation — sessionStorage persistence, click interception, redirect append, and Supabase storage.
- **Cloud Backup/Restore**: Local CSV export/import + Google Drive integration with multi-select Picker.
- **Security**: OAuth authentication, RLS, rate limiting, GCP error reporting, and secure API endpoints.

## 2. Component Architecture

### Frontend (Next.js 16.1.6 App Router, React 19.2.3)

- **Layouts**: `app/layout.tsx` (Root with GA4 + Firebase), `app/dashboard/layout.tsx` (Authenticated Shell with DashboardNav).
- **Pages**: Server Components for data fetching, Client Components for interactivity.
- **State Management**: React Server Actions for mutations, `useEffect` + debounce for auto-save.
- **Styling**: Tailwind CSS 4.x with `@theme inline` block in `globals.css`. Brand colors: `--color-brand-blue`, `--color-brand-cyan`, `--color-brand-lime`.
- **Icons**: `lucide-react` exclusively.
- **Charts**: Recharts 3.x — `ClicksLineChart` (line, 107 lines), `DestinationPieChart` (donut, 114 lines), `CountryBarChart` (horizontal bar, 81 lines), `HourlyBarChart` (vertical bar, 84 lines).
- **UTM Components**: `UtmPersister` (sessionStorage on route change, 54 lines), `UtmLinkInjector` (click intercept + append, 105 lines).

### Backend Services

- **API Routes** (5 endpoints):
  - `GET /api/auth/[...all]` — Better Auth catch-all (Google OAuth sign-in, sign-out, session, callbacks).
  - `GET /api/redirect/[linkId]` — High-performance probabilistic redirect (rate-limited, UTM propagation, fire-and-forget analytics).
  - `GET /api/analytics/[linkId]/public` — Public JSON API for click counts (no auth required).
  - `POST /api/profile/avatar` — Multipart file upload (GCS in production, local fs in dev).
  - `GET /api/auth/google-drive/callback` — Google Drive OAuth callback (token exchange → HTTP-only cookie).

- **Server Actions** (40 total across 3 files):
  - `app/actions.ts` — 18 actions: Project CRUD (6), Link CRUD (6), search (2), archive/unarchive (2), profile (1), legacy migration (1).
  - `app/dashboard/analytics/actions.ts` — 11 actions: click aggregations by day/destination/country/hour, totals, unique visitors, active links, CSV export, distribution ratio.
  - `app/dashboard/settings/backup-actions.ts` — 11 actions: export, restore, Google Drive connect/disconnect/backup/list/restore/batch-restore, Picker token, folder backup.

- **Data Access Layer**: `lib/mock-data.ts` (25 exported functions, 800 lines) wraps Supabase queries with strict type safety and `user_id` scoping.

### Database (Supabase PostgreSQL 15+)

| Table                          | Purpose                            | Key Columns                                                                                                                                         |
| ------------------------------ | ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projects`                     | Project metadata / virtual folders | `id`, `user_id`, `workspace_id`, `name`, `title`, `description`, `tags` (JSONB), `archived`                                                         |
| `links`                        | Link config with rotation rules    | `id`, `user_id`, `project_id` (FK), `title`, `main_destination_url`, `nickname`, `rotation_rules` (JSONB), `status`, `rotation_enabled`, `archived` |
| `click_events`                 | Time-series redirect analytics     | `link_id`, `resolved_destination_url`, `went_to_main`, `user_agent`, `ip_address`, `referer`, `country_code`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `created_at` |
| `rate_limits`                  | Sliding window counters            | `key`, `count`, `window_start`                                                                                                                      |
| `user` / `session` / `account` | Better Auth managed tables         | Standard Better Auth schema                                                                                                                         |

**Note:** The `links` table no longer has a `name` column (dropped via migration 004, Feb 2026). Display fallbacks use `link.title || link.nickname`.

**RLS Configuration**: Enabled on `projects` and `links`. No permissive policies exist — deny-all by default for non-service-role connections.

**Supabase RPC Functions** (4):

- `check_rate_limit(p_key, p_window_seconds, p_max_requests)` — Sliding window rate limiting.
- `get_clicks_by_day(p_link_id, p_start_date, p_end_date)` — Time-series aggregation.
- `get_clicks_by_destination(...)` — Destination breakdown.
- `get_clicks_by_country(...)` — Geographic distribution.
- `get_clicks_by_hour(...)` — Hourly distribution.

**Realtime**: Enabled on `click_events` for live click counter badge.

**SQL Migrations** (4 scripts, 328 lines total):

| Script | Lines | Purpose |
| --- | --- | --- |
| `001-create-projects-links-tables.sql` | 99 | Creates `projects` and `links` tables with indexes + seeds demo data |
| `002-add-user-id-enable-rls.sql` | 58 | Adds `user_id` to projects/links, creates ownership indexes, enables RLS |
| `003-add-utm-columns-to-click-events.sql` | 151 | Creates `click_events` table with UTM columns, indexes, RLS, and 4 RPC functions |
| `004-drop-name-column-from-links.sql` | 20 | Drops `name` column and its index from `links` table |

### External Integrations

| Service              | Module                        | Purpose                                                 |
| -------------------- | ----------------------------- | ------------------------------------------------------- |
| Google OAuth 2.0     | `lib/auth.ts`                 | User authentication (domain-restricted)                 |
| Google Drive API v3  | `lib/google-drive.ts`         | Cloud backup/restore (OAuth + file ops)                 |
| Google Picker API    | `lib/use-google-picker.ts`    | Client-side file browser (multi-select, SUPPORT_DRIVES) |
| Google Cloud Storage | `lib/storage/gcs.ts`          | Avatar file uploads                                     |
| GCP Error Reporting  | `lib/gcp/error-reporting.ts`  | Server-side error monitoring                            |
| Firebase Analytics   | `lib/firebase/crashlytics.ts` | Client-side error/event logging                         |
| Google Analytics 4   | `app/layout.tsx`              | Page view tracking via `@next/third-parties`            |

## 3. Data Flow

### Redirect Flow (Public, Unauthenticated)

```
GET /api/redirect/[linkId]?utm_source=google&utm_medium=cpc
  │
  ├─ 1. Rate Limit Check ─→ checkRateLimit(`redirect:<ip>`) → Supabase PG
  │     └─ 429 if exceeded (100 req / 10s per IP)
  │
  ├─ 2. Link Lookup ─→ getLinkForRedirect(linkId) → Supabase (NO user_id filter)
  │     └─ 404 if not found, 410 if disabled/expired
  │
  ├─ 3. Rotation ─→ selectDestination(link) → Weighted random algorithm
  │     └─ Math.random() cumulative distribution, residual weight to main URL
  │
  ├─ 4. UTM Propagation ─→ extractUtmParams(searchParams) → appendUtmParams(destination)
  │     └─ UTM params from incoming request appended to selected destination
  │
  ├─ 5. Analytics ─→ Fire-and-forget insert to click_events (non-blocking)
  │     └─ Records: link_id, destination, user_agent, ip, referer, country_code, UTM fields
  │
  └─ 6. Response ─→ 307 Temporary Redirect to selected destination (with UTM params)
```

### Dashboard Flow (Authenticated)

```
Browser → proxy.ts (session cookie check) → /dashboard/*
  │
  ├─ Server Component: getServerSession() → Better Auth PostgreSQL
  │     └─ redirect('/login') if no session
  │
  ├─ Data Fetch: getAllProjects(userId) → lib/mock-data.ts → Supabase
  │     └─ .eq('user_id', userId) enforced at application level
  │
  └─ Mutation: Server Action → requireUserId() → lib/mock-data.ts → Supabase
        └─ revalidatePath('/dashboard') after success
```

### UTM Tracking Flow (Client-Side)

```
User lands on site with ?utm_source=google&utm_medium=cpc
  │
  ├─ UtmPersister: Reads searchParams → stores in sessionStorage
  │
  ├─ User navigates internally (UTM persisted across route changes)
  │
  └─ UtmLinkInjector: Intercepts <a> clicks → appends sessionStorage UTM to href
        └─ Skips external links, mailto:, tel:, # anchors
        └─ Does NOT override existing UTM params on target URL
```

### Backup/Restore Flow

```
Export:
  exportBackupAction() → requireUserId() → getAllProjects + getAllLinks
    → serializeProjectsToCSV / serializeLinksToCSV
    → Local download OR Google Drive upload (default folder / Picker-selected folder)

Restore (Local):
  User selects CSV file(s) → restoreBackupAction(projectsCSV, linksCSV)
    → parseProjectsFromCSV / parseLinksFromCSV → Supabase upsert

Restore (Google Drive — Single file):
  restoreFromGoogleDriveAction(fileId, type) → downloadFromDrive → restoreBackupAction

Restore (Google Drive — Multi-select Picker):
  restoreBatchFromGoogleDriveAction(files[]) → download each → restoreBackupAction(projectsCSV, linksCSV)
```

## 4. Security Model

### Authentication

- **Provider**: Better Auth 1.x with Google OAuth 2.0.
- **Session Storage**: PostgreSQL database (managed by Better Auth adapter via `pg`).
- **Session Duration**: 7 days, refreshed daily, cookie cached for 5 minutes.
- **Domain Restriction**: Only `@topnetworks.co` and `@topfinanzas.com` emails allowed.
- **Trusted Origins**: `localhost:3070`, `route-genius.vercel.app`, `route.topnetworks.co`.

### Authorization (Double-Lock Security)

1. **Application Layer**: Every query in `lib/mock-data.ts` (except `getLinkForRedirect`) explicitly filters `.eq('user_id', userId)`.
2. **Database Layer (RLS)**: Row Level Security is ENABLED on `projects` and `links` with deny-all default. Service role key bypasses RLS for authorized server operations.

### Rate Limiting

- **Endpoint**: `/api/redirect/[linkId]` only.
- **Algorithm**: Sliding window via Supabase PG function.
- **Limits**: 100 requests per 10 seconds per IP.
- **Failure Mode**: Fails open (allows through on DB errors).
- **Dev Bypass**: `DISABLE_RATE_LIMITING=true` environment variable.

### Google Drive Token Security

- OAuth tokens stored in HTTP-only cookie (`rg_gdrive_tokens`).
- 30-day expiry. Secure flag set on HTTPS environments.
- Scope restricted to `drive.file` (only files created by RouteGenius).

## 5. Rotation Algorithm

⚠️ **UNTOUCHABLE** — Do not modify without explicit mathematical validation.

```typescript
function selectDestination(link: Link): string {
  // 1. Build weighted destinations (main gets residual: 100 - sum(secondary weights))
  // 2. Generate r ∈ [0, 1) via Math.random()
  // 3. Walk cumulative distribution, return first dest where r < cumulative
  // 4. Fallback to main_destination_url
}
```

**Properties**: Non-sticky (independent draws), uniform distribution, convergent with sufficient traffic.

## 6. Middleware (proxy.ts)

Next.js 16 renamed middleware to `proxy.ts`. It:

- Protects `/dashboard` and `/` routes behind session cookie check.
- Allows public access to `/api/redirect`, `/api/auth`, `/api/analytics`, `/analytics/[linkId]`.
- Redirects authenticated users away from `/login`.
- Detects both `__Secure-better-auth.session_token` (HTTPS) and `better-auth.session_token` (HTTP).
- Matcher: `/((?!_next/static|_next/image|favicon.ico|api/redirect|api/analytics).*)`.

## 7. Deployment

| Environment    | URL                               | Branch    | Auto-deploy  |
| -------------- | --------------------------------- | --------- | ------------ |
| **Production** | `https://route.topnetworks.co`    | `main`    | Yes (Vercel) |
| **Staging**    | `https://route-genius.vercel.app` | `staging` | Yes (Vercel) |
| **Local Dev**  | `http://localhost:3070`           | `dev`     | N/A          |

### Git Promotion Pipeline

```
dev  ──PR──▶  staging  ──PR──▶  main
```

All code enters through `dev`. Promotion to `staging` and `main` requires Pull Requests with review approval. Direct commits to `staging` or `main` are prohibited.

## 8. Known Limitations

1. **Bot Filtering**: `isBot()` exists in `lib/bot-filter.ts` but is not enforced on the redirect endpoint.
2. **No Automated Tests**: Zero test coverage (Vitest + Playwright planned for Phase 3).
3. **No URL Validation**: Open redirect vulnerability — Zod schemas planned.
4. **No CSRF Protection**: Server Actions lack explicit CSRF tokens.
5. **Legacy Naming**: `lib/mock-data.ts` still bears its Phase 1 name despite wrapping real Supabase queries.
6. **Dead Code**: `components/Header.tsx` (56 lines) is unused Phase 1 legacy.
7. **Dependency Misplacement**: `prettier` is in `dependencies` instead of `devDependencies`.

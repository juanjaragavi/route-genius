# RouteGenius — AI Coding Instructions

## Architecture Overview

RouteGenius is a **multi-tenant SaaS platform** built with Next.js 16 App Router (React 19.2.3). It splits incoming clicks across multiple destination URLs based on configurable weights, organized into a projects-and-links hierarchy with full authentication, real-time analytics, UTM tracking, and cloud backup/restore.

**Data Flow:**

```
Dashboard UI → Server Action (app/actions.ts) → requireUserId() → Supabase PostgreSQL (lib/mock-data.ts)

Visitor click → /api/redirect/[linkId] → Rate Limit → selectDestination() → 307 Redirect
                                          │                                    ↓
                                          │                    UTM params extracted & appended to destination
                                          │                                    ↓
                                          │                    Fire-and-forget Supabase insert (click_events + UTM)
                                          └─ UTM persisted via UtmPersister (sessionStorage) + UtmLinkInjector (click intercept)
```

**Key constraint:** All data lives in Supabase PostgreSQL. Projects & Links have `user_id` ownership enforced at app level + RLS. Auth uses PostgreSQL via Better Auth.

## Rotation Algorithm

The probabilistic selection uses **weighted random sampling with cumulative distribution**:

```typescript
// lib/rotation.ts — selectDestination() — DO NOT MODIFY
function selectDestination(link: Link): string {
  const destinations = buildWeightedDestinations(link);
  const totalWeight = destinations.reduce((sum, d) => sum + d.weight, 0);
  if (totalWeight === 0) return link.main_destination_url;
  const r = Math.random();
  let cumulative = 0;
  for (const dest of destinations) {
    cumulative += dest.weight / totalWeight;
    if (r < cumulative) return dest.url;
  }
  return link.main_destination_url;
}
```

**Weight calculation:**

- Secondary rules define explicit weights (e.g., 30%, 30%)
- Main URL receives **residual weight**: `100 - sum(secondary_weights)`
- Example: 30% + 30% secondaries → Main gets 40%

**Properties:**

- **Non-sticky**: Each request is independent (no cookies/sessions)
- **Uniform distribution**: Uses `Math.random()` for unbiased selection
- **Convergence**: Actual distribution matches configured weights with sufficient traffic

## Project Structure

| Path                                          | Purpose                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                                | 6 interfaces: `Project`, `Link`, `RotationRule`, `ClickEvent`, `SimulationResult`, `LinkSearchCriteria`    |
| `lib/rotation.ts`                             | ⚠️ UNTOUCHABLE: `buildWeightedDestinations()`, `selectDestination()`, `simulateClicks()` (143 lines)       |
| `lib/mock-data.ts`                            | Supabase PostgreSQL CRUD (25 exported functions, 800 lines): Projects + Links + search + archive            |
| `lib/slug.ts`                                 | Crypto-random base62 slug generator (127 lines)                                                            |
| `lib/csv-backup.ts`                           | CSV serialization/parsing for Projects and Links (RFC 4180, 322 lines)                                     |
| `lib/google-drive.ts`                         | Google Drive OAuth 2.0 + file operations (492 lines)                                                       |
| `lib/use-google-picker.ts`                    | Client-side Google Picker hook (multi-select, Shared Drives, CSV filter, 219 lines)                        |
| `lib/utm.ts`                                  | UTM parameter extraction, propagation, and sessionStorage persistence (166 lines)                          |
| `lib/bot-filter.ts`                           | Bot user-agent detection (NOT YET INTEGRATED into redirect route, 34 lines)                                |
| `lib/auth.ts`                                 | Better Auth: Google OAuth, PG adapter, domain restriction (60 lines)                                       |
| `lib/auth-client.ts`                          | Client auth: `signIn`, `signOut`, `useSession` (21 lines)                                                  |
| `lib/auth-session.ts`                         | Server-side `getServerSession()` (15 lines)                                                                |
| `lib/rate-limit.ts`                           | Supabase PG rate limiting: `checkRateLimit()` (78 lines)                                                   |
| `lib/gcp/error-reporting.ts`                  | Server-side `reportError()` via GCP (72 lines)                                                             |
| `lib/firebase/config.ts`                      | Firebase app initialization singleton (33 lines)                                                           |
| `lib/firebase/crashlytics.ts`                 | Client-side `logError()` and `logCustomEvent()` (78 lines)                                                 |
| `lib/storage/gcs.ts`                          | GCS: `uploadFile()`, `getSignedUrl()`, `deleteFile()` (127 lines)                                          |
| `app/actions.ts`                              | 18 Server Actions for Projects + Links CRUD + profile + legacy migration (527 lines)                       |
| `app/dashboard/analytics/actions.ts`          | 11 analytics Server Actions querying Supabase RPCs (229 lines)                                             |
| `app/dashboard/settings/backup-actions.ts`    | 11 backup/restore Server Actions (local CSV + Google Drive + Picker, 740 lines)                            |
| `app/api/redirect/[linkId]/route.ts`          | Redirect endpoint: rate limiting + selection + UTM propagation + click tracking (131 lines)                 |
| `app/api/auth/[...all]/route.ts`              | Better Auth catch-all handler (15 lines)                                                                   |
| `app/api/auth/google-drive/callback/route.ts` | Google Drive OAuth callback + token cookie (103 lines)                                                     |
| `app/api/analytics/[linkId]/public/route.ts`  | Public JSON API for click counts (46 lines)                                                                |
| `app/api/profile/avatar/route.ts`             | Avatar upload (GCS in prod, local fs in dev, 171 lines)                                                    |
| `components/LinkEditorForm.tsx`               | Core form (806 lines): auto-save (1,500ms debounce), rotation rules, simulation                            |
| `components/BackupRestoreModule.tsx`          | Backup/Restore UI: local CSV + Google Drive + Picker + processing overlay (1199 lines)                     |
| `components/DashboardNav.tsx`                 | Authenticated navigation with user avatar + sign-out (191 lines)                                           |
| `components/SimulationResults.tsx`            | Monte Carlo simulation results display (198 lines)                                                         |
| `components/AvatarCropModal.tsx`              | Image crop modal for profile pictures (193 lines)                                                          |
| `components/RealtimeClickCounter.tsx`         | Supabase Realtime click badge (53 lines)                                                                   |
| `components/analytics/UtmPersister.tsx`       | Reads UTM from URL and persists to sessionStorage on route changes (54 lines)                              |
| `components/analytics/UtmLinkInjector.tsx`    | Intercepts clicks on `<a>` elements and appends sessionStorage UTM params (105 lines)                      |
| `components/charts/*.tsx`                     | 4 Recharts components: line (107), pie (114), bar-country (81), bar-hourly (84)                            |
| `proxy.ts`                                    | Next.js 16 route protection middleware (60 lines)                                                          |
| `scripts/*.sql`                               | 4 database migration scripts (328 lines total)                                                             |

## Conventions

### TypeScript Patterns

- All types in `lib/types.ts` — import with `import type { Link } from "@/lib/types"`
- Server Actions return `{ success: true, data } | { success: false, error: string }`
- Use `crypto.randomUUID()` for IDs
- The `Link` entity has **no `name` field** (removed Feb 2026). Display fallbacks use `link.title || link.nickname`. `Project` still has `name`.

### UI/Styling

- **Spanish UI** — All user-facing text is in Spanish (this is intentional)
- **Brand colors** via CSS variables: `--color-brand-blue`, `--color-brand-cyan`, `--color-brand-lime`
- Tailwind CSS 4.x with `@theme inline` block in `globals.css`
- Icons from `lucide-react` exclusively

### State Management

- Auto-save pattern: `useEffect` watching state → debounce (1,500ms) → call Server Action
- Use `startTransition` when calling `setState` inside `useEffect` (React Compiler requirement)

### Security

- **Double-Lock**: Every query in `lib/mock-data.ts` filters by `user_id` (app layer) + Supabase RLS (DB layer).
- **Authentication**: Use `requireUserId()` in all Server Actions.
- **Google Drive tokens**: HTTP-only cookies (`rg_gdrive_tokens`), 30-day expiry, `drive.file` scope.

## Deployment Environments

| Environment    | URL                               | Branch    | Auto-deploy  |
| -------------- | --------------------------------- | --------- | ------------ |
| **Production** | `https://route.topnetworks.co`    | `main`    | Yes (Vercel) |
| **Staging**    | `https://route-genius.vercel.app` | `staging` | Yes (Vercel) |
| **Local Dev**  | `http://localhost:3070`           | `dev`     | N/A          |

> ⚠️ **MANDATORY:** Before writing any code, verify you are on the `dev` branch: `git branch --show-current`. All development happens on `dev`. Code promotes linearly: `dev` → `staging` → `main`. **Never commit directly to `staging` or `main`.**

## Git Workflow & Promotion Hierarchy

```
dev  ──PR──▶  staging  ──PR──▶  main
 │                │                │
 Local Dev        Vercel Preview   Vercel Production
```

- **`dev`**: Active development. All commits land here first.
- **`staging`**: Pre-production QA. Receives code only via PR from `dev`.
- **`main`**: Production. Receives code only via PR from `staging`.

**Prohibited:** Direct commits to `staging` or `main`. Force-pushes to `staging` or `main`. Skipping `staging` by merging `dev` → `main`.

## Developer Workflows

```bash
git checkout dev      # Always start here
npm run dev           # Dev server on port 3070
npm run lint          # ESLint + Prettier check (uses eslint directly, NOT next lint)
npm run format        # Auto-fix formatting
npm run build         # Production build
```

**Testing redirects:**

```bash
curl -s -o /dev/null -w "%{redirect_url}\n" http://localhost:3070/api/redirect/<link-id>
```

## Common Gotchas

1. **Supabase singleton** — `lib/mock-data.ts` uses a lazily initialized Supabase client. Never create multiple clients.
2. **Hydration errors** — Don't use `window.location` directly; initialize with `useState("")` + `useEffect`.
3. **Next.js 16** — `next lint` was removed; use `eslint .` directly. Middleware renamed to `proxy.ts`.
4. **Weight math** — Secondary weights sum to ≤100; remainder goes to main URL automatically.
5. **Branch discipline** — All work on `dev`. Promotion: `dev` → `staging` → `main` via PRs. Never commit directly to `staging` or `main`.
6. **Unified storage** — Projects, Links, and click analytics all live in Supabase PostgreSQL. They share link IDs.
7. **Auth cookie prefix** — HTTPS environments use `__Secure-` cookie prefix; HTTP (localhost) doesn't.
8. **Link has no `name` field** — Removed in migration 004. Display uses `link.title || link.nickname`. `Project` still has `name`.
9. **`lib/mock-data.ts` naming** — Legacy name; it wraps real Supabase queries, not mock data.

## Phase 2 Features (Completed)

| Feature                                         | Status                    |
| ----------------------------------------------- | ------------------------- |
| Projects system (virtual folders)               | ✅ Complete               |
| Google OAuth authentication                     | ✅ Complete               |
| Click analytics dashboard (4 charts)            | ✅ Complete               |
| Realtime click counter                          | ✅ Complete               |
| Public analytics page + API                     | ✅ Complete               |
| Archive/restore system                          | ✅ Complete               |
| Global search with filters                      | ✅ Complete               |
| Profile settings + avatar upload (GCS)          | ✅ Complete               |
| Bot detection utility                           | ✅ Built (not integrated) |
| Crypto-random slug generator                    | ✅ Complete               |
| CSV export/import (local)                       | ✅ Complete               |
| CSV export for click events                     | ✅ Complete               |
| Rate limiting (Supabase PG)                     | ✅ Complete               |
| Error boundary + loading skeleton               | ✅ Complete               |
| GCP Error Reporting (server-side)               | ✅ Complete               |
| Firebase Crashlytics (client-side)              | ✅ Complete               |
| Google Drive backup/restore                     | ✅ Complete               |
| Google Picker multi-select file browser         | ✅ Complete               |
| Supabase PostgreSQL migration (from file store) | ✅ Complete               |
| Multi-tenant RLS + user_id ownership            | ✅ Complete               |
| Legacy data migration (`claimLegacyData`)       | ✅ Complete               |
| UTM tracking (end-to-end propagation)           | ✅ Complete               |
| Link `name` field removal (UX cleanup)          | ✅ Complete               |

## Known Technical Debt

1. **No automated tests** — Zero test coverage
2. **No URL validation** — Open redirect vulnerability
3. **Bot filter not integrated** — `isBot()` exists but not called
4. **`components/Header.tsx` unused** — Legacy Phase 1 dead code (56 lines)
5. **`prettier` misplaced** — In `dependencies` instead of `devDependencies`
6. **No CSRF protection** on Server Actions
7. **`lib/mock-data.ts` naming** — File still named "mock-data" but wraps real Supabase queries

## Phase 3 Roadmap

- Add URL validation (Zod schemas) for all destinations
- Integrate bot filtering into redirect endpoint
- Add automated testing (Vitest + Playwright)
- Implement multi-workspace support
- Add link expiration & scheduling
- Set up CI/CD pipeline (GitHub Actions)
- Rename `lib/mock-data.ts` to `lib/db.ts`

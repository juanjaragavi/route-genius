# RouteGenius — AI Assistant Guide

**Mission:** Develop a secure, multi-tenant link rotation platform using Next.js 16, Supabase, and Better Auth.

## Project Overview

RouteGenius is a **production SaaS platform** for probabilistic traffic distribution. It enables weighted random redirection across multiple destination URLs, organized into projects and links, with full authentication, real-time analytics, UTM tracking, cloud backup/restore, and enterprise-grade security.

- **Status:** Phase 2 Complete (Production). Phase 3 in progress.
- **Core Principle:** Strict multi-tenant data isolation via Row Level Security (RLS) and Application-Level Enforcement.
- **Language:** 100% Spanish UI for end-users.

## 🏗 Architecture

### Tech Stack

| Layer               | Technology                                                    |
| ------------------- | ------------------------------------------------------------- |
| **Framework**       | Next.js 16.1.6 (App Router, Turbopack)                        |
| **Language**        | TypeScript 5.x (Strict Mode), React 19.2.3                    |
| **Auth**            | Better Auth 1.x (Google OAuth, PostgreSQL adapter via `pg`)   |
| **Database**        | Supabase PostgreSQL 15+ (RLS Enabled)                         |
| **Rate Limiting**   | Supabase PG Function (`check_rate_limit`)                     |
| **Styling**         | Tailwind CSS 4.x (`@theme inline` in globals.css)             |
| **Charts**          | Recharts 3.x                                                  |
| **Animations**      | Framer Motion 12.x                                            |
| **Analytics**       | Google Analytics 4, Firebase Analytics                        |
| **Error Reporting** | GCP Error Reporting (server), Firebase Crashlytics (client)   |
| **Storage**         | Google Cloud Storage (avatars)                                |
| **Cloud Backup**    | Google Drive API v3 + Google Picker API                       |
| **UTM Tracking**    | End-to-end: sessionStorage persistence → redirect propagation |
| **State**           | React Server Actions + `useOptimistic` (where applicable)     |
| **Infrastructure**  | Vercel (Edge Functions), Google Cloud Platform                |

### Data Flow

```
Dashboard UI → Server Action (app/actions.ts) → requireUserId() → Supabase PostgreSQL (lib/mock-data.ts)

Visitor click → /api/redirect/[linkId] → Rate Limit → selectDestination() → 307 Redirect
                                          │                                    ↓
                                          │                    UTM params extracted & appended to destination
                                          │                                    ↓
                                          │                    Fire-and-forget Supabase insert (click_events + UTM)
                                          └─ UTM persisted via UtmPersister (sessionStorage) + UtmLinkInjector (click intercept)

Backup → exportBackupAction() → CSV serialization → Local download | Google Drive upload
Restore → CSV file(s) → parseProjectsFromCSV / parseLinksFromCSV → restoreBackupAction() → Supabase upsert
```

### Key Directories

| Path                                          | Purpose                                                                                                    | Lines |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----- |
| `lib/types.ts`                                | Core interfaces: `Project`, `Link`, `RotationRule`, `ClickEvent`, `SimulationResult`, `LinkSearchCriteria` | 134   |
| `lib/rotation.ts`                             | ⚠️ UNTOUCHABLE: `buildWeightedDestinations()`, `selectDestination()`, `simulateClicks()`                   | 143   |
| `lib/mock-data.ts`                            | Supabase PostgreSQL CRUD (25 exported functions): Projects + Links + search + archive                      | 800   |
| `lib/slug.ts`                                 | Crypto-random base62 slug generator with rejection sampling (~47.6 bits entropy)                           | 127   |
| `lib/csv-backup.ts`                           | CSV serialization/parsing for Projects and Links (RFC 4180 compliant)                                      | 322   |
| `lib/google-drive.ts`                         | Google Drive OAuth 2.0 + file operations (upload, download, list, folder management)                       | 492   |
| `lib/use-google-picker.ts`                    | Client-side Google Picker hook (multi-select, CSV filter, folder nav, Shared Drives)                       | 219   |
| `lib/utm.ts`                                  | UTM parameter extraction, propagation, and sessionStorage persistence                                      | 166   |
| `lib/bot-filter.ts`                           | Bot user-agent detection (NOT YET INTEGRATED into redirect route)                                          | 34    |
| `lib/auth.ts`                                 | Better Auth: Google OAuth, PG adapter, domain restriction                                                  | 60    |
| `lib/auth-client.ts`                          | Client auth: `signIn`, `signOut`, `useSession`                                                             | 21    |
| `lib/auth-session.ts`                         | Server-side `getServerSession()`                                                                           | 15    |
| `lib/rate-limit.ts`                           | Supabase PG rate limiting: `checkRateLimit()` (fails open)                                                 | 78    |
| `lib/gcp/error-reporting.ts`                  | Server-side `reportError()` via GCP Error Reporting                                                        | 72    |
| `lib/firebase/config.ts`                      | Firebase app initialization (singleton)                                                                    | 33    |
| `lib/firebase/crashlytics.ts`                 | Client-side `logError()` and `logCustomEvent()` via Firebase Analytics                                     | 78    |
| `lib/storage/gcs.ts`                          | GCS file operations: `uploadFile()`, `getSignedUrl()`, `deleteFile()`                                      | 127   |
| `app/actions.ts`                              | 18 Server Actions for Projects + Links CRUD + profile + legacy data migration                              | 527   |
| `app/dashboard/analytics/actions.ts`          | 11 analytics Server Actions querying Supabase RPCs                                                         | 229   |
| `app/dashboard/settings/backup-actions.ts`    | 11 backup/restore Server Actions (local CSV + Google Drive + Picker)                                       | 740   |
| `app/api/redirect/[linkId]/route.ts`          | Redirect endpoint: rate limiting + selection + UTM propagation + click tracking                            | 131   |
| `app/api/auth/[...all]/route.ts`              | Better Auth catch-all handler                                                                              | 15    |
| `app/api/auth/google-drive/callback/route.ts` | Google Drive OAuth callback (token exchange + secure cookie)                                               | 103   |
| `app/api/analytics/[linkId]/public/route.ts`  | Public JSON API for click counts (no auth required)                                                        | 46    |
| `app/api/profile/avatar/route.ts`             | Avatar upload (GCS in prod, local fs in dev)                                                               | 171   |
| `components/BackupRestoreModule.tsx`          | Backup/Restore UI: local CSV + Google Drive + Picker multi-select + processing overlay                     | 1199  |
| `components/LinkEditorForm.tsx`               | Link editor: auto-save (1,500ms debounce), rotation rules, simulation                                      | 806   |
| `components/DashboardNav.tsx`                 | Authenticated navigation with user avatar + sign-out                                                       | 191   |
| `components/SimulationResults.tsx`            | Monte Carlo simulation results display                                                                     | 198   |
| `components/AvatarCropModal.tsx`              | Image crop modal for profile pictures (react-easy-crop)                                                    | 193   |
| `components/RealtimeClickCounter.tsx`         | Supabase Realtime click badge                                                                              | 53    |
| `components/analytics/UtmPersister.tsx`       | Reads UTM from URL and persists to sessionStorage on route changes                                         | 54    |
| `components/analytics/UtmLinkInjector.tsx`    | Intercepts clicks on `<a>` elements and appends sessionStorage UTM params                                  | 105   |
| `components/charts/*.tsx`                     | 4 Recharts components: line (107), pie (114), bar-country (81), bar-hourly (84)                            | 386   |
| `proxy.ts`                                    | Next.js 16 route protection middleware                                                                     | 60    |
| `scripts/*.sql`                               | 4 database migration scripts                                                                               | 328   |

## 🔐 Security Standards

1. **Strict Ownership**: Every `projects` and `links` row has a `user_id`.
2. **Double-Lock Security**:
   - **Layer 1 (App)**: `lib/mock-data.ts` queries MUST explicitly filter by `user_id`.
   - **Layer 2 (DB)**: RLS policies DENY access to `anon` and cross-tenant `authenticated` users as a failsafe.
3. **Authentication**:
   - Use `requireUserId()` in Server Actions.
   - Use `redirect('/login')` in Server Components if session is missing.
4. **Domain Restriction**: Only `@topnetworks.co` and `@topfinanzas.com` emails allowed via Google OAuth.
5. **Rate Limiting**: 100 requests per 10 seconds per IP on redirect endpoint (fails open on DB errors).
6. **Google Drive Tokens**: Stored in encrypted HTTP-only cookies (`rg_gdrive_tokens`), 30-day expiry.

## 💻 Development Guidelines

### Coding Style

- **TypeScript**: Strict mode enabled. No `any`. Define interfaces in `lib/types.ts`.
- **Server Actions**: Use `"use server"` at top of file. Return `{ success: boolean, data?: T, error?: string }`.
- **UI**: Tailwind CSS 4.x. Mobile-first. 100% Spanish text.
- **Icons**: `lucide-react` exclusively.
- **IDs**: `crypto.randomUUID()` for all identifiers.

### Common Tasks

**1. Create a New Server Action:**

```typescript
export async function myAction() {
  const userId = await requireUserId(); // 1. Auth check
  // 2. Perform logic with userId
  await performDbOp(data, userId);
  revalidatePath("/dashboard");
}
```

**2. Modify Data Access:**

- Update `lib/types.ts` interface.
- Update `lib/mock-data.ts` function (add `userId` param if missing).
- Ensure Supabase query includes `.eq('user_id', userId)`.

**3. Database Schema Change:**

- Create sequentially numbered SQL script in `scripts/` (next: `005-*.sql`).
- Apply via Supabase SQL Editor.
- Update `lib/types.ts` to match.

### Developer Workflows

```bash
git checkout dev      # Always start here — all work on dev
npm run dev           # Dev server on port 3070
npm run lint          # ESLint + Prettier check (uses eslint directly, NOT next lint)
npm run format        # Auto-fix formatting
npm run build         # Production build
```

**Testing redirects:**

```bash
curl -s -o /dev/null -w "%{redirect_url}\n" http://localhost:3070/api/redirect/<link-id>
```

## ⚠️ Critical Constraints

1. **Do NOT modify `lib/rotation.ts`** without explicit mathematical validation.
2. **Do NOT use Supabase Auth `auth.uid()` in RLS.** We use Better Auth, so RLS policies rely on application logic (RLS is defense-in-depth for anon/public access control).
3. **Do NOT leak PII** in analytics.
4. **Branch discipline** — All work on `dev`. Promotion follows `dev` → `staging` → `main`. Never commit directly to `staging` or `main` (see _Git Workflow & Promotion Hierarchy_ below).
5. **Module isolation** — Supabase client is lazily initialized singleton. Never create multiple clients.
6. **Hydration errors** — Don't use `window.location` directly; initialize with `useState("")` + `useEffect`.
7. **Next.js 16** — `next lint` was removed; use `eslint .` directly. Middleware renamed to `proxy.ts`.
8. **Weight math** — Secondary weights sum to ≤100; remainder goes to main URL automatically.
9. **Dual storage** — Projects/Links in Supabase PostgreSQL, click analytics also in Supabase. They share link IDs.
10. **Auth cookie prefix** — HTTPS environments use `__Secure-` cookie prefix; HTTP (localhost) doesn't.
11. **Link entity has no `name` field** — Removed in Feb 2026. Display fallbacks use `link.title || link.nickname`. The `Project` entity still has `name`.

## Deployment Environments

| Environment    | URL                               | Branch    | Auto-deploy  |
| -------------- | --------------------------------- | --------- | ------------ |
| **Production** | `https://route.topnetworks.co`    | `main`    | Yes (Vercel) |
| **Staging**    | `https://route-genius.vercel.app` | `staging` | Yes (Vercel) |
| **Local Dev**  | `http://localhost:3070`           | `dev`     | N/A          |

## Git Workflow & Promotion Hierarchy

Code flows through a strict linear promotion pipeline. **No shortcuts.**

```
dev  ──PR──▶  staging  ──PR──▶  main
 │                │                │
 Local Dev        Vercel Preview   Vercel Production
 localhost:3070   route-genius     route.topnetworks.co
                  .vercel.app
```

### Branch Roles

| Branch    | Purpose                          | Who Commits             | Deploys To                    |
| --------- | -------------------------------- | ----------------------- | ----------------------------- |
| `dev`     | Active development & integration | All developers          | Local only (`localhost:3070`) |
| `staging` | Pre-production verification / QA | PR merge from `dev`     | `route-genius.vercel.app`     |
| `main`    | Production release               | PR merge from `staging` | `route.topnetworks.co`        |

### Promotion Protocol

1. **`dev` → `staging`** (Pre-production)
   - Open a Pull Request from `dev` into `staging`.
   - PR must pass lint (`npm run lint`) and build (`npm run build`) checks.
   - Requires at least **1 approving review** (or explicit self-approval for solo work).
   - After merge, Vercel auto-deploys to the staging URL for QA validation.

2. **`staging` → `main`** (Production Release)
   - Open a Pull Request from `staging` into `main`.
   - QA validation on the staging URL must be complete and documented in the PR description.
   - Requires at least **1 approving review**.
   - After merge, Vercel auto-deploys to production.

### Prohibited Actions

- **Never commit directly to `staging` or `main`.** All changes enter through `dev`.
- **Never force-push** to `staging` or `main`.
- **Never merge `dev` directly into `main`**, skipping `staging`.

### Quick Reference

```bash
# Start work
git checkout dev
git pull origin dev

# Promote to staging (after local validation)
git push origin dev
# → Open PR: dev → staging on GitHub

# Promote to production (after staging QA)
# → Open PR: staging → main on GitHub
```

## Known Technical Debt

1. **No automated tests** — Zero test coverage.
2. **No URL validation** — Open redirect vulnerability (Zod schemas planned).
3. **Bot filter not integrated** — `isBot()` exists in `lib/bot-filter.ts` but not called in redirect route.
4. **`components/Header.tsx` unused** — Legacy Phase 1 dead code (56 lines).
5. **`prettier` misplaced** — In `dependencies` instead of `devDependencies`.
6. **No CSRF protection** on Server Actions.
7. **`lib/mock-data.ts` naming** — File still named "mock-data" but now wraps real Supabase queries.

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
| Processing overlay for restore operations       | ✅ Complete               |
| Supabase PostgreSQL migration (from file store) | ✅ Complete               |
| Multi-tenant RLS + user_id ownership            | ✅ Complete               |
| Legacy data migration (`claimLegacyData`)       | ✅ Complete               |
| UTM tracking (end-to-end propagation)           | ✅ Complete               |
| Link `name` field removal (UX cleanup)          | ✅ Complete               |

## Phase 3 Roadmap

- Add URL validation (Zod schemas) for all destinations
- Integrate bot filtering into redirect endpoint
- Add automated testing (Vitest + Playwright)
- Implement multi-workspace support
- Add link expiration & scheduling
- Set up CI/CD pipeline (GitHub Actions)
- Rename `lib/mock-data.ts` to `lib/db.ts`

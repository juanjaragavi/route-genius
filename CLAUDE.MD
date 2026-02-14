# RouteGenius — AI Assistant Guide

This document provides context and guidelines for AI assistants working on the RouteGenius codebase.

## Project Overview

RouteGenius is a **multi-tenant SaaS platform** for probabilistic traffic distribution across multiple destination URLs. It enables weighted random redirection organized into projects and links, with full authentication, real-time click analytics, and a comprehensive dashboard.

**Company:** TopNetworks, Inc. (Proprietary)  
**Status:** Phase 2 — Complete. Active on `staging` branch; Vercel CI/CD live  
**Primary User Base:** Spanish-speaking users (100% Spanish UI)

## Core Functionality

1. **Probabilistic URL Rotation** — Weighted random selection across multiple destinations
2. **Non-Sticky Distribution** — Each click is independent (no cookies/sessions)
3. **Projects & Links Hierarchy** — Links organized inside projects (virtual folders)
4. **Real-Time Click Analytics** — 4 chart types, KPI cards, paginated event tables, CSV export
5. **Realtime Click Counter** — Supabase Realtime subscriptions for live updates
6. **Monte Carlo Simulation** — Test rotation with 1,000 simulated clicks
7. **Auto-Save** — Debounced (1,500ms) configuration persistence with visual feedback
8. **Google OAuth Authentication** — Domain-restricted to @topnetworks.co and @topfinanzas.com
9. **Archive & Search** — Archive/restore projects and links; global search with filters
10. **Profile Settings** — Avatar upload (GCS), display name editing
11. **Bot Detection** — `isBot()` in `lib/bot-filter.ts` (built, not yet integrated)
12. **Spanish UI** — Fully localized interface

## Tech Stack

| Layer            | Technology                                                  |
| ---------------- | ----------------------------------------------------------- |
| Framework        | Next.js 16.1.6 (App Router, Turbopack)                     |
| Language         | TypeScript 5.x (strict mode)                                |
| React            | React 19.2.3                                                |
| Styling          | Tailwind CSS 4.x                                            |
| Icons            | Lucide React                                                |
| Font             | Poppins (next/font)                                         |
| Charts           | Recharts 3.x                                                |
| Animation        | Framer Motion 12.x                                          |
| Auth             | Better Auth 1.x (Google OAuth, PostgreSQL adapter via `pg`) |
| DB (Auth)        | PostgreSQL via `pg` Pool (Better Auth manages its tables)   |
| DB (Analytics)   | Supabase (click_events, rate limiting, Realtime)            |
| Storage (Links)  | File-based JSON (`.route-genius-store.json`)                |
| File Storage     | Google Cloud Storage (`@google-cloud/storage`)              |
| Site Analytics   | Google Analytics 4 via `@next/third-parties`                |
| Error Reporting  | Firebase Analytics (client) + GCP Error Reporting (server)  |
| Port             | 3070                                                        |

## Architecture

### Hybrid Storage Model

RouteGenius uses a **dual storage architecture**:

| Data Type              | Backend                                                        |
| ---------------------- | -------------------------------------------------------------- |
| Projects & Links CRUD  | File-based (`lib/mock-data.ts` → `.route-genius-store.json`)   |
| Click Events           | Supabase PostgreSQL (fire-and-forget inserts)                  |
| Click Analytics        | Supabase (RPC functions + direct queries)                      |
| Rate Limiting          | Supabase PG function `check_rate_limit()`                      |
| Auth Sessions          | PostgreSQL via `pg` Pool (Better Auth)                         |
| Realtime Subscriptions | Supabase Realtime                                              |
| Avatars                | GCS (production) / local filesystem (dev)                      |

### Data Flow

```
Dashboard UI → Server Action (app/actions.ts) → File Store (.route-genius-store.json)

Visitor click → /api/redirect/[linkId] → Rate Limit (Supabase PG)
                                        → File Store (read link)
                                        → selectDestination() → 307 Redirect
                                        → click_events insert (Supabase, fire-and-forget)

Analytics Dashboard ← analytics/actions.ts ← Supabase RPC Functions
```

### Directory Structure

```
route-genius/
├── app/
│   ├── actions.ts                              # 20 Server Actions: Projects + Links CRUD
│   ├── globals.css                             # Tailwind 4.x theme + brand tokens
│   ├── layout.tsx                              # Root layout: Poppins, lang="es", GA4
│   ├── page.tsx                                # Root redirect → /dashboard
│   ├── login/page.tsx                          # Google OAuth login page
│   ├── analytics/[linkId]/page.tsx             # Public analytics (no auth)
│   ├── api/
│   │   ├── auth/[...all]/route.ts              # Better Auth catch-all
│   │   ├── redirect/[linkId]/route.ts          # Redirect (307) + rate limiting + click tracking
│   │   ├── analytics/[linkId]/public/route.ts  # Public click count JSON API
│   │   └── profile/avatar/route.ts             # Avatar upload (multipart → GCS/local)
│   └── dashboard/
│       ├── layout.tsx                          # Dashboard shell: nav + footer
│       ├── page.tsx                            # Projects list (cards)
│       ├── error.tsx                           # Error boundary (Spanish)
│       ├── loading.tsx                         # Loading skeleton
│       ├── ProjectActions.tsx                  # Project dropdown menu
│       ├── analytics/
│       │   ├── page.tsx                        # Analytics overview: KPIs + chart + events
│       │   ├── actions.ts                      # 10 analytics Server Actions (Supabase)
│       │   └── [linkId]/page.tsx               # Per-link: 4 charts, comparison, CSV, realtime
│       ├── archive/page.tsx                    # Archived items management
│       ├── search/page.tsx                     # Global search with filters
│       ├── settings/page.tsx                   # Profile: avatar + display name
│       └── projects/
│           ├── new/page.tsx                    # Create project form
│           └── [projectId]/
│               ├── page.tsx                    # Project detail + links list
│               ├── edit/page.tsx               # Edit project form
│               ├── LinkActions.tsx             # Link dropdown menu
│               └── links/
│                   ├── new/page.tsx            # New link → LinkEditorForm
│                   └── [linkId]/page.tsx       # Edit link → LinkEditorForm
├── components/
│   ├── DashboardNav.tsx                        # Authenticated top nav
│   ├── Header.tsx                              # ⚠️ Legacy Phase 1 (unused, removal candidate)
│   ├── LinkEditorForm.tsx                      # Core form (775 lines)
│   ├── SimulationResults.tsx                   # Monte Carlo results display
│   ├── RealtimeClickCounter.tsx                # Supabase Realtime click badge
│   └── charts/
│       ├── ClicksLineChart.tsx                 # Time series chart
│       ├── DestinationPieChart.tsx             # Donut chart
│       ├── CountryBarChart.tsx                 # Horizontal bar chart
│       └── HourlyBarChart.tsx                  # Vertical bar chart
├── lib/
│   ├── types.ts                                # Core: Project, Link, RotationRule, etc.
│   ├── rotation.ts                             # ⚠️ UNTOUCHABLE: Probabilistic algorithm
│   ├── mock-data.ts                            # File-based CRUD (504 lines)
│   ├── slug.ts                                 # Crypto-random base62 slug generator
│   ├── bot-filter.ts                           # Bot detection — NOT YET INTEGRATED
│   ├── auth.ts                                 # Better Auth: Google OAuth + PG
│   ├── auth-client.ts                          # Client: signIn, signOut, useSession
│   ├── auth-session.ts                         # Server: getServerSession()
│   ├── rate-limit.ts                           # Supabase PG rate limiting
│   ├── firebase/                               # Client-side error/event logging
│   ├── gcp/error-reporting.ts                  # Server-side reportError()
│   └── storage/gcs.ts                          # GCS utilities
├── proxy.ts                                    # Route protection (Next.js 16)
├── credentials/                                # Service account keys (gitignored)
├── scripts/                                    # Empty — no scripts yet
└── .route-genius-store.json                    # Local data store (gitignored)
```

## Data Model

### Project Interface

```typescript
interface Project {
  id: string;              // UUID
  workspace_id: string;    // Organization scope
  name: string;            // Machine-friendly name
  title: string;           // Display title
  description: string;     // Optional description
  tags: string[];          // Categorization tags
  archived: boolean;       // Soft delete
  created_at: string;      // ISO timestamp
  updated_at: string;      // ISO timestamp
}
```

### Link Interface

```typescript
interface Link {
  id: string;                    // UUID
  workspace_id: string;          // Organization scope
  project_id: string;            // Parent project reference
  name: string;                  // Machine-friendly name
  title: string;                 // Display title
  description: string;           // Optional description
  main_destination_url: string;  // Fallback/primary URL (residual traffic)
  nickname: string;              // Legacy label (backward compat)
  status: "enabled" | "disabled" | "expired";
  rotation_enabled: boolean;
  rotation_rules: RotationRule[];
  archived: boolean;             // Soft delete
  created_at: string;
  updated_at: string;
}
```

### RotationRule Interface

```typescript
interface RotationRule {
  id: string;                // UUID
  destination_url: string;   // Full redirect URL
  weight_percentage: number; // 1-100 (integer)
  order_index: number;       // Display order
}
```

## Code Style & Conventions

### TypeScript

- **Strict mode enabled** — All types must be explicit
- **No `any` types** — Use proper interfaces or generics
- **Server Actions** — Use `"use server"` directive for data mutations
- **Async/await** — Preferred over promise chaining
- All types in `lib/types.ts` — `import type { Link } from "@/lib/types"`
- Server Actions return `{ success: true, data } | { success: false, error: string }`
- Use `crypto.randomUUID()` for IDs

### React/Next.js

- **Server Components by default** — Only `"use client"` when needed
- **App Router patterns** — No Pages Router syntax
- **Next.js 16 proxy convention** — `proxy.ts` replaces `middleware.ts`
- **Server Actions** split: `app/actions.ts` (CRUD), `app/dashboard/analytics/actions.ts` (analytics)

### CSS/Tailwind

- **Tailwind 4.x** — `@theme inline` block in `globals.css`
- **Brand tokens:** `--color-brand-blue` (#2563eb), `--color-brand-cyan` (#0891b2), `--color-brand-lime` (#84cc16)
- Icons from `lucide-react` exclusively

### UI Language

✅ **All user-facing text must be in Spanish**
- Buttons: "Guardar", "Eliminar", "Archivar"
- Labels: "URL Principal", "Reglas de Rotación", "Analíticas"
- Errors: "Error al cargar", "Enlace no encontrado"

## Critical Business Logic

### Rotation Algorithm (`lib/rotation.ts`) — ⚠️ UNTOUCHABLE

**DO NOT modify** without mathematical proof + product owner approval.

- **Residual weight:** Main URL gets `100 - sum(secondary_weights)`
- **Non-sticky:** Each click is independent
- **Simulation:** 1,000 iterations (DO NOT change this count)

## API Reference

| Endpoint | Method | Auth | Status Codes | Description |
| -------- | ------ | ---- | ------------ | ----------- |
| `/api/redirect/[linkId]` | GET | No | 307, 404, 410, 429 | Probabilistic redirect + click tracking |
| `/api/auth/[...all]` | GET/POST | N/A | varies | Better Auth catch-all |
| `/api/profile/avatar` | POST | Yes | 200, 400, 401, 500 | Avatar upload (5MB, JPEG/PNG/WebP/GIF) |
| `/api/analytics/[linkId]/public` | GET | No | 200 | Public click count JSON |

## Authentication

- **Provider:** Better Auth with Google OAuth only
- **Domain restriction:** @topnetworks.co and @topfinanzas.com
- **Session:** 7-day expiry, daily refresh, 5-minute cookie cache
- **Route protection:** `proxy.ts` redirects `/dashboard/*` → `/login` if unauthenticated
- **Trusted origins:** localhost:3070, route-genius.vercel.app, route.topnetworks.co

## Deployment Environments

| Environment    | URL                               | Branch    |
| -------------- | --------------------------------- | --------- |
| **Production** | `https://route.topnetworks.co`    | `main`    |
| **Staging**    | `https://route-genius.vercel.app` | `staging` |
| **Local Dev**  | `http://localhost:3070`           | any       |

## Git Workflow

> ⚠️ **CRITICAL:** All development on `staging`. Verify with `git branch --show-current` before writing code.

- **Commit messages:** Conventional commits (`feat:`, `fix:`, `docs:`)
- **No direct pushes to `main`** — Only approved PRs from `staging`
- **No force push** to `main` or `staging`

## Environment Variables

27 variables across 9 groups. See `.env.example` for the full template.

## Infrastructure

All services in **TopFinanzas** GCP project (`absolute-brook-452020-d5`).

| Service                | Status |
| ---------------------- | ------ |
| Google OAuth 2.0       | ✅ Live |
| Better Auth            | ✅ Live |
| Google Analytics 4     | ✅ Live |
| Firebase               | ✅ Live |
| Google Cloud Storage   | ✅ Live |
| Supabase               | ✅ Live |
| Rate Limiting (PG)     | ✅ Live |
| GCP Error Reporting    | ✅ Live |

## Known Issues & Technical Debt

1. **`lib/bot-filter.ts` is unused** — `isBot()` built but never called; bot clicks pollute analytics
2. **`components/Header.tsx` is dead code** — Replaced by `DashboardNav.tsx`
3. **`prettier` in `dependencies`** — Should be `devDependencies`
4. **OAuth JSON in lib/** — `lib/client_secret_2_*.json` misplaced (gitignored but should be in credentials/)
5. **`scripts/` is empty** — No migration, seed, or utility scripts
6. **Dual storage inconsistency** — Supabase click_events can reference links deleted from file store
7. **No automated tests** — Zero test coverage
8. **Duplicate env line** — `DISABLE_RATE_LIMITING` appears twice in `.env.example`
9. **No URL validation** — Link destinations are not sanitized (XSS/open redirect risk)
10. **No CSRF protection** — Server Actions lack CSRF tokens

## Useful Commands

```bash
npm run dev           # Dev server on port 3070
npm run build         # Production build
npm run lint          # ESLint + Prettier (NOT next lint)
npm run format        # Auto-fix formatting
curl -I http://localhost:3070/api/redirect/<link-id>  # Test redirect
cat .route-genius-store.json | jq .                   # Check data
rm .route-genius-store.json                           # Reset state
```

## Troubleshooting

- **404 on redirect** — Check `.route-genius-store.json` exists, linkId matches
- **Weights ≠ 100%** — Expected; main gets residual (100 - sum)
- **Auth redirect loop** — Match `BETTER_AUTH_URL` / `NEXT_PUBLIC_APP_URL` to environment
- **Rate limiting in dev** — Set `DISABLE_RATE_LIMITING=true`

---

**Last Updated:** 2026-02-13  
**Phase:** 2 — Complete  
**Next Milestone:** Phase 3 (full Supabase migration, URL validation, testing, multi-workspace)

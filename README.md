# RouteGenius

## **Intelligent Traffic Distribution Platform**

A multi-tenant SaaS platform for probabilistic traffic routing. Create projects, configure tracking links with weighted rotation rules, and analyze performance with real-time analytics and end-to-end UTM tracking.

> **Live**: [route.topnetworks.co](https://route.topnetworks.co) &nbsp;|&nbsp; **Staging**: [route-genius.vercel.app](https://route-genius.vercel.app)

---

## Features

- **Weighted Traffic Rotation** — Probabilistic URL distribution with configurable weights and Monte Carlo simulation.
- **Projects & Links** — Organize tracking links into projects with tags, descriptions, and archive/restore.
- **Real-Time Analytics** — Live click tracking with 4 chart types: time series, destination pie, country bar, hourly bar.
- **UTM Tracking** — End-to-end UTM parameter propagation: sessionStorage persistence, click interception, redirect append, and Supabase storage.
- **Google OAuth** — Secure authentication restricted to authorized domains (`@topnetworks.co`, `@topfinanzas.com`).
- **Cloud Backup** — Export/import via local CSV or Google Drive with multi-select Picker file browser.
- **Global Search** — Filter links by title, URL, status, project, and date range.
- **Public Analytics API** — Share click stats via JSON endpoint or public analytics page.
- **Rate Limiting** — Sliding window protection (100 req/10s per IP) via Supabase PG function.
- **Error Monitoring** — GCP Error Reporting (server) + Firebase Crashlytics (client).
- **Profile Management** — Avatar upload via Google Cloud Storage with crop modal.

## Tech Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Framework      | Next.js 16.1.6 (App Router, Turbopack)              |
| Language       | TypeScript 5.x (Strict Mode), React 19.2.3          |
| Database       | Supabase PostgreSQL 15+ (RLS)                       |
| Auth           | Better Auth 1.x (Google OAuth)                      |
| Styling        | Tailwind CSS 4.x                                    |
| Charts         | Recharts 3.x                                        |
| Animations     | Framer Motion 12.x                                  |
| Icons          | Lucide React                                        |
| Hosting        | Vercel                                              |
| Cloud Services | GCP (Storage, Error Reporting, Drive API), Firebase |

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+
- Supabase project with PostgreSQL
- Google Cloud project with OAuth, Storage, Drive, and Picker APIs enabled

### Setup

```bash
git clone https://github.com/juanjaragavi/route-genius.git
cd route-genius
npm install
```

Copy `.env.example` to `.env.local` and configure all 25 environment variables (see [INFRASTRUCTURE.md](INFRASTRUCTURE.md) for reference).

Apply database migrations:

```sql
-- Run in Supabase SQL Editor, in order:
-- scripts/001-create-projects-links-tables.sql
-- scripts/002-add-user-id-enable-rls.sql
-- scripts/003-add-utm-columns-to-click-events.sql
-- scripts/004-drop-name-column-from-links.sql
```

### Development

```bash
npm run dev       # Start dev server on port 3070
npm run lint      # ESLint + Prettier check
npm run format    # Auto-fix formatting
npm run build     # Production build
```

### Test Redirects

```bash
curl -s -o /dev/null -w "%{redirect_url}\n" http://localhost:3070/api/redirect/<link-id>
```

## Project Structure

```
app/
├── actions.ts                  # 18 Server Actions (Projects, Links, Profile)
├── layout.tsx                  # Root layout (GA4, Firebase, UTM components, fonts)
├── page.tsx                    # Landing / redirect to dashboard
├── api/
│   ├── redirect/[linkId]/      # 307 redirect with rotation + UTM propagation + analytics
│   ├── auth/[...all]/          # Better Auth catch-all
│   ├── auth/google-drive/      # Drive OAuth callback
│   ├── analytics/[linkId]/     # Public analytics API
│   └── profile/avatar/         # Avatar upload (GCS)
├── dashboard/
│   ├── analytics/              # Click analytics dashboard (4 charts) — 11 Server Actions
│   ├── projects/[projectId]/   # Project detail + link management
│   ├── settings/               # Profile, backup/restore — 11 Server Actions
│   ├── archive/                # Archived items
│   └── search/                 # Global search
└── login/                      # Google OAuth sign-in

components/
├── LinkEditorForm.tsx          # Core link editor with auto-save + simulation (806 lines)
├── BackupRestoreModule.tsx     # Local CSV + Google Drive backup/restore (1199 lines)
├── DashboardNav.tsx            # Navigation with user avatar
├── SimulationResults.tsx       # Monte Carlo results display
├── AvatarCropModal.tsx         # Image crop for profile pictures
├── RealtimeClickCounter.tsx    # Live click badge (Supabase Realtime)
├── analytics/
│   ├── UtmPersister.tsx        # sessionStorage UTM persistence on route changes
│   └── UtmLinkInjector.tsx     # Click intercept + UTM append for <a> elements
└── charts/                     # 4 Recharts components (line, pie, 2× bar)

lib/
├── mock-data.ts                # 25 Supabase CRUD functions (user_id scoped, 800 lines)
├── rotation.ts                 # ⚠️ UNTOUCHABLE: weighted random algorithm (143 lines)
├── types.ts                    # 6 TypeScript interfaces (134 lines)
├── auth.ts                     # Better Auth configuration
├── csv-backup.ts               # CSV serialization/parsing (RFC 4180, 322 lines)
├── google-drive.ts             # Drive API v3 operations (492 lines)
├── use-google-picker.ts        # Client-side Picker hook (multi-select, 219 lines)
├── slug.ts                     # Crypto-random base62 slug generator (127 lines)
├── utm.ts                      # UTM extraction, propagation, sessionStorage (166 lines)
├── rate-limit.ts               # Supabase PG rate limiting (78 lines)
├── bot-filter.ts               # Bot UA detection (not yet integrated, 34 lines)
├── firebase/                   # Firebase init + Crashlytics
├── gcp/                        # GCP Error Reporting
└── storage/                    # Google Cloud Storage operations

scripts/                        # 4 SQL migration scripts (328 lines total)
```

## Security

- **Double-Lock**: Application-level `user_id` filtering + database RLS policies.
- **Auth**: Google OAuth with domain restriction. Session stored in PostgreSQL.
- **Rate Limiting**: 100 req/10s per IP on redirect endpoint (fails open).
- **Drive Tokens**: HTTP-only cookies, 30-day expiry, `drive.file` scope only.

## Documentation

| Document                               | Contents                                                 |
| -------------------------------------- | -------------------------------------------------------- |
| [CLAUDE.MD](CLAUDE.MD)                 | AI assistant guide, coding standards, security protocols |
| [ARCHITECTURE.md](ARCHITECTURE.md)     | System design, data flow, component architecture         |
| [INFRASTRUCTURE.md](INFRASTRUCTURE.md) | Environment variables, cloud config, deployment          |

## Deployment

| Environment | URL                               | Branch    | Auto-deploy  |
| ----------- | --------------------------------- | --------- | ------------ |
| Production  | `https://route.topnetworks.co`    | `main`    | Yes (Vercel) |
| Staging     | `https://route-genius.vercel.app` | `staging` | Yes (Vercel) |
| Local Dev   | `http://localhost:3070`           | `dev`     | N/A          |

### Git Workflow

All development happens on the `dev` branch. Code promotes linearly via Pull Requests:

```
dev  ──PR──▶  staging  ──PR──▶  main
```

Direct commits to `staging` or `main` are prohibited.

## UI Language

All user-facing text is in **Spanish** (Español). This is intentional.

## License

Proprietary — © Top Networks

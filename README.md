# RouteGenius

## **Intelligent Traffic Distribution Platform**

A multi-tenant SaaS platform for probabilistic traffic routing. Create projects, configure tracking links with weighted rotation rules, and analyze performance with real-time analytics.

> **Live**: [route.topnetworks.co](https://route.topnetworks.co) &nbsp;|&nbsp; **Staging**: [route-genius.vercel.app](https://route-genius.vercel.app)

---

## Features

- **Weighted Traffic Rotation** — Probabilistic URL distribution with configurable weights and Monte Carlo simulation.
- **Projects & Links** — Organize tracking links into projects with tags, descriptions, and archive/restore.
- **Real-Time Analytics** — Live click tracking with 4 chart types: time series, destination pie, country bar, hourly bar.
- **Google OAuth** — Secure authentication restricted to authorized domains (`@topnetworks.co`, `@topfinanzas.com`).
- **Cloud Backup** — Export/import via local CSV or Google Drive with multi-select Picker file browser.
- **Global Search** — Filter links by name, URL, status, project, and date range.
- **Public Analytics API** — Share click stats via JSON endpoint or public analytics page.
- **Rate Limiting** — Sliding window protection (100 req/10s per IP) via Supabase PG function.
- **Error Monitoring** — GCP Error Reporting (server) + Firebase Crashlytics (client).
- **Profile Management** — Avatar upload via Google Cloud Storage with crop modal.

## Tech Stack

| Layer          | Technology                                          |
| -------------- | --------------------------------------------------- |
| Framework      | Next.js 16.1.6 (App Router, Turbopack)              |
| Language       | TypeScript 5.x (Strict Mode)                        |
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
git clone https://github.com/topnetworks/route-genius.git
cd route-genius
npm install
```

Copy `.env.example` to `.env.local` and configure all 25 environment variables (see [INFRASTRUCTURE.md](INFRASTRUCTURE.md) for reference).

Apply database migrations:

```sql
-- Run in Supabase SQL Editor, in order:
-- scripts/001-create-projects-links-tables.sql
-- scripts/002-add-user-id-enable-rls.sql
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
├── layout.tsx                  # Root layout (GA4, Firebase, fonts)
├── page.tsx                    # Landing / redirect to dashboard
├── api/
│   ├── redirect/[linkId]/      # 307 redirect with rotation + analytics
│   ├── auth/[...all]/          # Better Auth catch-all
│   ├── auth/google-drive/      # Drive OAuth callback
│   ├── analytics/[linkId]/     # Public analytics API
│   └── profile/avatar/         # Avatar upload (GCS)
├── dashboard/
│   ├── analytics/              # Click analytics dashboard (4 charts)
│   ├── projects/[projectId]/   # Project detail + link management
│   ├── settings/               # Profile, backup/restore
│   ├── archive/                # Archived items
│   └── search/                 # Global search
└── login/                      # Google OAuth sign-in

components/
├── LinkEditorForm.tsx          # Core link editor with auto-save + simulation
├── BackupRestoreModule.tsx     # Local CSV + Google Drive backup/restore
├── DashboardNav.tsx            # Navigation with user avatar
├── SimulationResults.tsx       # Monte Carlo results display
├── AvatarCropModal.tsx         # Image crop for profile pictures
├── RealtimeClickCounter.tsx    # Live click badge (Supabase Realtime)
└── charts/                     # 4 Recharts components

lib/
├── mock-data.ts                # 26 Supabase CRUD functions (user_id scoped)
├── rotation.ts                 # ⚠️ UNTOUCHABLE: weighted random algorithm
├── types.ts                    # Core TypeScript interfaces
├── auth.ts                     # Better Auth configuration
├── csv-backup.ts               # CSV serialization/parsing (RFC 4180)
├── google-drive.ts             # Drive API v3 operations
├── use-google-picker.ts        # Client-side Picker hook (multi-select)
├── slug.ts                     # Crypto-random base62 slug generator
├── rate-limit.ts               # Supabase PG rate limiting
├── bot-filter.ts               # Bot UA detection (not yet integrated)
├── firebase/                   # Firebase init + Crashlytics
├── gcp/                        # GCP Error Reporting
└── storage/                    # Google Cloud Storage operations
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

| Environment | URL                               | Branch    |
| ----------- | --------------------------------- | --------- |
| Production  | `https://route.topnetworks.co`    | `main`    |
| Staging     | `https://route-genius.vercel.app` | `staging` |
| Local       | `http://localhost:3070`           | any       |

All development on `staging` branch. Only approved PRs merge to `main`.

## UI Language

All user-facing text is in **Spanish** (Español). This is intentional.

## License

Proprietary — © Top Networks

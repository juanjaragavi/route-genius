---
name: RouteGenius Core Agent
description: Expert AI agent for the RouteGenius production codebase. Use this for all development, maintenance, and debugging tasks.
argument-hint: A task or question about RouteGenius (e.g., "implement feature X", "debug redirect latency", "explain auth flow").
---

# RouteGenius Core Agent

> **Mission:** Maintain and evolve RouteGenius, a production-grade, multi-tenant SaaS platform for probabilistic traffic distribution. Ensure strict security, performance, and stability standards are met in every change.

---

## 📚 Source of Truth

Always consult these files before making architectural decisions:

1.  **`CLAUDE.MD`**: Developer guide, coding standards, and security protocols (the "Constitution").
2.  **`ARCHITECTURE.md`**: System design, data flow, component architecture, and security model.
3.  **`INFRASTRUCTURE.md`**: Environment variables, GCP/Supabase/Firebase configuration.
4.  **`README.md`**: Project overview, tech stack, and setup instructions.

---

## 🎯 Core Objectives

1.  **Maintain Production Stability**: Zero regressions in redirect logic (`lib/rotation.ts`) or auth flow.
2.  **Enforce Security**:
    - **Double-Lock**: Always filter by `user_id` in app logic AND rely on RLS in DB.
    - **Authentication**: Use `requireUserId()` in all Server Actions.
    - **Sanitization**: Validate all inputs (Zod planned for Phase 3).
3.  **Preserve UI Language**: 100% Spanish for all user-facing text.
4.  **Optimize Performance**: Redirect latency < 200ms (P95).

---

## 🏗 Technology Stack

- **Framework**: Next.js 16.1.6 (App Router, Turbopack)
- **Language**: TypeScript 5.x (Strict Mode), React 19.2.3
- **Database**: Supabase PostgreSQL 15+ (RLS Enabled, Realtime on `click_events`)
- **Auth**: Better Auth 1.x (Google OAuth, PG adapter via `pg`)
- **Styling**: Tailwind CSS 4.x with `@theme inline` block
- **Charts**: Recharts 3.x (4 chart types)
- **Animations**: Framer Motion 12.x
- **Cloud**: GCP (Storage, Error Reporting, Drive API, Picker API), Firebase (Analytics, Crashlytics)
- **Infrastructure**: Vercel (Edge Functions), Google Cloud Storage (avatars)

---

## 📝 Coding Guidelines

### 1. Data Access & Security

- **Location**: All database queries in `lib/mock-data.ts` (26 exported functions; rename to `lib/db.ts` pending).
- **Pattern**: Functions accept `userId` and filter `.eq('user_id', userId)`.
- **Exception**: `getLinkForRedirect()` — public redirect endpoint, no user_id filter.
- **RLS**: Never bypass RLS unless explicitly authorized for system tasks.

### 2. Server Actions (40 total across 3 files)

- `app/actions.ts` — 18 actions (Projects, Links, Profile, Legacy Migration).
- `app/dashboard/analytics/actions.ts` — 11 actions (Click aggregations, CSV export).
- `app/dashboard/settings/backup-actions.ts` — 11 actions (Local CSV, Google Drive, Picker).

```typescript
export async function myAction() {
  const userId = await requireUserId(); // 🔒 Mandatory
  // ... logic with userId scoping
  revalidatePath("/dashboard");
}
```

### 3. Rotation Algorithm

- **Location**: `lib/rotation.ts` — **DO NOT MODIFY** `selectDestination()` or `buildWeightedDestinations()`.
- **Simulation**: `simulateClicks()` for Monte Carlo validation.

### 4. UI/UX

- **Language**: Spanish (Español) only.
- **Icons**: `lucide-react` exclusively.
- **Brand colors**: `--color-brand-blue`, `--color-brand-cyan`, `--color-brand-lime`.
- **Auto-save**: `useEffect` watching state → 1,500ms debounce → Server Action.

### 5. Google Drive & Picker

- **Drive OAuth**: Separate from auth OAuth. Tokens in `rg_gdrive_tokens` HTTP-only cookie.
- **Picker**: Multi-select enabled (`MULTISELECT_ENABLED`), Shared Drives (`SUPPORT_DRIVES`), CSV filter.
- **Backup folder**: `RouteGenius Backups` (auto-created).

---

## 🛠 Common Workflows

- **New Feature**: `lib/types.ts` → DB Schema (SQL script) → `lib/mock-data.ts` → Server Action → UI component.
- **Debug Redirects**: `app/api/redirect/[linkId]/route.ts` → `lib/rotation.ts` → `lib/rate-limit.ts`.
- **Debug Auth**: `lib/auth.ts` → `lib/auth-session.ts` → `proxy.ts` (NOT `middleware.ts`).
- **Debug Backup**: `app/dashboard/settings/backup-actions.ts` → `lib/google-drive.ts` → `lib/csv-backup.ts`.
- **Debug Analytics**: `app/dashboard/analytics/actions.ts` → Supabase RPCs.

---

## 🚀 Deployment

| Environment | URL                               | Branch    | Auto-deploy  |
| ----------- | --------------------------------- | --------- | ------------ |
| Production  | `https://route.topnetworks.co`    | `main`    | Yes (Vercel) |
| Staging     | `https://route-genius.vercel.app` | `staging` | Yes (Vercel) |
| Local Dev   | `http://localhost:3070`           | `dev`     | N/A          |

**Branch discipline**: All work on `dev`. Promotion: `dev` → `staging` → `main` via PRs. Never commit directly to `staging` or `main`.

```bash
git checkout dev  # Always start here
npm run dev       # Dev on port 3070
npm run lint      # eslint . && prettier --check (NOT next lint)
npm run format    # Auto-fix
npm run build     # Production build
```

---

## ⚠️ Critical Reminders

- `proxy.ts` is the middleware file (Next.js 16), NOT `middleware.ts`.
- `lib/mock-data.ts` wraps real Supabase queries despite its legacy name.
- `prettier` is in `dependencies` (should be `devDependencies` — known debt).
- `components/Header.tsx` is unused dead code (56 lines).
- `lib/bot-filter.ts` exists but is NOT integrated into the redirect endpoint.

> **When in doubt, read `CLAUDE.MD` first.**

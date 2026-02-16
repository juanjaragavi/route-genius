# RouteGenius Application Architecture

**Version**: 2.0.0
**Date**: February 16, 2026
**Status**: Production

## 1. System Overview

RouteGenius is a multi-tenant SaaS platform for probabilistic traffic distribution. It allows users to create projects and tracking links, configure weighted rotation rules, and analyze traffic performance in real-time.

### Key Capabilities

- **Traffic Rotation**: Weighted random distribution algorithm (validated via Monte Carlo simulation).
- **Multi-Tenancy**: Strict data isolation per user account.
- **Real-Time Analytics**: Dashboard with live click tracking and aggregated metrics.
- **Security**: OAuth authentication, Row Level Security (RLS), and secure API endpoints.

## 2. Component Architecture

### Frontend (Next.js App Router)

- **Layouts**: `app/layout.tsx` (Root), `app/dashboard/layout.tsx` (Authenticated Shell).
- **Pages**: Server Components for data fetching, Client Components for interactivity.
- **State Management**: React Server Actions (`app/actions.ts`) for mutations, React `useOptimistic` for UI updates.
- **Styling**: Tailwind CSS 4.0 with Shadcn UI-inspired component library.

### Backend Services

- **API Routes**:
  - `/api/auth/[...all]`: Better Auth endpoints (Google OAuth).
  - `/api/redirect/[linkId]`: High-performance redirect logic (Edge compatible).
  - `/api/analytics/[linkId]/public`: Public JSON API for click counts.
  - `/api/profile/avatar`: multipart/form-data upload handler.
- **Server Actions**: Secure CRUD operations in `app/actions.ts`.
- **Data Access Layer**: `lib/mock-data.ts` wraps Supabase queries with strict type safety and user scoping.

### Database (Supabase PostgreSQL)

- **Projects Table**: Metadata for grouping links.
- **Links Table**: Configuration for rotation rules and destination URLs.
- **Click Events Table**: Time-series log of every redirect event.
- **Rate Limits Table**: Sliding window counters for API protection.

## 3. Data Flow

### Redirect Flow (Public)

1. User visits `t.route-genius.com/[linkId]` (or `/api/redirect/[linkId]`).
2. **Rate Limit Check**: `lib/rate-limit.ts` checks IP against Supabase (100 req/10s).
3. **Link Lookup**: `getLinkForRedirect(linkId)` fetches configuration (bypassing RLS for public access).
4. **Rotation Logic**: `selectDestination(link)` runs probabilistic algorithm (`lib/rotation.ts`).
5. **Analytics**: `logClickEvent()` inserts row into `click_events` (fire-and-forget).
6. **Redirect**: 307 Temporary Redirect to destination.

### Dashboard Flow (Authenticated)

1. **Authentication**: User logs in via Google (Better Auth).
2. **Session**: `getServerSession()` verifies session cookie via PostgreSQL.
3. **Data Fetching**: Server Component calls `getAllProjects(userId)`.
4. **Query Execution**: `lib/mock-data.ts` builds Supabase query filter `.eq('user_id', userId)`.
5. **Action Mutation**: User updates link -> Server Action `saveLinkAction(link)` -> `requireUserId()` -> Database update.

## 4. Security Model

### Authentication

- **Provider**: Better Auth (Google OAuth 2.0).
- **Session Storage**: PostgreSQL database (managed by Better Auth adapters).
- **Domain Restriction**: Only `@topnetworks.co` and `@topfinanzas.com` emails allowed.

### Authorization (RLS)

RouteGenius employs a **defense-in-depth** strategy:

1. **Application Layer**: Every database query in `lib/mock-data.ts` (except public redirect) MUST include `.eq('user_id', userId)`.
2. **Database Layer (RLS)**: Row Level Security is ENABLED on `projects` and `links`.
   - **Policy**: No permissive policies exist (Deny All by default).
   - **Service Role**: Application connects via `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS for authorized operations.
   - **Anon Key**: Blocked from reading/writing any data (prevents client-side data leaks).

### Input Validation

- **Zod Schemas**: Used for API route payload validation.
- **Type Safety**: Full TypeScript strict mode throughout the codebase.

## 5. Deployment

- **Hosting**: Vercel (Production & Staging).
- **Database**: Supabase (Hosted PostgreSQL).
- **Environment Variables**: Managed via Vercel Project Settings.

## 6. Known Limitations

- **Bot Filtering**: Logic exists in `lib/bot-filter.ts` but is not currently enforced on the redirect endpoint.
- **Testing**: Automated test suite (Vitest + Playwright) is planned but not fully implemented.

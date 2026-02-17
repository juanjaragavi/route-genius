# RouteGenius — AI Coding Instructions

## Architecture Overview

RouteGenius is a **multi-tenant SaaS platform** built with Next.js 16 App Router. It splits incoming clicks across multiple destination URLs based on configurable weights, organized into a projects-and-links hierarchy with full authentication and analytics.

**Data Flow:**

```
Dashboard UI → Server Action (app/actions.ts) → File Store (.route-genius-store.json)

Visitor click → /api/redirect/[linkId] → Rate Limit → selectDestination() → 307 Redirect
                                                                              ↓
                                                              Fire-and-forget Supabase insert (click_events)
```

**Key constraint:** Projects & Links use file-based persistence (`.route-genius-store.json`). Click analytics use Supabase. Auth uses PostgreSQL via Better Auth.

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

| Path                                  | Purpose                                                                                                    |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                        | Core interfaces: `Project`, `Link`, `RotationRule`, `ClickEvent`, `SimulationResult`, `LinkSearchCriteria` |
| `lib/rotation.ts`                     | ⚠️ UNTOUCHABLE: `buildWeightedDestinations()`, `selectDestination()`, `simulateClicks()`                   |
| `lib/mock-data.ts`                    | File-based CRUD (504 lines): Projects + Links + search + archive                                           |
| `lib/slug.ts`                         | Crypto-random base62 slug generator                                                                        |
| `lib/bot-filter.ts`                   | Bot user-agent detection (NOT YET INTEGRATED into redirect route)                                          |
| `lib/auth.ts`                         | Better Auth: Google OAuth, PG adapter, domain restriction                                                  |
| `lib/auth-client.ts`                  | Client auth: `signIn`, `signOut`, `useSession`                                                             |
| `lib/auth-session.ts`                 | Server-side `getServerSession()`                                                                           |
| `lib/rate-limit.ts`                   | Supabase PG rate limiting: `checkRateLimit()`                                                              |
| `lib/gcp/error-reporting.ts`          | Server-side `reportError()` via GCP                                                                        |
| `app/actions.ts`                      | 20 Server Actions for Projects + Links CRUD                                                                |
| `app/dashboard/analytics/actions.ts`  | 10 analytics Server Actions querying Supabase                                                              |
| `app/api/redirect/[linkId]/route.ts`  | Redirect endpoint: rate limiting + selection + click tracking                                              |
| `components/LinkEditorForm.tsx`       | Core form (775 lines): auto-save (1,500ms debounce), rotation rules, simulation                            |
| `components/DashboardNav.tsx`         | Authenticated navigation with user avatar + sign-out                                                       |
| `components/charts/*.tsx`             | 4 Recharts components: line, pie, bar (country), bar (hourly)                                              |
| `components/RealtimeClickCounter.tsx` | Supabase Realtime click badge                                                                              |
| `proxy.ts`                            | Next.js 16 route protection middleware                                                                     |

## Conventions

### TypeScript Patterns

- All types in `lib/types.ts` — import with `import type { Link } from "@/lib/types"`
- Server Actions return `{ success: true, data } | { success: false, error: string }`
- Use `crypto.randomUUID()` for IDs

### UI/Styling

- **Spanish UI** — All user-facing text is in Spanish (this is intentional)
- **Brand colors** via CSS variables: `--color-brand-blue`, `--color-brand-cyan`, `--color-brand-lime`
- Tailwind CSS 4.x with `@theme inline` block in `globals.css`
- Icons from `lucide-react` exclusively

### State Management

- Auto-save pattern: `useEffect` watching state → debounce (1,500ms) → call Server Action
- Use `startTransition` when calling `setState` inside `useEffect` (React Compiler requirement)

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

**Reset local state:**

```bash
rm .route-genius-store.json  # Reverts to empty store on next request
```

## Common Gotchas

1. **Module isolation** — In-memory Maps don't work across Server Actions and API Routes. Use file-based storage.
2. **Hydration errors** — Don't use `window.location` directly; initialize with `useState("")` + `useEffect`.
3. **Next.js 16** — `next lint` was removed; use `eslint .` directly. Middleware renamed to `proxy.ts`.
4. **Weight math** — Secondary weights sum to ≤100; remainder goes to main URL automatically.
5. **Branch discipline** — All work on `dev`. Promotion: `dev` → `staging` → `main` via PRs. Never commit directly to `staging` or `main`.
6. **Dual storage** — Projects/Links in file store, click analytics in Supabase. They share link IDs but are in separate backends.
7. **Auth cookie prefix** — HTTPS environments use `__Secure-` cookie prefix; HTTP (localhost) doesn't.

## Phase 2 Features (Completed)

| Feature                              | Status                    |
| ------------------------------------ | ------------------------- |
| Projects system (virtual folders)    | ✅ Complete               |
| Google OAuth authentication          | ✅ Complete               |
| Click analytics dashboard (4 charts) | ✅ Complete               |
| Realtime click counter               | ✅ Complete               |
| Public analytics page + API          | ✅ Complete               |
| Archive/restore system               | ✅ Complete               |
| Global search with filters           | ✅ Complete               |
| Profile settings + avatar upload     | ✅ Complete               |
| Bot detection utility                | ✅ Built (not integrated) |
| Crypto-random slug generator         | ✅ Complete               |
| CSV export for click events          | ✅ Complete               |
| Rate limiting (Supabase PG)          | ✅ Complete               |
| Error boundary + loading skeleton    | ✅ Complete               |

## Known Technical Debt

1. **No automated tests** — Zero test coverage
2. **No URL validation** — Open redirect vulnerability
3. **Bot filter not integrated** — `isBot()` exists but not called
4. **`components/Header.tsx` unused** — Legacy Phase 1 dead code
5. **`prettier` misplaced** — In `dependencies` instead of `devDependencies`
6. **No CSRF protection** on Server Actions

## Phase 3 Roadmap

- Migrate Projects & Links CRUD from file store to Supabase PostgreSQL
- Add URL validation (Zod schemas) for all destinations
- Integrate bot filtering into redirect endpoint
- Add automated testing (Vitest + Playwright)
- Implement multi-workspace support
- Add link expiration & scheduling
- Set up CI/CD pipeline (GitHub Actions)

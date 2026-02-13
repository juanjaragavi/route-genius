# RouteGenius — AI Assistant Guide

This document provides context and guidelines for AI assistants working on the RouteGenius codebase.

## Project Overview

RouteGenius is a **Phase 1 MVP** for probabilistic traffic distribution across multiple destination URLs. It enables weighted random redirection similar to Linkly's "Rotate Traffic" feature.

**Company:** TopNetworks, Inc. (Proprietary)
**Status:** Phase 1 — File-based MVP with planned database migration in Phase 2
**Primary User Base:** Spanish-speaking users

## Core Functionality

1. **Probabilistic URL Rotation** — Weighted random selection across multiple destinations
2. **Non-Sticky Distribution** — Each click is independent (no cookies/sessions)
3. **Real-Time Simulation** — Test with 1,000 Monte Carlo simulated clicks
4. **Auto-Save** — Debounced configuration persistence with visual feedback
5. **Spanish UI** — Fully localized interface

## Tech Stack

| Layer           | Technology                                                      |
| --------------- | --------------------------------------------------------------- |
| Framework       | Next.js 16.1.6 (App Router)                                     |
| Language        | TypeScript 5.x                                                  |
| Styling         | Tailwind CSS 4.x                                                |
| Icons           | Lucide React                                                    |
| Font            | Poppins (next/font)                                             |
| Storage         | File-based JSON (Phase 1) — Supabase PostgreSQL planned         |
| Analytics       | Google Analytics 4 via `@next/third-parties`                    |
| Error Reporting | Firebase Analytics (`firebase` SDK, web Crashlytics equivalent) |
| File Storage    | Google Cloud Storage (`@google-cloud/storage`)                  |
| Port            | 3070                                                            |

## Architecture

### Directory Structure

```markdown
route-genius/
├── app/
│ ├── api/redirect/[linkId]/route.ts # Main redirect endpoint (307)
│ ├── actions.ts # Server Actions for data persistence
│ ├── globals.css # Global styles + brand tokens
│ ├── layout.tsx # Root layout with Poppins font + GA4
│ └── page.tsx # Main link editor page
├── components/
│ ├── Header.tsx # App header component
│ ├── LinkEditorForm.tsx # Main configuration form
│ └── SimulationResults.tsx # Monte Carlo simulation display
├── credentials/ # Service account keys (gitignored)
│ └── gcs-service-account.json # GCS service account JSON key
├── lib/
│ ├── types.ts # Core TypeScript interfaces
│ ├── rotation.ts # Probabilistic algorithm
│ ├── mock-data.ts # File-based storage adapter
│ ├── firebase/
│ │ ├── config.ts # Firebase app singleton initialization
│ │ └── crashlytics.ts # Client-side error logging (Analytics)
│ └── storage/
│ └── gcs.ts # Server-side GCS utility
└── .route-genius-store.json # Data store (gitignored)
```

### Key Files

- **`lib/types.ts`** — Core type definitions (`Link`, `RotationRule`, `ClickEvent`, `SimulationResult`)
- **`lib/rotation.ts`** — Weighted random selection algorithm with cumulative distribution
- **`lib/mock-data.ts`** — File I/O adapter for JSON storage (will be replaced with Supabase in Phase 2)
- **`app/api/redirect/[linkId]/route.ts`** — HTTP redirect endpoint (307 Temporary Redirect)
- **`app/actions.ts`** — Server Actions (`getLinkAction`, `updateLinkAction`)
- **`lib/firebase/config.ts`** — Firebase app singleton (`getFirebaseApp()`) with graceful fallback
- **`lib/firebase/crashlytics.ts`** — Client-side error logging via Firebase Analytics; exports `logError()` and `logCustomEvent()`
- **`lib/storage/gcs.ts`** — Server-side GCS utility; exports `uploadFile()`, `getSignedUrl()`, `deleteFile()`
- **`app/layout.tsx`** — Root layout; now conditionally renders `<GoogleAnalytics>` when `NEXT_PUBLIC_GA_MEASUREMENT_ID` is set

## Data Model

### Link Interface

```typescript
interface Link {
  id: string; // UUID
  workspace_id: string; // Workspace scope
  main_destination_url: string; // Fallback/primary URL
  nickname: string; // Internal label
  status: "enabled" | "disabled" | "expired";
  rotation_enabled: boolean; // Toggle for rotation
  rotation_rules: RotationRule[]; // Secondary destinations
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
```

### RotationRule Interface

```typescript
interface RotationRule {
  id: string; // UUID
  destination_url: string; // Full redirect URL
  weight_percentage: number; // 1-100 (integer)
  order_index: number; // Display order
}
```

## Code Style & Conventions

### TypeScript

- **Strict mode enabled** — All types must be explicit
- **No `any` types** — Use proper interfaces or generics
- **Server Actions** — Use `"use server"` directive for data mutations
- **Async/await** — Preferred over promise chaining

### React/Next.js

- **Server Components by default** — Only use `"use client"` when needed
- **App Router patterns** — No Pages Router syntax
- **Server Actions** — For mutations (in `app/actions.ts`)
- **Route Handlers** — For API endpoints (in `app/api/`)

### Naming Conventions

- **Files:** kebab-case (`link-editor-form.tsx`)
- **Components:** PascalCase (`LinkEditorForm`)
- **Functions:** camelCase (`getLinkAction`)
- **Constants:** UPPER_SNAKE_CASE (`MAX_WEIGHT`)
- **Interfaces:** PascalCase (`RotationRule`)

### CSS/Tailwind

- **Tailwind 4.x syntax** — Use native CSS variables
- **Brand tokens** — Defined in `app/globals.css`
  - Primary: `#2563eb` (Blue)
  - Secondary: `#0891b2` (Cyan)
  - Success: `#84cc16` (Lime)
- **Mobile-first** — Responsive design with `sm:`, `md:`, `lg:` breakpoints
- **Dark mode** — Not currently implemented (Phase 2 consideration)

### Comments

- **Docstrings** — Use TSDoc for public functions
- **Inline comments** — Only for non-obvious logic (especially in `rotation.ts`)
- **Spanish UI strings** — Keep all user-facing text in Spanish

## Critical Business Logic

### Probabilistic Rotation Algorithm (`lib/rotation.ts`)

**DO NOT modify this algorithm without understanding the mathematics.**

```typescript
// Weighted random selection with cumulative distribution
const destinations = buildWeightedDestinations(link);
const random = Math.random() * 100;
let cumulative = 0;

for (const dest of destinations) {
  cumulative += dest.weight;
  if (random <= cumulative) return dest.url;
}
```

**Key points:**

1. Main destination receives **residual weight** (100 - sum of rotation rules)
2. Each rule has an **integer weight** between 1-100
3. Rules are processed in `order_index` sequence
4. **Non-sticky** — Each click is independent (no cookies/localStorage)

### Simulation Logic

1. Runs 1,000 iterations of the rotation algorithm
2. Counts actual hits per destination
3. Calculates deviation from configured weights
4. Displays results in real-time

**DO NOT change the 1,000 iteration count** — This is a product requirement.

## API Reference

### GET `/api/redirect/[linkId]`

**Purpose:** Performs a 307 Temporary Redirect to a probabilistically selected destination.

**Response Codes:**

- `307` — Redirect to selected destination
- `404` — Link not found
- `410` — Link is disabled or expired

**Headers:**

- `Location` — Selected destination URL

**Example:**

```bash
curl -I http://localhost:3070/api/redirect/demo-link-001
# HTTP/1.1 307 Temporary Redirect
# Location: https://google.com/
```

## Development Guidelines

### Before Making Changes

1. **Read the affected files** — Never modify code you haven't read
2. **Check types** — Ensure TypeScript interfaces are up to date
3. **Test the redirect** — Use `curl -I` to verify behavior
4. **Run simulation** — Verify weight distribution is correct
5. **Check Spanish UI** — All user-facing text must remain in Spanish

### Testing Checklist

```bash
# 1. Type check
npm run lint

# 2. Format check
npm run format:check

# 3. Build check
npm run build

# 4. Manual testing
npm run dev
# Visit http://localhost:3070
# Test simulation
# Test redirect endpoint
```

### Git Workflow

- **Branch naming:** `feature/description`, `fix/bug-description`
- **Commit messages:** Conventional commits (e.g., `feat:`, `fix:`, `docs:`)
- **No force push to main** — Always use pull requests

## Common Tasks

### Adding a New Destination Rule

1. Update `rotation_rules` array in the `Link` object
2. Ensure `weight_percentage` is an integer 1-100
3. Set `order_index` for display order
4. Call `updateLinkAction()` to persist changes

### Modifying the Rotation Algorithm

⚠️ **CRITICAL:** This is core business logic. Changes require:

1. Mathematical proof of correctness
2. Simulation verification (should still pass with 1,000 iterations)
3. Product owner approval

### Changing UI Text

✅ **Remember:** All user-facing text must be in Spanish

- Button labels: `"Guardar"` not `"Save"`
- Error messages: `"Error al cargar"` not `"Failed to load"`
- Form labels: `"URL Principal"` not `"Main URL"`

## Phase 2 Infrastructure (Configured)

All external GCP services are provisioned inside the **TopFinanzas** project (`absolute-brook-452020-d5`).

| Service              | Status   | Details                                                                  |
| -------------------- | -------- | ------------------------------------------------------------------------ |
| Google OAuth 2.0     | Live     | Client ID configured; redirect URIs for `localhost:3070`                 |
| Better Auth          | Live     | Secret generated; URL set to `http://localhost:3070`                     |
| Google Analytics 4   | Live     | Measurement ID `G-72CP3PVkR3`; `<GoogleAnalytics>` component in layout   |
| Firebase             | Live     | Linked to TopFinanzas GCP project; Analytics enabled                     |
| Google Cloud Storage | Live     | Bucket `routegenius-media-development`; service account provisioned      |
| Supabase             | Live     | URL `https://owestahxdthunutdttye.supabase.co`; anon + service role keys |
| Upstash Redis        | Deferred | Placeholder in `.env.local`; configured in Phase 2E                      |
| Sentry               | Deferred | Placeholder in `.env.local`; configured in Phase 2E                      |

### Environment Variables

See `.env.example` for the full 21-variable template covering Supabase, Better Auth, OAuth, GA4, Firebase, GCS, Upstash, and Sentry.

**18 of 21 variables are live.** Remaining 3 (Upstash Redis, Sentry) are deferred to Phase 2E.

## Phase 2 Migration Plan

### Planned Changes

- Replace `lib/mock-data.ts` with Supabase client
- Add user authentication (Better Auth)
- Implement click analytics dashboard
- Add link expiration & scheduling
- A/B test reporting

### Files That Will Change

- `lib/mock-data.ts` → `lib/database.ts` (Supabase client)
- `app/actions.ts` → Will use Supabase queries instead of file I/O
- `.route-genius-store.json` → Will be removed

### Files Already Changed (Phase 2 Prep)

- `app/layout.tsx` — Now includes conditional `<GoogleAnalytics>` component
- `.env.local` / `.env.example` — Updated with full Phase 2 variable set
- `.gitignore` — Added `/credentials/`, `google-services.json`, `GoogleService-Info.plist`

### Files That Should NOT Change

- `lib/rotation.ts` — Core algorithm remains the same
- `lib/types.ts` — Interfaces will extend, not replace
- `app/api/redirect/[linkId]/route.ts` — Redirect logic unchanged

## Troubleshooting

### "Link not found" (404)

- Check `.route-genius-store.json` exists
- Verify `linkId` matches a key in the JSON file
- Ensure file permissions are correct

### Weights don't add up to 100%

- This is **expected behavior**
- Main destination receives residual weight
- Example: If rules = [30%, 40%], main gets 30%

### Simulation results don't match configured weights

- **This is normal** — Monte Carlo simulation has variance
- 1,000 iterations should be within ±3% of configured weights
- Check that all weights sum to ≤100

### Auto-save not working

- Check browser console for errors
- Verify Server Action is not throwing
- Ensure `.route-genius-store.json` is writable

## Security Considerations

### Phase 1 (Current)

- **No authentication** — Single user, local file system
- **No validation** — URLs are not checked (assumes trusted input)
- **No rate limiting** — Open redirect endpoint

### Phase 2 (Planned)

- Implement Supabase RLS (Row Level Security)
- Add URL validation and sanitization
- Implement rate limiting on redirect endpoint
- Add CSRF protection for Server Actions

## Performance Notes

- **File I/O is synchronous** — Acceptable for Phase 1 MVP
- **No caching** — Each redirect reads from disk (will use Redis in Phase 2)
- **No CDN** — Static assets served from Next.js (will use Vercel in Phase 2)
- **Port 3070** — Configured to avoid conflicts with other dev servers

## Useful Commands

```bash
# Start development server
npm run dev

# Production build
npm run build
npm run start

# Code quality
npm run lint
npm run format

# Test redirect (replace link ID)
curl -I http://localhost:3070/api/redirect/demo-link-001

# Check current data
cat .route-genius-store.json | jq .
```

## Contact & Resources

- **Repository:** <https://github.com/juanjaragavi/route-genius>
- **Company:** TopNetworks, Inc.
- **License:** Proprietary (see README.md)

---

**Last Updated:** 2026-02-13
**Phase:** 1 (MVP) — Phase 2 infrastructure configured
**Next Review:** Phase 2A implementation

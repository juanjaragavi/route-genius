# RouteGenius — AI Coding Instructions

## Architecture Overview

RouteGenius is a **probabilistic traffic rotation MVP** built with Next.js 16 App Router. It splits incoming clicks across multiple destination URLs based on configurable weights.

**Data Flow:**

```
Client (LinkEditorForm) → Server Action (saveLinkAction) → File Store (.route-genius-store.json)
                                                                    ↓
Visitor click → API Route (/api/redirect/[linkId]) → Rotation Algorithm → 307 Redirect
```

**Key constraint:** Phase 1 uses file-based persistence (`.route-genius-store.json`) since there's no database. Server Actions and API Routes share state via this file.

## Rotation Algorithm

The probabilistic selection uses **weighted random sampling with cumulative distribution**:

```typescript
// lib/rotation.ts — selectDestination()
function selectDestination(link: Link): string {
  const destinations = buildWeightedDestinations(link);
  const random = Math.random() * 100; // 0-100 range
  let cumulative = 0;

  for (const dest of destinations) {
    cumulative += dest.weight;
    if (random <= cumulative) {
      return dest.url;
    }
  }
  return link.main_destination_url; // Fallback
}
```

**Weight calculation:**

- Secondary rules define explicit weights (e.g., 30%, 30%)
- Main URL receives **residual weight**: `100 - sum(secondary_weights)`
- Example: 30% + 30% secondaries → Main gets 40%

**Properties:**

- **Non-sticky**: Each request is independent (no cookies/sessions)
- **Uniform distribution**: Uses `Math.random()` for unbiased selection
- **Convergence**: With sufficient traffic, actual distribution matches configured weights

## Project Structure

| Path                                 | Purpose                                                                                           |
| ------------------------------------ | ------------------------------------------------------------------------------------------------- |
| `lib/types.ts`                       | Core interfaces: `Link`, `RotationRule`, `ClickEvent`, `SimulationResult`                         |
| `lib/rotation.ts`                    | Probabilistic algorithm: `buildWeightedDestinations()`, `selectDestination()`, `simulateClicks()` |
| `lib/mock-data.ts`                   | File-based CRUD: `getLink()`, `saveLink()` — reads/writes `.route-genius-store.json`              |
| `app/actions.ts`                     | Server Action `saveLinkAction()` for persisting client edits                                      |
| `app/api/redirect/[linkId]/route.ts` | Redirect endpoint using `selectDestination()`                                                     |
| `components/LinkEditorForm.tsx`      | Main form with auto-save (500ms debounce)                                                         |

## Conventions

### TypeScript Patterns

- All types in `lib/types.ts` — import with `import type { Link } from "@/lib/types"`
- Server Actions return `{ success: true, data } | { success: false, error: string }`
- Use `crypto.randomUUID()` for IDs (not uuid package in most cases)

### UI/Styling

- **Spanish UI** — All user-facing text is in Spanish (this is intentional)
- **Brand colors** via CSS variables: `--color-brand-blue`, `--color-brand-cyan`, `--color-brand-lime`
- Tailwind CSS 4.x with `@theme inline` block in `globals.css`
- Icons from `lucide-react` exclusively

### State Management

- Auto-save pattern: `useEffect` watching state → debounce → call Server Action
- Use `startTransition` when calling `setState` inside `useEffect` (React Compiler requirement)

## Developer Workflows

```bash
npm run dev      # Dev server on port 3070
npm run lint     # ESLint + Prettier check (uses eslint directly, NOT next lint)
npm run format   # Auto-fix formatting
npm run build    # Production build
```

**Testing redirects:**

```bash
curl -s -o /dev/null -w "%{redirect_url}\n" http://localhost:3070/api/redirect/demo-link-001
```

**Reset local state:**

```bash
rm .route-genius-store.json  # Reverts to sampleLink defaults on next request
```

## Common Gotchas

1. **Module isolation** — In-memory Maps don't work across Server Actions and API Routes. Use file-based storage.
2. **Hydration errors** — Don't use `window.location` directly; initialize with `useState("")` + `useEffect`.
3. **Next.js 16** — `next lint` command was removed; use `eslint .` directly.
4. **Weight math** — Secondary weights sum to ≤100; remainder goes to main URL automatically.

## Testing & CI/CD (To Be Built)

### Recommended Test Structure

```
__tests__/
├── lib/
│   ├── rotation.test.ts      # Unit tests for algorithm
│   └── mock-data.test.ts     # File store operations
├── api/
│   └── redirect.test.ts      # Integration tests for API route
└── components/
    └── LinkEditorForm.test.tsx  # Component tests
```

### Priority Tests to Implement

1. **`rotation.test.ts`** — Verify weight distribution converges (run 10,000 iterations)
2. **`redirect.test.ts`** — Test 404/410 responses, valid redirects, header injection
3. **`saveLinkAction.test.ts`** — Validate input sanitization, weight overflow rejection

### CI Pipeline Suggestion (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20 }
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      # - run: npm test  # Enable when tests exist
```

## Phase 2 Migration Guide

### Database: Replace File Store with Supabase

**1. Install dependencies:**

```bash
npm install @supabase/supabase-js
```

**2. Create `lib/supabase.ts`:**

```typescript
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);
```

**3. Database schema (SQL):**

```sql
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id TEXT NOT NULL,
  main_destination_url TEXT NOT NULL,
  nickname TEXT,
  status TEXT DEFAULT 'enabled',
  rotation_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rotation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES links(id) ON DELETE CASCADE,
  destination_url TEXT NOT NULL,
  weight_percentage INTEGER CHECK (weight_percentage BETWEEN 0 AND 100),
  order_index INTEGER DEFAULT 0
);

CREATE TABLE click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID REFERENCES links(id),
  resolved_destination_url TEXT NOT NULL,
  user_agent TEXT,
  went_to_main BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

**4. Replace `lib/mock-data.ts` functions:**

```typescript
// getLink() replacement
export async function getLink(id: string): Promise<Link | null> {
  const { data, error } = await supabase
    .from("links")
    .select("*, rotation_rules(*)")
    .eq("id", id)
    .single();
  return error ? null : data;
}

// saveLink() replacement
export async function saveLink(link: Link): Promise<void> {
  await supabase.from("links").upsert(link);
  // Handle rotation_rules separately with delete + insert
}
```

### Authentication: Better Auth Integration

**1. Install:**

```bash
npm install better-auth
```

**2. Create `lib/auth.ts`:**

```typescript
import { betterAuth } from "better-auth";
import { supabaseAdapter } from "better-auth/adapters/supabase";

export const auth = betterAuth({
  database: supabaseAdapter(supabase),
  emailAndPassword: { enabled: true },
});
```

**3. Protect routes:** Add middleware to check `auth.session()` before allowing link edits.

### Click Analytics Dashboard

Store `ClickEvent` in database (see schema above), then create:

- `app/analytics/page.tsx` — Dashboard with charts
- `app/api/analytics/[linkId]/route.ts` — Aggregation queries
- Use Recharts or Chart.js for visualization

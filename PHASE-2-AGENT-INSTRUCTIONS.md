# RouteGenius Phase 2 — Advanced AI Coding Agent System Prompt

> **Mission:** Transform RouteGenius from a file-based MVP into a production-grade, multi-tenant SaaS platform with full authentication, database persistence, analytics, and enterprise features.

---

## 🎯 Phase 2 Objectives

### Core Deliverables

1. **Database Migration** — Supabase/PostgreSQL with RLS (Row Level Security)
2. **User Authentication** — Better Auth with email/password + OAuth providers
3. **Multi-Workspace Support** — Organizations with team management
4. **Click Analytics Dashboard** — Real-time metrics, charts, A/B test reporting
5. **Link Management** — CRUD operations, expiration, scheduling, custom slugs
6. **API Rate Limiting** — Protect redirect endpoint from abuse
7. **Production Deployment** — Vercel deployment with environment configs

### Success Criteria

- ✅ All Phase 1 functionality preserved (zero regression)
- ✅ Core rotation algorithm **UNCHANGED** (`lib/rotation.ts` remains identical)
- ✅ 100% Spanish UI maintained
- ✅ Sub-200ms P95 redirect latency
- ✅ Support 10,000+ concurrent users
- ✅ RLS ensures workspace isolation (no cross-tenant data leaks)
- ✅ Comprehensive test coverage (>80% for critical paths)

---

## 📚 Codebase Audit Summary

### Phase 1 Architecture (Current State)

#### Technology Stack

```yaml
Framework: Next.js 16.1.6 (App Router, Turbopack)
Language: TypeScript 5.x (strict mode)
Styling: Tailwind CSS 4.x
Icons: Lucide React
Font: Poppins (next/font)
Storage: File-based JSON (.route-genius-store.json)
Analytics: Google Analytics 4 (@next/third-parties)
Error Reporting: Firebase Analytics (firebase SDK)
File Storage: Google Cloud Storage (@google-cloud/storage)
Port: 3070
```

#### Directory Structure

```markdown
route-genius/
├── app/
│ ├── api/redirect/[linkId]/route.ts # Redirect endpoint (307)
│ ├── actions.ts # Server Actions
│ ├── globals.css # Brand tokens + utilities
│ ├── layout.tsx # Root layout + metadata + GA4
│ └── page.tsx # Main editor page
├── components/
│ ├── Header.tsx # TopNetworks branding
│ ├── LinkEditorForm.tsx # Configuration form (auto-save)
│ └── SimulationResults.tsx # Monte Carlo simulation display
├── credentials/ # Service account keys (gitignored)
│ └── gcs-service-account.json # GCS service account JSON key
├── lib/
│ ├── types.ts # Core interfaces
│ ├── rotation.ts # ⚠️ CRITICAL: Probabilistic algorithm
│ ├── mock-data.ts # File I/O adapter (WILL BE REPLACED)
│ ├── firebase/
│ │ ├── config.ts # Firebase app singleton initialization
│ │ └── crashlytics.ts # Client-side error logging (Analytics)
│ └── storage/
│ └── gcs.ts # Server-side GCS utility
└── .route-genius-store.json # Local data store (gitignored)
```

> **Note:** All GCP services are provisioned inside the **TopFinanzas** project (`absolute-brook-452020-d5`), not a separate project.

#### Critical Files Analysis

**`lib/types.ts`** — Data Model

```typescript
interface Link {
  id: string; // UUID
  workspace_id: string; // Workspace scope
  main_destination_url: string; // Fallback URL
  nickname: string; // Display name
  status: "enabled" | "disabled" | "expired";
  rotation_enabled: boolean;
  rotation_rules: RotationRule[];
  created_at: string; // ISO timestamp
  updated_at: string;
}

interface RotationRule {
  id: string; // UUID
  destination_url: string;
  weight_percentage: number; // 1-100 (integer)
  order_index: number; // Display order
}

interface ClickEvent {
  timestamp: string;
  link_id: string;
  resolved_destination_url: string;
  user_agent: string;
  went_to_main: boolean;
}

interface SimulationResult {
  url: string;
  label: string;
  configured_weight: number;
  actual_hits: number;
  actual_percentage: number;
  is_main: boolean;
}
```

**`lib/rotation.ts`** — ⚠️ **UNTOUCHABLE ALGORITHM**

```typescript
// Weighted random selection with cumulative distribution
export function selectDestination(link: Link): string {
  if (!link.rotation_enabled || link.rotation_rules.length === 0) {
    return link.main_destination_url;
  }

  const destinations = buildWeightedDestinations(link);
  const totalWeight = destinations.reduce((sum, d) => sum + d.weight, 0);

  if (totalWeight === 0) {
    return link.main_destination_url;
  }

  const r = Math.random(); // [0, 1)
  let cumulative = 0;

  for (const dest of destinations) {
    cumulative += dest.weight / totalWeight;
    if (r < cumulative) {
      return dest.url;
    }
  }

  return link.main_destination_url; // Fallback
}
```

**Key Properties:**

- Non-sticky: Each request is independent (no cookies/sessions)
- Residual probability: Main URL gets `100 - sum(secondary_weights)`
- Convergence: With sufficient traffic, actual distribution matches configured weights
- **DO NOT MODIFY THIS ALGORITHM** — It's mathematically proven and tested

**`lib/mock-data.ts`** — File-Based Storage (TO BE REPLACED)

```typescript
// Current implementation uses fs.readFileSync/writeFileSync
// Phase 2: Replace with Supabase queries
export function getLink(id: string): Link | undefined {
  /* ... */
}
export function saveLink(link: Link): void {
  /* ... */
}
export function getAllLinks(): Link[] {
  /* ... */
}
```

**`app/actions.ts`** — Server Actions

```typescript
"use server";
export async function saveLinkAction(
  link: Link,
): Promise<{ success: true; link: Link } | { success: false; error: string }> {
  // Validates: required fields, weight total ≤100
  // Phase 2: Add RLS checks, workspace ownership validation
}
```

**`app/api/redirect/[linkId]/route.ts`** — Redirect Endpoint

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;
  const link = getLink(linkId); // Phase 2: Database query

  if (!link)
    return NextResponse.json({ error: "Link not found" }, { status: 404 });
  if (link.status !== "enabled")
    return NextResponse.json({ error: "Link is not active" }, { status: 410 });

  const destination = selectDestination(link); // ⚠️ Keep this

  // Phase 1: console.log click event
  // Phase 2: Insert into click_events table
  console.log("[RouteGenius] Click Event:", {
    timestamp,
    link_id,
    destination,
  });

  return NextResponse.redirect(destination, 307); // Temporary redirect (non-sticky)
}
```

**`components/LinkEditorForm.tsx`** — Main UI Component

```typescript
// Features:
// - Auto-save with 500ms debounce
// - Real-time weight calculation (100 - sum(secondary))
// - Weight overflow validation
// - Uniform distribution helper
// - Monte Carlo simulation (1,000 iterations)
// - Copy tracking URL to clipboard
// - Collapsible advanced settings

// Phase 2 enhancements:
// - Multi-link list view
// - Link duplication
// - Bulk operations
// - Custom slug editor
// - Expiration date picker
// - Schedule publish/unpublish
```

**`app/globals.css`** — Brand Tokens

```css
@theme inline {
  --color-brand-blue: #2563eb; /* Primary actions */
  --color-brand-cyan: #0891b2; /* Secondary accents */
  --color-brand-lime: #84cc16; /* Success states */
}

.text-brand-gradient {
  background: linear-gradient(to right, #2563eb, #0891b2, #84cc16);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

### Current State Observations

#### Strengths

✅ Clean, modular architecture with clear separation of concerns
✅ Type-safe TypeScript throughout (strict mode)
✅ Well-documented code with TSDoc comments
✅ Proven rotation algorithm (mathematically sound)
✅ Auto-save UX pattern (debounced persistence)
✅ Responsive UI with Tailwind 4.x
✅ Spanish localization 100% complete
✅ Monte Carlo simulation for testing

#### Technical Debt (Phase 1 Limitations)

⚠️ File-based storage (doesn't scale, no concurrency safety)
⚠️ No authentication (single-user assumption)
⚠️ No click tracking database (console.log only)
⚠️ No rate limiting (open redirect endpoint)
⚠️ No URL validation (XSS/open redirect vulnerability)
⚠️ No error boundaries (React error handling)
⚠️ No test coverage (zero tests)
⚠️ Hard-coded workspace ID (`ws_topnetworks_default`)

#### Security Vulnerabilities

🔴 **CRITICAL:** Open redirect vulnerability (no URL whitelist/validation)
🔴 **HIGH:** No CSRF protection on Server Actions
🔴 **HIGH:** No rate limiting (DDoS risk)
🟡 **MEDIUM:** No input sanitization on URLs
🟡 **MEDIUM:** Click events contain user-agent (PII concern)

---

## 🏗️ Phase 2 Architecture Design

### Technology Stack Additions

```yaml
Database: Supabase (PostgreSQL 15+ with PostGIS)
Auth: Better Auth 1.x (email/password + OAuth)
Analytics: Supabase Realtime + SQL aggregations
Rate Limiting: Upstash Redis + @upstash/ratelimit
Validation: Zod 3.x for schema validation
Testing: Vitest + Testing Library + Playwright
Monitoring: Vercel Analytics + Sentry
Deployment: Vercel (Edge Functions for redirect)
```

> **Infrastructure Status:** Environment configuration is complete. 18 of 21 env vars are live. GA4, Firebase, GCS, Supabase, Better Auth, and Google OAuth are all provisioned and configured. See `PHASE-2-ENV-CONFIG-REPORT.md` for details.

### Database Schema (PostgreSQL)

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workspaces (organizations)
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL CHECK (slug ~ '^[a-z0-9-]+$'),
  owner_user_id UUID NOT NULL, -- Foreign key to auth.users
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro', 'enterprise')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT workspace_name_length CHECK (char_length(name) BETWEEN 1 AND 100),
  CONSTRAINT workspace_slug_length CHECK (char_length(slug) BETWEEN 3 AND 50)
);

-- Workspace members (many-to-many with roles)
CREATE TABLE workspace_members (
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- Foreign key to auth.users
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Links
CREATE TABLE links (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  slug TEXT, -- Custom short code (NULL = use id)
  main_destination_url TEXT NOT NULL CHECK (main_destination_url ~ '^https?://'),
  nickname TEXT,
  status TEXT DEFAULT 'enabled' CHECK (status IN ('enabled', 'disabled', 'expired', 'scheduled')),
  rotation_enabled BOOLEAN DEFAULT true,
  expires_at TIMESTAMPTZ, -- NULL = never expires
  published_at TIMESTAMPTZ, -- Scheduled publish time
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID, -- Foreign key to auth.users

  -- Constraints
  CONSTRAINT link_nickname_length CHECK (char_length(nickname) <= 200),
  CONSTRAINT link_slug_format CHECK (slug IS NULL OR slug ~ '^[a-zA-Z0-9-_]+$'),
  CONSTRAINT link_slug_length CHECK (slug IS NULL OR char_length(slug) BETWEEN 3 AND 50),
  UNIQUE (workspace_id, slug) -- Unique within workspace
);

-- Create index for fast slug lookups
CREATE INDEX idx_links_slug ON links(slug) WHERE slug IS NOT NULL;
CREATE INDEX idx_links_workspace_status ON links(workspace_id, status);

-- Rotation rules
CREATE TABLE rotation_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  destination_url TEXT NOT NULL CHECK (destination_url ~ '^https?://'),
  weight_percentage INTEGER NOT NULL CHECK (weight_percentage BETWEEN 1 AND 100),
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_rotation_rules_link ON rotation_rules(link_id);

-- Click events (time-series optimized)
CREATE TABLE click_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  link_id UUID NOT NULL REFERENCES links(id) ON DELETE CASCADE,
  resolved_destination_url TEXT NOT NULL,
  user_agent TEXT,
  ip_address INET, -- For rate limiting + geo analytics
  country_code TEXT, -- Extracted from IP (optional)
  referer TEXT, -- HTTP Referer header
  went_to_main BOOLEAN,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Partition hint: This table will grow large, consider partitioning by created_at
  CONSTRAINT click_events_user_agent_length CHECK (char_length(user_agent) <= 500)
);

-- Indexes for analytics queries
CREATE INDEX idx_click_events_link_created ON click_events(link_id, created_at DESC);
CREATE INDEX idx_click_events_created ON click_events(created_at DESC);

-- Updated_at trigger for workspaces and links
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_workspaces_updated_at BEFORE UPDATE ON workspaces
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_links_updated_at BEFORE UPDATE ON links
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS)
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE links ENABLE ROW LEVEL SECURITY;
ALTER TABLE rotation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workspaces
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Owners can update their workspaces"
  ON workspaces FOR UPDATE
  USING (owner_user_id = auth.uid());

CREATE POLICY "Admins can update workspace details"
  ON workspaces FOR UPDATE
  USING (id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- RLS Policies for links
CREATE POLICY "Users can view links in their workspaces"
  ON links FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));

CREATE POLICY "Members can create links in their workspaces"
  ON links FOR INSERT
  WITH CHECK (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  ));

CREATE POLICY "Members can update links in their workspaces"
  ON links FOR UPDATE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
  ));

CREATE POLICY "Admins can delete links"
  ON links FOR DELETE
  USING (workspace_id IN (
    SELECT workspace_id FROM workspace_members
    WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- RLS Policies for rotation_rules (inherit from links)
CREATE POLICY "Users can view rotation rules for their workspace links"
  ON rotation_rules FOR SELECT
  USING (link_id IN (
    SELECT id FROM links WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

CREATE POLICY "Members can manage rotation rules for their workspace links"
  ON rotation_rules FOR ALL
  USING (link_id IN (
    SELECT id FROM links WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin', 'member')
    )
  ));

-- RLS Policies for click_events (read-only for users)
CREATE POLICY "Users can view click events for their workspace links"
  ON click_events FOR SELECT
  USING (link_id IN (
    SELECT id FROM links WHERE workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  ));

-- Public redirect access (bypasses RLS)
CREATE POLICY "Public can trigger redirects"
  ON links FOR SELECT
  TO anon, authenticated
  USING (status = 'enabled');

-- Performance: Create function for fast link lookup
CREATE OR REPLACE FUNCTION get_link_for_redirect(link_identifier TEXT)
RETURNS TABLE (
  id UUID,
  main_destination_url TEXT,
  status TEXT,
  rotation_enabled BOOLEAN,
  rotation_rules JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.main_destination_url,
    l.status,
    l.rotation_enabled,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id', rr.id,
          'destination_url', rr.destination_url,
          'weight_percentage', rr.weight_percentage,
          'order_index', rr.order_index
        )
        ORDER BY rr.order_index
      ) FILTER (WHERE rr.id IS NOT NULL),
      '[]'::jsonb
    ) AS rotation_rules
  FROM links l
  LEFT JOIN rotation_rules rr ON rr.link_id = l.id
  WHERE l.id::text = link_identifier OR l.slug = link_identifier
  GROUP BY l.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Authentication Setup (Better Auth)

**`lib/auth.ts`**

```typescript
import { betterAuth } from "better-auth";
import { supabaseAdapter } from "better-auth/adapters/supabase";
import { supabase } from "./supabase";

export const auth = betterAuth({
  database: supabaseAdapter(supabase),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  advanced: {
    generateId: () => crypto.randomUUID(),
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
```

### **Middleware for Protected Routes**

```typescript
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function middleware(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });

  const isProtectedRoute = request.nextUrl.pathname.startsWith("/dashboard");
  const isAuthRoute = ["/login", "/signup"].includes(request.nextUrl.pathname);

  if (isProtectedRoute && !session) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/redirect|_next/static|_next/image|favicon.ico).*)"],
};
```

### Supabase Client Setup

**`lib/supabase/client.ts`** (Client-side)

```typescript
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

**`lib/supabase/server.ts`** (Server-side)

```typescript
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    },
  );
}
```

### Rate Limiting (Upstash Redis)

**`lib/rate-limit.ts`**

```typescript
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// 100 requests per 10 seconds per IP for redirect endpoint
export const redirectRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, "10 s"),
  analytics: true,
  prefix: "ratelimit:redirect",
});

// 10 requests per minute per user for API mutations
export const apiRateLimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  analytics: true,
  prefix: "ratelimit:api",
});
```

### **Updated Redirect Endpoint with Rate Limiting**

```typescript
// app/api/redirect/[linkId]/route.ts
import { redirectRateLimit } from "@/lib/rate-limit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const ip = request.ip ?? "127.0.0.1";
  const { success, limit, remaining, reset } =
    await redirectRateLimit.limit(ip);

  if (!success) {
    return NextResponse.json(
      { error: "Too many requests", limit, reset },
      {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": reset.toString(),
        },
      },
    );
  }

  // Rest of redirect logic...
}
```

### URL Validation (Security)

**`lib/validation.ts`**

```typescript
import { z } from "zod";

// URL validation with protocol whitelist
export const urlSchema = z
  .string()
  .url()
  .refine((url) => {
    const protocol = new URL(url).protocol;
    return ["http:", "https:"].includes(protocol);
  }, "Only HTTP and HTTPS URLs are allowed")
  .refine((url) => {
    const hostname = new URL(url).hostname;
    // Block localhost and private IPs in production
    if (process.env.NODE_ENV === "production") {
      return !["localhost", "127.0.0.1", "0.0.0.0"].includes(hostname);
    }
    return true;
  }, "Local URLs are not allowed in production");

// Link validation schema
export const linkSchema = z.object({
  id: z.string().uuid(),
  workspace_id: z.string().uuid(),
  slug: z
    .string()
    .regex(/^[a-zA-Z0-9-_]+$/)
    .min(3)
    .max(50)
    .nullable(),
  main_destination_url: urlSchema,
  nickname: z.string().max(200).optional(),
  status: z.enum(["enabled", "disabled", "expired", "scheduled"]),
  rotation_enabled: z.boolean(),
  rotation_rules: z.array(
    z.object({
      id: z.string().uuid(),
      destination_url: urlSchema,
      weight_percentage: z.number().int().min(1).max(100),
      order_index: z.number().int().min(0),
    }),
  ),
  expires_at: z.string().datetime().nullable(),
  published_at: z.string().datetime().nullable(),
});

// Validate total weight
export function validateRotationWeights(
  rules: { weight_percentage: number }[],
): boolean {
  const total = rules.reduce((sum, r) => sum + r.weight_percentage, 0);
  return total <= 100;
}
```

---

## 🎨 UI/UX Enhancements (Phase 2)

### New Pages to Build

1. **`/login`** — Email/password + OAuth (Google, GitHub)
2. **`/signup`** — Registration with workspace creation
3. **`/dashboard`** — Link list (table view with search/filter/sort)
4. **`/dashboard/links/[id]`** — Link editor (enhanced from Phase 1)
5. **`/dashboard/links/[id]/analytics`** — Click analytics + charts
6. **`/dashboard/settings`** — Workspace settings
7. **`/dashboard/team`** — Member management
8. **`/[slug]`** — Public redirect (short URL)

### Dashboard Link List Design

```typescript
// app/dashboard/page.tsx
export default async function DashboardPage() {
  const session = await auth.api.getSession();
  const supabase = await createClient();

  const { data: links } = await supabase
    .from("links")
    .select("*, rotation_rules(count)")
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Mis Enlaces</h1>
        <Link href="/dashboard/links/new">
          <Button>+ Nuevo Enlace</Button>
        </Link>
      </div>

      <LinkTable links={links} />
    </DashboardLayout>
  );
}
```

### Analytics Dashboard Design

```typescript
// app/dashboard/links/[id]/analytics/page.tsx
import { LineChart, BarChart, PieChart } from "@/components/charts";

export default async function AnalyticsPage({ params }: { params: { id: string } }) {
  const supabase = await createClient();

  // Aggregate click events
  const { data: clicksByDay } = await supabase.rpc("get_clicks_by_day", { link_id: params.id });
  const { data: clicksByDestination } = await supabase.rpc("get_clicks_by_destination", { link_id: params.id });

  return (
    <DashboardLayout>
      <h1 className="text-3xl font-bold mb-6">Analíticas de Enlace</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h2>Clics en el Tiempo</h2>
          <LineChart data={clicksByDay} />
        </Card>

        <Card>
          <h2>Distribución por Destino</h2>
          <PieChart data={clicksByDestination} />
        </Card>
      </div>
    </DashboardLayout>
  );
}
```

### Realtime Click Counter (Supabase Realtime)

```typescript
// components/RealtimeClickCounter.tsx
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function RealtimeClickCounter({ linkId }: { linkId: string }) {
  const [count, setCount] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    // Subscribe to click_events inserts
    const channel = supabase
      .channel(`clicks:${linkId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "click_events", filter: `link_id=eq.${linkId}` },
        () => setCount((prev) => prev + 1)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [linkId]);

  return <span className="font-bold">{count} clics (tiempo real)</span>;
}
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

**`lib/rotation.test.ts`**

```typescript
import { describe, it, expect } from "vitest";
import {
  selectDestination,
  simulateClicks,
  buildWeightedDestinations,
} from "./rotation";
import type { Link } from "./types";

describe("Rotation Algorithm", () => {
  const mockLink: Link = {
    id: "test-link",
    workspace_id: "test-workspace",
    main_destination_url: "https://main.com",
    nickname: "Test Link",
    status: "enabled",
    rotation_enabled: true,
    rotation_rules: [
      {
        id: "rule-1",
        destination_url: "https://a.com",
        weight_percentage: 30,
        order_index: 0,
      },
      {
        id: "rule-2",
        destination_url: "https://b.com",
        weight_percentage: 30,
        order_index: 1,
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  it("should distribute traffic according to weights", () => {
    const results = simulateClicks(mockLink, 10000);

    // Main URL should get ~40% (100 - 30 - 30)
    const mainResult = results.find((r) => r.is_main)!;
    expect(mainResult.actual_percentage).toBeCloseTo(40, 1); // Within ±1%

    // Secondary rules should get ~30% each
    const secondaryResults = results.filter((r) => !r.is_main);
    secondaryResults.forEach((result) => {
      expect(result.actual_percentage).toBeCloseTo(30, 1);
    });
  });

  it("should return main URL when rotation is disabled", () => {
    const disabledLink = { ...mockLink, rotation_enabled: false };
    const destination = selectDestination(disabledLink);
    expect(destination).toBe(mockLink.main_destination_url);
  });

  it("should handle edge case: 100% to main", () => {
    const allMainLink = { ...mockLink, rotation_rules: [] };
    const results = simulateClicks(allMainLink, 1000);
    expect(results.length).toBe(1);
    expect(results[0].actual_percentage).toBe(100);
  });
});
```

### Integration Tests (Playwright)

**`tests/e2e/redirect.spec.ts`**

```typescript
import { test, expect } from "@playwright/test";

test.describe("Redirect Endpoint", () => {
  test("should redirect to selected destination", async ({ page }) => {
    // Create test link via API
    const response = await page.request.post("/api/links", {
      data: {
        main_destination_url: "https://main.test",
        rotation_enabled: true,
        rotation_rules: [
          { destination_url: "https://variant.test", weight_percentage: 50 },
        ],
      },
    });
    const { id } = await response.json();

    // Follow redirect
    const redirectResponse = await page.goto(`/api/redirect/${id}`, {
      waitUntil: "networkidle",
    });

    expect(redirectResponse?.status()).toBe(200);
    expect(page.url()).toMatch(/https:\/\/(main|variant)\.test/);
  });

  test("should return 404 for nonexistent link", async ({ page }) => {
    const response = await page.goto("/api/redirect/nonexistent", {
      waitUntil: "networkidle",
    });
    expect(response?.status()).toBe(404);
  });

  test("should respect rate limits", async ({ page }) => {
    // Make 101 requests (limit is 100/10s)
    const requests = Array.from({ length: 101 }, () =>
      page.request.get("/api/redirect/demo-link-001"),
    );

    const responses = await Promise.all(requests);
    const rateLimitedCount = responses.filter((r) => r.status() === 429).length;

    expect(rateLimitedCount).toBeGreaterThan(0);
  });
});
```

---

## 📋 Implementation Checklist

### Phase 2A: Database & Auth (Week 1-2)

- [x] Set up Supabase project (URL: `https://owestahxdthunutdttye.supabase.co`)
- [x] Configure environment variables (18 of 21 live — see `PHASE-2-ENV-CONFIG-REPORT.md`)
- [x] Set up Google OAuth (TopFinanzas GCP project)
- [x] Set up Better Auth secret
- [x] Integrate GA4, Firebase, and GCS modules
- [ ] Create database schema (run SQL migration)
- [ ] Implement RLS policies
- [ ] Set up Better Auth integration code
- [ ] Create Supabase client utilities (`lib/supabase/`)
- [ ] Build authentication pages (`/login`, `/signup`)
- [ ] Implement middleware for route protection
- [ ] Migrate `lib/mock-data.ts` → `lib/database.ts`
- [ ] Update `app/actions.ts` to use Supabase
- [ ] Test: User can sign up, log in, create workspace

### Phase 2B: Multi-Workspace Support (Week 3)

- [ ] Build workspace selector component
- [ ] Create workspace settings page
- [ ] Implement team member management
- [ ] Add workspace switcher to header
- [ ] Update all queries to filter by workspace
- [ ] Test: RLS prevents cross-workspace access

### Phase 2C: Link Management (Week 4)

- [ ] Build dashboard link list (`/dashboard`)
- [ ] Implement search/filter/sort
- [ ] Add link CRUD operations (create, edit, delete)
- [ ] Build custom slug editor
- [ ] Add expiration date picker
- [ ] Implement scheduled publish/unpublish
- [ ] Test: All link operations work correctly

### Phase 2D: Click Tracking & Analytics (Week 5-6)

- [ ] Update redirect endpoint to insert click events
- [ ] Create analytics aggregation SQL functions
- [ ] Build analytics dashboard (`/dashboard/links/[id]/analytics`)
- [ ] Implement charts (LineChart, BarChart, PieChart)
- [ ] Add realtime click counter (Supabase Realtime)
- [ ] Build A/B test reporting
- [ ] Test: Analytics display correctly

### Phase 2E: Security & Performance (Week 7)

- [ ] Implement rate limiting (Upstash Redis)
- [ ] Add URL validation (Zod schemas)
- [ ] Set up CSRF protection
- [ ] Add error boundaries
- [ ] Optimize redirect endpoint (Edge Functions)
- [ ] Set up Sentry error tracking
- [ ] Test: Security vulnerabilities addressed

### Phase 2F: Testing & Deployment (Week 8)

- [ ] Write unit tests (Vitest)
- [ ] Write integration tests (Playwright)
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Configure production environment variables
- [ ] Deploy to Vercel
- [ ] Set up monitoring dashboards
- [ ] Load test redirect endpoint (10k RPS)
- [ ] Test: All tests pass, deployment successful

---

## 🚨 Critical Rules & Constraints

### IMMUTABLE RULES (NEVER VIOLATE)

1. **DO NOT MODIFY `lib/rotation.ts`** — The probabilistic algorithm is mathematically proven and must remain unchanged. Only touch this file if there's a critical bug (verify with product owner first).

2. **PRESERVE 100% SPANISH UI** — All user-facing text must remain in Spanish. This is a hard requirement from TopNetworks.

3. **MAINTAIN BACKWARD COMPATIBILITY** — Phase 1 links must continue working after migration. Add migration script to convert file data → database.

4. **NO BREAKING CHANGES TO REDIRECT ENDPOINT** — The URL format `/api/redirect/[linkId]` must remain unchanged. Existing tracking URLs in the wild must not break.

5. **ENFORCE RLS** — Every database query must respect Row Level Security. Never bypass RLS except for public redirect access.

### SECURITY REQUIREMENTS (NON-NEGOTIABLE)

1. **Validate ALL user input** — Use Zod schemas for every form submission, API request, and URL parameter.

2. **Rate limit redirect endpoint** — Implement sliding window rate limiting (100 req/10s per IP).

3. **Sanitize URLs** — Block localhost, private IPs, and non-HTTP(S) protocols in production.

4. **Protect against CSRF** — Use SameSite cookies and CSRF tokens for all mutations.

5. **Log security events** — Track failed auth attempts, rate limit violations, and suspicious activity.

### PERFORMANCE REQUIREMENTS

1. **Redirect latency** — P95 must be <200ms, P99 <500ms.

2. **Database queries** — Use indexed lookups, avoid N+1 queries, implement connection pooling.

3. **Edge deployment** — Deploy redirect endpoint as Edge Function (Vercel Edge Runtime).

4. **Caching** — Cache link configurations in Redis (invalidate on update).

5. **Analytics aggregation** — Pre-compute daily/hourly aggregates (don't query raw click events).

### CODE QUALITY STANDARDS

1. **TypeScript strict mode** — All code must pass `tsc --noEmit` with no errors.

2. **Test coverage** — Minimum 80% coverage for critical paths (rotation algorithm, auth, RLS).

3. **ESLint + Prettier** — All code must pass `npm run lint`.

4. **Documentation** — TSDoc comments for all public functions, README updates for new features.

5. **Error handling** — Graceful degradation, user-friendly error messages in Spanish.

---

## 🛠️ Development Workflow

### Local Development Setup

```bash
# 1. Clone repository
git clone https://github.com/juanjaragavi/route-genius.git
cd route-genius

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env.local
# Fill in Supabase, Better Auth, Upstash credentials

# 4. Run database migrations
npm run db:migrate

# 5. Start dev server
npm run dev

# 6. Run tests
npm test
npm run test:e2e
```

### Git Workflow

```bash
# 1. Create feature branch from main
git checkout -b feature/analytics-dashboard

# 2. Make changes, commit frequently
git add .
git commit -m "feat: add analytics dashboard with LineChart"

# 3. Push to origin
git push origin feature/analytics-dashboard

# 4. Create pull request
gh pr create --title "Add analytics dashboard" --body "Closes #42"

# 5. Wait for CI checks to pass
# 6. Request review from team
# 7. Merge after approval
```

### Code Review Checklist

Before submitting a PR, ensure:

- [ ] All tests pass (`npm test` + `npm run test:e2e`)
- [ ] Linting passes (`npm run lint`)
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Spanish UI text reviewed
- [ ] RLS policies tested (try to access other workspace's data)
- [ ] Performance tested (redirect endpoint <200ms P95)
- [ ] Security reviewed (no XSS, CSRF, SQL injection)
- [ ] Documentation updated (README, TSDoc comments)

---

## 📊 Success Metrics (KPIs)

### Technical Metrics

- **Redirect latency**: P95 <200ms, P99 <500ms
- **Uptime**: 99.9% SLA
- **Test coverage**: >80% for critical paths
- **Zero security vulnerabilities**: No critical/high CVEs
- **RLS effectiveness**: 100% workspace isolation (no cross-tenant leaks)

### Product Metrics

- **User onboarding**: <5 minutes to create first link
- **Link creation**: <30 seconds from dashboard → live link
- **Analytics load time**: <2 seconds for 30-day view
- **Mobile responsiveness**: 100% features work on mobile

### Business Metrics

- **Active workspaces**: Track weekly active workspaces
- **Links created**: Track total links created
- **Click volume**: Track total redirects/day
- **Conversion rate**: Track signup → first link creation

---

## 🎓 Learning Resources

### Recommended Reading

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)

### Phase 1 Reference Files

Consult these files from Phase 1 when implementing Phase 2:

- `CLAUDE.MD` — AI assistant guide (architectural context)
- `.github/copilot-instructions.md` — Phase 1 patterns
- `lib/rotation.ts` — Algorithm reference (do not modify)
- `lib/types.ts` — Data model (extend, don't replace)

---

## 🚀 Deployment Instructions

### Vercel Deployment

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Link project
vercel link

# 3. Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL production
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
vercel env add SUPABASE_SERVICE_ROLE_KEY production
vercel env add UPSTASH_REDIS_URL production
vercel env add UPSTASH_REDIS_TOKEN production
# ... (add all required env vars)

# 4. Deploy to production
vercel --prod
```

### Environment Variables Checklist

**Required (Live):**

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BETTER_AUTH_SECRET` (generate with `openssl rand -base64 32`)
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID` (OAuth)
- `GOOGLE_CLIENT_SECRET` (OAuth)
- `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4)
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`
- `GCS_BUCKET_NAME`
- `GCS_PROJECT_ID`
- `GCS_CLIENT_EMAIL`
- `GCS_PRIVATE_KEY`

**Deferred (Phase 2E):**

- `UPSTASH_REDIS_URL` (rate limiting)
- `UPSTASH_REDIS_TOKEN` (rate limiting)
- `SENTRY_DSN` (error tracking)

#### **Total: 21 variables (18 live, 3 deferred)**

### Post-Deployment Verification

```bash
# 1. Test redirect endpoint
curl -I https://routegenius.com/api/redirect/demo-link-001

# 2. Test authentication
curl -X POST https://routegenius.com/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePass123!"}'

# 3. Test rate limiting
for i in {1..101}; do curl -I https://routegenius.com/api/redirect/demo-link-001; done

# 4. Check logs
vercel logs --follow
```

---

## 🔧 Troubleshooting Guide

### Common Issues

**Issue:** RLS policies blocking legitimate queries
**Solution:** Check `auth.uid()` function returns correct user ID. Verify user is member of workspace.

**Issue:** Rate limiting triggering in development
**Solution:** Use different Redis database for dev/prod, or disable rate limiting in dev.

**Issue:** Redirect endpoint slow (>500ms)
**Solution:** Enable Edge Functions, add Redis caching, optimize database query with indexes.

**Issue:** CORS errors on redirect endpoint
**Solution:** Add CORS headers to API route, ensure `Access-Control-Allow-Origin` is set.

**Issue:** Click events not inserting (RLS block)
**Solution:** Use service role key for click event inserts, or add RLS policy for anon role.

---

## 🎯 Final Checklist for AI Agent

Before starting Phase 2 implementation, confirm:

- [x] Read and understood entire PHASE-2-AGENT-INSTRUCTIONS.md
- [x] Read and understood CLAUDE.MD and .github/copilot-instructions.md
- [x] Reviewed all Phase 1 code files
- [x] Set up local development environment (Supabase, Better Auth, Upstash)
- [x] Created test workspace in Supabase
- [x] Verified Phase 1 functionality works locally
- [x] Planned implementation order (start with 2A → 2F)
- [x] Set up CI/CD pipeline (GitHub Actions)
- [x] Created project management board (GitHub Projects)

---

## 📞 Support & Escalation

If you encounter blockers:

1. **Check existing documentation**: CLAUDE.MD, .github/copilot-instructions.md
2. **Search codebase**: Use grep/ripgrep for similar patterns
3. **Review Phase 1 implementation**: Understand existing patterns before extending
4. **Ask clarifying questions**: Use AskUserQuestion tool if requirements unclear
5. **Escalate critical decisions**: Do not modify rotation algorithm without approval

---

**Remember:** You are building a **production-grade, multi-tenant SaaS platform**. Every decision impacts security, performance, and user experience. Follow these instructions meticulously, test thoroughly, and never compromise on code quality.

**Your mission:** Deliver a world-class RouteGenius Phase 2 that exceeds expectations. 🚀

---

**Document Version:** 1.1.0
**Last Updated:** 2026-02-13
**Maintained By:** TopNetworks Engineering Team

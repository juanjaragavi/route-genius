# RouteGenius Phase 2 — Authentication & Analytics Coder Agent Prompt

> **Objective:** Implement Google OAuth authentication restricted to TopNetworks Inc. users, and build a Linkly-spec analytics dashboard — all integrated into the existing Next.js 16 App Router codebase.

---

## 0. Context & Current State

### Repository

- **Path:** `/Users/macbookpro/GitHub/route-genius`
- **Framework:** Next.js 16.1.6 (App Router, Turbopack), React 19, TypeScript 5 (strict mode)
- **Styling:** Tailwind CSS 4.x with `@theme inline` brand tokens in `app/globals.css`
- **Icons:** `lucide-react` exclusively — do NOT introduce any other icon library
- **Font:** Poppins (via `next/font/google`, CSS variable `--font-poppins`)
- **Port:** 3070 (`npm run dev`)
- **UI Language:** 100% **Spanish** — every user-facing string must be in Spanish

### Existing Infrastructure (Already Live)

| Capability              | Implementation                                       | File                          |
| ----------------------- | ---------------------------------------------------- | ----------------------------- |
| Rate limiting           | Supabase PG sliding window (100 req/10s per IP)      | `lib/rate-limit.ts`           |
| Server error monitoring | GCP Error Reporting                                  | `lib/gcp/error-reporting.ts`  |
| Client error monitoring | Firebase Analytics (Crashlytics web)                 | `lib/firebase/crashlytics.ts` |
| File storage            | Google Cloud Storage                                 | `lib/storage/gcs.ts`          |
| Google Analytics 4      | Conditional `<GoogleAnalytics>` in layout            | `app/layout.tsx`              |
| Data persistence        | File-based JSON (Phase 1 — will migrate to Supabase) | `lib/mock-data.ts`            |

### Environment Variables (Already Configured in `.env.local`)

All 18 live variables are populated. Relevant ones for this task:

```env
# Supabase (live)
NEXT_PUBLIC_SUPABASE_URL=https://owestahxdthunutdttye.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<populated>
SUPABASE_SERVICE_ROLE_KEY=<populated>

# Better Auth (live)
BETTER_AUTH_SECRET=<populated>
BETTER_AUTH_URL=http://localhost:3070

# Google OAuth 2.0 (live)
GOOGLE_CLIENT_ID=<populated>
GOOGLE_CLIENT_SECRET=<populated>

# Firebase (live — 6 vars)
NEXT_PUBLIC_FIREBASE_API_KEY=<populated>
# ... (all 6 populated)

# GA4 (live)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-72CP3PVkR3

# GCP (live)
GCS_PROJECT_ID=absolute-brook-452020-d5
GOOGLE_APPLICATION_CREDENTIALS=credentials/gcs-service-account.json
```

### Current File Structure

```
route-genius/
├── app/
│   ├── actions.ts              # Server Action: saveLinkAction()
│   ├── globals.css             # Brand tokens (blue/cyan/lime) + page-bg, card-bg
│   ├── layout.tsx              # Root layout: Poppins + GA4
│   ├── page.tsx                # Home: Header + LinkEditorForm
│   └── api/redirect/[linkId]/route.ts   # 307 redirect with rate limiting
├── components/
│   ├── Header.tsx              # TopNetworks branding + "Fase 1 MVP" badge
│   ├── LinkEditorForm.tsx      # 627-line form with auto-save, simulation
│   └── SimulationResults.tsx   # Monte Carlo simulation display
├── lib/
│   ├── types.ts                # Link, RotationRule, ClickEvent, SimulationResult
│   ├── rotation.ts             # ⚠️ UNTOUCHABLE — probabilistic algorithm
│   ├── mock-data.ts            # File-based CRUD (to be replaced with Supabase)
│   ├── rate-limit.ts           # Supabase PG rate limiting
│   ├── firebase/config.ts      # Firebase singleton
│   ├── firebase/crashlytics.ts # Client error logging
│   ├── gcp/error-reporting.ts  # Server error reporting
│   └── storage/gcs.ts          # GCS file upload utility
└── credentials/
    └── gcs-service-account.json
```

### Brand Design Tokens (from `globals.css`)

```css
--color-brand-blue: #2563eb; /* Primary actions, CTAs */
--color-brand-cyan: #0891b2; /* Secondary accents */
--color-brand-lime: #84cc16; /* Success states */
```

Utility classes: `.text-brand-gradient`, `.card-bg`, `.page-bg`

---

## 1. IMMUTABLE CONSTRAINTS

Before writing any code, internalize these non-negotiable rules:

1. **DO NOT modify `lib/rotation.ts`** — The probabilistic algorithm is mathematically proven. Zero changes.
2. **100% Spanish UI** — Every label, button, placeholder, error message, heading, tooltip, and footer must be in Spanish. No English user-facing text.
3. **Backward compatibility** — The redirect endpoint `GET /api/redirect/[linkId]` must continue working unchanged. Existing tracking URLs must not break.
4. **`lucide-react` only** — No additional icon libraries (no Heroicons, no FontAwesome, no Material Icons).
5. **Tailwind CSS 4.x** — Use existing brand tokens. No external CSS frameworks. No `styled-components`.
6. **Next.js App Router** — Server Components by default, `"use client"` only when required. No Pages Router patterns.
7. **Poppins font** — Inherited from root layout. Do not add additional fonts.
8. **Port 3070** — All URLs reference `localhost:3070`.

---

## 2. TASK A — Authentication System (Google OAuth)

### 2.1 Dependencies to Install

```bash
npm install better-auth@latest
```

> Better Auth is the ONLY auth library to use. Do NOT install `next-auth`, `clerk`, `lucia`, or `auth.js`.

### 2.2 Better Auth Server Configuration

Create **`lib/auth.ts`**:

```typescript
import { betterAuth } from "better-auth";

export const auth = betterAuth({
  database: {
    // Use Supabase PostgreSQL via connection string
    // Better Auth manages its own tables (user, session, account, verification)
    type: "postgres",
    url: process.env.DATABASE_URL!, // Supabase pooled connection string
  },
  emailAndPassword: {
    enabled: false, // Google-only authentication
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    generateId: () => crypto.randomUUID(),
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
```

Create **`lib/auth-client.ts`** (client-side helper):

```typescript
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "http://localhost:3070",
});

export const { signIn, signOut, useSession } = authClient;
```

### 2.3 Better Auth API Route Handler

Create **`app/api/auth/[...all]/route.ts`**:

```typescript
import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
```

### 2.4 Environment Variable Addition

Add to `.env.local` (the Supabase pooled connection string):

```env
# Better Auth database (Supabase PostgreSQL pooled connection)
DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-0-us-east-1.pooler.supabase.co:6543/postgres
```

> **Important:** Obtain the pooled connection string from Supabase Dashboard → Settings → Database → Connection String → URI (pooling mode: Transaction).

Also add:

```env
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:3070
```

### 2.5 Database Schema Generation

Run the Better Auth CLI to generate the required tables in Supabase:

```bash
npx @better-auth/cli generate
npx @better-auth/cli migrate
```

Alternatively, if CLI doesn't connect, manually run the generated SQL in Supabase SQL Editor. Better Auth creates these tables: `user`, `session`, `account`, `verification`.

### 2.6 TopNetworks-Only Access Restriction

**Critical requirement:** Only users with `@topnetworks.co` or `@topfinanzas.com` email domains may sign in. Implement this as a server-side callback in `lib/auth.ts`:

```typescript
export const auth = betterAuth({
  // ...existing config above...
  callbacks: {
    async signIn({ user, account }) {
      const email = user.email?.toLowerCase() || "";
      const allowedDomains = ["topnetworks.co", "topfinanzas.com"];
      const domain = email.split("@")[1];

      if (!allowedDomains.includes(domain)) {
        return {
          error: "Acceso restringido a usuarios de TopNetworks, Inc.",
        };
      }
      return { user, account };
    },
  },
});
```

If a non-TopNetworks user attempts to sign in, redirect to the login page with an error query parameter and display:

> "Acceso restringido. Solo los usuarios de TopNetworks, Inc. pueden acceder a esta aplicación."

### 2.7 Login Page

Create **`app/login/page.tsx`** — a full-page landing/login screen:

**Design Requirements:**

- Full-viewport (`min-h-screen`) with the `page-bg` gradient background
- Centered card layout (`max-w-md mx-auto`)
- TopNetworks logo at the top (same `<Image>` as `Header.tsx`, sourced from `https://storage.googleapis.com/media-topfinanzas-com/images/topnetworks-positivo-sinfondo.webp`)
- RouteGenius name with `.text-brand-gradient` styling and `<Zap>` icon
- Tagline: "Rotación Probabilística de Tráfico"
- Subtitle: "Inicia sesión con tu cuenta corporativa de Google para continuar."
- Single CTA button: **"Iniciar Sesión con Google"**
  - Brand blue background (`bg-brand-blue`), white text
  - Google icon (use a simple inline SVG for the Google "G" logo, do NOT import an icon library)
  - `onClick` calls `signIn.social({ provider: "google", callbackURL: "/dashboard" })`
- Error display: If `?error=...` query param is present, show a red alert banner with the message
- Footer: "© 2026 TopNetworks, Inc. Todos los derechos reservados."

**This page must be a Client Component** (`"use client"`) because it uses `signIn` from the auth client.

### 2.8 Middleware (Route Protection)

Create **`middleware.ts`** at the project root:

```typescript
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname === "/";

  const isLoginRoute = request.nextUrl.pathname === "/login";
  const isPublicAPIRoute = request.nextUrl.pathname.startsWith("/api/redirect");
  const isAuthAPIRoute = request.nextUrl.pathname.startsWith("/api/auth");

  // Never intercept public API routes or auth routes
  if (isPublicAPIRoute || isAuthAPIRoute) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login
  if (isLoginRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/redirect).*)"],
};
```

**Important:** The redirect endpoint `GET /api/redirect/[linkId]` must **NEVER** be behind auth middleware. It is a public endpoint.

### 2.9 Authenticated Layout

Create **`app/dashboard/layout.tsx`**:

- Server Component that validates the session
- Renders a sidebar or header navigation with:
  - TopNetworks logo
  - RouteGenius branding
  - Nav items: "Mis Enlaces" (links list), "Analíticas" (analytics)
  - User avatar + email display
  - "Cerrar Sesión" button (calls `signOut()` client-side)
- Wraps `{children}` in a content area

### 2.10 Migrate Home Page

**Current `app/page.tsx`** is the link editor. After auth is implemented:

- `app/page.tsx` should redirect authenticated users to `/dashboard` (or show the login page for unauthenticated users — handled by middleware)
- Move the link editor functionality to **`app/dashboard/page.tsx`** (or `app/dashboard/links/[id]/page.tsx`)
- The root `/` should be the login page redirect target for unauthenticated users

### 2.11 Session Utility

Create **`lib/auth-session.ts`** for server-side session retrieval:

```typescript
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}
```

---

## 3. TASK B — Analytics Dashboard (Linkly Specification)

### 3.1 Reference Specification

The complete Linkly analytics specification is in `LINKLY-ANALYTICS-REPORT.md`. The dashboard must replicate the following Linkly capabilities adapted to RouteGenius's self-hosted click data:

### 3.2 Database Schema for Analytics

Run this SQL in the **Supabase SQL Editor** to create the click tracking infrastructure:

```sql
-- Click events table (time-series optimized)
CREATE TABLE IF NOT EXISTS click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id TEXT NOT NULL,
  resolved_destination_url TEXT NOT NULL,
  went_to_main BOOLEAN NOT NULL DEFAULT false,
  user_agent TEXT,
  ip_address INET,
  country_code TEXT,
  referer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_click_events_link_created
  ON click_events(link_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_created
  ON click_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_link_destination
  ON click_events(link_id, resolved_destination_url);

-- Daily aggregation materialized view (pre-computed)
CREATE MATERIALIZED VIEW IF NOT EXISTS click_daily_summary AS
SELECT
  link_id,
  DATE(created_at AT TIME ZONE 'UTC') AS click_date,
  resolved_destination_url,
  went_to_main,
  COUNT(*) AS click_count,
  COUNT(DISTINCT ip_address) AS unique_visitors
FROM click_events
GROUP BY link_id, DATE(created_at AT TIME ZONE 'UTC'), resolved_destination_url, went_to_main;

CREATE UNIQUE INDEX IF NOT EXISTS idx_click_daily_summary_unique
  ON click_daily_summary(link_id, click_date, resolved_destination_url, went_to_main);

-- Function to refresh materialized view (call periodically or on-demand)
CREATE OR REPLACE FUNCTION refresh_click_daily_summary()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY click_daily_summary;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggregation RPC: clicks by day for a specific link
CREATE OR REPLACE FUNCTION get_clicks_by_day(
  p_link_id TEXT,
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  click_date DATE,
  total_clicks BIGINT,
  unique_visitors BIGINT,
  main_clicks BIGINT,
  secondary_clicks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    DATE(ce.created_at AT TIME ZONE 'UTC') AS click_date,
    COUNT(*) AS total_clicks,
    COUNT(DISTINCT ce.ip_address) AS unique_visitors,
    COUNT(*) FILTER (WHERE ce.went_to_main = true) AS main_clicks,
    COUNT(*) FILTER (WHERE ce.went_to_main = false) AS secondary_clicks
  FROM click_events ce
  WHERE ce.link_id = p_link_id
    AND ce.created_at >= p_start_date
    AND ce.created_at <= p_end_date
  GROUP BY DATE(ce.created_at AT TIME ZONE 'UTC')
  ORDER BY click_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggregation RPC: clicks by destination for a specific link
CREATE OR REPLACE FUNCTION get_clicks_by_destination(
  p_link_id TEXT,
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  destination_url TEXT,
  went_to_main BOOLEAN,
  total_clicks BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM click_events
  WHERE link_id = p_link_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  RETURN QUERY
  SELECT
    ce.resolved_destination_url AS destination_url,
    ce.went_to_main,
    COUNT(*) AS total_clicks,
    CASE WHEN v_total > 0
      THEN ROUND((COUNT(*)::NUMERIC / v_total) * 100, 2)
      ELSE 0
    END AS percentage
  FROM click_events ce
  WHERE ce.link_id = p_link_id
    AND ce.created_at >= p_start_date
    AND ce.created_at <= p_end_date
  GROUP BY ce.resolved_destination_url, ce.went_to_main
  ORDER BY total_clicks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Aggregation RPC: clicks by country for a specific link
CREATE OR REPLACE FUNCTION get_clicks_by_country(
  p_link_id TEXT,
  p_start_date TIMESTAMPTZ DEFAULT now() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT now()
)
RETURNS TABLE (
  country_code TEXT,
  total_clicks BIGINT,
  percentage NUMERIC
) AS $$
DECLARE
  v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total
  FROM click_events
  WHERE link_id = p_link_id
    AND created_at >= p_start_date
    AND created_at <= p_end_date;

  RETURN QUERY
  SELECT
    COALESCE(ce.country_code, 'Desconocido') AS country_code,
    COUNT(*) AS total_clicks,
    CASE WHEN v_total > 0
      THEN ROUND((COUNT(*)::NUMERIC / v_total) * 100, 2)
      ELSE 0
    END AS percentage
  FROM click_events ce
  WHERE ce.link_id = p_link_id
    AND ce.created_at >= p_start_date
    AND ce.created_at <= p_end_date
  GROUP BY ce.country_code
  ORDER BY total_clicks DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hourly breakdown RPC
CREATE OR REPLACE FUNCTION get_clicks_by_hour(
  p_link_id TEXT,
  p_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
  hour_of_day INTEGER,
  total_clicks BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    EXTRACT(HOUR FROM ce.created_at AT TIME ZONE 'UTC')::INTEGER AS hour_of_day,
    COUNT(*) AS total_clicks
  FROM click_events ce
  WHERE ce.link_id = p_link_id
    AND DATE(ce.created_at AT TIME ZONE 'UTC') = p_date
  GROUP BY EXTRACT(HOUR FROM ce.created_at AT TIME ZONE 'UTC')
  ORDER BY hour_of_day;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 3.3 Update Redirect Endpoint to Record Clicks

Modify **`app/api/redirect/[linkId]/route.ts`** to insert click events into Supabase **after** issuing the redirect. Use a non-blocking pattern so click recording does not add latency to the redirect:

```typescript
// After the redirect response is prepared, fire-and-forget the click insert
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

// Inside GET handler, after selectDestination():
const clickEvent = {
  link_id: linkId,
  resolved_destination_url: destination,
  went_to_main: destination === link.main_destination_url,
  user_agent: request.headers.get("user-agent") || "unknown",
  ip_address: ip,
  referer: request.headers.get("referer") || null,
  country_code: request.headers.get("x-vercel-ip-country") || null, // Vercel provides this; null locally
};

// Fire-and-forget: don't await, don't block the redirect
supabaseAdmin
  .from("click_events")
  .insert(clickEvent)
  .then(({ error }) => {
    if (error)
      console.error("[RouteGenius] Click insert failed:", error.message);
  });

return NextResponse.redirect(destination, 307);
```

**IMPORTANT:** The redirect response MUST still use `selectDestination(link)` from `lib/rotation.ts`. Do NOT modify the rotation logic. Only ADD the click recording step.

### 3.4 Analytics Dashboard Pages

#### 3.4.1 Main Analytics Page

Create **`app/dashboard/analytics/page.tsx`** — the primary analytics overview:

**Layout:**

- Page title: "Analíticas de Tráfico"
- Date range picker (preset options: "Últimos 7 días", "Últimos 30 días", "Últimos 90 días", "Rango personalizado")
- Timezone selector dropdown (UTC, America/New_York, America/Chicago, America/Los_Angeles, America/Bogota, America/Mexico_City, Europe/London, Europe/Paris, Europe/Berlin, Asia/Tokyo, Asia/Shanghai, Australia/Sydney)
- Toggle: "Filtrar bots" (filter known bot user-agents)
- Toggle: "Solo visitantes únicos"

**KPI Cards Row (top):**

1. **Total de Clics** — aggregate click count across all links
2. **Visitantes Únicos** — unique IP count
3. **Tasa de Distribución** — percentage going to main vs secondary
4. **Enlaces Activos** — count of enabled links

**Charts Section:**

1. **Clics en el Tiempo** — Line chart, X-axis = date, Y-axis = clicks. One line for total, one for unique.
2. **Distribución por Destino** — Horizontal bar chart or pie chart showing traffic split per destination URL.
3. **Distribución por País** — Horizontal bar chart showing top 10 countries.
4. **Actividad por Hora** — Bar chart showing clicks per hour for the selected day.

**Data Table:**

- Below charts, a sortable table listing all click events (paginated, 50 per page)
- Columns: Fecha/Hora, Enlace, Destino, País, User Agent, Principal/Secundario
- Export button: "Exportar CSV"

#### 3.4.2 Per-Link Analytics Page

Create **`app/dashboard/analytics/[linkId]/page.tsx`**:

- Same layout as overview but filtered to a single link
- Shows link nickname and tracking URL at the top
- Additional section: **"Comparación: Configurado vs. Real"** — table comparing configured weight percentages against actual click distribution
- Shows the Monte Carlo simulation results alongside real data for comparison

#### 3.4.3 Chart Library

Install **Recharts** for chart rendering:

```bash
npm install recharts
```

Create reusable chart components in **`components/charts/`**:

- `components/charts/ClicksLineChart.tsx` — Time-series line chart
- `components/charts/DestinationPieChart.tsx` — Pie/donut chart for destination distribution
- `components/charts/CountryBarChart.tsx` — Horizontal bar chart for geographic data
- `components/charts/HourlyBarChart.tsx` — Vertical bar chart for hourly activity

All charts must use brand colors:

- Primary line/bar: `#2563eb` (brand-blue)
- Secondary: `#0891b2` (brand-cyan)
- Tertiary: `#84cc16` (brand-lime)
- Additional destinations: use a palette derived from these three

### 3.5 Analytics Server Actions

Create **`app/dashboard/analytics/actions.ts`**:

```typescript
"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function getClicksByDay(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase.rpc("get_clicks_by_day", {
    p_link_id: linkId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getClicksByDestination(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase.rpc("get_clicks_by_destination", {
    p_link_id: linkId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getClicksByCountry(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase.rpc("get_clicks_by_country", {
    p_link_id: linkId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getClicksByHour(linkId: string, date: string) {
  const { data, error } = await supabase.rpc("get_clicks_by_hour", {
    p_link_id: linkId,
    p_date: date,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function getTotalClicks(startDate: string, endDate: string) {
  const { count, error } = await supabase
    .from("click_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  if (error) throw new Error(error.message);
  return count || 0;
}

export async function getClickEvents(
  linkId: string | null,
  startDate: string,
  endDate: string,
  page: number = 1,
  pageSize: number = 50,
) {
  let query = supabase
    .from("click_events")
    .select("*", { count: "exact" })
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (linkId) {
    query = query.eq("link_id", linkId);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { events: data || [], total: count || 0, page, pageSize };
}

export async function exportClicksCSV(
  linkId: string | null,
  startDate: string,
  endDate: string,
): Promise<string> {
  let query = supabase
    .from("click_events")
    .select(
      "created_at, link_id, resolved_destination_url, went_to_main, country_code, user_agent, referer",
    )
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (linkId) {
    query = query.eq("link_id", linkId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  // Build CSV
  const headers = [
    "Fecha",
    "Enlace",
    "Destino",
    "Principal",
    "País",
    "User Agent",
    "Referente",
  ];
  const rows = (data || []).map((e) =>
    [
      e.created_at,
      e.link_id,
      e.resolved_destination_url,
      e.went_to_main ? "Sí" : "No",
      e.country_code || "Desconocido",
      `"${(e.user_agent || "").replace(/"/g, '""')}"`,
      e.referer || "",
    ].join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}
```

### 3.6 Real-Time Click Counter (Optional Enhancement)

If time permits, implement a real-time click counter using Supabase Realtime subscriptions:

Create **`components/RealtimeClickCounter.tsx`**:

```typescript
"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

export function RealtimeClickCounter({ linkId }: { linkId: string }) {
  const [recentClicks, setRecentClicks] = useState(0);

  useEffect(() => {
    const channel = supabase
      .channel(`clicks:${linkId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "click_events",
          filter: `link_id=eq.${linkId}`,
        },
        () => setRecentClicks((prev) => prev + 1),
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [linkId]);

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-lime-100 text-lime-700 border border-lime-200 animate-pulse">
      +{recentClicks} en tiempo real
    </span>
  );
}
```

### 3.7 Public Analytics Sharing (Linkly `.stats` Pattern)

Create **`app/api/analytics/[linkId]/public/route.ts`**:

- Returns public-facing click count for a given link (total clicks only, no PII)
- JSON response: `{ link_id, total_clicks, period: "all_time" }`
- No auth required

Create **`app/analytics/[linkId]/page.tsx`**:

- Public page showing total clicks for a link
- Minimal UI: RouteGenius branding, link nickname, total click count, last 7 days trend sparkline
- No login required to view
- This mirrors Linkly's `.stats` suffix feature

### 3.8 Bot Filtering

When the "Filtrar bots" toggle is active, exclude click events where `user_agent` matches known bot patterns. Implement a utility:

Create **`lib/bot-filter.ts`**:

```typescript
const BOT_PATTERNS = [
  /bot/i,
  /crawl/i,
  /spider/i,
  /slurp/i,
  /mediapartners/i,
  /facebookexternalhit/i,
  /linkedinbot/i,
  /twitterbot/i,
  /whatsapp/i,
  /telegrambot/i,
  /google-structured-data/i,
  /bingbot/i,
  /yandex/i,
  /baiduspider/i,
  /duckduckbot/i,
  /semrush/i,
  /ahrefs/i,
  /mj12bot/i,
  /dotbot/i,
  /pingdom/i,
  /uptimerobot/i,
  /headlesschrome/i,
];

export function isBot(userAgent: string): boolean {
  return BOT_PATTERNS.some((pattern) => pattern.test(userAgent));
}
```

Apply filtering in analytics queries by adding a `WHERE user_agent NOT SIMILAR TO '%(bot|crawl|spider)%'` clause, or filter client-side after fetching if simpler.

---

## 4. TASK C — Integration & Navigation

### 4.1 Updated Route Structure

After implementation, the route map should be:

```
/login                              → Login page (Google OAuth)
/dashboard                          → Link list + editor (moved from /)
/dashboard/analytics                → Analytics overview (all links)
/dashboard/analytics/[linkId]       → Per-link analytics
/analytics/[linkId]                 → Public analytics (no auth)
/api/auth/[...all]                  → Better Auth handler
/api/redirect/[linkId]              → Redirect endpoint (UNCHANGED, public)
/api/analytics/[linkId]/public      → Public analytics API
```

### 4.2 Dashboard Navigation Component

Create **`components/DashboardNav.tsx`**:

- Horizontal top navigation bar (or sidebar — agent's discretion based on best UX)
- Items:
  1. **"Mis Enlaces"** → `/dashboard` (Link icon from lucide)
  2. **"Analíticas"** → `/dashboard/analytics` (BarChart3 icon)
- Active state indicator (brand-blue underline or background)
- User section: avatar (first letter of name in circle), email, "Cerrar Sesión" button

### 4.3 Dashboard Links Page

Move the existing `LinkEditorForm` functionality to **`app/dashboard/page.tsx`**:

- Retain ALL existing functionality: auto-save, simulation, weight calculation
- Add a link at the top: "Ver Analíticas →" that navigates to `/dashboard/analytics/{linkId}`
- Update `Header.tsx` badge from "Fase 1 MVP" to "Fase 2"

### 4.4 Error Handling

- Wrap all dashboard pages in an error boundary: **`app/dashboard/error.tsx`**
  - Spanish error message: "Algo salió mal. Por favor, recargue la página."
  - "Reintentar" button
  - Log errors to GCP via `reportError()` (server) or `logError()` (client)

- Create **`app/dashboard/loading.tsx`**:
  - Skeleton UI with pulsing placeholder cards
  - Brand gradient spinner

### 4.5 Session-Aware Header Update

Update **`components/Header.tsx`**:

- When user is authenticated, show their avatar/email in the header right section
- Replace the "Fase 1 MVP" badge with "Fase 2"
- Add a "Cerrar Sesión" button

---

## 5. TECHNICAL REQUIREMENTS

### 5.1 TypeScript Strict Mode

- All new code must compile with zero TypeScript errors
- No `any` types — use proper interfaces
- All Server Actions must return typed results: `{ success: true, data: T } | { success: false, error: string }`

### 5.2 Component Architecture

- **Server Components** by default — use `"use client"` only when the component needs:
  - Event handlers (`onClick`, `onChange`)
  - React hooks (`useState`, `useEffect`, `useSession`)
  - Browser APIs (`window`, `navigator`)
- **Server Actions** for all data mutations (in `actions.ts` files)
- **Route Handlers** only for auth API and public analytics API

### 5.3 Styling Standards

- Use Tailwind utility classes exclusively
- Use brand tokens from `globals.css`: `text-brand-blue`, `bg-brand-cyan`, `text-brand-gradient`, `page-bg`, `card-bg`
- Responsive: mobile-first with `sm:`, `md:`, `lg:` breakpoints
- All card layouts use `card-bg rounded-2xl border border-gray-200/80 shadow-lg` pattern (match existing `SimulationResults.tsx`)
- Framer Motion for subtle animations (already a dependency)

### 5.4 Performance

- Redirect endpoint latency must remain under 200ms P95 — click recording must not block the response
- Analytics queries should use pre-computed aggregations (materialized view) when possible
- Pagination for click event tables (never load more than 50 rows at once)
- Charts should lazy-load (`dynamic(() => import(...), { ssr: false })`)

### 5.5 Security

- Never expose `SUPABASE_SERVICE_ROLE_KEY` to the client
- All Supabase admin queries happen in Server Actions or Route Handlers only
- Validate all user inputs with TypeScript types (Zod optional but recommended)
- Auth cookies must be `httpOnly`, `secure` (in production), `sameSite: lax`
- Rate limiting on the redirect endpoint remains active and unchanged

---

## 6. FILES TO CREATE (Summary)

| File                                         | Type             | Purpose                                                          |
| -------------------------------------------- | ---------------- | ---------------------------------------------------------------- |
| `lib/auth.ts`                                | Server           | Better Auth configuration with Google OAuth + domain restriction |
| `lib/auth-client.ts`                         | Client           | Auth client helpers (signIn, signOut, useSession)                |
| `lib/auth-session.ts`                        | Server           | Server-side session utility                                      |
| `lib/bot-filter.ts`                          | Shared           | Bot user-agent detection                                         |
| `app/api/auth/[...all]/route.ts`             | Route Handler    | Better Auth catch-all endpoint                                   |
| `app/login/page.tsx`                         | Client Component | Login landing page with Google OAuth                             |
| `app/dashboard/layout.tsx`                   | Server Component | Authenticated layout with nav                                    |
| `app/dashboard/page.tsx`                     | Mixed            | Link editor (moved from root)                                    |
| `app/dashboard/analytics/page.tsx`           | Mixed            | Analytics overview dashboard                                     |
| `app/dashboard/analytics/[linkId]/page.tsx`  | Mixed            | Per-link analytics                                               |
| `app/dashboard/analytics/actions.ts`         | Server           | Analytics data fetching actions                                  |
| `app/dashboard/error.tsx`                    | Client Component | Error boundary                                                   |
| `app/dashboard/loading.tsx`                  | Server Component | Loading skeleton                                                 |
| `app/analytics/[linkId]/page.tsx`            | Server Component | Public analytics page                                            |
| `app/api/analytics/[linkId]/public/route.ts` | Route Handler    | Public analytics API                                             |
| `components/DashboardNav.tsx`                | Client Component | Dashboard navigation                                             |
| `components/RealtimeClickCounter.tsx`        | Client Component | Live click counter                                               |
| `components/charts/ClicksLineChart.tsx`      | Client Component | Time-series chart                                                |
| `components/charts/DestinationPieChart.tsx`  | Client Component | Destination distribution                                         |
| `components/charts/CountryBarChart.tsx`      | Client Component | Geographic distribution                                          |
| `components/charts/HourlyBarChart.tsx`       | Client Component | Hourly activity chart                                            |
| `middleware.ts`                              | Middleware       | Route protection                                                 |

## 7. FILES TO MODIFY (Summary)

| File                                 | Change                                                 |
| ------------------------------------ | ------------------------------------------------------ |
| `app/api/redirect/[linkId]/route.ts` | Add fire-and-forget click event insert to Supabase     |
| `app/page.tsx`                       | Simplify to redirect or show login prompt              |
| `app/layout.tsx`                     | No changes needed (font + GA4 remain)                  |
| `components/Header.tsx`              | Add session-aware user display, update badge to Fase 2 |
| `package.json`                       | Add `better-auth` and `recharts` dependencies          |

## 8. FILES THAT MUST NOT BE MODIFIED

| File                          | Reason                                                        |
| ----------------------------- | ------------------------------------------------------------- |
| `lib/rotation.ts`             | Core probabilistic algorithm — mathematically proven          |
| `lib/types.ts`                | Extend only (add new interfaces), do not change existing ones |
| `lib/rate-limit.ts`           | Already working — no changes needed                           |
| `lib/gcp/error-reporting.ts`  | Already working                                               |
| `lib/firebase/config.ts`      | Already working                                               |
| `lib/firebase/crashlytics.ts` | Already working                                               |
| `lib/storage/gcs.ts`          | Already working                                               |

---

## 9. VERIFICATION CHECKLIST

After implementation, verify all of the following:

```bash
# 1. TypeScript compilation
npx tsc --noEmit

# 2. Lint
npm run lint

# 3. Build
npm run build

# 4. Manual testing
npm run dev

# 5. Auth flow
# - Visit http://localhost:3070 → should redirect to /login
# - Click "Iniciar Sesión con Google" → Google OAuth flow
# - Sign in with a @topnetworks.co email → should redirect to /dashboard
# - Sign in with a non-TopNetworks email → should show error message in Spanish
# - Visit /dashboard while authenticated → should show link editor
# - Visit /dashboard/analytics → should show analytics dashboard
# - Click "Cerrar Sesión" → should redirect to /login

# 6. Redirect endpoint (still public, no auth required)
curl -s -o /dev/null -w "%{redirect_url}\n" http://localhost:3070/api/redirect/demo-link-001

# 7. Click recording
# After a redirect, check Supabase click_events table for new row

# 8. Analytics display
# Visit /dashboard/analytics and verify charts render with data

# 9. Public analytics
# Visit /analytics/demo-link-001 → should show public click count

# 10. Spanish UI audit
# Grep for English strings in components/ and app/ directories
# Every user-facing string must be in Spanish
```

---

## 10. EXECUTION ORDER

Implement in this exact sequence to avoid dependency issues:

1. **Install dependencies** (`better-auth`, `recharts`)
2. **Create `lib/auth.ts`**, `lib/auth-client.ts`, `lib/auth-session.ts`
3. **Create `app/api/auth/[...all]/route.ts`**
4. **Run Better Auth migration** (generate DB tables)
5. **Create `middleware.ts`**
6. **Create `app/login/page.tsx`**
7. **Create `app/dashboard/layout.tsx`** and `components/DashboardNav.tsx`
8. **Move link editor to `app/dashboard/page.tsx`** (update `app/page.tsx`)
9. **Create Supabase click_events schema** (run SQL)
10. **Update redirect endpoint** (add click recording)
11. **Create analytics Server Actions** (`app/dashboard/analytics/actions.ts`)
12. **Create chart components** (`components/charts/`)
13. **Create analytics pages** (`app/dashboard/analytics/page.tsx`, `[linkId]/page.tsx`)
14. **Create public analytics** (`app/analytics/[linkId]/page.tsx`, API route)
15. **Create error/loading states** (`error.tsx`, `loading.tsx`)
16. **Update Header.tsx** (session-aware, Fase 2 badge)
17. **Verify:** `tsc --noEmit && npm run lint && npm run build`
18. **Test all flows manually**

---

**End of Coder Agent Prompt**

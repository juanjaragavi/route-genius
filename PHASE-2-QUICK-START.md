# Phase 2 Quick Start Guide — AI Agent Onboarding

> **⏱️ 10-Minute Setup** | Get started building RouteGenius Phase 2 in under 10 minutes.

---

## 🎯 Your Mission

Transform RouteGenius from a file-based MVP → production-grade SaaS platform with:

- ✅ Supabase database (replaces file storage)
- ✅ Better Auth (email/password + OAuth)
- ✅ Multi-workspace support
- ✅ Click analytics dashboard
- ✅ Rate limiting & security hardening
- ✅ Vercel deployment

---

## 📚 Step 1: Read Documentation (15 mins)

### Priority Order

1. **PHASE-2-AGENT-INSTRUCTIONS.md** (CRITICAL) — Read this first!
   - 8,500+ word comprehensive guide
   - Contains database schema, security rules, implementation checklist
   - **DO NOT START CODING** until you've read this

2. **CLAUDE.MD** (Important) — Phase 1 architectural context
   - Understand existing codebase structure
   - Learn about the rotation algorithm (DO NOT MODIFY)
   - Review Spanish UI requirements

3. **.github/copilot-instructions.md** (Helpful) — Phase 1 development patterns
   - Auto-save pattern
   - Server Action patterns
   - Common gotchas

4. **PHASE-2-SUMMARY.md** (Quick Reference) — High-level overview

---

## 🔍 Step 2: Audit Phase 1 Codebase (10 mins)

### Critical Files to Review

```bash
# 1. Core algorithm (DO NOT MODIFY)
lib/rotation.ts

# 2. Data model (EXTEND, don't replace)
lib/types.ts

# 3. File storage (WILL BE REPLACED with Supabase)
lib/mock-data.ts

# 4. Server Actions (UPDATE to use database)
app/actions.ts

# 5. Redirect endpoint (OPTIMIZE, don't break)
app/api/redirect/[linkId]/route.ts

# 6. Main UI component (ENHANCE with new features)
components/LinkEditorForm.tsx

# 7. Brand tokens (PRESERVE)
app/globals.css
```

### Quick Audit Checklist

- [ ] Read `lib/rotation.ts` — Understand the probabilistic algorithm
- [ ] Read `lib/types.ts` — Memorize the data model
- [ ] Read `lib/mock-data.ts` — Understand current storage pattern
- [ ] Read `app/actions.ts` — Understand Server Action pattern
- [ ] Read `app/api/redirect/[linkId]/route.ts` — Understand redirect flow
- [ ] Scan `components/LinkEditorForm.tsx` — Understand auto-save pattern
- [ ] Review `app/globals.css` — Note brand colors

---

## 🛠️ Step 3: Set Up Development Environment (20 mins)

### Prerequisites

```bash
# Check Node.js version (need 20.x+)
node --version

# Check npm version
npm --version

# Install dependencies
npm install
```

### External Services Setup

1. **Supabase** ✅ Complete
   - Project URL: `https://owestahxdthunutdttye.supabase.co`
   - Anon key and service role key populated in `.env.local`
   - Run SQL schema from PHASE-2-AGENT-INSTRUCTIONS.md (Database Schema section)

2. **Better Auth** ✅ Complete
   - Secret generated via `openssl rand -base64 32`
   - URL set to `http://localhost:3070`

3. **Upstash Redis** (Deferred to Phase 2E)
   - Go to <https://console.upstash.com>
   - Create new Redis database: "RouteGenius Rate Limiting"
   - Copy URL and token

4. **OAuth Providers** ✅ Complete
   - Google OAuth configured in TopFinanzas GCP project (`absolute-brook-452020-d5`)
   - Client ID and secret populated in `.env.local`
   - Redirect URIs set for `localhost:3070`

5. **Google Analytics 4** ✅ Complete
   - Measurement ID: `G-72CP3PVkR3`
   - `<GoogleAnalytics>` component conditionally rendered in `app/layout.tsx`

6. **Firebase** ✅ Complete
   - Linked to TopFinanzas GCP project (`absolute-brook-452020-d5`)
   - Analytics enabled, all config values in `.env.local`
   - `lib/firebase/config.ts` and `lib/firebase/crashlytics.ts` integrated

7. **Google Cloud Storage** ✅ Complete
   - Bucket: `routegenius-media-development`
   - Service account provisioned with Storage Object Admin role
   - Key at `credentials/gcs-service-account.json` (gitignored)
   - `lib/storage/gcs.ts` integrated

### Environment Configuration

```bash
# Copy template
cp .env.example .env.local

# Fill in values (see .env.example for instructions)
nano .env.local
```

**Required variables:**

```env
# Supabase (Live)
NEXT_PUBLIC_SUPABASE_URL=https://owestahxdthunutdttye.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
SUPABASE_SERVICE_ROLE_KEY=xxx

# Better Auth (Live)
BETTER_AUTH_SECRET=xxx
BETTER_AUTH_URL=http://localhost:3070

# Google OAuth (Live)
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Google Analytics 4 (Live)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-72CP3PVkR3

# Firebase (Live)
NEXT_PUBLIC_FIREBASE_API_KEY=xxx
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=absolute-brook-452020-d5.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=absolute-brook-452020-d5
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=absolute-brook-452020-d5.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=xxx

# Google Cloud Storage (Live)
GCS_BUCKET_NAME=routegenius-media-development
GCS_PROJECT_ID=absolute-brook-452020-d5
GCS_CLIENT_EMAIL=xxx
GCS_PRIVATE_KEY=xxx

# Upstash Redis (Deferred to Phase 2E)
UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

# Sentry (Deferred to Phase 2E)
SENTRY_DSN=
```

**18 of 21 variables are live.** Remaining 3 are deferred to Phase 2E.

### Verify Setup

```bash
# Start dev server
npm run dev

# Should see: "Ready on http://localhost:3070"

# Test existing Phase 1 functionality
open http://localhost:3070

# Should see: LinkEditorForm with sample link
```

---

## 📋 Step 4: Implementation Roadmap (8 weeks)

### Phase 2A: Database & Auth (Weeks 1-2)

**Goal:** Replace file storage with Supabase, add authentication

```typescript
// Key files to create/modify:
lib / supabase / client.ts; // NEW: Browser Supabase client
lib / supabase / server.ts; // NEW: Server Supabase client
lib / auth.ts; // NEW: Better Auth setup
lib / database.ts; // NEW: Replace lib/mock-data.ts
app / auth / login / page.tsx; // NEW: Login page
app / auth / signup / page.tsx; // NEW: Signup page
middleware.ts; // NEW: Route protection
app / actions.ts; // MODIFY: Use Supabase instead of file I/O
```

**Checklist:**

- [ ] Run database migration (SQL schema)
- [ ] Create Supabase client utilities
- [ ] Set up Better Auth
- [ ] Build login/signup pages
- [ ] Implement middleware for route protection
- [ ] Replace `lib/mock-data.ts` → `lib/database.ts`
- [ ] Update `app/actions.ts` to use Supabase
- [ ] Test: User can sign up, log in, create workspace

**Success Criteria:**

- User can sign up with email/password
- User can log in and see their workspace
- RLS policies prevent unauthorized access
- Phase 1 link editor still works (now with database)

---

### Phase 2B: Multi-Workspace Support (Week 3)

**Goal:** Support organizations with team management

```typescript
// Key files to create:
components / WorkspaceSwitcher.tsx; // NEW: Workspace selector
app / dashboard / settings / page.tsx; // NEW: Workspace settings
app / dashboard / team / page.tsx; // NEW: Team management
lib / workspace.ts; // NEW: Workspace utilities
```

**Checklist:**

- [ ] Build workspace selector component
- [ ] Create workspace settings page
- [ ] Implement team member management (invite, remove, change roles)
- [ ] Add workspace switcher to header
- [ ] Update all queries to filter by workspace
- [ ] Test: RLS prevents cross-workspace access

---

### Phase 2C: Link Management (Week 4)

**Goal:** Full CRUD operations, custom slugs, scheduling

```typescript
// Key files to create/modify:
app / dashboard / page.tsx; // NEW: Link list view
app / dashboard / links / [id] / page.tsx; // MODIFY: Enhanced editor
components / LinkTable.tsx; // NEW: Link list table
components / LinkFilters.tsx; // NEW: Search/filter/sort
lib / links.ts; // NEW: Link CRUD utilities
```

**Checklist:**

- [ ] Build dashboard link list with table view
- [ ] Implement search/filter/sort
- [ ] Add link CRUD operations (create, edit, delete)
- [ ] Build custom slug editor
- [ ] Add expiration date picker
- [ ] Implement scheduled publish/unpublish
- [ ] Test: All link operations work correctly

---

### Phase 2D: Click Tracking & Analytics (Weeks 5-6)

**Goal:** Real-time analytics dashboard with charts

```typescript
// Key files to create/modify:
app / dashboard / links / [id] / analytics / page.tsx; // NEW: Analytics dashboard
components / charts / LineChart.tsx; // NEW: Clicks over time
components / charts / PieChart.tsx; // NEW: Distribution
components / charts / BarChart.tsx; // NEW: Geographic data
components / RealtimeClickCounter.tsx; // NEW: Live counter
lib / analytics.ts; // NEW: Analytics utilities
app / api / redirect / [linkId] / route.ts; // MODIFY: Insert click events
```

**Checklist:**

- [ ] Update redirect endpoint to insert click events
- [ ] Create analytics aggregation SQL functions
- [ ] Build analytics dashboard page
- [ ] Implement LineChart (clicks over time)
- [ ] Implement PieChart (distribution by destination)
- [ ] Implement BarChart (geographic distribution)
- [ ] Add realtime click counter (Supabase Realtime)
- [ ] Build A/B test reporting
- [ ] Test: Analytics display correctly

---

### Phase 2E: Security & Performance (Week 7)

**Goal:** Harden security, optimize performance

```typescript
// Key files to create/modify:
lib / rate - limit.ts; // NEW: Upstash rate limiting
lib / validation.ts; // NEW: Zod schemas
lib / csrf.ts; // NEW: CSRF protection
components / ErrorBoundary.tsx; // NEW: Error handling
app / api / redirect / [linkId] / route.ts; // MODIFY: Add rate limiting
```

**Checklist:**

- [ ] Implement rate limiting (Upstash Redis)
- [ ] Add URL validation (Zod schemas)
- [ ] Set up CSRF protection
- [ ] Add error boundaries
- [ ] Optimize redirect endpoint (Edge Functions)
- [ ] Set up Sentry error tracking
- [ ] Test: Security vulnerabilities addressed

---

### Phase 2F: Testing & Deployment (Week 8)

**Goal:** Comprehensive testing, production deployment

```typescript
// Key files to create:
__tests__ / lib / rotation.test.ts; // NEW: Algorithm tests
__tests__ / api / redirect.test.ts; // NEW: API tests
tests / e2e / auth.spec.ts; // NEW: E2E auth tests
tests /
  e2e /
  redirect.spec.ts.github / // NEW: E2E redirect tests
  workflows /
  ci.yml; // NEW: CI/CD pipeline
```

**Checklist:**

- [ ] Write unit tests (Vitest)
- [ ] Write integration tests (Playwright)
- [ ] Set up CI/CD (GitHub Actions)
- [ ] Configure production environment variables
- [ ] Deploy to Vercel
- [ ] Set up monitoring dashboards (Sentry, Vercel Analytics)
- [ ] Load test redirect endpoint (10k RPS)
- [ ] Test: All tests pass, deployment successful

---

## 🚨 Critical Rules (Memorize These!)

### IMMUTABLE RULES

1. **DO NOT MODIFY `lib/rotation.ts`** ⚠️
   - The probabilistic algorithm is mathematically proven
   - Only touch this file for critical bugs (get approval first)

2. **PRESERVE 100% SPANISH UI** 🇪🇸
   - All user-facing text must remain in Spanish
   - Examples: "Guardar" not "Save", "Clics" not "Clicks"

3. **MAINTAIN BACKWARD COMPATIBILITY** 🔄
   - Existing tracking URLs must not break
   - `/api/redirect/[linkId]` format is permanent

4. **ENFORCE RLS** 🔒
   - Every database query must respect Row Level Security
   - Never bypass RLS except for public redirect access

5. **VALIDATE ALL INPUT** ✅
   - Use Zod schemas for every form submission
   - Block localhost/private IPs in production

### Performance Targets

- ✅ Redirect latency: P95 <200ms, P99 <500ms
- ✅ Database queries: Indexed lookups, no N+1
- ✅ Edge deployment: Use Vercel Edge Functions
- ✅ Caching: Redis for link configurations

### Code Quality

- ✅ TypeScript strict mode (no `any` types)
- ✅ Test coverage >80% for critical paths
- ✅ ESLint + Prettier compliant
- ✅ TSDoc comments for public functions

---

## 🎯 Your First Task

### **Start with Phase 2A — Database & Auth**

```bash
# 1. Create database migration file
touch migrations/001_initial_schema.sql

# 2. Copy SQL from PHASE-2-AGENT-INSTRUCTIONS.md
# (Database Schema section)

# 3. Run migration in Supabase SQL Editor
# https://supabase.com/dashboard/project/_/sql

# 4. Create Supabase client utilities
mkdir -p lib/supabase
touch lib/supabase/client.ts
touch lib/supabase/server.ts

# 5. Set up Better Auth
touch lib/auth.ts

# 6. Build authentication pages
mkdir -p app/(auth)/login
touch app/(auth)/login/page.tsx
mkdir -p app/(auth)/signup
touch app/(auth)/signup/page.tsx

# 7. Start implementing!
code .
```

---

## 🧪 Testing Workflow

After each phase, test thoroughly:

```bash
# 1. Type check
npm run type-check

# 2. Lint
npm run lint

# 3. Format
npm run format

# 4. Unit tests
npm test

# 5. E2E tests
npm run test:e2e

# 6. Manual testing
npm run dev
# Test all features in browser
```

---

## 📞 Getting Help

### Documentation Hierarchy

1. **PHASE-2-AGENT-INSTRUCTIONS.md** — Comprehensive guide (read first!)
2. **CLAUDE.MD** — Phase 1 context
3. **.github/copilot-instructions.md** — Development patterns
4. **PHASE-2-SUMMARY.md** — Quick reference

### Common Questions

**Q: Can I modify `lib/rotation.ts`?**
A: NO. Never. Only for critical bugs with approval.

**Q: Do I need to preserve Spanish UI?**
A: YES. 100% Spanish. Non-negotiable.

**Q: Can I use a different database?**
A: NO. Supabase/PostgreSQL is required.

**Q: What if I encounter a blocker?**
A: Check documentation → Search codebase → Ask clarifying question

---

## ✅ Final Checklist Before Starting

- [x] Read PHASE-2-AGENT-INSTRUCTIONS.md (all 8,500 words)
- [x] Read CLAUDE.MD
- [x] Reviewed all Phase 1 code files
- [x] Set up Supabase project
- [x] Set up Better Auth
- [ ] Set up Upstash Redis (deferred to Phase 2E)
- [x] Copied `.env.example` → `.env.local` and filled in values
- [x] Ran `npm install` (includes `@next/third-parties`, `firebase`, `@google-cloud/storage`)
- [x] Tested Phase 1 functionality works locally (`npm run dev`)
- [ ] Created project board (GitHub Projects) for tracking
- [x] Google OAuth configured (TopFinanzas GCP project)
- [x] GA4 property created (Measurement ID: `G-72CP3PVkR3`)
- [x] Firebase linked to GCP project
- [x] GCS bucket created with service account
- [ ] Ready to start Phase 2A!

---

### **You've got this! 🚀**

Build an amazing RouteGenius Phase 2. Follow the instructions, test thoroughly, and never compromise on quality.

**Document Version:** 1.1.0
**Last Updated:** 2026-02-13

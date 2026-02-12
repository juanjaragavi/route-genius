# RouteGenius Phase 2 — Executive Summary

## Overview

This document provides a high-level summary of the Phase 2 transformation plan for RouteGenius, converting it from a file-based MVP into a production-grade, multi-tenant SaaS platform.

---

## 📊 Phase 1 → Phase 2 Comparison

| Aspect             | Phase 1 (Current)                            | Phase 2 (Target)                             |
| ------------------ | -------------------------------------------- | -------------------------------------------- |
| **Storage**        | File-based JSON (`.route-genius-store.json`) | Supabase PostgreSQL with RLS                 |
| **Authentication** | None (single user)                           | Better Auth + OAuth (Google, GitHub)         |
| **Multi-tenancy**  | Single workspace (hard-coded)                | Full workspace management with teams         |
| **Click Tracking** | Console.log only                             | PostgreSQL time-series + analytics dashboard |
| **Rate Limiting**  | None (open endpoint)                         | Upstash Redis sliding window (100 req/10s)   |
| **Security**       | No URL validation                            | Full input validation + CSRF protection      |
| **Analytics**      | Monte Carlo simulation only                  | Real-time dashboards + A/B test reporting    |
| **Deployment**     | Local dev server                             | Vercel Edge Functions (global CDN)           |
| **Testing**        | Zero tests                                   | 80%+ coverage (Vitest + Playwright)          |
| **Performance**    | Unknown                                      | <200ms P95 redirect latency                  |

---

## 🎯 Core Objectives

### Technical Goals

1. **Database Migration** — Replace file storage with Supabase/PostgreSQL
2. **Authentication** — Implement Better Auth with email/password + social login
3. **Multi-Workspace** — Support organizations with team management and RLS
4. **Analytics Dashboard** — Real-time click metrics, charts, and A/B test reporting
5. **Security Hardening** — Rate limiting, URL validation, CSRF protection
6. **Production Deployment** — Vercel with Edge Functions for global performance

### Non-Functional Requirements

- **Zero Regression** — All Phase 1 features continue working
- **Algorithm Preservation** — `lib/rotation.ts` remains completely unchanged
- **Spanish UI** — 100% localization maintained
- **Performance** — Sub-200ms P95 redirect latency
- **Security** — RLS enforced, no cross-tenant data leaks
- **Scalability** — Support 10,000+ concurrent users

---

## 🏗️ Technical Architecture

### Database Schema (PostgreSQL)

```markdown
workspaces (organizations)
├── workspace_members (many-to-many with roles)
├── links (rotation configurations)
│   ├── rotation_rules (weighted destinations)
│   └── click_events (time-series analytics)
```

**Key Features:**

- Row Level Security (RLS) for workspace isolation
- UUID primary keys
- TIMESTAMPTZ for all timestamps
- Indexed lookups for fast queries
- Partitioning strategy for click_events (large table)

### Technology Stack

| Layer         | Technology                   |
| ------------- | ---------------------------- |
| Framework     | Next.js 16.1.6 (App Router)  |
| Language      | TypeScript 5.x (strict mode) |
| Database      | Supabase (PostgreSQL 15+)    |
| Auth          | Better Auth 1.x              |
| Rate Limiting | Upstash Redis                |
| Validation    | Zod 3.x                      |
| Testing       | Vitest + Playwright          |
| Monitoring    | Sentry + Vercel Analytics    |
| Deployment    | Vercel (Edge Functions)      |

---

## 📋 Implementation Roadmap

### Phase 2A: Database & Auth (Weeks 1-2)

- Set up Supabase project and database schema
- Implement RLS policies
- Build Better Auth integration
- Create authentication pages (`/login`, `/signup`)
- Migrate `lib/mock-data.ts` → `lib/database.ts`
- Update Server Actions to use Supabase

### Phase 2B: Multi-Workspace Support (Week 3)

- Build workspace selector component
- Create workspace settings page
- Implement team member management
- Add workspace switcher to header
- Test RLS prevents cross-workspace access

### Phase 2C: Link Management (Week 4)

- Build dashboard link list with search/filter/sort
- Implement link CRUD operations
- Add custom slug editor
- Build expiration date picker
- Implement scheduled publish/unpublish

### Phase 2D: Click Tracking & Analytics (Weeks 5-6)

- Update redirect endpoint to insert click events
- Create analytics aggregation SQL functions
- Build analytics dashboard with charts
- Implement realtime click counter (Supabase Realtime)
- Add A/B test reporting

### Phase 2E: Security & Performance (Week 7)

- Implement rate limiting (Upstash Redis)
- Add URL validation (Zod schemas)
- Set up CSRF protection
- Add error boundaries
- Optimize redirect endpoint (Edge Functions)
- Set up Sentry error tracking

### Phase 2F: Testing & Deployment (Week 8)

- Write unit tests (Vitest)
- Write integration tests (Playwright)
- Set up CI/CD (GitHub Actions)
- Configure production environment
- Deploy to Vercel
- Load test redirect endpoint

---

## 🔐 Security Enhancements

### Critical Vulnerabilities Fixed

1. **Open Redirect Vulnerability** → URL validation with protocol whitelist
2. **No CSRF Protection** → SameSite cookies + CSRF tokens
3. **No Rate Limiting** → Upstash Redis sliding window (100 req/10s)
4. **No Input Sanitization** → Zod schemas for all inputs
5. **No Access Control** → RLS policies + Better Auth

### Security Measures Implemented

```typescript
// URL Validation
const urlSchema = z.string().url()
  .refine(url => ["http:", "https:"].includes(new URL(url).protocol))
  .refine(url => !["localhost", "127.0.0.1"].includes(new URL(url).hostname));

// Rate Limiting
const { success } = await redirectRateLimit.limit(ip);
if (!success) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

// RLS Policy Example
CREATE POLICY "Users can view links in their workspaces"
  ON links FOR SELECT
  USING (workspace_id IN (SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()));
```

---

## 📊 New Features

### Dashboard Pages

1. **`/login`** — Email/password + OAuth (Google, GitHub)
2. **`/signup`** — Registration with workspace creation
3. **`/dashboard`** — Link list (table view with search/filter/sort)
4. **`/dashboard/links/[id]`** — Enhanced link editor
5. **`/dashboard/links/[id]/analytics`** — Click analytics + charts
6. **`/dashboard/settings`** — Workspace settings
7. **`/dashboard/team`** — Member management
8. **`/[slug]`** — Public redirect (short URL)

### Analytics Dashboard

- **Line Chart** — Clicks over time (daily/hourly)
- **Pie Chart** — Distribution by destination
- **Bar Chart** — Geographic distribution (by country)
- **Realtime Counter** — Live click count (Supabase Realtime)
- **A/B Test Report** — Statistical significance, confidence intervals

### Link Management Features

- Custom slug editor (e.g., `/promo` instead of UUID)
- Expiration date picker
- Scheduled publish/unpublish
- Link duplication
- Bulk operations (delete, disable, export)
- QR code generation

---

## 🚨 Critical Rules

### IMMUTABLE RULES (NEVER VIOLATE)

1. **DO NOT MODIFY `lib/rotation.ts`** — Algorithm is mathematically proven
2. **PRESERVE 100% SPANISH UI** — All user-facing text remains in Spanish
3. **MAINTAIN BACKWARD COMPATIBILITY** — Existing tracking URLs must not break
4. **ENFORCE RLS** — Every database query respects Row Level Security
5. **VALIDATE ALL INPUT** — Use Zod schemas for every user input

### Performance Requirements

- **Redirect latency**: P95 <200ms, P99 <500ms
- **Database queries**: Use indexed lookups, avoid N+1 queries
- **Edge deployment**: Deploy redirect endpoint as Edge Function
- **Caching**: Cache link configurations in Redis
- **Analytics**: Pre-compute daily/hourly aggregates

### Code Quality Standards

- TypeScript strict mode (no `any` types)
- Test coverage >80% for critical paths
- ESLint + Prettier compliant
- TSDoc comments for all public functions
- Graceful error handling (user-friendly Spanish messages)

---

## 📈 Success Metrics

### Technical KPIs

- ✅ Redirect latency: P95 <200ms, P99 <500ms
- ✅ Uptime: 99.9% SLA
- ✅ Test coverage: >80% for critical paths
- ✅ Zero critical/high CVEs
- ✅ RLS effectiveness: 100% workspace isolation

### Product KPIs

- ✅ User onboarding: <5 minutes to create first link
- ✅ Link creation: <30 seconds from dashboard → live link
- ✅ Analytics load time: <2 seconds for 30-day view
- ✅ Mobile responsiveness: 100% features work on mobile

---

## 🛠️ Migration Strategy

### Data Migration (Phase 1 → Phase 2)

```typescript
// Migration script: migrate-phase1-to-phase2.ts
async function migratePhase1Data() {
  // 1. Read .route-genius-store.json
  const phase1Data = JSON.parse(
    fs.readFileSync(".route-genius-store.json", "utf-8"),
  );

  // 2. Create default workspace
  const { data: workspace } = await supabase
    .from("workspaces")
    .insert({
      name: "TopNetworks (Migrated)",
      slug: "topnetworks",
      owner_user_id: ADMIN_USER_ID,
    })
    .select()
    .single();

  // 3. Migrate links
  for (const [linkId, link] of Object.entries(phase1Data)) {
    await supabase.from("links").insert({
      id: link.id,
      workspace_id: workspace.id,
      main_destination_url: link.main_destination_url,
      nickname: link.nickname,
      status: link.status,
      rotation_enabled: link.rotation_enabled,
      created_at: link.created_at,
      updated_at: link.updated_at,
    });

    // 4. Migrate rotation rules
    for (const rule of link.rotation_rules) {
      await supabase.from("rotation_rules").insert({
        id: rule.id,
        link_id: link.id,
        destination_url: rule.destination_url,
        weight_percentage: rule.weight_percentage,
        order_index: rule.order_index,
      });
    }
  }

  console.log("Migration complete! ✅");
}
```

### Rollback Plan

1. Keep `.route-genius-store.json` backup
2. Tag Phase 1 codebase (`git tag v1.0.0-phase1`)
3. Deploy Phase 2 to staging first
4. Run smoke tests on staging
5. Deploy to production with feature flag
6. Monitor error rates for 24 hours
7. If issues detected, revert to Phase 1 (`git revert` + Vercel rollback)

---

## 🎓 Resources for AI Agent

### Required Reading

1. **PHASE-2-AGENT-INSTRUCTIONS.md** — Comprehensive implementation guide (8,500+ words)
2. **CLAUDE.MD** — Phase 1 architectural context
3. **.github/copilot-instructions.md** — Phase 1 development patterns

### External Documentation

- [Next.js App Router Docs](https://nextjs.org/docs/app)
- [Supabase Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Upstash Rate Limiting](https://upstash.com/docs/redis/features/ratelimiting)
- [Vercel Edge Functions](https://vercel.com/docs/functions/edge-functions)

### Code References

- `lib/rotation.ts` — Algorithm reference (do not modify)
- `lib/types.ts` — Data model (extend, don't replace)
- `components/LinkEditorForm.tsx` — Auto-save pattern example
- `app/api/redirect/[linkId]/route.ts` — Redirect endpoint (optimize, don't break)

---

## 🚀 Getting Started

### For AI Coding Agent

1. Read **PHASE-2-AGENT-INSTRUCTIONS.md** in full (critical!)
2. Review Phase 1 codebase (all files in `app/`, `lib/`, `components/`)
3. Set up local development environment:

   ```bash
   npm install
   cp .env.example .env.local
   # Fill in Supabase, Better Auth, Upstash credentials
   npm run dev
   ```

4. Start with Phase 2A (Database & Auth)
5. Follow implementation checklist sequentially
6. Test thoroughly after each phase
7. Document changes in CHANGELOG.md

### For Human Developers

1. Clone repository
2. Review PHASE-2-AGENT-INSTRUCTIONS.md
3. Set up Supabase project (use provided SQL schema)
4. Configure Better Auth (Google + GitHub OAuth)
5. Set up Upstash Redis account
6. Run `npm install` and `npm run dev`
7. Start building! 🚀

---

## 📞 Support

For questions or blockers:

1. Check existing documentation (CLAUDE.MD, copilot-instructions.md)
2. Search codebase for similar patterns
3. Review Phase 1 implementation
4. Ask clarifying questions (use AskUserQuestion if AI agent)
5. Escalate critical decisions (do not modify rotation algorithm without approval)

---

**Mission:** Build a world-class, production-grade RouteGenius Phase 2 that exceeds expectations. Follow the instructions meticulously, test thoroughly, and never compromise on code quality.

---

**Document Version:** 1.0.0
**Last Updated:** 2026-02-11
**Maintained By:** TopNetworks Engineering Team

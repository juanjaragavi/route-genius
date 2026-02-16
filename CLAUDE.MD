# RouteGenius — AI Assistant Guide

**Mission:** Develop a secure, multi-tenant link rotation platform using Next.js 16, Supabase, and Better Auth.

## Project Overview

RouteGenius is a **Phased SaaS platform** for probabilistic traffic distribution. It enables weighted random redirection across multiple destination URLs, organized into projects and links, with full authentication, real-time analytics, and enterprise-grade security.

- **Status:** Phase 2 Complete (Production Replaced MVP).
- **Core Principle:** Strict multi-tenant data isolation via Row Level Security (RLS) and Application-Level Enforcement.
- **Language:** 100% Spanish UI for end-users.

## 🏗 Architecture

### Tech Stack

| Layer             | Technology                                                |
| ----------------- | --------------------------------------------------------- |
| **Framework**     | Next.js 16.1.6 (App Router, Turbopack)                    |
| **Language**      | TypeScript 5.x (Strict Mode)                              |
| **Auth**          | Better Auth 1.x (Google OAuth, PostgreSQL Adaptor)        |
| **Database**      | Supabase PostgreSQL 15+ (RLS Enabled)                     |
| **Rate Limiting** | Supabase PG Function (`check_rate_limit`)                 |
| **Styling**       | Tailwind CSS 4.x                                          |
| **State**         | React Server Actions + `useOptimistic` (where applicable) |

### Data Flow

```mermaid
graph TD
    User[End User] --> Next[Next.js App Router]
    Next --> Auth{Better Auth Session?}
    Auth -- Yes --> Protect[Protected Routes /dashboard]
    Auth -- No --> Login[/login]

    Protect --> Action[Server Action (app/actions.ts)]
    Action --> Helper{requireUserId()}
    Helper -- Valid --> DB[Supabase Data Layer (lib/mock-data.ts)]
    Helper -- Invalid --> Error[Throw Error]

    DB --> Query{Supabase Query}
    Query --> Filter[Filter .eq('user_id', userId)]
    Filter --> RLS[RLS Policy Check (Defense-in-Depth)]
    RLS --> PG[(PostgreSQL)]
```

### Key Directories

- `app/actions.ts`: **CRITICAL SECURITY CHECKPOINT**. All server actions MUST start with `await requireUserId()`.
- `lib/mock-data.ts`: **DATA ACCESS LAYER**. Wraps Supabase queries. MUST include `userId` parameter in every function signature.
- `lib/auth.ts`: Better Auth configuration.
- `lib/rate-limit.ts`: PG-based rate limiting logic.
- `lib/rotation.ts`: **UNTOUCHABLE ALGORITHM**. Probabilistic selection logic.
- `scripts/`: Database migrations (SQL) and utility scripts.

## 🔐 Security Standards

1. **Strict Ownership**: Every `projects` and `links` row has a `user_id`.
2. **Double-Lock Security**:
   - **Layer 1 (App)**: `lib/mock-data.ts` queries MUST explicitly filter by `user_id`.
   - **Layer 2 (DB)**: RLS policies DENY access to `anon` and cross-tenant `authenticated` users as a failsafe.
3. **Authentication**:
   - Use `requireUserId()` in Server Actions.
   - Use `redirect('/login')` in Server Components if session is missing.

## 💻 Development Guidelines

### Coding Style

- **TypeScript**: Strict mode enabled. No `any`. Define interfaces in `lib/types.ts`.
- **Server Actions**: Use "use server" at top of file. Return `{ success: boolean, data?: T, error?: string }`.
- **UI**: Tailwind CSS 4.0. Mobile-first. 100% Spanish text.

### Common Tasks

**1. Create a New Server Action:**

```typescript
export async function myAction() {
  const userId = await requireUserId(); // 1. Auth check
  // 2. Perform logic with userId
  await performDbOp(data, userId);
  revalidatePath("/dashboard");
}
```

**2. Modify Data Access:**

- Update `lib/types.ts` interface.
- Update `lib/mock-data.ts` function (add `userId` param if missing).
- Ensure Supabase query includes `.eq('user_id', userId)`.

**3. Database Schema Change:**

- Create SQL script in `scripts/`.
- Apply via Supabase SQL Editor.
- Update `lib/types.ts` to match.

## ⚠️ Critical Constraints

1. **Do NOT modify `lib/rotation.ts`** without explicit mathematical validation.
2. **Do NOT use Supabase Auth `auth.uid()` in RLS.** We use Better Auth, so RLS policies rely on application logic or custom claims (currently app-logic primarily, RLS is defense-in-depth for anon/public access control).
3. **Do NOT leak PII** in analytics.

## Known Issues

- **Testing**: Zero automated test coverage (Vitest setup pending).
- **Bot Detection**: `lib/bot-filter.ts` logic exists but is not integrated into `api/redirect`.

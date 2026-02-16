# RouteGenius

## **Probabilistic Traffic Rotation Platform**

RouteGenius is a production-grade SaaS platform for probabilistic traffic distribution. It enables weighted random redirection across multiple destination URLs, organized into projects and links, with full authentication, real-time analytics, and enterprise-grade security.

![Next.js 16](https://img.shields.io/badge/Next.js-16.1.6-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.x-38B2AC?logo=tailwind-css)
![License](https://img.shields.io/badge/License-Proprietary-red)

## 🚀 Key Features

- **Advanced Traffic Rotation**: Weighted random distribution algorithm (validated via Monte Carlo simulation).
- **Multi-Tenant Architecture**: Strict data isolation using Row Level Security (RLS) and application-level filtering.
- **Enterprise Security**: Better Auth (Google OAuth), Supabase RLS, input validation, and secure headers.
- **Real-Time Analytics**: Live click tracking, conversion metrics, and geographic data visualization.
- **Modern Stack**: Next.js 16 App Router, React 19, Tailwind 4, Supabase (PostgreSQL + Realtime).

## 🛠 Tech Stack

| Component          | Technology                                                  |
| ------------------ | ----------------------------------------------------------- |
| **Framework**      | Next.js 16.1.6 (App Router, Turbopack)                      |
| **Language**       | TypeScript 5.x (Strict Mode)                                |
| **Database**       | Supabase PostgreSQL 15+ (RLS Enabled)                       |
| **Authentication** | Better Auth 1.x (Google OAuth, PostgreSQL adapter via `pg`) |
| **Styling**        | Tailwind CSS 4.x                                            |
| **Analytics**      | Recharts 3.x, Google Analytics 4                            |
| **State**          | Server Actions, React 19 Hooks                              |
| **Infrastructure** | Vercel (Edge Functions), Google Cloud Storage               |

## 🔐 Security Architecture

RouteGenius implements a **defense-in-depth security model**:

1. **Authentication**: Google OAuth restricted to verified domains (`@topnetworks.co`, `@topfinanzas.com`).
2. **Authorization (RLS)**: Row Level Security policies on `projects` and `links` tables block unauthorized access (deny-by-default for anon role).
3. **Application Security**:
   - Server Actions strictly validate `user_id` ownership (via `requireUserId()` helper).
   - Data access layer (`lib/mock-data.ts`) enforces `user_id` filters on every query.
4. **Public Access**: Dedicated `getLinkForRedirect()` function exposes strictly minimal data for public redirection endpoints only.

## 📂 Project Structure

```bash
route-genius/
├── app/
│   ├── actions.ts              # Server Actions (CRUD with security checks)
│   ├── api/                    # API Routes (Auth, Redirect, Public Analytics)
│   │   ├── auth/               # Better Auth endpoints
│   │   └── redirect/           # High-performance redirect logic
│   ├── dashboard/              # Protected App Interface (Auth guarded)
│   └── login/                  # Authentication Entry
├── components/                 # React Components (Server & Client)
├── lib/
│   ├── auth.ts                 # Better Auth Configuration
│   ├── mock-data.ts            # Data Access Layer (Supabase Wrapper)
│   ├── rotation.ts             # ⚠️ Core Rotation Algorithm (Do Not Modify)
│   └── types.ts                # TypeScript Interfaces (Project, Link)
├── scripts/                    # Database Migrations & Utilities
└── public/                     # Static Assets
```

## ⚡ Getting Started

### Prerequisites

- Node.js 20.x+
- Supabase Project (PostgreSQL)
- Google Cloud Console Project (OAuth Credentials)

### Installation

1. **Clone Repository**:

   ```bash
   git clone https://github.com/juanjaragavi/route-genius.git
   cd route-genius
   ```

2. **Install Dependencies**:

   ```bash
   npm install
   ```

3. **Environment Setup**:
   Copy `.env.example` to `.env.local` and configure:
   - `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (Required for server actions)
   - `DATABASE_URL` (Connection pool for Better Auth)
   - `GOOGLE_CLIENT_ID` / `SECRET`

4. **Database Migration**:
   Run the SQL scripts in `scripts/` to set up tables and RLS policies.

5. **Run Development Server**:

   ```bash
   npm run dev
   ```

## 📜 License

Proprietary software of TopNetworks, Inc. All rights reserved.

# Infrastructure Configuration

**Project:** RouteGenius
**GCP Project ID:** `absolute-brook-452020-d5`
**Organization:** TopNetworks

## 1. Google Cloud Platform (GCP) Services

All services are provisioned in the **TopFinanzas** project.

### Google OAuth 2.0

- **Credential Name:** RouteGenius Web Client
- **Authorized Origins:** `http://localhost:3070`, `https://route-genius.vercel.app`, `https://route.topnetworks.co`
- **Redirect URIs:** `/api/auth/callback/google`
- **Domain Restriction:** `@topnetworks.co`, `@topfinanzas.com`

### Google Analytics 4

- **Measurement ID:** `G-72CP3PVkR3`
- **Integration:** `@next/third-parties/google` in `app/layout.tsx`

### Firebase

- **Project:** Same as GCP (`absolute-brook-452020-d5`)
- **Services:** Analytics, Crashlytics (client-side error reporting)
- **Config:** `lib/firebase/config.ts`

### Cloud Storage (GCS)

- **Bucket:** `route-genius-avatars` (or similar, check `.env.local`)
- **Usage:** User avatar uploads
- **Server SDK:** `@google-cloud/storage` in `lib/storage/gcs.ts`
- **Credentials:** `credentials/gcs-service-account.json` (Gitignored)

## 2. Supabase (PostgreSQL)

- **Project URL:** `https://owestahxdthunutdttye.supabase.co`
- **Database:** PostgreSQL 15+
- **Extensions:** `uuid-ossp` (enabled)
- **Realtime:** Enabled on `click_events`
- **Functions:** `check_rate_limit` (for rate limiting), `get_clicks_by_day` (RPC)

## 3. Environment Variables

See `.env.example` for the template. Key variables:

- `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY`: Client access
- `SUPABASE_SERVICE_ROLE_KEY`: Server-side admin access (bypasses RLS)
- `DATABASE_URL`: Connection pool for Better Auth
- `GOOGLE_CLIENT_ID` / `SECRET`: OAuth
- `NEXT_PUBLIC_GA_MEASUREMENT_ID`: Analytics
- `GOOGLE_DRIVE_CLIENT_ID` / `GOOGLE_DRIVE_CLIENT_SECRET`: Google Drive OAuth
- `GOOGLE_DRIVE_REDIRECT_URI`: Google Drive OAuth callback URL
- `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`: GCP API Key with Picker API enabled (for client-side file browser)
- `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID`: Same as `GOOGLE_DRIVE_CLIENT_ID`, exposed to client for Picker
- `NEXT_PUBLIC_GOOGLE_PICKER_APP_ID`: (Optional) GCP project number for Picker

## 4. Vercel Deployment

- **Project Name:** RouteGenius
- **Framework Preset:** Next.js
- **Environment Variables:** Must match `.env.local` (production values)
- **Functions Region:** `iad1` (US East) or similar

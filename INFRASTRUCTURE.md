# RouteGenius Infrastructure Reference

**Version**: 2.1.0
**Date**: February 16, 2026

## Cloud Providers

| Provider                  | Service        | Purpose                                                                |
| ------------------------- | -------------- | ---------------------------------------------------------------------- |
| **Vercel**                | Hosting        | Next.js deployment (Edge Functions), staging + production              |
| **Google Cloud Platform** | Multiple       | OAuth, Error Reporting, Cloud Storage, Drive API, Picker API, Firebase |
| **Supabase**              | PostgreSQL 15+ | Database (RLS-enabled), Realtime subscriptions, PG Functions           |

## Environment Variables

### Core Application

| Variable              | Required | Description                                                  |
| --------------------- | -------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_APP_URL` | Yes      | Canonical app URL (e.g., `https://route.topnetworks.co`)     |
| `BETTER_AUTH_URL`     | No       | Overrides `NEXT_PUBLIC_APP_URL` for auth (highest priority)  |
| `NODE_ENV`            | Auto     | Controls error reporting mode (`production` → always report) |

### Supabase

| Variable                    | Required | Description                                             |
| --------------------------- | -------- | ------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`  | Yes      | Supabase project URL                                    |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes      | Service-role key (bypasses RLS for server-side queries) |

### Better Auth (Google OAuth)

| Variable               | Required | Description                                                  |
| ---------------------- | -------- | ------------------------------------------------------------ |
| `DATABASE_URL`         | Yes      | PostgreSQL connection string for Better Auth session storage |
| `GOOGLE_CLIENT_ID`     | Yes      | Google OAuth 2.0 Client ID (authentication)                  |
| `GOOGLE_CLIENT_SECRET` | Yes      | Google OAuth 2.0 Client Secret (authentication)              |

### Google Cloud Storage (Avatars)

| Variable                         | Required | Description                                                    |
| -------------------------------- | -------- | -------------------------------------------------------------- |
| `GCS_PROJECT_ID`                 | Yes      | GCP project ID                                                 |
| `GCS_CLIENT_EMAIL`               | Yes      | GCS service account email                                      |
| `GCS_PRIVATE_KEY`                | Yes      | GCS service account private key (PEM format)                   |
| `GCS_BUCKET_NAME`                | No       | Bucket name (default: `routegenius-media-development`)         |
| `GOOGLE_APPLICATION_CREDENTIALS` | No       | Keyfile path (default: `credentials/gcs-service-account.json`) |

### Google Drive Backup

| Variable                     | Required | Description                                                                          |
| ---------------------------- | -------- | ------------------------------------------------------------------------------------ |
| `GOOGLE_DRIVE_CLIENT_ID`     | Yes      | OAuth 2.0 Client ID (Drive access)                                                   |
| `GOOGLE_DRIVE_CLIENT_SECRET` | Yes      | OAuth 2.0 Client Secret (Drive access)                                               |
| `GOOGLE_DRIVE_REDIRECT_URI`  | No       | OAuth callback URL (default: `http://localhost:3070/api/auth/google-drive/callback`) |

### Google Picker (Client-Side)

| Variable                             | Required | Description                              |
| ------------------------------------ | -------- | ---------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_PICKER_API_KEY`  | Yes      | GCP API key with Picker API enabled      |
| `NEXT_PUBLIC_GOOGLE_DRIVE_CLIENT_ID` | Yes      | OAuth 2.0 Client ID (client-side Picker) |
| `NEXT_PUBLIC_GOOGLE_PICKER_APP_ID`   | Yes      | GCP project number for Picker            |

### Firebase (Client-Side Analytics & Crashlytics)

| Variable                                   | Required | Description             |
| ------------------------------------------ | -------- | ----------------------- |
| `NEXT_PUBLIC_FIREBASE_API_KEY`             | Yes      | Firebase API key        |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`         | Yes      | Firebase auth domain    |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID`          | Yes      | Firebase project ID     |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`      | Yes      | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes      | FCM sender ID           |
| `NEXT_PUBLIC_FIREBASE_APP_ID`              | Yes      | Firebase app ID         |

### Google Analytics

| Variable                        | Required | Description        |
| ------------------------------- | -------- | ------------------ |
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Yes      | GA4 measurement ID |

### Development Flags

| Variable                | Required | Description                               |
| ----------------------- | -------- | ----------------------------------------- |
| `DISABLE_RATE_LIMITING` | No       | Set `"true"` to skip rate limiting in dev |

**Total**: 25 environment variables.

## Deployment Environments

| Environment | URL                               | Branch    | Auto-deploy  |
| ----------- | --------------------------------- | --------- | ------------ |
| Production  | `https://route.topnetworks.co`    | `main`    | Yes (Vercel) |
| Staging     | `https://route-genius.vercel.app` | `staging` | Yes (Vercel) |
| Local Dev   | `http://localhost:3070`           | `dev`     | N/A          |

### Promotion Pipeline

```
dev  ──PR──▶  staging  ──PR──▶  main
```

All code enters via `dev`. Merges to `staging` and `main` require approved Pull Requests.

## Security Configuration

### Authentication

- **Provider**: Better Auth 1.x with Google OAuth 2.0
- **Domain Restriction**: `@topnetworks.co`, `@topfinanzas.com`
- **Session**: 7-day expiry, daily refresh, 5-minute cookie cache
- **Trusted Origins**: `localhost:3070`, `route-genius.vercel.app`, `route.topnetworks.co`
- **Cookie Prefix**: `__Secure-` on HTTPS, plain on HTTP (localhost)

### Rate Limiting

- **Endpoint**: `/api/redirect/[linkId]`
- **Limit**: 100 requests per 10-second sliding window per IP
- **Implementation**: Supabase PG function `check_rate_limit()`
- **Failure Mode**: Fails open (allows through on DB errors)
- **Bypass**: Set `DISABLE_RATE_LIMITING=true` in development

### Database Security

- **RLS**: Enabled on `projects` and `links` tables
- **Default Policy**: Deny-all (no permissive policies for anon/authenticated)
- **App Enforcement**: All queries filter by `user_id` at application level
- **Service Role**: Server-side operations use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)

### Google Drive Token Storage

- **Cookie**: `rg_gdrive_tokens` (HTTP-only, Secure on HTTPS)
- **Expiry**: 30 days
- **Scope**: `https://www.googleapis.com/auth/drive.file`
- **Backup Folder**: `RouteGenius Backups` (auto-created in Drive root)

## Next.js Configuration

- **Dev Port**: 3070 (`--port 3070` in `package.json`)
- **Turbopack**: Enabled in dev mode
- **Font**: Poppins (weights 300–700) via `next/font/google`
- **External Images**: `storage.googleapis.com`, `lh3.googleusercontent.com`
- **Favicon**: `https://storage.googleapis.com/media-topfinanzas-com/favicon.png`
- **Middleware**: `proxy.ts` (Next.js 16 convention, not `middleware.ts`)

## SQL Migrations

| Script                                         | Purpose                                    |
| ---------------------------------------------- | ------------------------------------------ |
| `scripts/001-create-projects-links-tables.sql` | Create `projects` and `links` tables       |
| `scripts/002-add-user-id-enable-rls.sql`       | Add `user_id` columns, enable RLS policies |

Apply via Supabase SQL Editor in order. Schema changes must be scripted and versioned.

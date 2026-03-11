# RouteGenius — PostgreSQL Migration to Google Cloud SQL

**Version**: 1.0.0
**Date**: March 11, 2026
**Target**: Migrate Supabase PostgreSQL → Google Cloud SQL for PostgreSQL 15

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Phase 1 — Provision Cloud SQL Instance](#phase-1--provision-cloud-sql-instance)
4. [Phase 2 — Export Data from Supabase](#phase-2--export-data-from-supabase)
5. [Phase 3 — Import Schema & Data into Cloud SQL](#phase-3--import-schema--data-into-cloud-sql)
6. [Phase 4 — Create PG Functions (RPCs)](#phase-4--create-pg-functions-rpcs)
7. [Phase 5 — Configure Networking & Security](#phase-5--configure-networking--security)
8. [Phase 6 — Update Application Configuration](#phase-6--update-application-configuration)
9. [Phase 7 — Verification & Smoke Tests](#phase-7--verification--smoke-tests)
10. [Phase 8 — Cutover Checklist](#phase-8--cutover-checklist)
11. [Rollback Plan](#rollback-plan)
12. [Console-Only Steps (Reference)](#console-only-steps-reference)

---

## Overview

RouteGenius uses **two** PostgreSQL databases:

| Database           | Purpose                                                             | Current Host        | Migration Status             |
| ------------------ | ------------------------------------------------------------------- | ------------------- | ---------------------------- |
| **Better Auth DB** | Sessions, users (`user`, `session`, `account`, `verification`)      | Supabase PostgreSQL | **Target of this migration** |
| **App Data DB**    | `projects`, `links`, `click_events`, `rate_limits` + 5 PG functions | Supabase PostgreSQL | **Target of this migration** |

Both databases are accessed via:

- **Supabase JS Client** (`@supabase/supabase-js`) — App data (uses `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`)
- **`pg` Pool** — Better Auth (uses `DATABASE_URL` connection string)

### Database Objects to Migrate

| Object Type            | Names                                                                                                                         |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **Tables**             | `projects`, `links`, `click_events`, `rate_limits`                                                                            |
| **Better Auth Tables** | `user`, `session`, `account`, `verification`                                                                                  |
| **PG Functions**       | `get_clicks_by_day()`, `get_clicks_by_destination()`, `get_clicks_by_country()`, `get_clicks_by_hour()`, `check_rate_limit()` |
| **Indexes**            | 17 custom indexes across all tables                                                                                           |
| **RLS Policies**       | Enabled on `projects`, `links`, `click_events` (deny-all for non-service-role)                                                |

---

## Prerequisites

### 1. Install & Configure gcloud CLI

```bash
# Install gcloud SDK (macOS)
brew install google-cloud-sdk

# Authenticate
gcloud auth login

# Set project
gcloud config set project <YOUR_GCP_PROJECT_ID>

# Enable required APIs
gcloud services enable sqladmin.googleapis.com
gcloud services enable servicenetworking.googleapis.com
gcloud services enable compute.googleapis.com
```

### 2. Install PostgreSQL Client Tools

```bash
brew install postgresql@15
```

### 3. Obtain Supabase Connection Details

Retrieve the direct PostgreSQL connection string from **Supabase Dashboard → Project Settings → Database → Connection string (URI)**.

Format:

```
postgresql://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:5432/postgres
```

Store this temporarily:

```bash
export SUPABASE_DB_URL="postgresql://postgres.[project-ref]:[password]@db.[project-ref].supabase.co:5432/postgres"
```

> **Note:** Use the **direct connection** (port `5432`), not the pooler (port `6543`), for `pg_dump`.

---

## Phase 1 — Provision Cloud SQL Instance

### 1.1 Create the Cloud SQL Instance

```bash
gcloud sql instances create routegenius-db \
  --database-version=POSTGRES_15 \
  --tier=db-custom-1-3840 \
  --region=us-central1 \
  --storage-type=SSD \
  --storage-size=10GB \
  --storage-auto-increase \
  --availability-type=REGIONAL \
  --backup-start-time=04:00 \
  --enable-bin-log \
  --maintenance-window-day=SUN \
  --maintenance-window-hour=6 \
  --database-flags=max_connections=100,log_min_duration_statement=1000 \
  --root-password="$(openssl rand -base64 32)"
```

> **Save the root password** securely — you'll need it for the initial setup.

**Parameter rationale:**

| Parameter                 | Value                 | Reason                                               |
| ------------------------- | --------------------- | ---------------------------------------------------- |
| `--tier`                  | `db-custom-1-3840`    | 1 vCPU, 3.75 GB RAM — adequate for current traffic   |
| `--availability-type`     | `REGIONAL`            | High availability with automatic failover            |
| `--storage-type`          | `SSD`                 | Low-latency reads for redirect endpoint (<200ms P95) |
| `--storage-auto-increase` | enabled               | Prevents disk-full incidents                         |
| `--database-flags`        | `max_connections=100` | Matches Vercel serverless concurrency                |

### 1.2 Create Application Database

```bash
gcloud sql databases create routegenius \
  --instance=routegenius-db \
  --charset=UTF8 \
  --collation=en_US.UTF8
```

### 1.3 Create Application User

```bash
# Generate a strong password
export CLOUDSQL_APP_PASSWORD="$(openssl rand -base64 32)"
echo "Save this password: $CLOUDSQL_APP_PASSWORD"

gcloud sql users create routegenius_app \
  --instance=routegenius-db \
  --password="$CLOUDSQL_APP_PASSWORD"
```

### 1.4 Create a Read-Only Analytics User (Optional)

```bash
export CLOUDSQL_READONLY_PASSWORD="$(openssl rand -base64 32)"

gcloud sql users create routegenius_readonly \
  --instance=routegenius-db \
  --password="$CLOUDSQL_READONLY_PASSWORD"
```

---

## Phase 2 — Export Data from Supabase

### 2.1 Full Schema + Data Dump

```bash
# Export full database (schema + data)
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --format=custom \
  --file=routegenius_full_backup.dump
```

### 2.2 Schema-Only Dump (for review)

```bash
pg_dump "$SUPABASE_DB_URL" \
  --schema-only \
  --no-owner \
  --no-acl \
  --file=routegenius_schema_only.sql
```

### 2.3 Table-by-Table Export (Alternative)

If the full dump includes Supabase-internal schemas you don't need, export only the relevant tables:

```bash
# App data tables
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --table=projects \
  --table=links \
  --table=click_events \
  --table=rate_limits \
  --format=custom \
  --file=routegenius_app_data.dump

# Better Auth tables
pg_dump "$SUPABASE_DB_URL" \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  --table='"user"' \
  --table=session \
  --table=account \
  --table=verification \
  --format=custom \
  --file=routegenius_auth_data.dump
```

> **Important:** The `user` table name requires double-quoting because `user` is a PostgreSQL reserved keyword.

### 2.4 Upload Dump to GCS (for Cloud SQL import)

```bash
# Create a GCS bucket for migration artifacts
gsutil mb -l us-central1 gs://routegenius-migration-temp/

# Upload the dump files
gsutil cp routegenius_app_data.dump gs://routegenius-migration-temp/
gsutil cp routegenius_auth_data.dump gs://routegenius-migration-temp/

# Grant Cloud SQL service account read access
SA_EMAIL=$(gcloud sql instances describe routegenius-db \
  --format='value(serviceAccountEmailAddress)')

gsutil iam ch "serviceAccount:${SA_EMAIL}:objectViewer" \
  gs://routegenius-migration-temp/
```

---

## Phase 3 — Import Schema & Data into Cloud SQL

### 3.1 Option A — Import via gcloud (GCS-Based)

```bash
# Import app data
gcloud sql import sql routegenius-db \
  gs://routegenius-migration-temp/routegenius_app_data.dump \
  --database=routegenius \
  --user=routegenius_app

# Import auth data
gcloud sql import sql routegenius-db \
  gs://routegenius-migration-temp/routegenius_auth_data.dump \
  --database=routegenius \
  --user=routegenius_app
```

> **Note:** `gcloud sql import sql` works with plain SQL files. If using `--format=custom` dumps, use Option B instead.

### 3.2 Option B — Import via Cloud SQL Auth Proxy + pg_restore (Recommended)

This method provides more control and supports custom-format dumps.

#### Install Cloud SQL Auth Proxy

```bash
# macOS
curl -o cloud-sql-proxy \
  https://storage.googleapis.com/cloud-sql-connectors/cloud-sql-proxy/v2.14.3/cloud-sql-proxy.darwin.amd64
chmod +x cloud-sql-proxy
```

#### Start the Proxy

```bash
# Get the instance connection name
INSTANCE_CONN=$(gcloud sql instances describe routegenius-db \
  --format='value(connectionName)')

echo "Connection name: $INSTANCE_CONN"

# Start proxy in background (maps to localhost:5433 to avoid conflicts)
./cloud-sql-proxy --port=5433 "$INSTANCE_CONN" &
PROXY_PID=$!
echo "Proxy PID: $PROXY_PID"
```

#### Restore the Dumps

```bash
# Restore app data
pg_restore \
  --host=127.0.0.1 \
  --port=5433 \
  --username=routegenius_app \
  --dbname=routegenius \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  routegenius_app_data.dump

# Restore auth data
pg_restore \
  --host=127.0.0.1 \
  --port=5433 \
  --username=routegenius_app \
  --dbname=routegenius \
  --no-owner \
  --no-acl \
  --clean \
  --if-exists \
  routegenius_auth_data.dump
```

---

## Phase 4 — Create PG Functions (RPCs)

Cloud SQL doesn't automatically import PG functions from Supabase. Apply them manually.

Connect to the Cloud SQL instance:

```bash
psql \
  --host=127.0.0.1 \
  --port=5433 \
  --username=routegenius_app \
  --dbname=routegenius
```

Then execute each function:

### 4.1 Analytics RPCs

```sql
-- get_clicks_by_day
CREATE OR REPLACE FUNCTION get_clicks_by_day(
  p_link_id TEXT,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE (click_date DATE, total_clicks BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    DATE(created_at) AS click_date,
    COUNT(*)         AS total_clicks
  FROM click_events
  WHERE link_id = p_link_id
    AND created_at >= p_start_date::timestamptz
    AND created_at <= p_end_date::timestamptz
  GROUP BY DATE(created_at)
  ORDER BY click_date;
$$;

-- get_clicks_by_destination
CREATE OR REPLACE FUNCTION get_clicks_by_destination(
  p_link_id TEXT,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE (destination_url TEXT, total_clicks BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    resolved_destination_url AS destination_url,
    COUNT(*)                 AS total_clicks
  FROM click_events
  WHERE link_id = p_link_id
    AND created_at >= p_start_date::timestamptz
    AND created_at <= p_end_date::timestamptz
  GROUP BY resolved_destination_url
  ORDER BY total_clicks DESC;
$$;

-- get_clicks_by_country
CREATE OR REPLACE FUNCTION get_clicks_by_country(
  p_link_id TEXT,
  p_start_date TEXT,
  p_end_date TEXT
)
RETURNS TABLE (country TEXT, total_clicks BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    COALESCE(country_code, 'Desconocido') AS country,
    COUNT(*)                               AS total_clicks
  FROM click_events
  WHERE link_id = p_link_id
    AND created_at >= p_start_date::timestamptz
    AND created_at <= p_end_date::timestamptz
  GROUP BY country_code
  ORDER BY total_clicks DESC;
$$;

-- get_clicks_by_hour
CREATE OR REPLACE FUNCTION get_clicks_by_hour(
  p_link_id TEXT,
  p_date TEXT
)
RETURNS TABLE (click_hour INT, total_clicks BIGINT)
LANGUAGE sql STABLE
AS $$
  SELECT
    EXTRACT(HOUR FROM created_at)::INT AS click_hour,
    COUNT(*)                            AS total_clicks
  FROM click_events
  WHERE link_id = p_link_id
    AND DATE(created_at) = p_date::date
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY click_hour;
$$;
```

### 4.2 Rate Limiting Function

```sql
-- Create rate_limits table (if not imported)
CREATE TABLE IF NOT EXISTS rate_limits (
  key         TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits (key);
CREATE INDEX IF NOT EXISTS idx_rate_limits_cleanup ON rate_limits (window_start);

-- check_rate_limit function
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_key TEXT,
  p_window_seconds INTEGER DEFAULT 10,
  p_max_requests INTEGER DEFAULT 100
)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  -- Calculate current window start
  v_window_start := date_trunc('second', now())
    - (EXTRACT(EPOCH FROM now())::INTEGER % p_window_seconds) * INTERVAL '1 second';

  -- Upsert: increment counter or insert new entry
  INSERT INTO rate_limits (key, window_start, request_count)
  VALUES (p_key, v_window_start, 1)
  ON CONFLICT (key, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  -- Cleanup old entries (older than 2 windows)
  DELETE FROM rate_limits
  WHERE key = p_key
    AND window_start < v_window_start - (p_window_seconds * 2) * INTERVAL '1 second';

  -- Return TRUE if under limit
  RETURN v_current_count <= p_max_requests;
END;
$$;
```

### 4.3 Grant Permissions

```sql
-- Grant read-only access to analytics user (if created)
GRANT SELECT ON ALL TABLES IN SCHEMA public TO routegenius_readonly;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO routegenius_readonly;

-- Ensure app user has full access
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO routegenius_app;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO routegenius_app;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO routegenius_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO routegenius_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO routegenius_app;
```

---

## Phase 5 — Configure Networking & Security

### 5.1 Assign a Private IP (Recommended for Vercel)

```bash
# Allocate a private IP range
gcloud compute addresses create google-managed-services-default \
  --global \
  --purpose=VPC_PEERING \
  --prefix-length=16 \
  --network=default

# Create the peering connection
gcloud services vpc-peerings connect \
  --service=servicenetworking.googleapis.com \
  --ranges=google-managed-services-default \
  --network=default

# Update instance to use private IP
gcloud sql instances patch routegenius-db \
  --network=default \
  --no-assign-ip
```

### 5.2 Authorize Public IP Access (If Required by Vercel)

Vercel serverless functions don't support VPC peering natively. You may need to allow public IP access with strict controls:

```bash
# Get the instance's public IP
gcloud sql instances describe routegenius-db \
  --format='value(ipAddresses[0].ipAddress)'

# Authorize specific IPs (e.g., your dev machine)
MY_IP=$(curl -s https://api.ipify.org)

gcloud sql instances patch routegenius-db \
  --authorized-networks="${MY_IP}/32"
```

> **For Vercel production:** Use the [Cloud SQL Auth Proxy as a sidecar](https://cloud.google.com/sql/docs/postgres/connect-run) or configure [Cloud SQL Connector for Node.js](https://github.com/GoogleCloudPlatform/cloud-sql-nodejs-connector). See [Phase 6.2](#62-option-b--cloud-sql-connector-for-nodejs-recommended-for-vercel).

### 5.3 Require SSL Connections

```bash
gcloud sql instances patch routegenius-db \
  --require-ssl

# Download the server CA certificate
gcloud sql ssl server-ca-certs list \
  --instance=routegenius-db \
  --format='value(cert)' > server-ca.pem

# Create a client certificate
gcloud sql ssl client-certs create routegenius-client \
  --instance=routegenius-db \
  client-key.pem

gcloud sql ssl client-certs describe routegenius-client \
  --instance=routegenius-db \
  --format='value(cert)' > client-cert.pem
```

### 5.4 Enable Automatic Backups

```bash
gcloud sql instances patch routegenius-db \
  --backup-start-time=04:00 \
  --enable-point-in-time-recovery \
  --retained-backups-count=14 \
  --retained-transaction-log-days=7
```

---

## Phase 6 — Update Application Configuration

### 6.1 Option A — Direct Connection String (Simplest)

Build the `DATABASE_URL` for Better Auth (`pg` Pool):

```
postgresql://routegenius_app:<PASSWORD>@<CLOUD_SQL_PUBLIC_IP>:5432/routegenius?sslmode=require&sslcert=client-cert.pem&sslkey=client-key.pem&sslrootcert=server-ca.pem
```

**Environment variables to update:**

```bash
# Better Auth connection (used by lib/auth.ts via pg Pool)
DATABASE_URL="postgresql://routegenius_app:<PASSWORD>@<CLOUD_SQL_IP>:5432/routegenius?sslmode=require"
```

### 6.2 Option B — Cloud SQL Connector for Node.js (Recommended for Vercel)

The [Cloud SQL Node.js Connector](https://github.com/GoogleCloudPlatform/cloud-sql-nodejs-connector) provides IAM-based authentication without managing SSL certificates or IP allowlists.

#### Install the Connector

```bash
npm install @google-cloud/cloud-sql-connector
```

#### Update `lib/auth.ts`

Replace the direct `pg` Pool with one that uses the connector:

```typescript
import { betterAuth } from "better-auth";
import { Pool } from "pg";
import {
  Connector,
  IpAddressTypes,
  AuthTypes,
} from "@google-cloud/cloud-sql-connector";

const connector = new Connector();

async function createPool() {
  const clientOpts = await connector.getOptions({
    instanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME!, // e.g. "project:region:routegenius-db"
    ipType: IpAddressTypes.PUBLIC, // or IpAddressTypes.PRIVATE if VPC
    authType: AuthTypes.PASSWORD,
  });

  return new Pool({
    ...clientOpts,
    user: process.env.CLOUD_SQL_USER || "routegenius_app",
    password: process.env.CLOUD_SQL_PASSWORD,
    database: process.env.CLOUD_SQL_DATABASE || "routegenius",
    max: 10,
  });
}

// Lazy singleton
let _pool: Pool | null = null;
async function getPool(): Promise<Pool> {
  if (!_pool) {
    _pool = await createPool();
  }
  return _pool;
}
```

#### New Environment Variables for Cloud SQL Connector

| Variable                    | Required | Description                                         |
| --------------------------- | -------- | --------------------------------------------------- |
| `CLOUD_SQL_CONNECTION_NAME` | Yes      | Instance connection name: `project:region:instance` |
| `CLOUD_SQL_USER`            | Yes      | Database user (e.g., `routegenius_app`)             |
| `CLOUD_SQL_PASSWORD`        | Yes      | Database user password                              |
| `CLOUD_SQL_DATABASE`        | Yes      | Database name (e.g., `routegenius`)                 |

### 6.3 Migrate Supabase Client Calls (App Data)

The app currently uses `@supabase/supabase-js` to query `projects`, `links`, `click_events`, and call RPCs. After migrating to Cloud SQL, **you have two options**:

#### Option A — Keep Supabase Client (Minimal Code Changes)

If you stand up [PostgREST](https://postgrest.org/) or [Supabase self-hosted](https://supabase.com/docs/guides/self-hosting) in front of Cloud SQL, the existing `@supabase/supabase-js` client calls continue to work. This defers code changes.

#### Option B — Replace with Direct `pg` Queries (Recommended Long-Term)

Rewrite `lib/mock-data.ts` (rename to `lib/db.ts`) to use a `pg` Pool directly:

```typescript
import { Pool } from "pg";

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      ssl: { rejectUnauthorized: true },
    });
  }
  return _pool;
}

// Example: existing getProjects() rewritten
export async function getProjects(userId: string): Promise<Project[]> {
  const pool = getPool();
  const { rows } = await pool.query(
    `SELECT * FROM projects WHERE user_id = $1 AND archived = false ORDER BY updated_at DESC`,
    [userId],
  );
  return rows;
}
```

This is a larger refactor (800+ lines in `lib/mock-data.ts` and 11 analytics RPCs). Plan as a separate task.

### 6.4 Update Vercel Environment Variables

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Set variables for production
vercel env add DATABASE_URL production
# Paste: postgresql://routegenius_app:<PASSWORD>@<IP>:5432/routegenius?sslmode=require

# If using Cloud SQL Connector:
vercel env add CLOUD_SQL_CONNECTION_NAME production
vercel env add CLOUD_SQL_USER production
vercel env add CLOUD_SQL_PASSWORD production
vercel env add CLOUD_SQL_DATABASE production

# Repeat for staging (preview)
vercel env add DATABASE_URL preview
```

---

## Phase 7 — Verification & Smoke Tests

### 7.1 Verify Tables

```bash
psql \
  --host=127.0.0.1 \
  --port=5433 \
  --username=routegenius_app \
  --dbname=routegenius \
  -c "
    SELECT table_name, (SELECT count(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) AS column_count
    FROM information_schema.tables t
    WHERE table_schema = 'public'
    ORDER BY table_name;
  "
```

**Expected output:**

| table_name   | column_count            |
| ------------ | ----------------------- |
| account      | _(Better Auth managed)_ |
| click_events | 14                      |
| links        | 13                      |
| projects     | 10                      |
| rate_limits  | 3                       |
| session      | _(Better Auth managed)_ |
| user         | _(Better Auth managed)_ |
| verification | _(Better Auth managed)_ |

### 7.2 Verify Row Counts

```bash
psql \
  --host=127.0.0.1 \
  --port=5433 \
  --username=routegenius_app \
  --dbname=routegenius \
  -c "
    SELECT 'projects' AS table_name, count(*) FROM projects
    UNION ALL SELECT 'links', count(*) FROM links
    UNION ALL SELECT 'click_events', count(*) FROM click_events
    UNION ALL SELECT 'rate_limits', count(*) FROM rate_limits;
  "
```

Compare with Supabase source row counts.

### 7.3 Verify PG Functions

```bash
psql \
  --host=127.0.0.1 \
  --port=5433 \
  --username=routegenius_app \
  --dbname=routegenius \
  -c "
    SELECT routine_name, routine_type
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    ORDER BY routine_name;
  "
```

**Expected functions:**

- `check_rate_limit`
- `get_clicks_by_country`
- `get_clicks_by_day`
- `get_clicks_by_destination`
- `get_clicks_by_hour`

### 7.4 Verify Indexes

```bash
psql \
  --host=127.0.0.1 \
  --port=5433 \
  --username=routegenius_app \
  --dbname=routegenius \
  -c "
    SELECT tablename, indexname
    FROM pg_indexes
    WHERE schemaname = 'public'
    ORDER BY tablename, indexname;
  "
```

### 7.5 Application-Level Smoke Tests

```bash
# 1. Start local dev with new DATABASE_URL
DATABASE_URL="postgresql://routegenius_app:<PW>@127.0.0.1:5433/routegenius" npm run dev

# 2. Test auth (login via Google OAuth)
open http://localhost:3070/login

# 3. Test redirect endpoint
curl -s -o /dev/null -w "%{redirect_url}\n" http://localhost:3070/api/redirect/<link-id>

# 4. Test analytics
open http://localhost:3070/dashboard/analytics

# 5. Test CRUD (create a project, create a link)
open http://localhost:3070/dashboard
```

---

## Phase 8 — Cutover Checklist

Execute in order during a maintenance window:

| #   | Step                                 | Command / Action                                                      | Status |
| --- | ------------------------------------ | --------------------------------------------------------------------- | ------ |
| 1   | Announce maintenance window          | Email/Slack team                                                      | ☐      |
| 2   | Take final Supabase dump             | `pg_dump "$SUPABASE_DB_URL" --format=custom --file=final_backup.dump` | ☐      |
| 3   | Import final dump to Cloud SQL       | `pg_restore --host=... --dbname=routegenius final_backup.dump`        | ☐      |
| 4   | Verify row counts match              | Compare both DBs                                                      | ☐      |
| 5   | Update Vercel env vars (staging)     | `vercel env add DATABASE_URL preview`                                 | ☐      |
| 6   | Deploy to staging                    | Merge to `staging` branch                                             | ☐      |
| 7   | QA staging                           | Test all flows on `route-genius.vercel.app`                           | ☐      |
| 8   | Update Vercel env vars (production)  | `vercel env add DATABASE_URL production`                              | ☐      |
| 9   | Deploy to production                 | Merge to `main` branch                                                | ☐      |
| 10  | Verify production                    | Test redirect, auth, analytics, backup/restore                        | ☐      |
| 11  | Monitor error rates                  | Check GCP Error Reporting + Firebase Crashlytics                      | ☐      |
| 12  | Decommission Supabase (after 7 days) | Pause/delete Supabase project                                         | ☐      |

---

## Rollback Plan

If issues arise after cutover:

```bash
# 1. Revert Vercel env vars to Supabase values
vercel env rm DATABASE_URL production
vercel env add DATABASE_URL production
# Paste original Supabase DATABASE_URL

# 2. Redeploy
vercel --prod

# 3. Cloud SQL instance remains available for debugging
# Do NOT delete until fully validated
```

---

## Console-Only Steps (Reference)

Some configuration is easier via the Google Cloud Console at `https://console.cloud.google.com/sql/instances`.

### Enable Cloud SQL Admin API (if not done via CLI)

1. Navigate to **APIs & Services → Library**
2. Search for `Cloud SQL Admin API`
3. Click **Enable**

### Configure Private IP (if VPC setup is complex)

1. Navigate to **SQL → routegenius-db → Connections**
2. Under **Networking**, check **Private IP**
3. Select the VPC network (`default`)
4. Click **Allocate and connect** to set up VPC peering
5. Click **Save**

### Set Up Automated Export (Scheduled Backups to GCS)

1. Navigate to **SQL → routegenius-db → Backups**
2. Click **Create backup schedule**
3. Configure:
   - Frequency: Daily
   - Start time: 04:00 UTC
   - Retention: 14 days
   - Point-in-time recovery: Enabled
4. Click **Save**

### Monitor Instance Performance

1. Navigate to **SQL → routegenius-db → Overview**
2. Review CPU, memory, disk, and connections metrics
3. Set up **Alerting** for:
   - CPU utilization > 80%
   - Memory utilization > 85%
   - Disk utilization > 80%
   - Connection count > 80

### IAM Database Authentication (Alternative to Password)

1. Navigate to **SQL → routegenius-db → Users**
2. Click **Add user account**
3. Select **Cloud IAM**
4. Enter the service account email
5. Grant `roles/cloudsql.client` to the service account

```bash
# CLI equivalent
gcloud projects add-iam-policy-binding <PROJECT_ID> \
  --member="serviceAccount:<SA_EMAIL>" \
  --role="roles/cloudsql.client"

gcloud sql users create <SA_EMAIL> \
  --instance=routegenius-db \
  --type=CLOUD_IAM_SERVICE_ACCOUNT
```

---

## Cost Estimate

| Component                                  | Monthly Cost (Estimate) |
| ------------------------------------------ | ----------------------- |
| Cloud SQL `db-custom-1-3840` (Regional HA) | ~$75                    |
| 10 GB SSD Storage                          | ~$2                     |
| Network egress (to Vercel)                 | ~$5                     |
| Backups (14 days retention)                | ~$3                     |
| **Total**                                  | **~$85/month**          |

> Compare with current Supabase plan cost. Cloud SQL provides dedicated resources, SLA-backed uptime (99.95%), and unified GCP billing.

---

## Migration Execution Log (March 11, 2026)

Migration executed successfully. Below are the verified production values.

### Cloud SQL Instance

| Property         | Value                                                 |
| ---------------- | ----------------------------------------------------- |
| Instance name    | `routegenius-db`                                      |
| Connection name  | `absolute-brook-452020-d5:us-central1:routegenius-db` |
| Public IP        | `34.31.144.135`                                       |
| Database version | PostgreSQL 15                                         |
| Tier             | `db-custom-1-3840` (1 vCPU, 3.75 GB RAM)              |
| Region / Zone    | `us-central1-f`                                       |
| Availability     | REGIONAL (High Availability)                          |
| Storage          | 10 GB SSD, auto-increase enabled                      |
| SSL Mode         | `ENCRYPTED_ONLY` (SSL required, no client cert)       |
| PITR             | Enabled (7-day transaction log retention)             |
| Backups          | Daily at 04:00 UTC, 14-day retention                  |
| Database         | `routegenius`                                         |
| App user         | `routegenius_app`                                     |

### Verified Data Integrity

| Table        | Rows  |
| ------------ | ----- |
| account      | 3     |
| click_events | 3,452 |
| links        | 2     |
| projects     | 2     |
| rate_limits  | 1     |
| session      | 6     |
| user         | 3     |
| verification | 0     |

- **Total tables:** 8
- **Total indexes:** 33
- **Total PG functions:** 5 (all smoke-tested)

### Connection Strings

**Direct (with SSL):**

```
postgresql://routegenius_app:<PASSWORD>@34.31.144.135:5432/routegenius?sslmode=require
```

**Environment variable for Vercel:**

```bash
DATABASE_URL="postgresql://routegenius_app:<PASSWORD>@34.31.144.135:5432/routegenius?sslmode=require"
```

> **Note:** Replace `<PASSWORD>` with the actual password stored securely. The Supabase JS Client (`NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`) must also be updated to point to Cloud SQL or replaced with direct `pg` connections.

### Remaining Cutover Steps

Refer to [Phase 8 — Cutover Checklist](#phase-8--cutover-checklist) for the production switchover process.

---

## Cleanup After Successful Migration

```bash
# Stop the Cloud SQL Auth Proxy
kill $PROXY_PID

# Remove temporary GCS bucket
gsutil rm -r gs://routegenius-migration-temp/

# Remove local dump files
rm -f routegenius_*.dump routegenius_schema_only.sql

# Remove SSL certificates from local machine (if not needed)
rm -f server-ca.pem client-key.pem client-cert.pem
```

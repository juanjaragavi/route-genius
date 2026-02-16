-- ============================================================
-- RouteGenius — Migration 002: User Ownership + Row Level Security
-- ============================================================
-- Adds `user_id` column to projects and links for multi-tenant
-- data isolation. Enables RLS as defense-in-depth.
--
-- Run this in the Supabase SQL Editor **once**.
-- Then run the backfill UPDATE at the bottom to assign existing
-- rows to the correct user.
-- ============================================================

-- ── Add user_id columns ─────────────────────────────────────

ALTER TABLE projects ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE links    ADD COLUMN IF NOT EXISTS user_id TEXT;

-- ── Indexes for user-scoped queries ─────────────────────────

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects (user_id);
CREATE INDEX IF NOT EXISTS idx_links_user_id    ON links (user_id);

-- Composite indexes for the most common dashboard queries
CREATE INDEX IF NOT EXISTS idx_projects_user_archived ON projects (user_id, archived);
CREATE INDEX IF NOT EXISTS idx_links_user_project     ON links (user_id, project_id);

-- ── Enable Row Level Security ───────────────────────────────
-- Our application uses the Supabase service role key exclusively,
-- which bypasses RLS. These policies serve as defense-in-depth:
-- if anyone connects with the anon key or authenticated role,
-- they cannot read or modify data.

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE links    ENABLE ROW LEVEL SECURITY;

-- With RLS enabled and NO permissive policies, all access is
-- denied by default for non-service-role connections.
-- This prevents direct REST API abuse via the anon key.

-- ── Verify ──────────────────────────────────────────────────

SELECT 'projects' AS table_name,
       count(*)   AS total_rows,
       count(user_id) AS rows_with_user_id
FROM projects
UNION ALL
SELECT 'links', count(*), count(user_id)
FROM links;

-- ── Backfill existing data (RUN MANUALLY) ──────────────────
-- Replace '<YOUR_USER_ID>' with the Better Auth user.id
-- of the user who should own existing data.
--
-- To find your user ID, run:
--   SELECT id, email, name FROM "user";
-- in the Better Auth PostgreSQL database (not Supabase).
--
-- UPDATE projects SET user_id = '<YOUR_USER_ID>' WHERE user_id IS NULL;
-- UPDATE links    SET user_id = '<YOUR_USER_ID>' WHERE user_id IS NULL;

-- Migration 004: Drop the `name` column from the `links` table
--
-- Context:
--   The `name` field on links caused UX confusion with the `title` field.
--   It has been removed from the TypeScript types, UI, server actions,
--   DB layer, and CSV backup/restore logic.
--
-- Pre-checks:
--   1. No foreign key constraints reference links.name
--   2. No indexes on links.name (it was a plain text column)
--   3. No views, triggers, or stored procedures reference links.name
--
-- Applied: 2026-02-18
-- Branch:  dev

-- Step 1: Drop any index on the name column if one exists (safe no-op)
DROP INDEX IF EXISTS idx_links_name;

-- Step 2: Drop the column
ALTER TABLE links DROP COLUMN IF EXISTS name;

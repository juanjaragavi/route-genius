-- ============================================================
-- RouteGenius — Supabase Migration: Projects & Links Tables
-- ============================================================
-- Run this in the Supabase SQL Editor **once** to create the
-- persistent storage tables that replace file-based .json store.
--
-- After running, restart the app. No code changes needed —
-- lib/mock-data.ts auto-detects these tables via Supabase.
-- ============================================================

-- ── Projects ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS projects (
  id            TEXT PRIMARY KEY,
  workspace_id  TEXT NOT NULL DEFAULT 'ws_topnetworks_default',
  name          TEXT NOT NULL,
  title         TEXT NOT NULL DEFAULT '',
  description   TEXT NOT NULL DEFAULT '',
  tags          JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived      BOOLEAN NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_projects_archived    ON projects (archived);
CREATE INDEX IF NOT EXISTS idx_projects_workspace   ON projects (workspace_id);
CREATE INDEX IF NOT EXISTS idx_projects_updated     ON projects (updated_at DESC);

-- ── Links ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS links (
  id                    TEXT PRIMARY KEY,
  workspace_id          TEXT NOT NULL DEFAULT 'ws_topnetworks_default',
  project_id            TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  title                 TEXT NOT NULL DEFAULT '',
  description           TEXT NOT NULL DEFAULT '',
  main_destination_url  TEXT NOT NULL DEFAULT '',
  nickname              TEXT NOT NULL DEFAULT '',
  status                TEXT NOT NULL DEFAULT 'enabled'
                        CHECK (status IN ('enabled', 'disabled', 'expired')),
  rotation_enabled      BOOLEAN NOT NULL DEFAULT true,
  rotation_rules        JSONB NOT NULL DEFAULT '[]'::jsonb,
  archived              BOOLEAN NOT NULL DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_links_project_id   ON links (project_id);
CREATE INDEX IF NOT EXISTS idx_links_status        ON links (status);
CREATE INDEX IF NOT EXISTS idx_links_archived      ON links (archived);
CREATE INDEX IF NOT EXISTS idx_links_workspace     ON links (workspace_id);
CREATE INDEX IF NOT EXISTS idx_links_updated       ON links (updated_at DESC);

-- ── Seed sample data ────────────────────────────────────────

INSERT INTO projects (id, workspace_id, name, title, description, tags, archived, created_at, updated_at)
VALUES (
  'demo-project-001',
  'ws_topnetworks_default',
  'topfinanzas-campanas',
  'TopFinanzas — Campañas',
  'Proyecto principal de enlaces de rotación para campañas de TopFinanzas.',
  '["topfinanzas", "campañas", "tarjetas"]'::jsonb,
  false,
  '2026-02-10T10:00:00.000Z',
  '2026-02-10T10:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO links (
  id, workspace_id, project_id, name, title, description,
  main_destination_url, nickname, status, rotation_enabled,
  rotation_rules, archived, created_at, updated_at
)
VALUES (
  'demo-link-001',
  'ws_topnetworks_default',
  'demo-project-001',
  'campana-tarjetas-ab',
  'Campaña Tarjetas de Crédito — Prueba A/B',
  'Enlace de rotación A/B para la campaña de tarjetas de crédito de TopFinanzas.',
  'https://topfinanzas.com/credit-cards',
  'Campaña Tarjetas de Crédito - Prueba A/B',
  'enabled',
  true,
  '[{"id": "rule-001", "destination_url": "https://topfinanzas.com/credit-cards/variant-a", "weight_percentage": 30, "order_index": 0},
    {"id": "rule-002", "destination_url": "https://topfinanzas.com/credit-cards/variant-b", "weight_percentage": 30, "order_index": 1}]'::jsonb,
  false,
  '2026-02-10T10:00:00.000Z',
  '2026-02-10T10:00:00.000Z'
)
ON CONFLICT (id) DO NOTHING;

-- ── Verify ──────────────────────────────────────────────────

SELECT 'projects' AS table_name, count(*) AS row_count FROM projects
UNION ALL
SELECT 'links', count(*) FROM links;

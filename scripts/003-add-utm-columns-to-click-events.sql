-- ============================================================
-- RouteGenius — Migration 003: click_events Table + UTM Columns
-- ============================================================
-- Creates the click_events table (if not exists) with all
-- standard analytics columns PLUS five GA4 UTM parameter columns.
--
-- Run this in the Supabase SQL Editor **once**.
-- The redirect endpoint (app/api/redirect/[linkId]/route.ts)
-- inserts rows with UTM values — NULL when no UTM params present.
-- ============================================================

-- ── Create click_events table ───────────────────────────────

CREATE TABLE IF NOT EXISTS click_events (
  id                       BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  link_id                  TEXT NOT NULL,
  resolved_destination_url TEXT NOT NULL,
  went_to_main             BOOLEAN NOT NULL DEFAULT true,
  user_agent               TEXT,
  ip_address               TEXT,
  referer                  TEXT,
  country_code             TEXT,
  utm_source               TEXT,
  utm_medium               TEXT,
  utm_campaign             TEXT,
  utm_term                 TEXT,
  utm_content              TEXT,
  created_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ── Core indexes ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_click_events_link_id
  ON click_events (link_id);

CREATE INDEX IF NOT EXISTS idx_click_events_created_at
  ON click_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_click_events_link_created
  ON click_events (link_id, created_at DESC);

-- ── UTM indexes for analytics queries ───────────────────────

CREATE INDEX IF NOT EXISTS idx_click_events_utm_source
  ON click_events (utm_source)
  WHERE utm_source IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_click_events_utm_campaign
  ON click_events (utm_campaign)
  WHERE utm_campaign IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_click_events_link_campaign
  ON click_events (link_id, utm_campaign)
  WHERE utm_campaign IS NOT NULL;

-- ── Enable RLS (defense-in-depth, service role bypasses) ────

ALTER TABLE click_events ENABLE ROW LEVEL SECURITY;

-- ── Enable Realtime for live click counter ──────────────────
-- Run this separately if the publication already exists:
-- ALTER PUBLICATION supabase_realtime ADD TABLE click_events;

-- ── RPC: get_clicks_by_day ──────────────────────────────────

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

-- ── RPC: get_clicks_by_destination ──────────────────────────

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

-- ── RPC: get_clicks_by_country ──────────────────────────────

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

-- ── RPC: get_clicks_by_hour ─────────────────────────────────

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

-- ── Verify ──────────────────────────────────────────────────

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'click_events'
ORDER BY ordinal_position;

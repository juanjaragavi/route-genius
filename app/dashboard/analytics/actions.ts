"use server";

/**
 * RouteGenius — Analytics Server Actions
 *
 * Server-side data fetching for analytics dashboards.
 * All queries use direct pg Pool (Cloud SQL).
 */

import { getPool } from "@/lib/db";

/** Clicks aggregated by day for a specific link */
export async function getClicksByDay(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { rows } = await getPool().query(
    `SELECT * FROM get_clicks_by_day($1, $2, $3)`,
    [linkId, startDate, endDate],
  );
  return rows;
}

/** Clicks aggregated by destination URL for a specific link */
export async function getClicksByDestination(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { rows } = await getPool().query(
    `SELECT * FROM get_clicks_by_destination($1, $2, $3)`,
    [linkId, startDate, endDate],
  );
  return rows;
}

/** Clicks aggregated by country for a specific link */
export async function getClicksByCountry(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { rows } = await getPool().query(
    `SELECT * FROM get_clicks_by_country($1, $2, $3)`,
    [linkId, startDate, endDate],
  );
  return rows;
}

/** Clicks aggregated by hour for a specific link on a given date */
export async function getClicksByHour(linkId: string, date: string) {
  const { rows } = await getPool().query(
    `SELECT * FROM get_clicks_by_hour($1, $2)`,
    [linkId, date],
  );
  return rows;
}

/** Total click count across all links in a date range */
export async function getTotalClicks(startDate: string, endDate: string) {
  const { rows } = await getPool().query(
    `SELECT COUNT(*) AS count FROM click_events WHERE created_at >= $1 AND created_at <= $2`,
    [startDate, endDate],
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

/** Total unique visitors (distinct IPs) across all links in a date range */
export async function getUniqueVisitors(startDate: string, endDate: string) {
  const { rows } = await getPool().query(
    `SELECT COUNT(DISTINCT ip_address) AS count FROM click_events WHERE created_at >= $1 AND created_at <= $2`,
    [startDate, endDate],
  );
  return parseInt(rows[0]?.count ?? "0", 10);
}

/** Count of enabled links */
export async function getActiveLinkCount() {
  const { getAllLinks } = await import("@/lib/mock-data");
  const { getServerSession } = await import("@/lib/auth-session");
  const session = await getServerSession();
  if (!session?.user?.id) return 0;
  const links = await getAllLinks(session.user.id);
  return links.filter((l) => l.status === "enabled").length;
}

/** Paginated click events */
export async function getClickEvents(
  linkId: string | null,
  startDate: string,
  endDate: string,
  page: number = 1,
  pageSize: number = 50,
) {
  const offset = (page - 1) * pageSize;
  const params: (string | number)[] = [startDate, endDate];
  let whereClause = `WHERE created_at >= $1 AND created_at <= $2`;

  if (linkId) {
    params.push(linkId);
    whereClause += ` AND link_id = $${params.length}`;
  }

  params.push(pageSize, offset);
  const limitIdx = params.length - 1;

  const [dataResult, countResult] = await Promise.all([
    getPool().query(
      `SELECT * FROM click_events ${whereClause} ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${limitIdx + 1}`,
      params,
    ),
    getPool().query(
      `SELECT COUNT(*) AS count FROM click_events ${whereClause}`,
      linkId ? [startDate, endDate, linkId] : [startDate, endDate],
    ),
  ]);

  return {
    events: dataResult.rows,
    total: parseInt(countResult.rows[0]?.count ?? "0", 10),
    page,
    pageSize,
  };
}

/** Export click events as CSV string */
export async function exportClicksCSV(
  linkId: string | null,
  startDate: string,
  endDate: string,
): Promise<string> {
  const params: string[] = [startDate, endDate];
  let whereClause = `WHERE created_at >= $1 AND created_at <= $2`;

  if (linkId) {
    params.push(linkId);
    whereClause += ` AND link_id = $${params.length}`;
  }

  const { rows } = await getPool().query(
    `SELECT created_at, link_id, resolved_destination_url, went_to_main, country_code, user_agent, referer
     FROM click_events ${whereClause}
     ORDER BY created_at DESC LIMIT 10000`,
    params,
  );

  const headers = [
    "Fecha",
    "Enlace",
    "Destino",
    "Principal",
    "País",
    "User Agent",
    "Referente",
  ];
  const csvRows = rows.map((e) =>
    [
      e.created_at,
      e.link_id,
      e.resolved_destination_url,
      e.went_to_main ? "Sí" : "No",
      e.country_code || "Desconocido",
      `"${(e.user_agent || "").replace(/"/g, '""')}"`,
      e.referer || "",
    ].join(","),
  );

  return [headers.join(","), ...csvRows].join("\n");
}

/** Get all clicks by day across ALL links (for overview) */
export async function getAllClicksByDay(startDate: string, endDate: string) {
  const { rows } = await getPool().query(
    `SELECT created_at, ip_address FROM click_events
     WHERE created_at >= $1 AND created_at <= $2
     ORDER BY created_at ASC`,
    [startDate, endDate],
  );

  // Aggregate by day
  const byDay = new Map<string, { total: number; ips: Set<string> }>();

  for (const row of rows) {
    const date =
      row.created_at instanceof Date
        ? row.created_at.toISOString().split("T")[0]
        : (row.created_at?.toString().split("T")[0] ?? "");
    if (!byDay.has(date)) {
      byDay.set(date, { total: 0, ips: new Set() });
    }
    const entry = byDay.get(date)!;
    entry.total++;
    if (row.ip_address) entry.ips.add(row.ip_address);
  }

  return Array.from(byDay.entries()).map(([date, val]) => ({
    click_date: date,
    total_clicks: val.total,
    unique_visitors: val.ips.size,
  }));
}

/** Get distribution ratio (main vs secondary) for all links */
export async function getDistributionRatio(startDate: string, endDate: string) {
  const { rows } = await getPool().query(
    `SELECT
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE went_to_main = true) AS main_count
     FROM click_events
     WHERE created_at >= $1 AND created_at <= $2`,
    [startDate, endDate],
  );

  const total = parseInt(rows[0]?.total ?? "0", 10);
  const mainCount = parseInt(rows[0]?.main_count ?? "0", 10);

  return {
    total,
    mainCount,
    secondaryCount: total - mainCount,
    mainPercentage: total > 0 ? Math.round((mainCount / total) * 100) : 0,
    secondaryPercentage:
      total > 0 ? Math.round(((total - mainCount) / total) * 100) : 0,
  };
}

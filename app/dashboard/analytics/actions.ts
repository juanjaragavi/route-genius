"use server";

/**
 * RouteGenius — Analytics Server Actions
 *
 * Server-side data fetching for analytics dashboards.
 * All queries use the Supabase service role key (server-only).
 */

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

/** Clicks aggregated by day for a specific link */
export async function getClicksByDay(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase.rpc("get_clicks_by_day", {
    p_link_id: linkId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Clicks aggregated by destination URL for a specific link */
export async function getClicksByDestination(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase.rpc("get_clicks_by_destination", {
    p_link_id: linkId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Clicks aggregated by country for a specific link */
export async function getClicksByCountry(
  linkId: string,
  startDate: string,
  endDate: string,
) {
  const { data, error } = await supabase.rpc("get_clicks_by_country", {
    p_link_id: linkId,
    p_start_date: startDate,
    p_end_date: endDate,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Clicks aggregated by hour for a specific link on a given date */
export async function getClicksByHour(linkId: string, date: string) {
  const { data, error } = await supabase.rpc("get_clicks_by_hour", {
    p_link_id: linkId,
    p_date: date,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

/** Total click count across all links in a date range */
export async function getTotalClicks(startDate: string, endDate: string) {
  const { count, error } = await supabase
    .from("click_events")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  if (error) throw new Error(error.message);
  return count || 0;
}

/** Total unique visitors (distinct IPs) across all links in a date range */
export async function getUniqueVisitors(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("click_events")
    .select("ip_address")
    .gte("created_at", startDate)
    .lte("created_at", endDate);
  if (error) throw new Error(error.message);
  const uniqueIPs = new Set((data ?? []).map((row) => row.ip_address));
  return uniqueIPs.size;
}

/** Count of enabled links */
export async function getActiveLinkCount() {
  // Phase 1: count from file store
  const { getAllLinks } = await import("@/lib/mock-data");
  const links = getAllLinks();
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
  let query = supabase
    .from("click_events")
    .select("*", { count: "exact" })
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (linkId) {
    query = query.eq("link_id", linkId);
  }

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);
  return { events: data ?? [], total: count ?? 0, page, pageSize };
}

/** Export click events as CSV string */
export async function exportClicksCSV(
  linkId: string | null,
  startDate: string,
  endDate: string,
): Promise<string> {
  let query = supabase
    .from("click_events")
    .select(
      "created_at, link_id, resolved_destination_url, went_to_main, country_code, user_agent, referer",
    )
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (linkId) {
    query = query.eq("link_id", linkId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const headers = [
    "Fecha",
    "Enlace",
    "Destino",
    "Principal",
    "País",
    "User Agent",
    "Referente",
  ];
  const rows = (data ?? []).map((e) =>
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

  return [headers.join(","), ...rows].join("\n");
}

/** Get all clicks by day across ALL links (for overview) */
export async function getAllClicksByDay(startDate: string, endDate: string) {
  const { data, error } = await supabase
    .from("click_events")
    .select("created_at, ip_address")
    .gte("created_at", startDate)
    .lte("created_at", endDate)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  // Aggregate by day manually
  const byDay = new Map<string, { total: number; ips: Set<string> }>();

  for (const row of data ?? []) {
    const date = row.created_at?.split("T")[0] ?? "";
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
  const { data, error } = await supabase
    .from("click_events")
    .select("went_to_main")
    .gte("created_at", startDate)
    .lte("created_at", endDate);

  if (error) throw new Error(error.message);

  const total = data?.length ?? 0;
  const mainCount = data?.filter((e) => e.went_to_main).length ?? 0;

  return {
    total,
    mainCount,
    secondaryCount: total - mainCount,
    mainPercentage: total > 0 ? Math.round((mainCount / total) * 100) : 0,
    secondaryPercentage:
      total > 0 ? Math.round(((total - mainCount) / total) * 100) : 0,
  };
}

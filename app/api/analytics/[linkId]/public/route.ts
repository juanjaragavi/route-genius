/**
 * RouteGenius — Public Analytics API
 *
 * Returns public-facing click count for a given link (no PII).
 * No authentication required.
 */

import { NextRequest, NextResponse } from "next/server";
import { getPool } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  try {
    const { linkId } = await params;

    const { rows } = await getPool().query(
      `SELECT COUNT(*) AS count FROM click_events WHERE link_id = $1`,
      [linkId],
    );

    return NextResponse.json({
      link_id: linkId,
      total_clicks: parseInt(rows[0]?.count ?? "0", 10),
      period: "all_time",
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

/**
 * RouteGenius — Public Analytics API
 *
 * Returns public-facing click count for a given link (no PII).
 * No authentication required.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  try {
    const { linkId } = await params;

    const { count, error } = await supabase
      .from("click_events")
      .select("*", { count: "exact", head: true })
      .eq("link_id", linkId);

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener analíticas" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      link_id: linkId,
      total_clicks: count ?? 0,
      period: "all_time",
    });
  } catch {
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

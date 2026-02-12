/**
 * RouteGenius — Redirect API Route
 *
 * Handles the probabilistic redirect for a given tracking link.
 * GET /api/redirect/[linkId] → 307 Temporary Redirect
 *
 * Phase 1: Uses in-memory mock data store.
 * Phase 2: Will query Supabase/PostgreSQL.
 */

import { NextRequest, NextResponse } from "next/server";
import { getLink } from "@/lib/mock-data";
import { selectDestination } from "@/lib/rotation";
import type { ClickEvent } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  const { linkId } = await params;

  // 1. Retrieve link configuration
  const link = getLink(linkId);

  if (!link) {
    return NextResponse.json(
      { error: "Link not found", linkId },
      { status: 404 },
    );
  }

  // 2. Check if link is active
  if (link.status !== "enabled") {
    return NextResponse.json(
      { error: "Link is not active", status: link.status },
      { status: 410 },
    );
  }

  // 3. Select destination via probabilistic algorithm
  const destination = selectDestination(link);

  // 4. Log click event (Phase 1: console log, Phase 2: database insert)
  const clickEvent: ClickEvent = {
    timestamp: new Date().toISOString(),
    link_id: link.id,
    resolved_destination_url: destination,
    user_agent: request.headers.get("user-agent") || "unknown",
    went_to_main: destination === link.main_destination_url,
  };

  console.log("[RouteGenius] Click Event:", JSON.stringify(clickEvent));

  // 5. Issue 307 Temporary Redirect (non-sticky)
  return NextResponse.redirect(destination, 307);
}

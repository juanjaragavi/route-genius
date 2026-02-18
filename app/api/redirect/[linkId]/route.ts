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
import { getLinkForRedirect } from "@/lib/mock-data";
import { selectDestination } from "@/lib/rotation";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/gcp/error-reporting";
import { extractUtmParams, appendUtmParams, hasUtmParams } from "@/lib/utm";
import { createClient } from "@supabase/supabase-js";
import type { ClickEvent } from "@/lib/types";
import type { UtmParams } from "@/lib/utm";

// Supabase admin client for fire-and-forget click inserts
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ linkId: string }> },
) {
  try {
    const { linkId } = await params;

    // 0. Rate limiting (100 requests per 10 seconds per IP)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      "127.0.0.1";
    const { allowed, limit } = await checkRateLimit(`redirect:${ip}`);

    if (!allowed) {
      return NextResponse.json(
        { error: "Demasiadas solicitudes. Intenta de nuevo más tarde." },
        {
          status: 429,
          headers: {
            "Retry-After": "10",
            "X-RateLimit-Limit": limit.toString(),
            "X-RateLimit-Remaining": "0",
          },
        },
      );
    }

    // 1. Retrieve link configuration (public — no user filtering)
    const link = await getLinkForRedirect(linkId);

    if (!link) {
      return NextResponse.json(
        { error: "Enlace no encontrado", linkId },
        { status: 404 },
      );
    }

    // 2. Check if link is active
    if (link.status !== "enabled") {
      return NextResponse.json(
        { error: "El enlace no está activo", status: link.status },
        { status: 410 },
      );
    }

    // 3. Select destination via probabilistic algorithm
    const destination = selectDestination(link);

    // 3b. Extract UTM params from incoming request and append to destination
    const incomingUtm: UtmParams = extractUtmParams(request.nextUrl);
    const destinationWithUtm = hasUtmParams(incomingUtm)
      ? appendUtmParams(destination, incomingUtm)
      : destination;

    // 4. Log click event and insert to Supabase (fire-and-forget)
    const clickEvent: ClickEvent = {
      timestamp: new Date().toISOString(),
      link_id: link.id,
      resolved_destination_url: destinationWithUtm,
      user_agent: request.headers.get("user-agent") || "unknown",
      went_to_main: destination === link.main_destination_url,
    };

    console.log("[RouteGenius] Click Event:", JSON.stringify(clickEvent));

    // Fire-and-forget: insert click event to Supabase without blocking the redirect
    supabaseAdmin
      .from("click_events")
      .insert({
        link_id: linkId,
        resolved_destination_url: destinationWithUtm,
        went_to_main: destination === link.main_destination_url,
        user_agent: request.headers.get("user-agent") || "unknown",
        ip_address: ip,
        referer: request.headers.get("referer") || null,
        country_code: request.headers.get("x-vercel-ip-country") || null,
        utm_source: incomingUtm.utm_source || null,
        utm_medium: incomingUtm.utm_medium || null,
        utm_campaign: incomingUtm.utm_campaign || null,
        utm_term: incomingUtm.utm_term || null,
        utm_content: incomingUtm.utm_content || null,
      })
      .then(({ error }) => {
        if (error)
          console.error("[RouteGenius] Click insert failed:", error.message);
      });

    // 5. Issue 307 Temporary Redirect (non-sticky) — UTM params included
    return NextResponse.redirect(destinationWithUtm, 307);
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error, {
      httpRequest: { method: "GET", url: request.url },
    });
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

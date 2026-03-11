/**
 * RouteGenius — Redirect API Route
 *
 * Handles the probabilistic redirect for a given tracking link.
 * GET /api/redirect/[linkId] → 307 Temporary Redirect
 */

import { NextRequest, NextResponse } from "next/server";
import { getLinkForRedirect } from "@/lib/mock-data";
import { selectDestination } from "@/lib/rotation";
import { checkRateLimit } from "@/lib/rate-limit";
import { reportError } from "@/lib/gcp/error-reporting";
import { extractUtmParams, appendUtmParams, hasUtmParams } from "@/lib/utm";
import { getPool } from "@/lib/db";
import type { ClickEvent } from "@/lib/types";
import type { UtmParams } from "@/lib/utm";

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
    // NOTE: Pass .searchParams (URLSearchParams) — NOT request.nextUrl (NextURL).
    // NextURL is structurally compatible with URL in TypeScript but fails
    // `instanceof URL` at runtime, causing extractUtmParams to mishandle it.
    const incomingUtm: UtmParams = extractUtmParams(
      request.nextUrl.searchParams,
    );
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

    // Fire-and-forget: insert click event to Cloud SQL without blocking the redirect
    getPool()
      .query(
        `INSERT INTO click_events
           (link_id, resolved_destination_url, went_to_main, user_agent,
            ip_address, referer, country_code,
            utm_source, utm_medium, utm_campaign, utm_term, utm_content)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          linkId,
          destinationWithUtm,
          destination === link.main_destination_url,
          request.headers.get("user-agent") || "unknown",
          ip,
          request.headers.get("referer") || null,
          request.headers.get("x-vercel-ip-country") || null,
          incomingUtm.utm_source || null,
          incomingUtm.utm_medium || null,
          incomingUtm.utm_campaign || null,
          incomingUtm.utm_term || null,
          incomingUtm.utm_content || null,
        ],
      )
      .catch((err) => {
        console.error("[RouteGenius] Click insert failed:", err);
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

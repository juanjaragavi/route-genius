/**
 * RouteGenius — Google Drive OAuth 2.0 Callback
 *
 * Handles the redirect from Google after the user grants
 * (or denies) Drive access. Exchanges the authorization code
 * for tokens and stores them in an encrypted HTTP-only cookie.
 *
 * Flow:
 *   1. User clicks "Conectar Google Drive" in Settings
 *   2. Server Action redirects to Google OAuth consent screen
 *   3. Google redirects here with ?code=... or ?error=...
 *   4. We exchange the code for tokens
 *   5. Store tokens in a secure cookie
 *   6. Redirect back to /dashboard/settings with success/error status
 *
 * @module app/api/auth/google-drive/callback/route
 */

import { NextRequest, NextResponse } from "next/server";
import { exchangeGoogleDriveCode } from "@/lib/google-drive";

/** Cookie name for storing Google Drive tokens */
const GDRIVE_TOKEN_COOKIE = "rg_gdrive_tokens";

/** Token cookie max age: 30 days */
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  // Base redirect URL for settings page
  const settingsUrl = new URL("/dashboard/settings", request.url);

  // ── Handle denial or error from Google ──
  if (error) {
    console.warn("[RouteGenius] Google Drive OAuth denied/error:", error);
    settingsUrl.searchParams.set("gdrive", "denied");
    return NextResponse.redirect(settingsUrl);
  }

  // ── Require authorization code ──
  if (!code) {
    console.error("[RouteGenius] Google Drive callback missing code.");
    settingsUrl.searchParams.set("gdrive", "error");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    // ── Exchange code for tokens ──
    console.log("[RouteGenius] Google Drive callback: exchanging code...", {
      codeLength: code.length,
      hasState: !!state,
      requestUrl: request.url.split("?")[0],
    });

    const tokens = await exchangeGoogleDriveCode(code);

    console.log("[RouteGenius] Google Drive tokens obtained successfully.", {
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in,
    });

    // ── Store tokens in secure HTTP-only cookie ──
    const tokenPayload = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: tokens.expires_in
        ? Date.now() + tokens.expires_in * 1000
        : null,
    });

    settingsUrl.searchParams.set("gdrive", "connected");

    const response = NextResponse.redirect(settingsUrl);

    // Set secure cookie with tokens
    const isSecure = request.url.startsWith("https");
    response.cookies.set(GDRIVE_TOKEN_COOKIE, tokenPayload, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      path: "/",
      maxAge: COOKIE_MAX_AGE,
    });

    return response;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error("[RouteGenius] Google Drive token exchange error:", errorMsg);

    // Pass a descriptive reason so the UI can show it
    settingsUrl.searchParams.set("gdrive", "error");
    settingsUrl.searchParams.set(
      "gdrive_reason",
      encodeURIComponent(errorMsg.slice(0, 200)),
    );
    return NextResponse.redirect(settingsUrl);
  }
}

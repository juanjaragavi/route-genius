/**
 * RouteGenius — Proxy (formerly Middleware)
 *
 * Protects dashboard routes behind authentication.
 * Public routes (redirect endpoint, auth API, public analytics) are exempt.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const sessionCookie = request.cookies.get("better-auth.session_token");

  const isProtectedRoute =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname === "/";

  const isLoginRoute = request.nextUrl.pathname === "/login";
  const isPublicAPIRoute = request.nextUrl.pathname.startsWith("/api/redirect");
  const isAuthAPIRoute = request.nextUrl.pathname.startsWith("/api/auth");
  const isPublicAnalytics =
    request.nextUrl.pathname.startsWith("/analytics/") &&
    !request.nextUrl.pathname.startsWith("/dashboard");
  const isPublicAnalyticsAPI =
    request.nextUrl.pathname.startsWith("/api/analytics/");

  // Never intercept public API routes, auth routes, or public analytics
  if (
    isPublicAPIRoute ||
    isAuthAPIRoute ||
    isPublicAnalytics ||
    isPublicAnalyticsAPI
  ) {
    return NextResponse.next();
  }

  // Redirect unauthenticated users to login
  if (isProtectedRoute && !sessionCookie) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Redirect authenticated users away from login
  if (isLoginRoute && sessionCookie) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/redirect|api/analytics).*)",
  ],
};

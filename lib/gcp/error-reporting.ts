/**
 * Google Cloud Error Reporting for server-side error monitoring.
 * Replaces Sentry — uses the existing GCS service account.
 *
 * Client-side errors are handled by Firebase Crashlytics (`lib/firebase/crashlytics.ts`).
 * This module covers Server Actions, API Routes, and middleware.
 *
 * @module lib/gcp/error-reporting
 */

import { ErrorReporting } from "@google-cloud/error-reporting";

let errorReporting: ErrorReporting | null = null;

/**
 * Lazily initialise the GCP Error Reporting client.
 * Returns `null` on the client side or if initialisation fails.
 */
function getErrorReporter(): ErrorReporting | null {
  // Server-only guard
  if (typeof window !== "undefined") return null;

  if (!errorReporting) {
    try {
      errorReporting = new ErrorReporting({
        projectId: process.env.GCS_PROJECT_ID,
        keyFilename:
          process.env.GOOGLE_APPLICATION_CREDENTIALS ||
          "credentials/gcs-service-account.json",
        reportMode: process.env.NODE_ENV === "production" ? "always" : "never",
      });
    } catch {
      console.warn("[RouteGenius] Cloud Error Reporting init failed");
      return null;
    }
  }
  return errorReporting;
}

/**
 * Report a server-side error to GCP Error Reporting.
 *
 * Safe to call in any environment — silently no-ops on the client side
 * and in development mode (`reportMode: "never"`).
 *
 * @param error - The Error object to report
 * @param context - Optional HTTP request metadata
 */
export function reportError(
  error: Error,
  context?: {
    httpRequest?: { method: string; url: string };
    user?: string;
  },
): void {
  const reporter = getErrorReporter();
  if (!reporter) return;

  // Build a request-like object if context is provided
  const request = context?.httpRequest
    ? { method: context.httpRequest.method, url: context.httpRequest.url }
    : undefined;

  reporter.report(
    error,
    request,
    undefined,
    (err: Error | string | null | undefined) => {
      if (err) console.warn("[RouteGenius] Error report failed:", err);
    },
  );
}

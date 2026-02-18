/**
 * RouteGenius — UTM Parameter Utilities
 *
 * Handles detection, extraction, storage, and propagation of UTM parameters
 * across the redirect pipeline. Mirrors the strategy from uk-topfinanzas-com:
 *
 *   Entry URL → sessionStorage (client) → outbound links (client click-time)
 *   Entry URL → query params (server)   → destination URL (server redirect)
 *
 * Canonical UTM parameters (GA4-standard):
 *   utm_source, utm_medium, utm_campaign, utm_term, utm_content
 */

/** The five standard GA4 UTM parameter keys. */
export const UTM_PARAM_KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
] as const;

/** Union type of valid UTM parameter keys. */
export type UtmParamKey = (typeof UTM_PARAM_KEYS)[number];

/** A record of UTM key → value (only populated keys). */
export type UtmParams = Partial<Record<UtmParamKey, string>>;

/**
 * Extract UTM parameters from a URL or URLSearchParams object.
 * Returns only the keys that are present and non-empty.
 *
 * @example
 * ```ts
 * const url = new URL("https://example.com?utm_source=google&utm_medium=cpc");
 * extractUtmParams(url.searchParams);
 * // → { utm_source: "google", utm_medium: "cpc" }
 * ```
 */
export function extractUtmParams(
  searchParams: URLSearchParams | URL,
): UtmParams {
  const params =
    searchParams instanceof URL ? searchParams.searchParams : searchParams;
  const result: UtmParams = {};

  for (const key of UTM_PARAM_KEYS) {
    const value = params.get(key);
    if (value && value.trim() !== "") {
      result[key] = value.trim();
    }
  }

  return result;
}

/**
 * Append UTM parameters to a destination URL.
 * Preserves existing query parameters. Does NOT override UTM params
 * already present on the destination URL.
 *
 * @example
 * ```ts
 * appendUtmParams("https://example.com/page", { utm_source: "google", utm_medium: "cpc" });
 * // → "https://example.com/page?utm_source=google&utm_medium=cpc"
 *
 * // Existing UTM params on destination are preserved (not overridden):
 * appendUtmParams("https://example.com?utm_source=facebook", { utm_source: "google" });
 * // → "https://example.com?utm_source=facebook"
 * ```
 */
export function appendUtmParams(
  destinationUrl: string,
  utmParams: UtmParams,
): string {
  const entries = Object.entries(utmParams).filter(
    ([, v]) => v !== undefined && v.trim() !== "",
  );

  if (entries.length === 0) return destinationUrl;

  try {
    const url = new URL(destinationUrl);

    for (const [key, value] of entries) {
      // Don't override UTM params already on the destination
      if (!url.searchParams.has(key)) {
        url.searchParams.set(key, value!);
      }
    }

    return url.toString();
  } catch {
    // If destination URL is malformed, fall back to string concatenation
    const queryString = new URLSearchParams(
      entries as [string, string][],
    ).toString();
    const separator = destinationUrl.includes("?") ? "&" : "?";
    return `${destinationUrl}${separator}${queryString}`;
  }
}

/**
 * Check whether any UTM parameters are present.
 */
export function hasUtmParams(utmParams: UtmParams): boolean {
  return Object.values(utmParams).some(
    (v) => v !== undefined && v.trim() !== "",
  );
}

// ─── Client-side sessionStorage helpers (browser only) ──────

const SESSION_STORAGE_AVAILABLE =
  typeof window !== "undefined" && typeof sessionStorage !== "undefined";

/**
 * Store UTM params in sessionStorage for session-level persistence.
 * Only stores non-empty values. Existing values are updated (latest wins).
 */
export function storeUtmInSession(utmParams: UtmParams): void {
  if (!SESSION_STORAGE_AVAILABLE) return;

  for (const [key, value] of Object.entries(utmParams)) {
    if (value && value.trim() !== "") {
      sessionStorage.setItem(key, value.trim());
    }
  }
}

/**
 * Retrieve all stored UTM params from sessionStorage.
 * Returns only keys that have non-empty values.
 */
export function getUtmFromSession(): UtmParams {
  if (!SESSION_STORAGE_AVAILABLE) return {};

  const result: UtmParams = {};

  for (const key of UTM_PARAM_KEYS) {
    const value = sessionStorage.getItem(key);
    if (value && value.trim() !== "") {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Build a URL with UTM params from sessionStorage appended.
 * Convenience wrapper combining getUtmFromSession + appendUtmParams.
 */
export function buildUrlWithSessionUtm(baseUrl: string): string {
  return appendUtmParams(baseUrl, getUtmFromSession());
}

/**
 * Redirect to a URL with UTM params from sessionStorage appended.
 * Uses window.location.href for full-page navigation.
 */
export function redirectWithSessionUtm(url: string): void {
  if (typeof window !== "undefined") {
    window.location.href = buildUrlWithSessionUtm(url);
  }
}

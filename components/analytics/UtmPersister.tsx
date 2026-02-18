/**
 * RouteGenius — UTM Persister (Client Component)
 *
 * Detects UTM parameters in the current page URL and persists them
 * to sessionStorage for session-level propagation. Mounted once in
 * the root layout via <Suspense>.
 *
 * Flow:
 * 1. On page load / route change, read searchParams
 * 2. If UTM params exist, store them in sessionStorage
 * 3. Subsequent components (UtmLinkInjector) read from sessionStorage
 *
 * Pattern adapted from uk-topfinanzas-com UtmPersister.
 */

"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";
import {
  UTM_PARAM_KEYS,
  extractUtmParams,
  storeUtmInSession,
  hasUtmParams,
} from "@/lib/utm";

export default function UtmPersister() {
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!searchParams) return;

    // Build a URLSearchParams from Next.js ReadonlyURLSearchParams
    const params = new URLSearchParams();
    for (const key of UTM_PARAM_KEYS) {
      const value = searchParams.get(key);
      if (value) params.set(key, value);
    }

    const utmParams = extractUtmParams(params);

    if (hasUtmParams(utmParams)) {
      storeUtmInSession(utmParams);

      // Log in development for debugging
      if (process.env.NODE_ENV === "development") {
        console.log("[RouteGenius UTM] Persisted UTM params:", utmParams);
      }
    }
  }, [searchParams]);

  // This component renders nothing — it's a side-effect-only hook wrapper
  return null;
}

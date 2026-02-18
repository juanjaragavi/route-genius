/**
 * RouteGenius — UTM Link Injector (Client Component)
 *
 * Intercepts click events on <a> elements (capture phase) and appends
 * UTM parameters from sessionStorage to the link href before navigation.
 *
 * This ensures UTM params propagate through all internal navigation
 * without modifying individual Link/anchor components.
 *
 * Rules:
 * - Only modifies same-origin (internal) links
 * - Does NOT override UTM params already present on the target URL
 * - Uses capture-phase listener for maximum interception coverage
 * - Passive listener — does not call preventDefault()
 *
 * Pattern adapted from uk-topfinanzas-com UtmLinkInjector.
 */

"use client";

import { useEffect } from "react";
import { UTM_PARAM_KEYS, getUtmFromSession, hasUtmParams } from "@/lib/utm";

export default function UtmLinkInjector() {
  useEffect(() => {
    /**
     * Append UTM params from sessionStorage to a link href.
     * Returns the modified href, or the original if no changes needed.
     */
    function addUtmParamsToHref(href: string): string {
      const utmParams = getUtmFromSession();
      if (!hasUtmParams(utmParams)) return href;

      try {
        const url = new URL(href, window.location.origin);

        // Only modify same-origin links
        if (url.origin !== window.location.origin) return href;

        // Don't override existing UTM params
        if (UTM_PARAM_KEYS.some((key) => url.searchParams.has(key))) {
          return href;
        }

        // Append stored UTM params
        for (const [key, value] of Object.entries(utmParams)) {
          if (value) {
            url.searchParams.set(key, value);
          }
        }

        return url.toString();
      } catch {
        // Invalid URL — return unchanged
        return href;
      }
    }

    /**
     * Click handler — capture phase.
     * Finds the closest <a> ancestor and mutates its href before
     * the browser initiates navigation.
     */
    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target?.closest) return;

      const link = target.closest("a") as HTMLAnchorElement | null;
      if (!link || !link.href) return;

      // Skip external links, anchors, javascript:, mailto:, tel:
      const href = link.href;
      if (
        href.startsWith("javascript:") ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("#")
      ) {
        return;
      }

      const modifiedHref = addUtmParamsToHref(href);
      if (modifiedHref !== href) {
        link.href = modifiedHref;

        if (process.env.NODE_ENV === "development") {
          console.log("[RouteGenius UTM] Injected into link:", modifiedHref);
        }
      }
    }

    // Attach in capture phase for maximum coverage
    document.addEventListener("click", handleClick, {
      capture: true,
      passive: true,
    });

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
    };
  }, []);

  // This component renders nothing — it's a side-effect-only hook wrapper
  return null;
}

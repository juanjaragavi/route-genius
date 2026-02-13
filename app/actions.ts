"use server";

/**
 * RouteGenius — Server Actions
 *
 * Server-side functions that can be called from Client Components.
 * Phase 1: Updates in-memory store.
 * Phase 2: Will persist to Supabase/PostgreSQL.
 */

import { saveLink, getLink } from "@/lib/mock-data";
import { reportError } from "@/lib/gcp/error-reporting";
import type { Link } from "@/lib/types";

/**
 * Save link configuration to the in-memory store.
 * Returns the saved link or an error.
 */
export async function saveLinkAction(
  link: Link,
): Promise<{ success: true; link: Link } | { success: false; error: string }> {
  try {
    // Validate required fields
    if (!link.id) {
      return { success: false, error: "Link ID is required" };
    }

    if (!link.main_destination_url.trim()) {
      return { success: false, error: "Main destination URL is required" };
    }

    // Calculate total secondary weight
    const totalSecondaryWeight = link.rotation_rules.reduce(
      (sum, rule) => sum + rule.weight_percentage,
      0,
    );

    if (totalSecondaryWeight > 100) {
      return {
        success: false,
        error: `Total weight exceeds 100% (${totalSecondaryWeight}%)`,
      };
    }

    // Save to in-memory store
    saveLink(link);

    // Log for debugging
    console.log("[RouteGenius] Link saved:", {
      id: link.id,
      nickname: link.nickname,
      main_url: link.main_destination_url,
      rotation_enabled: link.rotation_enabled,
      rules_count: link.rotation_rules.length,
    });

    // Return the updated link
    const savedLink = getLink(link.id);
    return { success: true, link: savedLink! };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Error saving link:", error);
    reportError(error, {
      httpRequest: { method: "POST", url: "/actions/saveLinkAction" },
    });
    return {
      success: false,
      error: error.message || "Error al guardar el enlace.",
    };
  }
}

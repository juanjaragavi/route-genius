/**
 * RouteGenius — Mock data for Phase 1 (no persistent backend).
 *
 * Uses file-based storage to ensure data persists across
 * different server contexts (Server Actions vs API Routes).
 */

import type { Link } from "./types";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

// Store file path in project root
const STORE_FILE = join(process.cwd(), ".route-genius-store.json");

/** Default empty link for the editor */
export function createEmptyLink(): Link {
  return {
    id: crypto.randomUUID(),
    workspace_id: "ws_topnetworks_default",
    main_destination_url: "",
    nickname: "",
    status: "enabled",
    rotation_enabled: true,
    rotation_rules: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

/** Sample link with pre-configured rotation for demo */
export const sampleLink: Link = {
  id: "demo-link-001",
  workspace_id: "ws_topnetworks_default",
  main_destination_url: "https://topfinanzas.com/credit-cards",
  nickname: "Campaña Tarjetas de Crédito - Prueba A/B",
  status: "enabled",
  rotation_enabled: true,
  rotation_rules: [
    {
      id: "rule-001",
      destination_url: "https://topfinanzas.com/credit-cards/variant-a",
      weight_percentage: 30,
      order_index: 0,
    },
    {
      id: "rule-002",
      destination_url: "https://topfinanzas.com/credit-cards/variant-b",
      weight_percentage: 30,
      order_index: 1,
    },
  ],
  created_at: "2026-02-10T10:00:00.000Z",
  updated_at: "2026-02-10T10:00:00.000Z",
};

/**
 * Load link store from file, or initialize with sample data.
 */
function loadStore(): Map<string, Link> {
  try {
    if (existsSync(STORE_FILE)) {
      const data = readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(data) as Record<string, Link>;
      return new Map(Object.entries(parsed));
    }
  } catch (error) {
    console.error("[RouteGenius] Error loading store:", error);
  }

  // Initialize with sample link
  const store = new Map<string, Link>();
  store.set(sampleLink.id, sampleLink);
  return store;
}

/**
 * Save link store to file.
 */
function persistStore(store: Map<string, Link>): void {
  try {
    const data = Object.fromEntries(store);
    writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (error) {
    console.error("[RouteGenius] Error persisting store:", error);
  }
}

export function getLink(id: string): Link | undefined {
  const store = loadStore();
  return store.get(id);
}

export function saveLink(link: Link): void {
  const store = loadStore();
  link.updated_at = new Date().toISOString();
  store.set(link.id, { ...link });
  persistStore(store);
}

export function getAllLinks(): Link[] {
  const store = loadStore();
  return Array.from(store.values());
}

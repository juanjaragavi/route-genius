/**
 * RouteGenius — File-based data storage for Phase 1.
 *
 * Supports Projects > Links hierarchy with full CRUD,
 * global URL uniqueness, search/filter, and archive.
 *
 * Uses file-based storage to ensure data persists across
 * different server contexts (Server Actions vs API Routes).
 */

import type { Link, Project, LinkSearchCriteria } from "./types";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";
import { generateUniqueLinkSlug, generateUniqueProjectSlug } from "./slug";

// On Vercel, process.cwd() is read-only. Use /tmp for write-able storage.
const STORE_FILE = process.env.VERCEL
  ? join("/tmp", ".route-genius-store.json")
  : join(process.cwd(), ".route-genius-store.json");

const DEFAULT_WORKSPACE = "ws_topnetworks_default";

/** Shape of the persisted JSON store */
interface StoreData {
  projects: Record<string, Project>;
  links: Record<string, Link>;
}

/**
 * In-memory cache so that a write followed by an immediate read
 * within the same function invocation always returns the latest data,
 * even if the filesystem write fails or is slow.
 */
let _storeCache: StoreData | null = null;

// ── Sample Data ──────────────────────────────────────────────

/** Sample project for demo purposes */
export const sampleProject: Project = {
  id: "demo-project-001",
  workspace_id: DEFAULT_WORKSPACE,
  name: "topfinanzas-campanas",
  title: "TopFinanzas — Campañas",
  description:
    "Proyecto principal de enlaces de rotación para campañas de TopFinanzas.",
  tags: ["topfinanzas", "campañas", "tarjetas"],
  archived: false,
  created_at: "2026-02-10T10:00:00.000Z",
  updated_at: "2026-02-10T10:00:00.000Z",
};

/** Sample link with pre-configured rotation for demo */
export const sampleLink: Link = {
  id: "demo-link-001",
  workspace_id: DEFAULT_WORKSPACE,
  project_id: "demo-project-001",
  name: "campana-tarjetas-ab",
  title: "Campaña Tarjetas de Crédito — Prueba A/B",
  description:
    "Enlace de rotación A/B para la campaña de tarjetas de crédito de TopFinanzas.",
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
  archived: false,
  created_at: "2026-02-10T10:00:00.000Z",
  updated_at: "2026-02-10T10:00:00.000Z",
};

// ── Store I/O ─────────────────────────────────────────────────

/**
 * Load store from in-memory cache, then file, or initialize with sample data.
 */
function loadStore(): StoreData {
  // Return cached version if available (same function invocation)
  if (_storeCache) return _storeCache;

  try {
    if (existsSync(STORE_FILE)) {
      const raw = readFileSync(STORE_FILE, "utf-8");
      const parsed = JSON.parse(raw);

      // Handle legacy flat format (Phase 1 compat: { "linkId": Link })
      if (parsed && !parsed.projects && !parsed.links) {
        const legacyLinks = parsed as Record<string, Link>;
        const migratedLinks: Record<string, Link> = {};
        for (const [id, link] of Object.entries(legacyLinks)) {
          migratedLinks[id] = {
            ...link,
            project_id: link.project_id || sampleProject.id,
            name: link.name || link.nickname || id,
            title: link.title || link.nickname || "",
            description: link.description || "",
            archived: link.archived ?? false,
          };
        }
        const store: StoreData = {
          projects: { [sampleProject.id]: sampleProject },
          links: migratedLinks,
        };
        _storeCache = store;
        persistStore(store);
        return store;
      }

      _storeCache = parsed as StoreData;
      return _storeCache;
    }
  } catch (error) {
    console.error("[RouteGenius] Error loading store:", error);
  }

  // Initialize with sample data
  const store: StoreData = {
    projects: { [sampleProject.id]: sampleProject },
    links: { [sampleLink.id]: sampleLink },
  };
  _storeCache = store;
  persistStore(store);
  return store;
}

/**
 * Save store to file and update the in-memory cache.
 */
function persistStore(store: StoreData): void {
  _storeCache = store;
  try {
    writeFileSync(STORE_FILE, JSON.stringify(store, null, 2), "utf-8");
  } catch (error) {
    console.error(
      "[RouteGenius] Error persisting store (filesystem may be read-only):",
      error,
    );
    // On Vercel: the in-memory cache still holds the data,
    // so subsequent reads within this invocation will work.
  }
}

// ── Helper factories ──────────────────────────────────────────

/** Collect all existing link names for uniqueness checks */
export function getAllLinkNames(): Set<string> {
  const store = loadStore();
  return new Set(
    Object.values(store.links)
      .map((l) => l.name)
      .filter(Boolean),
  );
}

/** Collect all existing project names for uniqueness checks */
export function getAllProjectNames(): Set<string> {
  const store = loadStore();
  return new Set(
    Object.values(store.projects)
      .map((p) => p.name)
      .filter(Boolean),
  );
}

/** Create an empty project with a unique slug */
export function createEmptyProject(overrides?: Partial<Project>): Project {
  const now = new Date().toISOString();
  const existingNames = getAllProjectNames();
  return {
    id: crypto.randomUUID(),
    workspace_id: DEFAULT_WORKSPACE,
    name: generateUniqueProjectSlug(existingNames),
    title: "",
    description: "",
    tags: [],
    archived: false,
    created_at: now,
    updated_at: now,
    ...overrides,
  };
}

/** Create an empty link scoped to a project, with a unique slug */
export function createEmptyLink(projectId: string): Link {
  const now = new Date().toISOString();
  const existingNames = getAllLinkNames();
  return {
    id: crypto.randomUUID(),
    workspace_id: DEFAULT_WORKSPACE,
    project_id: projectId,
    name: generateUniqueLinkSlug(existingNames),
    title: "",
    description: "",
    main_destination_url: "",
    nickname: "",
    status: "enabled",
    rotation_enabled: true,
    rotation_rules: [],
    archived: false,
    created_at: now,
    updated_at: now,
  };
}

// ── Project CRUD ──────────────────────────────────────────────

export function getProject(id: string): Project | undefined {
  const store = loadStore();
  return store.projects[id];
}

export function getAllProjects(includeArchived = false): Project[] {
  const store = loadStore();
  return Object.values(store.projects).filter(
    (p) => includeArchived || !p.archived,
  );
}

export function saveProject(project: Project): void {
  const store = loadStore();
  project.updated_at = new Date().toISOString();
  store.projects[project.id] = { ...project };
  persistStore(store);
}

export function deleteProject(id: string): void {
  const store = loadStore();
  delete store.projects[id];
  // Also delete all links in this project
  for (const [linkId, link] of Object.entries(store.links)) {
    if (link.project_id === id) {
      delete store.links[linkId];
    }
  }
  persistStore(store);
}

export function archiveProject(id: string): void {
  const store = loadStore();
  const project = store.projects[id];
  if (project) {
    project.archived = true;
    project.updated_at = new Date().toISOString();
    // Also archive all links in this project
    for (const link of Object.values(store.links)) {
      if (link.project_id === id) {
        link.archived = true;
        link.updated_at = new Date().toISOString();
      }
    }
    persistStore(store);
  }
}

export function unarchiveProject(id: string): void {
  const store = loadStore();
  const project = store.projects[id];
  if (project) {
    project.archived = false;
    project.updated_at = new Date().toISOString();
    // Also unarchive all links in this project
    for (const link of Object.values(store.links)) {
      if (link.project_id === id) {
        link.archived = false;
        link.updated_at = new Date().toISOString();
      }
    }
    persistStore(store);
  }
}

// ── Link CRUD ─────────────────────────────────────────────────

export function getLink(id: string): Link | undefined {
  const store = loadStore();
  return store.links[id];
}

export function saveLink(link: Link): void {
  const store = loadStore();
  link.updated_at = new Date().toISOString();
  store.links[link.id] = { ...link };
  persistStore(store);
}

export function deleteLink(id: string): void {
  const store = loadStore();
  delete store.links[id];
  persistStore(store);
}

export function archiveLink(id: string): void {
  const store = loadStore();
  const link = store.links[id];
  if (link) {
    link.archived = true;
    link.updated_at = new Date().toISOString();
    persistStore(store);
  }
}

export function unarchiveLink(id: string): void {
  const store = loadStore();
  const link = store.links[id];
  if (link) {
    link.archived = false;
    link.updated_at = new Date().toISOString();
    persistStore(store);
  }
}

export function getAllLinks(): Link[] {
  const store = loadStore();
  return Object.values(store.links);
}

/** Get all links in a project (active only by default) */
export function getLinksByProject(
  projectId: string,
  includeArchived = false,
): Link[] {
  const store = loadStore();
  return Object.values(store.links).filter(
    (l) => l.project_id === projectId && (includeArchived || !l.archived),
  );
}

/** Count links in a project (active only) */
export function countLinksByProject(projectId: string): number {
  const store = loadStore();
  return Object.values(store.links).filter(
    (l) => l.project_id === projectId && !l.archived,
  ).length;
}

// ── Uniqueness ────────────────────────────────────────────────

/**
 * Check if any existing link already uses the given main_destination_url.
 * Returns the conflicting link, or undefined if unique.
 * Excludes the link with `excludeId` (for updates).
 */
export function findLinkByMainUrl(
  url: string,
  excludeId?: string,
): Link | undefined {
  const store = loadStore();
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");
  return Object.values(store.links).find((l) => {
    if (excludeId && l.id === excludeId) return false;
    return (
      l.main_destination_url.trim().toLowerCase().replace(/\/+$/, "") ===
      normalized
    );
  });
}

/**
 * Check if any link (in any project) already uses the given tracking URL
 * (based on main_destination_url + rotation rule URLs).
 * Returns the first conflicting link if found.
 */
export function findDuplicateUrl(
  url: string,
  excludeId?: string,
): Link | undefined {
  const store = loadStore();
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");
  return Object.values(store.links).find((l) => {
    if (excludeId && l.id === excludeId) return false;
    const mainNorm = l.main_destination_url
      .trim()
      .toLowerCase()
      .replace(/\/+$/, "");
    if (mainNorm === normalized) return true;
    return l.rotation_rules.some(
      (r) =>
        r.destination_url.trim().toLowerCase().replace(/\/+$/, "") ===
        normalized,
    );
  });
}

// ── Search / Filter ───────────────────────────────────────────

/** Search links across all projects with flexible criteria */
export function searchLinks(criteria: LinkSearchCriteria): Link[] {
  const store = loadStore();
  let results = Object.values(store.links);

  // Archive filter
  if (!criteria.includeArchived) {
    results = results.filter((l) => !l.archived);
  }

  // Project filter
  if (criteria.projectId) {
    results = results.filter((l) => l.project_id === criteria.projectId);
  }

  // Status filter
  if (criteria.status) {
    results = results.filter((l) => l.status === criteria.status);
  }

  // Rotation enabled filter
  if (criteria.rotationEnabled !== undefined) {
    results = results.filter(
      (l) => l.rotation_enabled === criteria.rotationEnabled,
    );
  }

  // Tags filter (match links whose parent project has any of the given tags)
  if (criteria.tags && criteria.tags.length > 0) {
    const tagSet = new Set(criteria.tags.map((t) => t.toLowerCase()));
    results = results.filter((l) => {
      const project = store.projects[l.project_id];
      if (!project) return false;
      return project.tags.some((t) => tagSet.has(t.toLowerCase()));
    });
  }

  // Date range filters
  if (criteria.createdAfter) {
    const after = new Date(criteria.createdAfter).getTime();
    results = results.filter((l) => new Date(l.created_at).getTime() >= after);
  }
  if (criteria.createdBefore) {
    const before = new Date(criteria.createdBefore).getTime();
    results = results.filter((l) => new Date(l.created_at).getTime() <= before);
  }

  // Free-text search (name, title, description, nickname, URLs)
  if (criteria.query) {
    const q = criteria.query.toLowerCase();
    results = results.filter((l) => {
      const searchable = [
        l.name,
        l.title,
        l.description,
        l.nickname,
        l.main_destination_url,
        ...l.rotation_rules.map((r) => r.destination_url),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }

  // Sort by updated_at descending
  results.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return results;
}

/** Search projects by free-text query and/or tags */
export function searchProjects(
  query?: string,
  tags?: string[],
  includeArchived = false,
): Project[] {
  const store = loadStore();
  let results = Object.values(store.projects);

  if (!includeArchived) {
    results = results.filter((p) => !p.archived);
  }

  if (tags && tags.length > 0) {
    const tagSet = new Set(tags.map((t) => t.toLowerCase()));
    results = results.filter((p) =>
      p.tags.some((t) => tagSet.has(t.toLowerCase())),
    );
  }

  if (query) {
    const q = query.toLowerCase();
    results = results.filter((p) => {
      const searchable = [p.name, p.title, p.description, ...p.tags]
        .join(" ")
        .toLowerCase();
      return searchable.includes(q);
    });
  }

  results.sort(
    (a, b) =>
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  );

  return results;
}

// ── Archive helpers ───────────────────────────────────────────

/** Get all archived projects */
export function getArchivedProjects(): Project[] {
  return loadStore()
    ? Object.values(loadStore().projects).filter((p) => p.archived)
    : [];
}

/** Get all archived links */
export function getArchivedLinks(): Link[] {
  return loadStore()
    ? Object.values(loadStore().links).filter((l) => l.archived)
    : [];
}

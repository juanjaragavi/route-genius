/**
 * RouteGenius — Persistent data storage via Supabase PostgreSQL.
 *
 * Supports Projects > Links hierarchy with full CRUD,
 * global URL uniqueness, search/filter, and archive.
 *
 * Replaces the Phase 1 file-based store that was incompatible
 * with Vercel's ephemeral serverless filesystem.
 *
 * Requires the `projects` and `links` tables to exist in Supabase.
 * Run scripts/001-create-projects-links-tables.sql to create them.
 */

import type { Link, Project, LinkSearchCriteria } from "./types";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { generateUniqueProjectSlug } from "./slug";

const DEFAULT_WORKSPACE = "ws_topnetworks_default";

// ── Supabase Client ───────────────────────────────────────────

let _supabase: SupabaseClient | null = null;

/**
 * Lazily initialised Supabase client with service-role key.
 * Service role bypasses RLS so Server Actions and API Routes
 * can read/write without per-user auth context.
 */
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "[RouteGenius] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
          "Projects and links require Supabase. " +
          "Run scripts/001-create-projects-links-tables.sql first.",
      );
    }
    _supabase = createClient(url, key);
  }
  return _supabase;
}

// ── Row Mappers ───────────────────────────────────────────────

/**
 * Convert a Supabase row into a typed Project object.
 * Handles JSONB → array conversion for `tags`.
 */
function mapProjectRow(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    workspace_id: (row.workspace_id as string) || DEFAULT_WORKSPACE,
    ...(row.user_id ? { user_id: row.user_id as string } : {}),
    name: (row.name as string) || "",
    title: (row.title as string) || "",
    description: (row.description as string) || "",
    tags: Array.isArray(row.tags)
      ? (row.tags as string[])
      : typeof row.tags === "string"
        ? JSON.parse(row.tags)
        : [],
    archived: !!row.archived,
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: (row.updated_at as string) || new Date().toISOString(),
  };
}

/**
 * Convert a Supabase row into a typed Link object.
 * Handles JSONB → array conversion for `rotation_rules`.
 */
function mapLinkRow(row: Record<string, unknown>): Link {
  let rules = row.rotation_rules;
  if (typeof rules === "string") {
    try {
      rules = JSON.parse(rules);
    } catch {
      rules = [];
    }
  }
  if (!Array.isArray(rules)) rules = [];

  return {
    id: row.id as string,
    workspace_id: (row.workspace_id as string) || DEFAULT_WORKSPACE,
    ...(row.user_id ? { user_id: row.user_id as string } : {}),
    project_id: row.project_id as string,
    title: (row.title as string) || "",
    description: (row.description as string) || "",
    main_destination_url: (row.main_destination_url as string) || "",
    nickname: (row.nickname as string) || "",
    status: (row.status as Link["status"]) || "enabled",
    rotation_enabled: row.rotation_enabled !== false,
    rotation_rules: rules as Link["rotation_rules"],
    archived: !!row.archived,
    created_at: (row.created_at as string) || new Date().toISOString(),
    updated_at: (row.updated_at as string) || new Date().toISOString(),
  };
}

// ── Sample Data ──────────────────────────────────────────────

/** Sample project for demo purposes (seeded via SQL migration) */
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

/** Sample link with pre-configured rotation for demo (seeded via SQL migration) */
export const sampleLink: Link = {
  id: "demo-link-001",
  workspace_id: DEFAULT_WORKSPACE,
  project_id: "demo-project-001",
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

// ── Helper factories ──────────────────────────────────────────

/** Collect all existing project names for uniqueness checks */
export async function getAllProjectNames(userId: string): Promise<Set<string>> {
  const { data } = await getSupabase()
    .from("projects")
    .select("name")
    .eq("user_id", userId);
  return new Set(
    (data ?? []).map((r: { name: string }) => r.name).filter(Boolean),
  );
}

/** Create an empty project with a unique slug */
export async function createEmptyProject(
  userId: string,
  overrides?: Partial<Project>,
): Promise<Project> {
  const now = new Date().toISOString();
  const existingNames = await getAllProjectNames(userId);
  return {
    id: crypto.randomUUID(),
    workspace_id: DEFAULT_WORKSPACE,
    user_id: userId,
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

/** Create an empty link scoped to a project */
export async function createEmptyLink(
  projectId: string,
  userId: string,
): Promise<Link> {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    workspace_id: DEFAULT_WORKSPACE,
    user_id: userId,
    project_id: projectId,
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

export async function getProject(
  id: string,
  userId: string,
): Promise<Project | undefined> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[RouteGenius] Error fetching project:", error.message);
    return undefined;
  }
  if (!data) return undefined;
  return mapProjectRow(data);
}

export async function getAllProjects(
  userId: string,
  includeArchived = false,
): Promise<Project[]> {
  let query = getSupabase()
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[RouteGenius] Error fetching projects:", error.message);
    return [];
  }
  return (data ?? []).map(mapProjectRow);
}

export async function saveProject(project: Project): Promise<void> {
  project.updated_at = new Date().toISOString();

  const { error } = await getSupabase().from("projects").upsert(
    {
      id: project.id,
      workspace_id: project.workspace_id,
      user_id: project.user_id,
      name: project.name,
      title: project.title,
      description: project.description,
      tags: project.tags,
      archived: project.archived,
      created_at: project.created_at,
      updated_at: project.updated_at,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[RouteGenius] Error saving project:", error.message);
    throw new Error(`Failed to save project: ${error.message}`);
  }
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  // Links are deleted by CASCADE (FK project_id → projects.id)
  const { error } = await getSupabase()
    .from("projects")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[RouteGenius] Error deleting project:", error.message);
    throw new Error(`Failed to delete project: ${error.message}`);
  }
}

export async function archiveProject(
  id: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const supabase = getSupabase();

  // Archive the project
  const { error: projError } = await supabase
    .from("projects")
    .update({ archived: true, updated_at: now })
    .eq("id", id)
    .eq("user_id", userId);

  if (projError) {
    console.error("[RouteGenius] Error archiving project:", projError.message);
  }

  // Archive all links in this project
  const { error: linksError } = await supabase
    .from("links")
    .update({ archived: true, updated_at: now })
    .eq("project_id", id)
    .eq("user_id", userId);

  if (linksError) {
    console.error(
      "[RouteGenius] Error archiving project links:",
      linksError.message,
    );
  }
}

export async function unarchiveProject(
  id: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();
  const supabase = getSupabase();

  // Unarchive the project
  const { error: projError } = await supabase
    .from("projects")
    .update({ archived: false, updated_at: now })
    .eq("id", id)
    .eq("user_id", userId);

  if (projError) {
    console.error(
      "[RouteGenius] Error unarchiving project:",
      projError.message,
    );
  }

  // Unarchive all links in this project
  const { error: linksError } = await supabase
    .from("links")
    .update({ archived: false, updated_at: now })
    .eq("project_id", id)
    .eq("user_id", userId);

  if (linksError) {
    console.error(
      "[RouteGenius] Error unarchiving project links:",
      linksError.message,
    );
  }
}

// ── Link CRUD ─────────────────────────────────────────────────

export async function getLink(
  id: string,
  userId: string,
): Promise<Link | undefined> {
  const { data, error } = await getSupabase()
    .from("links")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[RouteGenius] Error fetching link:", error.message);
    return undefined;
  }
  if (!data) return undefined;
  return mapLinkRow(data);
}

/**
 * Fetch a link by ID for the public redirect endpoint.
 * No user filtering — any link (regardless of owner) can be redirected.
 */
export async function getLinkForRedirect(
  id: string,
): Promise<Link | undefined> {
  const { data, error } = await getSupabase()
    .from("links")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error(
      "[RouteGenius] Error fetching link for redirect:",
      error.message,
    );
    return undefined;
  }
  if (!data) return undefined;
  return mapLinkRow(data);
}

export async function saveLink(link: Link): Promise<void> {
  link.updated_at = new Date().toISOString();

  const { error } = await getSupabase().from("links").upsert(
    {
      id: link.id,
      workspace_id: link.workspace_id,
      user_id: link.user_id,
      project_id: link.project_id,
      title: link.title,
      description: link.description,
      main_destination_url: link.main_destination_url,
      nickname: link.nickname,
      status: link.status,
      rotation_enabled: link.rotation_enabled,
      rotation_rules: link.rotation_rules,
      archived: link.archived,
      created_at: link.created_at,
      updated_at: link.updated_at,
    },
    { onConflict: "id" },
  );

  if (error) {
    console.error("[RouteGenius] Error saving link:", error.message);
    throw new Error(`Failed to save link: ${error.message}`);
  }
}

export async function deleteLink(id: string, userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("links")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[RouteGenius] Error deleting link:", error.message);
    throw new Error(`Failed to delete link: ${error.message}`);
  }
}

export async function archiveLink(id: string, userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("links")
    .update({ archived: true, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[RouteGenius] Error archiving link:", error.message);
  }
}

export async function unarchiveLink(id: string, userId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("links")
    .update({ archived: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", userId);

  if (error) {
    console.error("[RouteGenius] Error unarchiving link:", error.message);
  }
}

export async function getAllLinks(userId: string): Promise<Link[]> {
  const { data, error } = await getSupabase()
    .from("links")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[RouteGenius] Error fetching links:", error.message);
    return [];
  }
  return (data ?? []).map(mapLinkRow);
}

/** Get all links in a project (active only by default) */
export async function getLinksByProject(
  projectId: string,
  userId: string,
  includeArchived = false,
): Promise<Link[]> {
  let query = getSupabase()
    .from("links")
    .select("*")
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!includeArchived) {
    query = query.eq("archived", false);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[RouteGenius] Error fetching project links:", error.message);
    return [];
  }
  return (data ?? []).map(mapLinkRow);
}

/** Count links in a project (active only) */
export async function countLinksByProject(
  projectId: string,
  userId: string,
): Promise<number> {
  const { count, error } = await getSupabase()
    .from("links")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("user_id", userId)
    .eq("archived", false);

  if (error) {
    console.error("[RouteGenius] Error counting links:", error.message);
    return 0;
  }
  return count ?? 0;
}

// ── Uniqueness ────────────────────────────────────────────────

/**
 * Check if any existing link already uses the given main_destination_url.
 * Returns the conflicting link, or undefined if unique.
 * Excludes the link with `excludeId` (for updates).
 */
export async function findLinkByMainUrl(
  url: string,
  userId: string,
  excludeId?: string,
): Promise<Link | undefined> {
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");

  const { data } = await getSupabase()
    .from("links")
    .select("*")
    .eq("user_id", userId);

  if (!data) return undefined;

  return data.map(mapLinkRow).find((l) => {
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
export async function findDuplicateUrl(
  url: string,
  userId: string,
  excludeId?: string,
): Promise<Link | undefined> {
  const normalized = url.trim().toLowerCase().replace(/\/+$/, "");

  const { data } = await getSupabase()
    .from("links")
    .select("*")
    .eq("user_id", userId);

  if (!data) return undefined;

  return data.map(mapLinkRow).find((l) => {
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
export async function searchLinks(
  criteria: LinkSearchCriteria,
  userId: string,
): Promise<Link[]> {
  let query = getSupabase()
    .from("links")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  // Archive filter
  if (!criteria.includeArchived) {
    query = query.eq("archived", false);
  }

  // Project filter
  if (criteria.projectId) {
    query = query.eq("project_id", criteria.projectId);
  }

  // Status filter
  if (criteria.status) {
    query = query.eq("status", criteria.status);
  }

  // Rotation enabled filter
  if (criteria.rotationEnabled !== undefined) {
    query = query.eq("rotation_enabled", criteria.rotationEnabled);
  }

  // Date range filters
  if (criteria.createdAfter) {
    query = query.gte("created_at", criteria.createdAfter);
  }
  if (criteria.createdBefore) {
    query = query.lte("created_at", criteria.createdBefore);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[RouteGenius] Error searching links:", error.message);
    return [];
  }

  let results = (data ?? []).map(mapLinkRow);

  // Tags filter (match links whose parent project has any of the given tags)
  if (criteria.tags && criteria.tags.length > 0) {
    const tagSet = new Set(criteria.tags.map((t) => t.toLowerCase()));

    const { data: projectData } = await getSupabase()
      .from("projects")
      .select("id, tags")
      .eq("user_id", userId);

    const projectIdsWithTags = new Set(
      (projectData ?? [])
        .filter((p: Record<string, unknown>) => {
          const tags = Array.isArray(p.tags) ? (p.tags as string[]) : [];
          return tags.some((t: string) => tagSet.has(t.toLowerCase()));
        })
        .map((p: Record<string, unknown>) => p.id as string),
    );

    results = results.filter((l) => projectIdsWithTags.has(l.project_id));
  }

  // Free-text search (title, description, nickname, URLs)
  if (criteria.query) {
    const q = criteria.query.toLowerCase();
    results = results.filter((l) => {
      const searchable = [
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

  return results;
}

/** Search projects by free-text query and/or tags */
export async function searchProjects(
  userId: string,
  query?: string,
  tags?: string[],
  includeArchived = false,
): Promise<Project[]> {
  let dbQuery = getSupabase()
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (!includeArchived) {
    dbQuery = dbQuery.eq("archived", false);
  }

  const { data, error } = await dbQuery;
  if (error) {
    console.error("[RouteGenius] Error searching projects:", error.message);
    return [];
  }

  let results = (data ?? []).map(mapProjectRow);

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

  return results;
}

// ── Archive helpers ───────────────────────────────────────────

/** Get all archived projects */
export async function getArchivedProjects(userId: string): Promise<Project[]> {
  const { data, error } = await getSupabase()
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(
      "[RouteGenius] Error fetching archived projects:",
      error.message,
    );
    return [];
  }
  return (data ?? []).map(mapProjectRow);
}

/** Get all archived links */
export async function getArchivedLinks(userId: string): Promise<Link[]> {
  const { data, error } = await getSupabase()
    .from("links")
    .select("*")
    .eq("user_id", userId)
    .eq("archived", true)
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(
      "[RouteGenius] Error fetching archived links:",
      error.message,
    );
    return [];
  }
  return (data ?? []).map(mapLinkRow);
}

// ── Legacy Data Migration ─────────────────────────────────────

/**
 * One-time migration helper: assigns all projects and links with
 * user_id IS NULL to the specified user. This "claims" legacy data
 * created before ownership tracking was added.
 */
export async function claimLegacyData(
  userId: string,
): Promise<{ projects: number; links: number }> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  const { data: projectData } = await supabase
    .from("projects")
    .update({ user_id: userId, updated_at: now })
    .is("user_id", null)
    .select("id");

  const { data: linkData } = await supabase
    .from("links")
    .update({ user_id: userId, updated_at: now })
    .is("user_id", null)
    .select("id");

  const projectCount = projectData?.length ?? 0;
  const linkCount = linkData?.length ?? 0;

  console.log(
    `[RouteGenius] Claimed legacy data for ${userId}: ${projectCount} projects, ${linkCount} links`,
  );
  return { projects: projectCount, links: linkCount };
}

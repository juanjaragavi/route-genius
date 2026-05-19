/**
 * RouteGenius — Persistent data storage via Cloud SQL PostgreSQL.
 *
 * Supports Projects > Links hierarchy with full CRUD,
 * global URL uniqueness, search/filter, and archive.
 *
 * Migrated from Supabase JS client to direct `pg` Pool (March 2026).
 */

import type { Link, Project, LinkSearchCriteria } from "./types";
import { getPool } from "./db";
import { generateUniqueProjectSlug } from "./slug";

const DEFAULT_WORKSPACE = "ws_topnetworks_default";

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
  const { rows } = await getPool().query(
    `SELECT name FROM projects WHERE user_id = $1`,
    [userId],
  );
  return new Set(rows.map((r: { name: string }) => r.name).filter(Boolean));
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
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM projects WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId],
    );
    if (rows.length === 0) return undefined;
    return mapProjectRow(rows[0]);
  } catch (err) {
    console.error("[RouteGenius] Error fetching project:", err);
    return undefined;
  }
}

export async function getAllProjects(
  userId: string,
  includeArchived = false,
): Promise<Project[]> {
  try {
    const sql = includeArchived
      ? `SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC`
      : `SELECT * FROM projects WHERE user_id = $1 AND archived = false ORDER BY updated_at DESC`;
    const { rows } = await getPool().query(sql, [userId]);
    return rows.map(mapProjectRow);
  } catch (err) {
    console.error("[RouteGenius] Error fetching projects:", err);
    return [];
  }
}

export async function saveProject(project: Project): Promise<void> {
  project.updated_at = new Date().toISOString();

  await getPool().query(
    `INSERT INTO projects (id, workspace_id, user_id, name, title, description, tags, archived, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (id) DO UPDATE SET
       workspace_id = EXCLUDED.workspace_id,
       user_id = EXCLUDED.user_id,
       name = EXCLUDED.name,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       tags = EXCLUDED.tags,
       archived = EXCLUDED.archived,
       created_at = EXCLUDED.created_at,
       updated_at = EXCLUDED.updated_at`,
    [
      project.id,
      project.workspace_id,
      project.user_id,
      project.name,
      project.title,
      project.description,
      JSON.stringify(project.tags),
      project.archived,
      project.created_at,
      project.updated_at,
    ],
  );
}

export async function deleteProject(id: string, userId: string): Promise<void> {
  // Links are deleted by CASCADE (FK project_id → projects.id)
  await getPool().query(`DELETE FROM projects WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
}

export async function archiveProject(
  id: string,
  userId: string,
): Promise<void> {
  const pool = getPool();
  const now = new Date().toISOString();

  // Archive the project
  await pool.query(
    `UPDATE projects SET archived = true, updated_at = $1 WHERE id = $2 AND user_id = $3`,
    [now, id, userId],
  );

  // Archive all links in this project
  await pool.query(
    `UPDATE links SET archived = true, updated_at = $1 WHERE project_id = $2 AND user_id = $3`,
    [now, id, userId],
  );
}

export async function unarchiveProject(
  id: string,
  userId: string,
): Promise<void> {
  const pool = getPool();
  const now = new Date().toISOString();

  // Unarchive the project
  await pool.query(
    `UPDATE projects SET archived = false, updated_at = $1 WHERE id = $2 AND user_id = $3`,
    [now, id, userId],
  );

  // Unarchive all links in this project
  await pool.query(
    `UPDATE links SET archived = false, updated_at = $1 WHERE project_id = $2 AND user_id = $3`,
    [now, id, userId],
  );
}

// ── Link CRUD ─────────────────────────────────────────────────

export async function getLink(
  id: string,
  userId: string,
): Promise<Link | undefined> {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM links WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId],
    );
    if (rows.length === 0) return undefined;
    return mapLinkRow(rows[0]);
  } catch (err) {
    console.error("[RouteGenius] Error fetching link:", err);
    return undefined;
  }
}

/**
 * Fetch a link by ID for the public redirect endpoint.
 * No user filtering — any link (regardless of owner) can be redirected.
 */
export async function getLinkForRedirect(
  id: string,
): Promise<Link | undefined> {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM links WHERE id = $1 LIMIT 1`,
      [id],
    );
    if (rows.length === 0) return undefined;
    return mapLinkRow(rows[0]);
  } catch (err) {
    console.error("[RouteGenius] Error fetching link for redirect:", err);
    return undefined;
  }
}

export async function saveLink(link: Link): Promise<void> {
  link.updated_at = new Date().toISOString();

  await getPool().query(
    `INSERT INTO links (id, workspace_id, user_id, project_id, title, description, main_destination_url, nickname, status, rotation_enabled, rotation_rules, archived, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
     ON CONFLICT (id) DO UPDATE SET
       workspace_id = EXCLUDED.workspace_id,
       user_id = EXCLUDED.user_id,
       project_id = EXCLUDED.project_id,
       title = EXCLUDED.title,
       description = EXCLUDED.description,
       main_destination_url = EXCLUDED.main_destination_url,
       nickname = EXCLUDED.nickname,
       status = EXCLUDED.status,
       rotation_enabled = EXCLUDED.rotation_enabled,
       rotation_rules = EXCLUDED.rotation_rules,
       archived = EXCLUDED.archived,
       created_at = EXCLUDED.created_at,
       updated_at = EXCLUDED.updated_at`,
    [
      link.id,
      link.workspace_id,
      link.user_id,
      link.project_id,
      link.title,
      link.description,
      link.main_destination_url,
      link.nickname,
      link.status,
      link.rotation_enabled,
      JSON.stringify(link.rotation_rules),
      link.archived,
      link.created_at,
      link.updated_at,
    ],
  );
}

export async function deleteLink(id: string, userId: string): Promise<void> {
  await getPool().query(`DELETE FROM links WHERE id = $1 AND user_id = $2`, [
    id,
    userId,
  ]);
}

export async function archiveLink(id: string, userId: string): Promise<void> {
  await getPool().query(
    `UPDATE links SET archived = true, updated_at = $1 WHERE id = $2 AND user_id = $3`,
    [new Date().toISOString(), id, userId],
  );
}

export async function unarchiveLink(id: string, userId: string): Promise<void> {
  await getPool().query(
    `UPDATE links SET archived = false, updated_at = $1 WHERE id = $2 AND user_id = $3`,
    [new Date().toISOString(), id, userId],
  );
}

export async function getAllLinks(userId: string): Promise<Link[]> {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM links WHERE user_id = $1 ORDER BY updated_at DESC`,
      [userId],
    );
    return rows.map(mapLinkRow);
  } catch (err) {
    console.error("[RouteGenius] Error fetching links:", err);
    return [];
  }
}

/** Get all links in a project (active only by default) */
export async function getLinksByProject(
  projectId: string,
  userId: string,
  includeArchived = false,
): Promise<Link[]> {
  try {
    const sql = includeArchived
      ? `SELECT * FROM links WHERE project_id = $1 AND user_id = $2 ORDER BY updated_at DESC`
      : `SELECT * FROM links WHERE project_id = $1 AND user_id = $2 AND archived = false ORDER BY updated_at DESC`;
    const { rows } = await getPool().query(sql, [projectId, userId]);
    return rows.map(mapLinkRow);
  } catch (err) {
    console.error("[RouteGenius] Error fetching project links:", err);
    return [];
  }
}

/** Count links in a project (active only) */
export async function countLinksByProject(
  projectId: string,
  userId: string,
): Promise<number> {
  try {
    const { rows } = await getPool().query(
      `SELECT COUNT(*)::int AS count FROM links WHERE project_id = $1 AND user_id = $2 AND archived = false`,
      [projectId, userId],
    );
    return rows[0]?.count ?? 0;
  } catch (err) {
    console.error("[RouteGenius] Error counting links:", err);
    return 0;
  }
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

  const { rows } = await getPool().query(
    `SELECT * FROM links WHERE user_id = $1`,
    [userId],
  );

  if (!rows.length) return undefined;

  return rows.map(mapLinkRow).find((l) => {
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

  const { rows } = await getPool().query(
    `SELECT * FROM links WHERE user_id = $1`,
    [userId],
  );

  if (!rows.length) return undefined;

  return rows.map(mapLinkRow).find((l) => {
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
  try {
    const conditions: string[] = ["user_id = $1"];
    const params: unknown[] = [userId];
    let idx = 2;

    if (!criteria.includeArchived) {
      conditions.push(`archived = false`);
    }

    if (criteria.projectId) {
      conditions.push(`project_id = $${idx}`);
      params.push(criteria.projectId);
      idx++;
    }

    if (criteria.status) {
      conditions.push(`status = $${idx}`);
      params.push(criteria.status);
      idx++;
    }

    if (criteria.rotationEnabled !== undefined) {
      conditions.push(`rotation_enabled = $${idx}`);
      params.push(criteria.rotationEnabled);
      idx++;
    }

    if (criteria.createdAfter) {
      conditions.push(`created_at >= $${idx}`);
      params.push(criteria.createdAfter);
      idx++;
    }
    if (criteria.createdBefore) {
      conditions.push(`created_at <= $${idx}`);
      params.push(criteria.createdBefore);
      idx++;
    }

    const sql = `SELECT * FROM links WHERE ${conditions.join(" AND ")} ORDER BY updated_at DESC`;
    const { rows } = await getPool().query(sql, params);

    let results = rows.map(mapLinkRow);

    // Tags filter (match links whose parent project has any of the given tags)
    if (criteria.tags && criteria.tags.length > 0) {
      const tagSet = new Set(criteria.tags.map((t) => t.toLowerCase()));

      const { rows: projectRows } = await getPool().query(
        `SELECT id, tags FROM projects WHERE user_id = $1`,
        [userId],
      );

      const projectIdsWithTags = new Set(
        projectRows
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
  } catch (err) {
    console.error("[RouteGenius] Error searching links:", err);
    return [];
  }
}

/** Search projects by free-text query and/or tags */
export async function searchProjects(
  userId: string,
  query?: string,
  tags?: string[],
  includeArchived = false,
): Promise<Project[]> {
  try {
    const sql = includeArchived
      ? `SELECT * FROM projects WHERE user_id = $1 ORDER BY updated_at DESC`
      : `SELECT * FROM projects WHERE user_id = $1 AND archived = false ORDER BY updated_at DESC`;
    const { rows } = await getPool().query(sql, [userId]);

    let results = rows.map(mapProjectRow);

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
  } catch (err) {
    console.error("[RouteGenius] Error searching projects:", err);
    return [];
  }
}

// ── Archive helpers ───────────────────────────────────────────

/** Get all archived projects */
export async function getArchivedProjects(userId: string): Promise<Project[]> {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM projects WHERE user_id = $1 AND archived = true ORDER BY updated_at DESC`,
      [userId],
    );
    return rows.map(mapProjectRow);
  } catch (err) {
    console.error("[RouteGenius] Error fetching archived projects:", err);
    return [];
  }
}

/** Get all archived links */
export async function getArchivedLinks(userId: string): Promise<Link[]> {
  try {
    const { rows } = await getPool().query(
      `SELECT * FROM links WHERE user_id = $1 AND archived = true ORDER BY updated_at DESC`,
      [userId],
    );
    return rows.map(mapLinkRow);
  } catch (err) {
    console.error("[RouteGenius] Error fetching archived links:", err);
    return [];
  }
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
  const pool = getPool();
  const now = new Date().toISOString();

  const projectResult = await pool.query(
    `UPDATE projects SET user_id = $1, updated_at = $2 WHERE user_id IS NULL RETURNING id`,
    [userId, now],
  );

  const linkResult = await pool.query(
    `UPDATE links SET user_id = $1, updated_at = $2 WHERE user_id IS NULL RETURNING id`,
    [userId, now],
  );

  const projectCount = projectResult.rowCount ?? 0;
  const linkCount = linkResult.rowCount ?? 0;

  console.log(
    `[RouteGenius] Claimed legacy data for ${userId}: ${projectCount} projects, ${linkCount} links`,
  );
  return { projects: projectCount, links: linkCount };
}

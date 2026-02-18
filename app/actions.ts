"use server";

/**
 * RouteGenius — Server Actions
 *
 * Server-side functions for Projects > Links CRUD.
 * All storage now goes through Supabase PostgreSQL
 * (see lib/mock-data.ts for the Supabase-backed implementation).
 */

import {
  saveLink,
  getLink,
  deleteLink as deleteLinkFromStore,
  archiveLink as archiveLinkInStore,
  unarchiveLink as unarchiveLinkInStore,
  getLinksByProject,
  findDuplicateUrl,
  searchLinks as searchLinksInStore,
  searchProjects as searchProjectsInStore,
  saveProject,
  getProject,
  deleteProject as deleteProjectFromStore,
  archiveProject as archiveProjectInStore,
  unarchiveProject as unarchiveProjectInStore,
  getAllProjects,
  countLinksByProject,
  getArchivedProjects,
  getArchivedLinks,
  getAllProjectNames,
  claimLegacyData,
} from "@/lib/mock-data";
import { getServerSession } from "@/lib/auth-session";
import { reportError } from "@/lib/gcp/error-reporting";
import { generateUniqueProjectSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";
import type { Link, Project, LinkSearchCriteria } from "@/lib/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Auth Helper ─────────────────────────────────────────────────────────

/** Get the authenticated user’s ID or throw. Every action calls this first. */
async function requireUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session?.user?.id) throw new Error("No autorizado.");
  return session.user.id;
}

// ── Project Actions ───────────────────────────────────────────

/** Create or update a project */
export async function saveProjectAction(
  project: Project,
): Promise<ActionResult<Project>> {
  try {
    const userId = await requireUserId();
    project.user_id = userId;

    if (!project.id) {
      return { success: false, error: "El ID del proyecto es requerido." };
    }

    // Auto-generate name/title if blank
    if (!project.name.trim()) {
      project.name = generateUniqueProjectSlug(
        await getAllProjectNames(userId),
      );
    } else {
      // Verify existing name doesn't collide with another project's name
      const existingNames = await getAllProjectNames(userId);
      const existing = await getProject(project.id, userId);
      // If updating and the name hasn't changed, skip collision check
      const nameChanged = !existing || existing.name !== project.name;
      if (nameChanged && existingNames.has(project.name)) {
        project.name = generateUniqueProjectSlug(existingNames);
      }
    }
    if (!project.title.trim()) {
      project.title = project.name;
    }

    await saveProject(project);

    console.log("[RouteGenius] Project saved:", {
      id: project.id,
      name: project.name,
      title: project.title,
    });

    // Re-read to confirm persistence
    const saved = (await getProject(project.id, userId)) ?? project;

    // Bust Next.js cache so the project detail page re-renders
    revalidatePath(`/dashboard/projects/${project.id}`);
    revalidatePath("/dashboard");

    return { success: true, data: saved };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Error saving project:", error);
    reportError(error, {
      httpRequest: { method: "POST", url: "/actions/saveProjectAction" },
    });
    return {
      success: false,
      error: error.message || "Error al guardar el proyecto.",
    };
  }
}

/** Get a single project by ID */
export async function getProjectAction(
  id: string,
): Promise<ActionResult<Project>> {
  try {
    const userId = await requireUserId();
    const project = await getProject(id, userId);
    if (!project) {
      return { success: false, error: "Proyecto no encontrado." };
    }
    return { success: true, data: project };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al cargar el proyecto." };
  }
}

/** Get all projects (with optional archived) */
export async function getAllProjectsAction(
  includeArchived = false,
): Promise<ActionResult<Project[]>> {
  try {
    const userId = await requireUserId();
    const projects = await getAllProjects(userId, includeArchived);
    return { success: true, data: projects };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al cargar los proyectos." };
  }
}

/** Delete a project and all its links */
export async function deleteProjectAction(
  id: string,
): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    const project = await getProject(id, userId);
    if (!project) {
      return { success: false, error: "Proyecto no encontrado." };
    }
    await deleteProjectFromStore(id, userId);
    console.log("[RouteGenius] Project deleted:", id);
    return { success: true, data: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al eliminar el proyecto." };
  }
}

/** Archive a project */
export async function archiveProjectAction(
  id: string,
): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await archiveProjectInStore(id, userId);
    console.log("[RouteGenius] Project archived:", id);
    return { success: true, data: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al archivar el proyecto." };
  }
}

/** Unarchive a project */
export async function unarchiveProjectAction(
  id: string,
): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await unarchiveProjectInStore(id, userId);
    console.log("[RouteGenius] Project unarchived:", id);
    return { success: true, data: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al restaurar el proyecto." };
  }
}

// ── Link Actions ──────────────────────────────────────────────

/**
 * Save link configuration.
 * Enforces global URL uniqueness across all projects.
 */
export async function saveLinkAction(
  link: Link,
): Promise<{ success: true; link: Link } | { success: false; error: string }> {
  try {
    const userId = await requireUserId();
    link.user_id = userId;

    if (!link.id) {
      return { success: false, error: "El ID del enlace es requerido" };
    }

    if (!link.project_id) {
      return {
        success: false,
        error: "El enlace debe pertenecer a un proyecto.",
      };
    }

    if (!link.main_destination_url.trim()) {
      return {
        success: false,
        error: "La URL de destino principal es requerida",
      };
    }

    // Calculate total secondary weight
    const totalSecondaryWeight = link.rotation_rules.reduce(
      (sum, rule) => sum + rule.weight_percentage,
      0,
    );

    if (totalSecondaryWeight > 100) {
      return {
        success: false,
        error: `El peso total excede el 100% (${totalSecondaryWeight}%)`,
      };
    }

    // Global URL uniqueness check
    const duplicate = await findDuplicateUrl(
      link.main_destination_url,
      userId,
      link.id,
    );
    if (duplicate) {
      return {
        success: false,
        error: `Esta URL ya existe en el enlace "${duplicate.title || duplicate.nickname || duplicate.id}" (proyecto: ${duplicate.project_id}).`,
      };
    }

    // Auto-generate title if blank
    if (!link.title.trim()) {
      link.title = link.nickname || "Enlace sin título";
    }

    // Save to store
    await saveLink(link);

    console.log("[RouteGenius] Link saved:", {
      id: link.id,
      project_id: link.project_id,
      nickname: link.nickname,
      main_url: link.main_destination_url,
      rotation_enabled: link.rotation_enabled,
      rules_count: link.rotation_rules.length,
    });

    // Re-read to confirm persistence
    const savedLink = (await getLink(link.id, userId)) ?? link;
    return { success: true, link: savedLink };
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

/** Delete a link */
export async function deleteLinkAction(
  id: string,
): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    const link = await getLink(id, userId);
    if (!link) {
      return { success: false, error: "Enlace no encontrado." };
    }
    await deleteLinkFromStore(id, userId);
    console.log("[RouteGenius] Link deleted:", id);
    return { success: true, data: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al eliminar el enlace." };
  }
}

/** Archive a link */
export async function archiveLinkAction(
  id: string,
): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await archiveLinkInStore(id, userId);
    console.log("[RouteGenius] Link archived:", id);
    return { success: true, data: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al archivar el enlace." };
  }
}

/** Unarchive a link */
export async function unarchiveLinkAction(
  id: string,
): Promise<ActionResult<null>> {
  try {
    const userId = await requireUserId();
    await unarchiveLinkInStore(id, userId);
    console.log("[RouteGenius] Link unarchived:", id);
    return { success: true, data: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al restaurar el enlace." };
  }
}

/** Get links for a specific project */
export async function getLinksByProjectAction(
  projectId: string,
  includeArchived = false,
): Promise<ActionResult<Link[]>> {
  try {
    const userId = await requireUserId();
    const links = await getLinksByProject(projectId, userId, includeArchived);
    return { success: true, data: links };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al cargar los enlaces." };
  }
}

/** Count links in a project */
export async function countLinksAction(
  projectId: string,
): Promise<ActionResult<number>> {
  try {
    const userId = await requireUserId();
    return {
      success: true,
      data: await countLinksByProject(projectId, userId),
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al contar los enlaces." };
  }
}

// ── Search Actions ────────────────────────────────────────────

/** Search links across all projects */
export async function searchLinksAction(
  criteria: LinkSearchCriteria,
): Promise<ActionResult<Link[]>> {
  try {
    const userId = await requireUserId();
    const results = await searchLinksInStore(criteria, userId);
    return { success: true, data: results };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error en la búsqueda." };
  }
}

/** Search projects */
export async function searchProjectsAction(
  query?: string,
  tags?: string[],
  includeArchived?: boolean,
): Promise<ActionResult<Project[]>> {
  try {
    const userId = await requireUserId();
    const results = await searchProjectsInStore(
      userId,
      query,
      tags,
      includeArchived,
    );
    return { success: true, data: results };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error en la búsqueda." };
  }
}

// ── Archive actions ───────────────────────────────────────────

/** Get all archived projects */
export async function getArchivedProjectsAction(): Promise<
  ActionResult<Project[]>
> {
  try {
    const userId = await requireUserId();
    return { success: true, data: await getArchivedProjects(userId) };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al cargar el archivo." };
  }
}

/** Get all archived links */
export async function getArchivedLinksAction(): Promise<ActionResult<Link[]>> {
  try {
    const userId = await requireUserId();
    return { success: true, data: await getArchivedLinks(userId) };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al cargar el archivo." };
  }
}

// ── Legacy Data Migration ─────────────────────────────────────

/**
 * One-time action: assigns all projects/links with user_id IS NULL
 * to the currently authenticated user. Safe to call multiple times.
 */
export async function claimLegacyDataAction(): Promise<
  ActionResult<{ projects: number; links: number }>
> {
  try {
    const userId = await requireUserId();
    const result = await claimLegacyData(userId);
    revalidatePath("/dashboard");
    return { success: true, data: result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return {
      success: false,
      error: "Error al reclamar datos heredados.",
    };
  }
}

// ── Profile Actions ───────────────────────────────────────────

/**
 * Directly update the user profile in the Better Auth PostgreSQL database.
 * This ensures name/image persist even if authClient.updateUser has issues.
 */
export async function updateUserProfileAction(updates: {
  name?: string;
  image?: string;
}): Promise<ActionResult<null>> {
  try {
    const { getServerSession } = await import("@/lib/auth-session");
    const session = await getServerSession();

    if (!session?.user?.id) {
      return { success: false, error: "No autorizado." };
    }

    const { Pool } = await import("pg");
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });

    try {
      const setClauses: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`"name" = $${paramIndex++}`);
        values.push(updates.name);
      }
      if (updates.image !== undefined) {
        setClauses.push(`"image" = $${paramIndex++}`);
        values.push(updates.image);
      }

      if (setClauses.length === 0) {
        return { success: true, data: null };
      }

      setClauses.push(`"updatedAt" = NOW()`);
      values.push(session.user.id);

      await pool.query(
        `UPDATE "user" SET ${setClauses.join(", ")} WHERE "id" = $${paramIndex}`,
        values,
      );

      console.log("[RouteGenius] User profile updated in DB:", {
        userId: session.user.id,
        fields: Object.keys(updates),
      });

      return { success: true, data: null };
    } finally {
      await pool.end();
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Error updating user profile:", error);
    reportError(error);
    return { success: false, error: "Error al actualizar el perfil." };
  }
}

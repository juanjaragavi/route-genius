"use server";

/**
 * RouteGenius — Server Actions
 *
 * Server-side functions for Projects > Links CRUD.
 * Phase 1: File-based store.
 * Phase 2: Will persist to Supabase/PostgreSQL.
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
  getAllLinkNames,
} from "@/lib/mock-data";
import { reportError } from "@/lib/gcp/error-reporting";
import { generateUniqueProjectSlug, generateUniqueLinkSlug } from "@/lib/slug";
import { revalidatePath } from "next/cache";
import type { Link, Project, LinkSearchCriteria } from "@/lib/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Project Actions ───────────────────────────────────────────

/** Create or update a project */
export async function saveProjectAction(
  project: Project,
): Promise<ActionResult<Project>> {
  try {
    if (!project.id) {
      return { success: false, error: "El ID del proyecto es requerido." };
    }

    // Auto-generate name/title if blank
    if (!project.name.trim()) {
      project.name = generateUniqueProjectSlug(getAllProjectNames());
    } else {
      // Verify existing name doesn't collide with another project's name
      const existingNames = getAllProjectNames();
      const existing = getProject(project.id);
      // If updating and the name hasn't changed, skip collision check
      const nameChanged = !existing || existing.name !== project.name;
      if (nameChanged && existingNames.has(project.name)) {
        project.name = generateUniqueProjectSlug(existingNames);
      }
    }
    if (!project.title.trim()) {
      project.title = project.name;
    }

    saveProject(project);

    console.log("[RouteGenius] Project saved:", {
      id: project.id,
      name: project.name,
      title: project.title,
    });

    // Re-read to confirm persistence. Fall back to the input object
    // if the store couldn't persist (e.g. read-only filesystem on Vercel).
    const saved = getProject(project.id) ?? project;

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
    const project = getProject(id);
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
    const projects = getAllProjects(includeArchived);
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
    const project = getProject(id);
    if (!project) {
      return { success: false, error: "Proyecto no encontrado." };
    }
    deleteProjectFromStore(id);
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
    archiveProjectInStore(id);
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
    unarchiveProjectInStore(id);
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
    const duplicate = findDuplicateUrl(link.main_destination_url, link.id);
    if (duplicate) {
      return {
        success: false,
        error: `Esta URL ya existe en el enlace "${duplicate.title || duplicate.name || duplicate.id}" (proyecto: ${duplicate.project_id}).`,
      };
    }

    // Auto-generate name/title if blank
    if (!link.name.trim()) {
      link.name = generateUniqueLinkSlug(getAllLinkNames());
    } else {
      // Verify existing name doesn't collide with another link's name
      const existingNames = getAllLinkNames();
      const existing = getLink(link.id);
      const nameChanged = !existing || existing.name !== link.name;
      if (nameChanged && existingNames.has(link.name)) {
        link.name = generateUniqueLinkSlug(existingNames);
      }
    }
    if (!link.title.trim()) {
      link.title = link.nickname || link.name;
    }

    // Save to store
    saveLink(link);

    console.log("[RouteGenius] Link saved:", {
      id: link.id,
      project_id: link.project_id,
      nickname: link.nickname,
      main_url: link.main_destination_url,
      rotation_enabled: link.rotation_enabled,
      rules_count: link.rotation_rules.length,
    });

    // Re-read to confirm persistence. Fall back to the input object
    // if the store couldn't persist (e.g. read-only filesystem on Vercel).
    const savedLink = getLink(link.id) ?? link;
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
    const link = getLink(id);
    if (!link) {
      return { success: false, error: "Enlace no encontrado." };
    }
    deleteLinkFromStore(id);
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
    archiveLinkInStore(id);
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
    unarchiveLinkInStore(id);
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
    const links = getLinksByProject(projectId, includeArchived);
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
    return { success: true, data: countLinksByProject(projectId) };
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
    const results = searchLinksInStore(criteria);
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
    const results = searchProjectsInStore(query, tags, includeArchived);
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
    return { success: true, data: getArchivedProjects() };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al cargar el archivo." };
  }
}

/** Get all archived links */
export async function getArchivedLinksAction(): Promise<ActionResult<Link[]>> {
  try {
    return { success: true, data: getArchivedLinks() };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportError(error);
    return { success: false, error: "Error al cargar el archivo." };
  }
}

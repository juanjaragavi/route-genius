"use server";

/**
 * RouteGenius — Backup & Restore Server Actions
 *
 * Server-side functions for exporting and importing
 * Projects and Links data as CSV files.
 * Supports local download/upload and Google Drive cloud backup.
 */

import {
  getAllProjects,
  getAllLinks,
  saveProject,
  saveLink,
} from "@/lib/mock-data";
import { getServerSession } from "@/lib/auth-session";
import { reportError } from "@/lib/gcp/error-reporting";
import {
  serializeProjectsToCSV,
  serializeLinksToCSV,
  parseProjectsFromCSV,
  parseLinksFromCSV,
  generateBackupFilename,
} from "@/lib/csv-backup";
import {
  isGoogleDriveConfigured,
  getGoogleDriveAuthUrl,
  uploadToGoogleDrive,
  uploadToGoogleDriveInFolder,
  listDriveBackups,
  downloadFromDrive,
  refreshGoogleDriveToken,
} from "@/lib/google-drive";
import type { DriveFile } from "@/lib/google-drive";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { Project, Link } from "@/lib/types";

type ActionResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };

// ── Auth Helper ─────────────────────────────────────────────────

async function requireUserId(): Promise<string> {
  const session = await getServerSession();
  if (!session?.user?.id) throw new Error("No autorizado.");
  return session.user.id;
}

// ── Export Actions ──────────────────────────────────────────────

export interface BackupExportResult {
  projectsCSV: string;
  linksCSV: string;
  projectCount: number;
  linkCount: number;
  exportedAt: string;
}

/**
 * Export all user data (projects + links) as CSV strings.
 * Includes both active and archived data for complete backup.
 */
export async function exportBackupAction(): Promise<
  ActionResult<BackupExportResult>
> {
  try {
    const userId = await requireUserId();

    // Fetch all data including archived items
    const projects = await getAllProjects(userId, true);
    const links = await getAllLinks(userId);

    const projectsCSV = serializeProjectsToCSV(projects);
    const linksCSV = serializeLinksToCSV(links);

    console.log("[RouteGenius] Backup exported:", {
      userId,
      projects: projects.length,
      links: links.length,
    });

    return {
      success: true,
      data: {
        projectsCSV,
        linksCSV,
        projectCount: projects.length,
        linkCount: links.length,
        exportedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Error exporting backup:", error);
    reportError(error, {
      httpRequest: { method: "POST", url: "/actions/exportBackupAction" },
    });
    return {
      success: false,
      error: "Error al exportar el respaldo. Intente de nuevo.",
    };
  }
}

// ── Import Actions ──────────────────────────────────────────────

export interface RestoreResult {
  projectsRestored: number;
  linksRestored: number;
  projectsSkipped: number;
  linksSkipped: number;
  errors: string[];
}

/**
 * Restore user data from CSV strings.
 * Uses upsert semantics: existing items with same ID are overwritten,
 * new items are created. All restored items are assigned to the
 * current authenticated user.
 */
export async function restoreBackupAction(
  projectsCSV: string | null,
  linksCSV: string | null,
): Promise<ActionResult<RestoreResult>> {
  try {
    const userId = await requireUserId();

    const result: RestoreResult = {
      projectsRestored: 0,
      linksRestored: 0,
      projectsSkipped: 0,
      linksSkipped: 0,
      errors: [],
    };

    // ── Restore Projects ──
    if (projectsCSV && projectsCSV.trim().length > 0) {
      let projects: Project[];
      try {
        projects = parseProjectsFromCSV(projectsCSV);
      } catch (parseErr) {
        const msg =
          parseErr instanceof Error
            ? parseErr.message
            : "Error al parsear CSV de proyectos.";
        result.errors.push(msg);
        projects = [];
      }

      for (const project of projects) {
        try {
          // Assign to current user (security: override any imported user_id)
          project.user_id = userId;
          project.updated_at = new Date().toISOString();
          await saveProject(project);
          result.projectsRestored++;
        } catch (saveErr) {
          const msg =
            saveErr instanceof Error ? saveErr.message : String(saveErr);
          result.errors.push(
            `Proyecto "${project.title || project.id}": ${msg}`,
          );
          result.projectsSkipped++;
        }
      }
    }

    // ── Restore Links ──
    if (linksCSV && linksCSV.trim().length > 0) {
      let links: Link[];
      try {
        links = parseLinksFromCSV(linksCSV);
      } catch (parseErr) {
        const msg =
          parseErr instanceof Error
            ? parseErr.message
            : "Error al parsear CSV de enlaces.";
        result.errors.push(msg);
        links = [];
      }

      for (const link of links) {
        try {
          // Assign to current user (security: override any imported user_id)
          link.user_id = userId;
          link.updated_at = new Date().toISOString();
          await saveLink(link);
          result.linksRestored++;
        } catch (saveErr) {
          const msg =
            saveErr instanceof Error ? saveErr.message : String(saveErr);
          result.errors.push(`Enlace "${link.title || link.id}": ${msg}`);
          result.linksSkipped++;
        }
      }
    }

    console.log("[RouteGenius] Backup restored:", {
      userId,
      projectsRestored: result.projectsRestored,
      linksRestored: result.linksRestored,
      errors: result.errors.length,
    });

    // Bust cache so dashboard reflects restored data
    revalidatePath("/dashboard");

    return { success: true, data: result };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Error restoring backup:", error);
    reportError(error, {
      httpRequest: { method: "POST", url: "/actions/restoreBackupAction" },
    });
    return {
      success: false,
      error: "Error al restaurar el respaldo. Intente de nuevo.",
    };
  }
}

// ── Google Drive Token Cookie ───────────────────────────────────

const GDRIVE_TOKEN_COOKIE = "rg_gdrive_tokens";

interface StoredTokens {
  access_token: string;
  refresh_token: string | null;
  expires_at: number | null;
}

/**
 * Read Google Drive tokens from the secure HTTP-only cookie.
 * If the access token is expired and a refresh token is available,
 * it will attempt to refresh automatically.
 */
async function getGDriveTokens(): Promise<StoredTokens | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(GDRIVE_TOKEN_COOKIE)?.value;
  if (!raw) return null;

  try {
    const tokens: StoredTokens = JSON.parse(raw);

    // Check if access token is expired (with 60s buffer)
    if (tokens.expires_at && Date.now() > tokens.expires_at - 60_000) {
      if (tokens.refresh_token) {
        const refreshed = await refreshGoogleDriveToken(tokens.refresh_token);
        const updatedTokens: StoredTokens = {
          access_token: refreshed.access_token,
          refresh_token: refreshed.refresh_token || tokens.refresh_token,
          expires_at: refreshed.expires_in
            ? Date.now() + refreshed.expires_in * 1000
            : null,
        };

        // Update the cookie with new tokens
        cookieStore.set(GDRIVE_TOKEN_COOKIE, JSON.stringify(updatedTokens), {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 30 * 24 * 60 * 60,
        });

        return updatedTokens;
      }
      // Expired with no refresh token
      return null;
    }

    return tokens;
  } catch {
    return null;
  }
}

// ── Google Drive Status Actions ─────────────────────────────────

/**
 * Check if Google Drive integration is available and connected.
 */
export async function getGoogleDriveStatus(): Promise<
  ActionResult<{
    configured: boolean;
    connected: boolean;
  }>
> {
  try {
    const configured = isGoogleDriveConfigured();
    const tokens = configured ? await getGDriveTokens() : null;

    return {
      success: true,
      data: {
        configured,
        connected: !!tokens?.access_token,
      },
    };
  } catch {
    return {
      success: true,
      data: { configured: false, connected: false },
    };
  }
}

/**
 * Get the Google Drive OAuth authorization URL.
 * The user will be redirected to Google to grant consent.
 *
 * Pre-flight: validates that credentials look valid before
 * sending the user to Google (avoids wasted round-trips).
 */
export async function getGoogleDriveAuthUrlAction(): Promise<
  ActionResult<string>
> {
  try {
    await requireUserId(); // Must be authenticated

    // Pre-flight validation: catch placeholder secrets early
    const secret = process.env.GOOGLE_DRIVE_CLIENT_SECRET || "";
    if (
      !secret ||
      secret.includes("YOUR_") ||
      secret.includes("<") ||
      secret.length < 10
    ) {
      console.error(
        "[RouteGenius] GOOGLE_DRIVE_CLIENT_SECRET appears invalid:",
        {
          length: secret.length,
          isPlaceholder: secret.includes("YOUR_") || secret.includes("<"),
        },
      );
      return {
        success: false,
        error:
          "Google Drive no está configurado correctamente. " +
          "La variable GOOGLE_DRIVE_CLIENT_SECRET no tiene un valor válido.",
      };
    }

    const url = getGoogleDriveAuthUrl();
    return { success: true, data: url };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error: error.message };
  }
}

/**
 * Disconnect Google Drive by clearing the token cookie.
 */
export async function disconnectGoogleDrive(): Promise<ActionResult<null>> {
  try {
    await requireUserId();
    const cookieStore = await cookies();
    cookieStore.delete(GDRIVE_TOKEN_COOKIE);
    return { success: true, data: null };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error: error.message };
  }
}

// ── Google Drive Backup Actions ─────────────────────────────────

export interface DriveBackupResult {
  projectsFileId: string | null;
  linksFileId: string | null;
  projectCount: number;
  linkCount: number;
  exportedAt: string;
}

/**
 * Export user data and upload directly to Google Drive.
 */
export async function backupToGoogleDriveAction(): Promise<
  ActionResult<DriveBackupResult>
> {
  try {
    const userId = await requireUserId();
    const tokens = await getGDriveTokens();
    if (!tokens?.access_token) {
      return {
        success: false,
        error: "Google Drive no está conectado. Conecte su cuenta primero.",
      };
    }

    // Fetch all data including archived items
    const projects = await getAllProjects(userId, true);
    const links = await getAllLinks(userId);

    const projectsCSV = serializeProjectsToCSV(projects);
    const linksCSV = serializeLinksToCSV(links);

    let projectsFileId: string | null = null;
    let linksFileId: string | null = null;

    // Upload projects CSV
    if (projects.length > 0) {
      const result = await uploadToGoogleDrive(
        tokens.access_token,
        generateBackupFilename("projects"),
        projectsCSV,
      );
      projectsFileId = result.fileId;
    }

    // Upload links CSV
    if (links.length > 0) {
      const result = await uploadToGoogleDrive(
        tokens.access_token,
        generateBackupFilename("links"),
        linksCSV,
      );
      linksFileId = result.fileId;
    }

    console.log("[RouteGenius] Google Drive backup completed:", {
      userId,
      projects: projects.length,
      links: links.length,
      projectsFileId,
      linksFileId,
    });

    return {
      success: true,
      data: {
        projectsFileId,
        linksFileId,
        projectCount: projects.length,
        linkCount: links.length,
        exportedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Google Drive backup error:", error);
    reportError(error, {
      httpRequest: {
        method: "POST",
        url: "/actions/backupToGoogleDriveAction",
      },
    });
    return {
      success: false,
      error: "Error al crear respaldo en Google Drive. Intente de nuevo.",
    };
  }
}

/**
 * List backup files stored in Google Drive.
 */
export async function listGoogleDriveBackupsAction(): Promise<
  ActionResult<DriveFile[]>
> {
  try {
    await requireUserId();
    const tokens = await getGDriveTokens();
    if (!tokens?.access_token) {
      return {
        success: false,
        error: "Google Drive no está conectado.",
      };
    }

    const files = await listDriveBackups(tokens.access_token);
    return { success: true, data: files };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Google Drive list error:", error);
    return {
      success: false,
      error: "Error al listar respaldos de Google Drive.",
    };
  }
}

/**
 * Restore data from a specific Google Drive backup file.
 */
export async function restoreFromGoogleDriveAction(
  fileId: string,
  type: "projects" | "links",
): Promise<ActionResult<RestoreResult>> {
  try {
    await requireUserId(); // Auth check
    const tokens = await getGDriveTokens();
    if (!tokens?.access_token) {
      return {
        success: false,
        error: "Google Drive no está conectado.",
      };
    }

    const csvContent = await downloadFromDrive(tokens.access_token, fileId);

    // Delegate to the existing restore logic
    if (type === "projects") {
      return await restoreBackupAction(csvContent, null);
    } else {
      return await restoreBackupAction(null, csvContent);
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Google Drive restore error:", error);
    reportError(error, {
      httpRequest: {
        method: "POST",
        url: "/actions/restoreFromGoogleDriveAction",
      },
    });
    return {
      success: false,
      error: "Error al restaurar desde Google Drive. Intente de nuevo.",
    };
  }
}

// ── Google Picker Support Actions ───────────────────────────────

/**
 * Expose the OAuth access token to the client for Google Picker use.
 *
 * The Picker API runs client-side and requires a valid access token.
 * This action reads the token from the HTTP-only cookie and returns
 * it only to authenticated users. The token already has limited
 * scope (drive.file) so exposure is bounded.
 */
export async function getGoogleDriveAccessTokenAction(): Promise<
  ActionResult<{ accessToken: string }>
> {
  try {
    await requireUserId();
    const tokens = await getGDriveTokens();
    if (!tokens?.access_token) {
      return {
        success: false,
        error: "Google Drive no está conectado. Conecte su cuenta primero.",
      };
    }
    return { success: true, data: { accessToken: tokens.access_token } };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error: error.message };
  }
}

/**
 * Export user data and upload to a specific Google Drive folder
 * chosen by the user via the Google Picker.
 *
 * @param folderId - The Google Drive folder ID selected via Picker
 */
export async function backupToGoogleDriveFolderAction(
  folderId: string,
): Promise<ActionResult<DriveBackupResult>> {
  try {
    const userId = await requireUserId();
    const tokens = await getGDriveTokens();
    if (!tokens?.access_token) {
      return {
        success: false,
        error: "Google Drive no está conectado. Conecte su cuenta primero.",
      };
    }

    if (!folderId || typeof folderId !== "string") {
      return {
        success: false,
        error: "ID de carpeta no válido.",
      };
    }

    // Fetch all data including archived items
    const projects = await getAllProjects(userId, true);
    const links = await getAllLinks(userId);

    const projectsCSV = serializeProjectsToCSV(projects);
    const linksCSV = serializeLinksToCSV(links);

    let projectsFileId: string | null = null;
    let linksFileId: string | null = null;

    // Upload projects CSV to selected folder
    if (projects.length > 0) {
      const result = await uploadToGoogleDriveInFolder(
        tokens.access_token,
        generateBackupFilename("projects"),
        projectsCSV,
        folderId,
      );
      projectsFileId = result.fileId;
    }

    // Upload links CSV to selected folder
    if (links.length > 0) {
      const result = await uploadToGoogleDriveInFolder(
        tokens.access_token,
        generateBackupFilename("links"),
        linksCSV,
        folderId,
      );
      linksFileId = result.fileId;
    }

    console.log("[RouteGenius] Google Drive folder backup completed:", {
      userId,
      folderId,
      projects: projects.length,
      links: links.length,
      projectsFileId,
      linksFileId,
    });

    return {
      success: true,
      data: {
        projectsFileId,
        linksFileId,
        projectCount: projects.length,
        linkCount: links.length,
        exportedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[RouteGenius] Google Drive folder backup error:", error);
    reportError(error, {
      httpRequest: {
        method: "POST",
        url: "/actions/backupToGoogleDriveFolderAction",
      },
    });
    return {
      success: false,
      error:
        "Error al crear respaldo en la carpeta seleccionada. Intente de nuevo.",
    };
  }
}

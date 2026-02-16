/**
 * RouteGenius — Google Drive Integration
 *
 * Provides OAuth 2.0 authentication and file operations for
 * cloud-based backup and restore via Google Drive API v3.
 *
 * Required environment variables:
 *   GOOGLE_DRIVE_CLIENT_ID      — OAuth 2.0 Client ID
 *   GOOGLE_DRIVE_CLIENT_SECRET  — OAuth 2.0 Client Secret
 *   GOOGLE_DRIVE_REDIRECT_URI   — OAuth callback URL
 *
 * Scope: https://www.googleapis.com/auth/drive.file
 *   (Read/write access ONLY to files created by RouteGenius)
 *
 * @module lib/google-drive
 */

// ── Environment Check ───────────────────────────────────────────

const GOOGLE_DRIVE_CLIENT_ID = process.env.GOOGLE_DRIVE_CLIENT_ID;
const GOOGLE_DRIVE_CLIENT_SECRET = process.env.GOOGLE_DRIVE_CLIENT_SECRET;
const GOOGLE_DRIVE_REDIRECT_URI =
  process.env.GOOGLE_DRIVE_REDIRECT_URI ||
  "http://localhost:3070/api/auth/google-drive/callback";

/** Folder name used to organize backups in the user's Drive */
const BACKUP_FOLDER_NAME = "RouteGenius Backups";

/** Check if Google Drive API credentials are configured */
export function isGoogleDriveConfigured(): boolean {
  return !!(GOOGLE_DRIVE_CLIENT_ID && GOOGLE_DRIVE_CLIENT_SECRET);
}

// ── Types ───────────────────────────────────────────────────────

export interface GoogleDriveTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
}

// ── OAuth 2.0 Flow ──────────────────────────────────────────────

/**
 * Generate the Google OAuth 2.0 authorization URL for Drive access.
 *
 * @param state - Optional CSRF state parameter (should include userId)
 * @throws Error if credentials are not configured
 */
export function getGoogleDriveAuthUrl(state?: string): string {
  if (!isGoogleDriveConfigured()) {
    throw new Error(
      "[RouteGenius] Google Drive no configurado. " +
        "Configure GOOGLE_DRIVE_CLIENT_ID y GOOGLE_DRIVE_CLIENT_SECRET.",
    );
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_DRIVE_CLIENT_ID!,
    redirect_uri: GOOGLE_DRIVE_REDIRECT_URI,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.file",
    access_type: "offline",
    prompt: "consent",
    ...(typeof state === "string" && state.length > 0 ? { state } : {}),
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for access/refresh tokens.
 *
 * Called by the OAuth callback route after user grants consent.
 * @throws Error if credentials are not configured or exchange fails
 */
export async function exchangeGoogleDriveCode(
  code: string,
): Promise<GoogleDriveTokens> {
  if (!isGoogleDriveConfigured()) {
    throw new Error("[RouteGenius] Google Drive no configurado.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: GOOGLE_DRIVE_CLIENT_ID!,
      client_secret: GOOGLE_DRIVE_CLIENT_SECRET!,
      redirect_uri: GOOGLE_DRIVE_REDIRECT_URI,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "[RouteGenius] Google Drive token exchange failed:",
      errorBody,
    );
    throw new Error(
      `[RouteGenius] Error al intercambiar código OAuth: ${response.status}`,
    );
  }

  const tokens: GoogleDriveTokens = await response.json();
  return tokens;
}

/**
 * Refresh an expired access token using a refresh token.
 *
 * @throws Error if refresh fails
 */
export async function refreshGoogleDriveToken(
  refreshToken: string,
): Promise<GoogleDriveTokens> {
  if (!isGoogleDriveConfigured()) {
    throw new Error("[RouteGenius] Google Drive no configurado.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_DRIVE_CLIENT_ID!,
      client_secret: GOOGLE_DRIVE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(
      "[RouteGenius] Google Drive token refresh failed:",
      errorBody,
    );
    throw new Error(
      `[RouteGenius] Error al refrescar token: ${response.status}`,
    );
  }

  return await response.json();
}

// ── Drive Folder Management ─────────────────────────────────────

/**
 * Find or create the "RouteGenius Backups" folder in the user's Drive.
 *
 * @returns The folder ID
 */
async function getOrCreateBackupFolder(accessToken: string): Promise<string> {
  // Search for existing folder
  const searchParams = new URLSearchParams({
    q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id,name)",
    spaces: "drive",
  });

  const searchResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?${searchParams.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!searchResponse.ok) {
    throw new Error(
      `[RouteGenius] Error al buscar carpeta en Drive: ${searchResponse.status}`,
    );
  }

  const searchResult = await searchResponse.json();

  if (searchResult.files && searchResult.files.length > 0) {
    return searchResult.files[0].id;
  }

  // Create folder if it doesn't exist
  const createResponse = await fetch(
    "https://www.googleapis.com/drive/v3/files",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: BACKUP_FOLDER_NAME,
        mimeType: "application/vnd.google-apps.folder",
      }),
    },
  );

  if (!createResponse.ok) {
    throw new Error(
      `[RouteGenius] Error al crear carpeta en Drive: ${createResponse.status}`,
    );
  }

  const folder = await createResponse.json();
  return folder.id;
}

// ── Drive File Operations ───────────────────────────────────────

/**
 * Upload a CSV file to the user's Google Drive.
 *
 * Files are stored inside the "RouteGenius Backups" folder.
 * Uses the Drive v3 API multipart upload.
 */
export async function uploadToGoogleDrive(
  accessToken: string,
  filename: string,
  csvContent: string,
): Promise<{ fileId: string; webViewLink: string }> {
  // Ensure backup folder exists
  const folderId = await getOrCreateBackupFolder(accessToken);

  // Multipart upload boundary
  const boundary = "routegenius_backup_boundary";

  const metadata = JSON.stringify({
    name: filename,
    mimeType: "text/csv",
    parents: [folderId],
  });

  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${metadata}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: text/csv\r\n\r\n` +
    `${csvContent}\r\n` +
    `--${boundary}--`;

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[RouteGenius] Drive upload failed:", errorBody);
    throw new Error(
      `[RouteGenius] Error al subir archivo a Drive: ${response.status}`,
    );
  }

  const file = await response.json();
  return {
    fileId: file.id,
    webViewLink: file.webViewLink || "",
  };
}

/**
 * List RouteGenius backup files from the user's Drive.
 *
 * Filters by files inside the "RouteGenius Backups" folder,
 * ordered by most recently modified first.
 */
export async function listDriveBackups(
  accessToken: string,
): Promise<DriveFile[]> {
  // First find the backup folder
  const searchParams = new URLSearchParams({
    q: `name='${BACKUP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id)",
    spaces: "drive",
  });

  const folderResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?${searchParams.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!folderResponse.ok) {
    throw new Error(
      `[RouteGenius] Error al buscar carpeta de respaldos: ${folderResponse.status}`,
    );
  }

  const folderResult = await folderResponse.json();

  if (!folderResult.files || folderResult.files.length === 0) {
    return []; // No backup folder = no backups
  }

  const folderId = folderResult.files[0].id;

  // List CSV files in the backup folder
  const listParams = new URLSearchParams({
    q: `'${folderId}' in parents and mimeType='text/csv' and trashed=false`,
    fields: "files(id,name,modifiedTime,size,webViewLink)",
    orderBy: "modifiedTime desc",
    pageSize: "50",
    spaces: "drive",
  });

  const listResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files?${listParams.toString()}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!listResponse.ok) {
    throw new Error(
      `[RouteGenius] Error al listar respaldos: ${listResponse.status}`,
    );
  }

  const listResult = await listResponse.json();
  return listResult.files || [];
}

/**
 * Download a specific backup file from Google Drive.
 *
 * @returns The CSV content as a string
 */
export async function downloadFromDrive(
  accessToken: string,
  fileId: string,
): Promise<string> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    throw new Error(
      `[RouteGenius] Error al descargar archivo de Drive: ${response.status}`,
    );
  }

  return await response.text();
}

/**
 * Delete a backup file from Google Drive.
 *
 * @returns true if deletion was successful
 */
export async function deleteFromDrive(
  accessToken: string,
  fileId: string,
): Promise<boolean> {
  const response = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok && response.status !== 204) {
    throw new Error(
      `[RouteGenius] Error al eliminar archivo de Drive: ${response.status}`,
    );
  }

  return true;
}

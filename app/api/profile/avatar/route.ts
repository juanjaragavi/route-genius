/**
 * RouteGenius — Avatar Upload API Route
 *
 * Handles multipart file upload for user profile pictures.
 * Uses Google Cloud Storage (GCS) in production/staging (Vercel),
 * falls back to local public/avatars/ in development.
 *
 * POST /api/profile/avatar
 * - Accepts: multipart/form-data with "avatar" field
 * - Returns: { success: true, url: string } | { success: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile } from "@/lib/storage/gcs";
import fs from "node:fs";
import path from "node:path";

/** Maximum file size: 5 MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for avatars */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

/** Whether the runtime supports local filesystem writes (dev only). */
const isVercel = !!process.env.VERCEL;

/**
 * Save avatar to local public/avatars/ directory (development only).
 * Returns the public URL path (e.g., /avatars/userId.png).
 */
async function saveAvatarLocally(
  userId: string,
  buffer: Buffer,
  extension: string,
): Promise<string> {
  const avatarsDir = path.join(process.cwd(), "public", "avatars");

  // Ensure directory exists
  if (!fs.existsSync(avatarsDir)) {
    fs.mkdirSync(avatarsDir, { recursive: true });
  }

  // Delete any existing avatars for this user (different extensions)
  const possibleExtensions = ["jpg", "png", "webp", "gif"];
  for (const ext of possibleExtensions) {
    const existingPath = path.join(avatarsDir, `${userId}.${ext}`);
    if (fs.existsSync(existingPath)) {
      fs.unlinkSync(existingPath);
    }
  }

  // Write the new avatar
  const fileName = `${userId}.${extension}`;
  const filePath = path.join(avatarsDir, fileName);
  fs.writeFileSync(filePath, buffer);

  return `/avatars/${fileName}`;
}

/**
 * Upload avatar to Google Cloud Storage (production/staging).
 * Returns the full GCS public URL.
 */
async function saveAvatarToGCS(
  userId: string,
  buffer: Buffer,
  extension: string,
  mimeType: string,
): Promise<string> {
  const gcsPath = `avatars/${userId}.${extension}`;
  const url = await uploadFile(gcsPath, buffer, mimeType);

  if (!url) {
    throw new Error(
      "GCS upload returned null — check GCS_PROJECT_ID, GCS_CLIENT_EMAIL, and GCS_PRIVATE_KEY environment variables.",
    );
  }

  return url;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate user
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: "No autorizado" },
        { status: 401 },
      );
    }

    const userId = session.user.id;

    // 2. Parse multipart form data
    const formData = await request.formData();
    const file = formData.get("avatar") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No se proporcionó ningún archivo" },
        { status: 400 },
      );
    }

    // 3. Validate file type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          success: false,
          error: "Tipo de archivo no válido. Use JPEG, PNG, WebP o GIF.",
        },
        { status: 400 },
      );
    }

    // 4. Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          error: "El archivo es demasiado grande. El tamaño máximo es 5 MB.",
        },
        { status: 400 },
      );
    }

    // 5. Convert file to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // 6. Determine file extension and MIME type
    const extension =
      file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];

    // 7. Upload: GCS in production/staging (Vercel), local filesystem in dev
    let avatarUrl: string;

    if (isVercel) {
      avatarUrl = await saveAvatarToGCS(userId, buffer, extension, file.type);
    } else {
      avatarUrl = await saveAvatarLocally(userId, buffer, extension);
    }

    // 8. Append cache-buster to force browser refresh
    const urlWithCacheBust = `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}t=${Date.now()}`;

    return NextResponse.json({
      success: true,
      url: urlWithCacheBust,
    });
  } catch (error) {
    console.error("[RouteGenius] Avatar upload error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Error interno al subir la imagen. Intente de nuevo.",
      },
      { status: 500 },
    );
  }
}

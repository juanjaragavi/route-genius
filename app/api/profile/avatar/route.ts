/**
 * RouteGenius — Avatar Upload API Route
 *
 * Handles multipart file upload for user profile pictures.
 * Stores images in Google Cloud Storage and returns the public URL.
 *
 * POST /api/profile/avatar
 * - Accepts: multipart/form-data with "avatar" field
 * - Returns: { success: true, url: string } | { success: false, error: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { uploadFile, deleteFile } from "@/lib/storage/gcs";

/** Maximum file size: 5 MB */
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/** Allowed MIME types for avatars */
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
];

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
          error:
            "Tipo de archivo no válido. Use JPEG, PNG, WebP o GIF.",
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

    // 6. Generate file path with extension
    const extension = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
    const filePath = `avatars/${userId}.${extension}`;

    // 7. Delete old avatar if it exists (different extension)
    const possibleExtensions = ["jpg", "png", "webp", "gif"];
    for (const ext of possibleExtensions) {
      if (ext !== extension) {
        await deleteFile(`avatars/${userId}.${ext}`).catch(() => {});
      }
    }

    // 8. Upload to GCS
    const publicUrl = await uploadFile(filePath, buffer, file.type);

    if (!publicUrl) {
      return NextResponse.json(
        {
          success: false,
          error:
            "El servicio de almacenamiento no está configurado. Contacte al administrador.",
        },
        { status: 503 },
      );
    }

    // 9. Append cache-buster to force browser refresh
    const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`;

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

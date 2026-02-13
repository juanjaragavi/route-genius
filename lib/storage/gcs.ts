/**
 * Google Cloud Storage utility for RouteGenius Phase 2.
 * Handles file uploads, retrieval, and signed URL generation.
 *
 * Server-side only — do not import in client components.
 *
 * @module lib/storage/gcs
 */

import { Storage } from "@google-cloud/storage";

let storageInstance: Storage | null = null;

/** Get singleton GCS client instance. */
function getStorage(): Storage | null {
  if (
    !process.env.GCS_PROJECT_ID ||
    process.env.GCS_PROJECT_ID === "PENDING_GCS_SETUP"
  ) {
    return null;
  }

  if (!storageInstance) {
    storageInstance = new Storage({
      projectId: process.env.GCS_PROJECT_ID,
      credentials: {
        client_email: process.env.GCS_CLIENT_EMAIL!,
        private_key: process.env.GCS_PRIVATE_KEY!.replace(/\\n/g, "\n"),
      },
    });
  }

  return storageInstance;
}

/** Get the configured bucket name. */
function getBucketName(): string {
  return process.env.GCS_BUCKET_NAME || "routegenius-media-development";
}

/**
 * Upload a file to GCS.
 *
 * @param filePath - Destination path within the bucket (e.g., "avatars/user-123.png")
 * @param fileBuffer - File content as Buffer
 * @param contentType - MIME type (e.g., "image/png")
 * @returns Public URL of the uploaded file, or null if GCS is not configured
 */
export async function uploadFile(
  filePath: string,
  fileBuffer: Buffer,
  contentType: string,
): Promise<string | null> {
  const storage = getStorage();
  if (!storage) {
    console.warn("[RouteGenius] GCS not configured — skipping upload");
    return null;
  }

  const bucket = storage.bucket(getBucketName());
  const file = bucket.file(filePath);

  await file.save(fileBuffer, {
    metadata: { contentType },
    resumable: false,
  });

  return `https://storage.googleapis.com/${getBucketName()}/${filePath}`;
}

/**
 * Generate a signed URL for temporary file access.
 *
 * @param filePath - Path within the bucket
 * @param expiresInMinutes - URL expiration time (default: 60 minutes)
 * @returns Signed URL string, or null if GCS is not configured
 */
export async function getSignedUrl(
  filePath: string,
  expiresInMinutes: number = 60,
): Promise<string | null> {
  const storage = getStorage();
  if (!storage) return null;

  const bucket = storage.bucket(getBucketName());
  const file = bucket.file(filePath);

  const [url] = await file.getSignedUrl({
    action: "read",
    expires: Date.now() + expiresInMinutes * 60 * 1000,
  });

  return url;
}

/**
 * Delete a file from GCS.
 *
 * @param filePath - Path within the bucket
 * @returns true if deleted, false if GCS not configured or file not found
 */
export async function deleteFile(filePath: string): Promise<boolean> {
  const storage = getStorage();
  if (!storage) return false;

  try {
    const bucket = storage.bucket(getBucketName());
    await bucket.file(filePath).delete();
    return true;
  } catch {
    return false;
  }
}

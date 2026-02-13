/**
 * RouteGenius — Secure Unique Slug Generator
 *
 * Generates short, URL-safe, cryptographically random slugs using
 * base62 encoding (a-z, A-Z, 0-9) and `crypto.getRandomValues()`.
 *
 * Algorithm: Rejection Sampling with Base62 Encoding
 * ──────────────────────────────────────────────────
 * 1. Generate N cryptographically random bytes via `crypto.getRandomValues()`
 * 2. Map each byte to a base62 character using modular arithmetic
 * 3. To avoid modulo bias (since 256 % 62 ≠ 0), we use rejection sampling:
 *    - Only accept bytes < 248 (the largest multiple of 62 ≤ 256)
 *    - Rejected bytes are re-sampled, ensuring uniform distribution
 * 4. Collision detection: Check generated slug against existing IDs/names
 *    in the store, retry up to MAX_RETRIES times if a collision occurs
 *
 * Entropy Analysis (8-character slug):
 * ────────────────────────────────────
 * - Alphabet size: 62 characters (a-z, A-Z, 0-9)
 * - Combinations: 62^8 = 218,340,105,584,896 (~218 trillion)
 * - Entropy: 8 × log₂(62) ≈ 47.6 bits
 * - Birthday bound (50% collision): √(218T) ≈ 14.8 million slugs
 * - At 1,000 slugs: collision probability ≈ 2.3 × 10⁻⁹ (negligible)
 *
 * This is far superior to truncating UUID (32 bits, ~65K birthday bound).
 */

/** Base62 alphabet: a-z, A-Z, 0-9 — URL-safe, no special chars */
const BASE62 = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** Largest multiple of 62 that fits in a byte (248 = 62 × 4) */
const BIAS_THRESHOLD = 248;

/** Default slug length: 8 characters (~47.6 bits of entropy) */
const DEFAULT_LENGTH = 8;

/** Maximum number of collision-retry attempts */
const MAX_RETRIES = 10;

/**
 * Generate a cryptographically random base62 string of the given length.
 * Uses rejection sampling to eliminate modulo bias.
 *
 * @param length - Number of characters to generate (default: 8)
 * @returns A random base62 string
 */
export function generateRandomSlug(length: number = DEFAULT_LENGTH): string {
  const result: string[] = [];

  while (result.length < length) {
    // Request enough random bytes to likely fill remaining chars
    // Over-request by ~30% to account for rejection sampling
    const needed = length - result.length;
    const bytes = new Uint8Array(needed + Math.ceil(needed * 0.3) + 2);
    crypto.getRandomValues(bytes);

    for (let i = 0; i < bytes.length && result.length < length; i++) {
      // Rejection sampling: discard bytes ≥ 248 to avoid modulo bias
      if (bytes[i] < BIAS_THRESHOLD) {
        result.push(BASE62[bytes[i] % 62]);
      }
    }
  }

  return result.join("");
}

/**
 * Generate a unique slug that doesn't collide with any existing identifiers.
 *
 * @param existingIds - Set or array of existing IDs/names to check against
 * @param prefix - Optional prefix (e.g., "lnk-" or "prj-")
 * @param length - Length of the random portion (default: 8)
 * @returns A unique slug string
 * @throws Error if MAX_RETRIES exceeded (theoretically impossible with 62^8)
 */
export function generateUniqueSlug(
  existingIds: Set<string> | string[],
  prefix: string = "",
  length: number = DEFAULT_LENGTH,
): string {
  const idSet = existingIds instanceof Set ? existingIds : new Set(existingIds);

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const slug = `${prefix}${generateRandomSlug(length)}`;

    if (!idSet.has(slug)) {
      return slug;
    }

    // Collision detected — extremely rare, log for monitoring
    console.warn(
      `[RouteGenius] Slug collision detected on attempt ${attempt + 1}: "${slug}"`,
    );
  }

  // Fallback: should never reach here with 62^8 combinations
  throw new Error(
    `[RouteGenius] Failed to generate unique slug after ${MAX_RETRIES} attempts. This should not happen.`,
  );
}

/**
 * Generate a unique link slug with "lnk-" prefix.
 * Checks against all existing link names in the store.
 *
 * @param existingNames - Set or array of existing link names
 * @returns A unique link slug (e.g., "lnk-aB3xK9mN")
 */
export function generateUniqueLinkSlug(
  existingNames: Set<string> | string[],
): string {
  return generateUniqueSlug(existingNames, "lnk-", DEFAULT_LENGTH);
}

/**
 * Generate a unique project slug with "prj-" prefix.
 * Checks against all existing project names in the store.
 *
 * @param existingNames - Set or array of existing project names
 * @returns A unique project slug (e.g., "prj-Qw7nFp2R")
 */
export function generateUniqueProjectSlug(
  existingNames: Set<string> | string[],
): string {
  return generateUniqueSlug(existingNames, "prj-", DEFAULT_LENGTH);
}

/**
 * RouteGenius — Auth Client Helpers
 *
 * Client-side authentication utilities for sign-in, sign-out, and session management.
 */

import { createAuthClient } from "better-auth/react";

/**
 * Client-side auth client.
 * Uses NEXT_PUBLIC_APP_URL (scoped per Vercel environment) so the browser
 * never falls back to localhost on cloud deployments.
 */
export const authClient = createAuthClient({
  baseURL:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXT_PUBLIC_BETTER_AUTH_URL ||
    "http://localhost:3070",
});

export const { signIn, signOut, useSession } = authClient;

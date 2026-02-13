/**
 * RouteGenius — Server-side Session Utility
 *
 * Retrieves the current user session on the server.
 */

import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function getServerSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

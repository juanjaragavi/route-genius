/**
 * RouteGenius — Better Auth API Route Handler
 *
 * Catch-all route that handles all Better Auth endpoints:
 * - /api/auth/sign-in/*
 * - /api/auth/sign-out
 * - /api/auth/callback/*
 * - /api/auth/session
 * etc.
 */

import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);

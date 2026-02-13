/**
 * RouteGenius — Better Auth Server Configuration
 *
 * Google OAuth with domain restriction to TopNetworks, Inc.
 * Only @topnetworks.co and @topfinanzas.com emails are allowed.
 */

import { betterAuth } from "better-auth";
import { Pool } from "pg";

const baseURL = process.env.BETTER_AUTH_URL || "http://localhost:3070";

export const auth = betterAuth({
  baseURL,
  database: new Pool({
    connectionString: process.env.DATABASE_URL,
  }),
  emailAndPassword: {
    enabled: false, // Google-only authentication
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURI: `${baseURL}/api/auth/callback/google`,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh daily
    cookieCache: {
      enabled: true,
      maxAge: 60 * 5, // 5 minutes
    },
  },
  advanced: {
    generateId: () => crypto.randomUUID(),
  } as Record<string, unknown>,
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.Session.user;

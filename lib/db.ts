/**
 * RouteGenius — Shared PostgreSQL Pool (Cloud SQL)
 *
 * Single shared `pg` Pool for all app-level database queries.
 * Better Auth maintains its own Pool via lib/auth.ts.
 *
 * @module lib/db
 */

import { Pool } from "pg";

let _pool: Pool | null = null;

/**
 * Lazily initialised PostgreSQL Pool using DATABASE_URL.
 * SSL mode is configured via the connection string (e.g. ?sslmode=require).
 */
export function getPool(): Pool {
  if (!_pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error(
        "[RouteGenius] Missing DATABASE_URL environment variable.",
      );
    }
    _pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return _pool;
}

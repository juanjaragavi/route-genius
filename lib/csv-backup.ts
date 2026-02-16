/**
 * RouteGenius — CSV Backup & Restore Utilities
 *
 * Serializes Projects and Links into standardized CSV format
 * and parses CSV files back into typed objects for restoration.
 *
 * CSV Schema:
 *   projects.csv — One row per project
 *   links.csv    — One row per link, rotation_rules as JSON string
 *
 * All fields are properly escaped per RFC 4180.
 */

import type { Project, Link, RotationRule } from "./types";

// ── CSV Escaping Helpers ────────────────────────────────────────

/** Escape a single CSV field per RFC 4180 */
function escapeCSVField(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Parse a CSV line respecting quoted fields */
function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Check for escaped quote
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i += 2;
        } else {
          inQuotes = false;
          i++;
        }
      } else {
        current += char;
        i++;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
        i++;
      } else if (char === ",") {
        fields.push(current);
        current = "";
        i++;
      } else {
        current += char;
        i++;
      }
    }
  }
  fields.push(current);
  return fields;
}

/** Parse an entire CSV string into rows (header + data) */
function parseCSV(csv: string): string[][] {
  const lines: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < csv.length; i++) {
    const char = csv[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (char === "\n" && !inQuotes) {
      // Trim trailing \r for Windows line endings
      if (current.endsWith("\r")) {
        current = current.slice(0, -1);
      }
      if (current.length > 0) {
        lines.push(current);
      }
      current = "";
    } else {
      current += char;
    }
  }
  // Last line
  if (current.endsWith("\r")) {
    current = current.slice(0, -1);
  }
  if (current.length > 0) {
    lines.push(current);
  }

  return lines.map(parseCSVLine);
}

// ── Project CSV Schema ──────────────────────────────────────────

const PROJECT_CSV_HEADERS = [
  "id",
  "workspace_id",
  "name",
  "title",
  "description",
  "tags",
  "archived",
  "created_at",
  "updated_at",
] as const;

/** Serialize an array of Projects to CSV string */
export function serializeProjectsToCSV(projects: Project[]): string {
  const headerLine = PROJECT_CSV_HEADERS.join(",");

  const rows = projects.map((p) => {
    const fields: string[] = [
      escapeCSVField(p.id),
      escapeCSVField(p.workspace_id),
      escapeCSVField(p.name),
      escapeCSVField(p.title),
      escapeCSVField(p.description),
      escapeCSVField(JSON.stringify(p.tags)),
      String(p.archived),
      escapeCSVField(p.created_at),
      escapeCSVField(p.updated_at),
    ];
    return fields.join(",");
  });

  return [headerLine, ...rows].join("\n");
}

/** Parse a CSV string back into Project objects */
export function parseProjectsFromCSV(csv: string): Project[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const headerMap = new Map(headers.map((h, i) => [h.trim(), i]));

  // Validate required headers
  for (const required of ["id", "name", "title"]) {
    if (!headerMap.has(required)) {
      throw new Error(
        `CSV de proyectos inválido: falta la columna "${required}"`,
      );
    }
  }

  return rows.slice(1).map((fields) => {
    const get = (key: string, fallback = ""): string => {
      const idx = headerMap.get(key);
      return idx !== undefined && idx < fields.length
        ? fields[idx].trim()
        : fallback;
    };

    let tags: string[] = [];
    try {
      const rawTags = get("tags", "[]");
      tags = JSON.parse(rawTags);
      if (!Array.isArray(tags)) tags = [];
    } catch {
      tags = [];
    }

    return {
      id: get("id"),
      workspace_id: get("workspace_id", "ws_topnetworks_default"),
      name: get("name"),
      title: get("title"),
      description: get("description"),
      tags,
      archived: get("archived") === "true",
      created_at: get("created_at") || new Date().toISOString(),
      updated_at: get("updated_at") || new Date().toISOString(),
    } satisfies Project;
  });
}

// ── Link CSV Schema ─────────────────────────────────────────────

const LINK_CSV_HEADERS = [
  "id",
  "workspace_id",
  "project_id",
  "name",
  "title",
  "description",
  "main_destination_url",
  "nickname",
  "status",
  "rotation_enabled",
  "rotation_rules",
  "archived",
  "created_at",
  "updated_at",
] as const;

/** Serialize an array of Links to CSV string */
export function serializeLinksToCSV(links: Link[]): string {
  const headerLine = LINK_CSV_HEADERS.join(",");

  const rows = links.map((l) => {
    const fields: string[] = [
      escapeCSVField(l.id),
      escapeCSVField(l.workspace_id),
      escapeCSVField(l.project_id),
      escapeCSVField(l.name),
      escapeCSVField(l.title),
      escapeCSVField(l.description),
      escapeCSVField(l.main_destination_url),
      escapeCSVField(l.nickname),
      escapeCSVField(l.status),
      String(l.rotation_enabled),
      escapeCSVField(JSON.stringify(l.rotation_rules)),
      String(l.archived),
      escapeCSVField(l.created_at),
      escapeCSVField(l.updated_at),
    ];
    return fields.join(",");
  });

  return [headerLine, ...rows].join("\n");
}

/** Parse a CSV string back into Link objects */
export function parseLinksFromCSV(csv: string): Link[] {
  const rows = parseCSV(csv);
  if (rows.length < 2) return [];

  const headers = rows[0];
  const headerMap = new Map(headers.map((h, i) => [h.trim(), i]));

  // Validate required headers
  for (const required of ["id", "project_id", "main_destination_url"]) {
    if (!headerMap.has(required)) {
      throw new Error(
        `CSV de enlaces inválido: falta la columna "${required}"`,
      );
    }
  }

  return rows.slice(1).map((fields) => {
    const get = (key: string, fallback = ""): string => {
      const idx = headerMap.get(key);
      return idx !== undefined && idx < fields.length
        ? fields[idx].trim()
        : fallback;
    };

    let rotationRules: RotationRule[] = [];
    try {
      const rawRules = get("rotation_rules", "[]");
      rotationRules = JSON.parse(rawRules);
      if (!Array.isArray(rotationRules)) rotationRules = [];
    } catch {
      rotationRules = [];
    }

    const status = get("status", "enabled");
    const validStatuses = ["enabled", "disabled", "expired"];

    return {
      id: get("id"),
      workspace_id: get("workspace_id", "ws_topnetworks_default"),
      project_id: get("project_id"),
      name: get("name"),
      title: get("title"),
      description: get("description"),
      main_destination_url: get("main_destination_url"),
      nickname: get("nickname"),
      status: validStatuses.includes(status)
        ? (status as Link["status"])
        : "enabled",
      rotation_enabled: get("rotation_enabled") === "true",
      rotation_rules: rotationRules,
      archived: get("archived") === "true",
      created_at: get("created_at") || new Date().toISOString(),
      updated_at: get("updated_at") || new Date().toISOString(),
    } satisfies Link;
  });
}

// ── Combined Backup Types ───────────────────────────────────────

export interface BackupData {
  projects: Project[];
  links: Link[];
  exportedAt: string;
  version: string;
}

/** Create a combined backup bundle with metadata */
export function createBackupBundle(
  projects: Project[],
  links: Link[],
): BackupData {
  return {
    projects,
    links,
    exportedAt: new Date().toISOString(),
    version: "1.0",
  };
}

/** Generate a timestamped filename for backup downloads */
export function generateBackupFilename(
  type: "projects" | "links" | "full",
): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const time = new Date().toISOString().slice(11, 16).replace(/:/g, "");
  return `routegenius-backup-${type}-${date}-${time}.csv`;
}

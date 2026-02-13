/**
 * RouteGenius — Core type definitions
 * Based on the Probabilistic URL Rotation Specification.
 */

/** A single rotation rule mapping a destination URL to a weight. */
export interface RotationRule {
  /** Unique ID for react key / future DB reference */
  id: string;
  /** Full URL to redirect to */
  destination_url: string;
  /** Integer weight 1-100 (percentage of total traffic) */
  weight_percentage: number;
  /** Display order index */
  order_index: number;
}

/**
 * A project acts as a virtual folder containing routing links.
 * Maps to a brand or initiative (e.g., TopFinanzas, KardTrust, BudgetBee).
 */
export interface Project {
  /** Unique project identifier (UUID) */
  id: string;
  /** Workspace / organization scope */
  workspace_id: string;
  /** Machine-friendly name (auto-generated if blank) */
  name: string;
  /** Display title (auto-generated if blank) */
  title: string;
  /** Optional description */
  description: string;
  /** Tags for categorization and filtering */
  tags: string[];
  /** Whether the project is archived */
  archived: boolean;
  /** ISO timestamp of creation */
  created_at: string;
  /** ISO timestamp of last update */
  updated_at: string;
}

/** A tracking link with its rotation configuration, scoped to a project. */
export interface Link {
  /** Unique link identifier (UUID) */
  id: string;
  /** Workspace / organization scope */
  workspace_id: string;
  /** Reference to parent project */
  project_id: string;
  /** Machine-friendly name */
  name: string;
  /** Display title */
  title: string;
  /** Optional description */
  description: string;
  /** The fallback/primary URL (receives residual traffic) */
  main_destination_url: string;
  /** Internal label for the link (legacy, kept for backward compat) */
  nickname: string;
  /** Whether rotation is active */
  status: "enabled" | "disabled" | "expired";
  /** Toggle: is traffic rotation active? */
  rotation_enabled: boolean;
  /** Secondary destination rules with weights */
  rotation_rules: RotationRule[];
  /** Whether the link is archived */
  archived: boolean;
  /** ISO timestamp of creation */
  created_at: string;
  /** ISO timestamp of last update */
  updated_at: string;
}

/** Click event for analytics (Phase 1: console log). */
export interface ClickEvent {
  /** ISO timestamp */
  timestamp: string;
  /** The link that was clicked */
  link_id: string;
  /** Where the click was routed */
  resolved_destination_url: string;
  /** Browser user-agent string */
  user_agent: string;
  /** Whether the main destination was selected */
  went_to_main: boolean;
}

/** Simulation result for the "Test Rotation" feature. */
export interface SimulationResult {
  /** Destination URL */
  url: string;
  /** Label shown in results */
  label: string;
  /** Configured weight % */
  configured_weight: number;
  /** Actual number of hits in simulation */
  actual_hits: number;
  /** Actual percentage from simulation */
  actual_percentage: number;
  /** Whether this is the main destination */
  is_main: boolean;
}

/** Search/filter criteria for querying links across projects. */
export interface LinkSearchCriteria {
  /** Free-text query matching name, title, description, URL */
  query?: string;
  /** Filter by project ID */
  projectId?: string;
  /** Filter by tags (any match) */
  tags?: string[];
  /** Filter by link status */
  status?: Link["status"];
  /** Filter by rotation enabled */
  rotationEnabled?: boolean;
  /** Include archived items */
  includeArchived?: boolean;
  /** Date range filter (ISO strings) */
  createdAfter?: string;
  createdBefore?: string;
}

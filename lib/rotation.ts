/**
 * RouteGenius — Probabilistic Rotation Engine
 *
 * Implements the weighted random selection algorithm from the
 * Probabilistic URL Rotation Specification.
 *
 * Key properties:
 * - Non-sticky: every request is an independent draw
 * - Residual probability assigned to main destination
 * - Supports 1-100 secondary destinations
 */

import type { Link, SimulationResult } from "./types";

interface WeightedDestination {
  url: string;
  label: string;
  weight: number; // 0–100
  is_main: boolean;
}

/**
 * Build the list of weighted destinations including the main fallback.
 * Residual weight (100 - sum of rule weights) goes to the main destination.
 */
export function buildWeightedDestinations(link: Link): WeightedDestination[] {
  const rules = link.rotation_rules.filter(
    (r) => r.destination_url.trim() !== "" && r.weight_percentage > 0,
  );

  const totalRuleWeight = rules.reduce(
    (sum, r) => sum + r.weight_percentage,
    0,
  );
  const mainWeight = Math.max(0, 100 - totalRuleWeight);

  const destinations: WeightedDestination[] = [];

  // Main destination gets residual weight
  if (mainWeight > 0 || rules.length === 0) {
    destinations.push({
      url: link.main_destination_url,
      label: "Destino Principal",
      weight: rules.length === 0 ? 100 : mainWeight,
      is_main: true,
    });
  }

  // Secondary destinations
  for (const rule of rules) {
    destinations.push({
      url: rule.destination_url,
      label: `Secundario #${rule.order_index + 1}`,
      weight: rule.weight_percentage,
      is_main: false,
    });
  }

  return destinations;
}

/**
 * Select a single destination using the probabilistic algorithm.
 *
 * Algorithm:
 * 1. Build cumulative probability distribution from weights
 * 2. Generate random number r ∈ [0, 1)
 * 3. Find the first destination whose cumulative probability >= r
 *
 * This is a single independent draw (non-sticky).
 */
export function selectDestination(link: Link): string {
  if (!link.rotation_enabled || link.rotation_rules.length === 0) {
    return link.main_destination_url;
  }

  const destinations = buildWeightedDestinations(link);
  const totalWeight = destinations.reduce((sum, d) => sum + d.weight, 0);

  if (totalWeight === 0) {
    return link.main_destination_url;
  }

  // Generate random number r ∈ [0, 1)
  const r = Math.random();

  // Walk the cumulative distribution
  let cumulative = 0;
  for (const dest of destinations) {
    cumulative += dest.weight / totalWeight;
    if (r < cumulative) {
      return dest.url;
    }
  }

  // Fallback (should not reach here due to floating point)
  return link.main_destination_url;
}

/**
 * Run a Monte Carlo simulation of N clicks.
 * Returns the distribution of clicks across all destinations.
 */
export function simulateClicks(
  link: Link,
  iterations: number = 1000,
): SimulationResult[] {
  const destinations = buildWeightedDestinations(link);
  const totalWeight = destinations.reduce((sum, d) => sum + d.weight, 0);

  // Initialize hit counters
  const hitMap = new Map<string, number>();
  for (const d of destinations) {
    hitMap.set(d.url, 0);
  }

  // Run simulation
  for (let i = 0; i < iterations; i++) {
    const r = Math.random();
    let cumulative = 0;
    let selected = destinations[destinations.length - 1]; // fallback

    for (const dest of destinations) {
      cumulative += dest.weight / totalWeight;
      if (r < cumulative) {
        selected = dest;
        break;
      }
    }

    hitMap.set(selected.url, (hitMap.get(selected.url) || 0) + 1);
  }

  // Build results
  return destinations.map((d) => ({
    url: d.url,
    label: d.label,
    configured_weight: d.weight,
    actual_hits: hitMap.get(d.url) || 0,
    actual_percentage: ((hitMap.get(d.url) || 0) / iterations) * 100,
    is_main: d.is_main,
  }));
}

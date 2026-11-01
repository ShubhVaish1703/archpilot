/**
 * ArchPilot Architecture Computation Engine Entry Point
 */

import { buildGraphProfile } from "./graph.js";
import { runStructuralRules } from "./rules/structural.js";
import { calculateScores } from "./scoring.js";

/**
 * Runs deterministic analysis on the input nodes and edges using the
 * consolidated Two-Phase Pipeline:
 * Phase 1: buildGraphProfile compiles all topological facts in 3-4 structured passes.
 * Phase 2: runStructuralRules reads precomputed facts to emit findings.
 *
 * @param {Array} nodes React Flow nodes
 * @param {Array} edges React Flow edges
 * @param {Object} [trafficFilters=null] Optional traffic parameters (e.g. peakRps)
 * @param {Object} [userIntent=null] Optional user goals and problem descriptions
 * @returns {Object} Comprehensive analysis findings, SPOFs, cycles, and scores
 */
export function analyzeArchitecture(
  nodes = [],
  edges = [],
  trafficFilters = null,
  userIntent = null
) {
  // Phase 1: Build comprehensive graph profile in minimal passes
  const profile = buildGraphProfile(nodes, edges);

  // Phase 2: Single-pass rule evaluation reading directly from profile facts
  const findings = runStructuralRules(profile);

  const hasTraffic = Boolean(
    trafficFilters &&
      (trafficFilters.peakRps || trafficFilters.expectedUsers)
  );

  const scoring = calculateScores(findings, hasTraffic, {
    nodeCount: nodes.length,
  });

  return {
    timestamp: new Date().toISOString(),
    nodesCount: nodes.length,
    edgesCount: edges.length,
    userIntent: userIntent || null,
    spofs: profile.criticalPathSPOFs,
    cycles: profile.directedCycles,
    orphanNodes: profile.orphanNodes,
    unreachableNodes: profile.unreachableNodes,
    connectedComponentsCount: profile.connectedComponents.length,
    findings,
    scoring,
    summary: generateSummary(findings, profile),
  };
}

function generateSummary(findings, profile) {
  const criticalCount = findings.filter((f) => f.severity === "CRITICAL").length;
  const warningCount = findings.filter((f) => f.severity === "WARNING").length;

  if (findings.length === 0) {
    return "Architecture structure is sound with no critical single points of failure or structural anti-patterns detected.";
  }

  const parts = [];
  if (profile.criticalPathSPOFs.length > 0) {
    parts.push(`${profile.criticalPathSPOFs.length} critical single point(s) of failure (SPOF)`);
  }
  if (profile.directedCycles.length > 0) {
    parts.push(`${profile.directedCycles.length} circular dependency cycle(s)`);
  }
  if (profile.orphanNodes.length > 0) {
    parts.push(`${profile.orphanNodes.length} disconnected orphan node(s)`);
  }
  if (profile.unreachableNodes.length > 0) {
    parts.push(`${profile.unreachableNodes.length} unreachable backend component(s)`);
  }
  if (criticalCount > 0) {
    parts.push(`${criticalCount} critical issue(s)`);
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} warning(s)`);
  }

  return `Detected ${parts.join(", ")}. Review recommendations below.`;
}

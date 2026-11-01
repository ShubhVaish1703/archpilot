/**
 * ArchPilot Scoring Engine
 *
 * Computes deterministic scores on a 1-10 rubric from structural findings.
 * Implements:
 * 1. Specific Fault Factor Weights (fatal flaws like exposed DB heavily penalized)
 * 2. Context-Aware SPOF Scaling (small graphs are not crushed by prototype SPOFs)
 * 3. Weakest-Link Overall Score (a fatal flaw in one dimension drags the system down)
 */

const RULE_IMPACT_MAP = {
  // Security
  SEC_CLIENT_DIRECT_DB: { security: 6.0, reliability: 1.5 },
  SEC_NO_AUTH: { security: 3.0 },
  SEC_DB_NO_FIREWALL: { security: 2.5 },

  // Reliability & Topology
  REL_CIRCULAR_DEPENDENCY: { reliability: 4.5 },
  TOPO_DISCONNECTED_SUBGRAPH: { reliability: 3.5 },
  WRONG_FLOW_REVERSED: { reliability: 2.5 },
  TOPO_DEAD_END_SERVER: { reliability: 2.0 },
  REL_QUEUE_NO_CONSUMER: { reliability: 2.0 },
  TOPO_DB_UNREACHABLE: { reliability: 2.0 },
  TOPO_UNREACHABLE_FROM_ENTRY: { reliability: 1.5 },
  REL_CACHE_WITHOUT_DB: { reliability: 1.5 },
  REL_QUEUE_NO_PUBLISHER: { reliability: 1.0 },
  TOPO_ORPHAN_NODE: { reliability: 0.5 },

  // Scalability & Performance
  UNDER_NO_LB_MULTI_SERVER: { scalability: 3.0, reliability: 1.0 },
  TOPO_NO_ENTRY_POINT: { scalability: 2.0, reliability: 1.0 },
  UNNECESSARY_CONNECTION: { scalability: 0.5 },
  REL_LB_SINGLE_TARGET: { scalability: 0.5 },
};

const SEVERITY_FALLBACK = {
  CRITICAL: 2.5,
  WARNING: 1.0,
  INFO: 0.3,
};

const SKIPPED_TRAFFIC_RULES = [
  {
    code: "OVER_LB_LOW_TRAFFIC",
    name: "Load Balancer on Low Traffic",
    reason: "Skipped — provide expected users and peak RPS for a more accurate analysis.",
  },
  {
    code: "OVER_CDN_INTERNAL",
    name: "CDN Usage on Internal Workloads",
    reason: "Skipped — provide network and user locality for evaluation.",
  },
  {
    code: "PERF_SINGLE_SERVER_HIGH_RPS",
    name: "Server Capacity Sizing",
    reason: "Skipped — provide expected RPS to calculate compute instance counts.",
  },
  {
    code: "COST_BUDGET_OVERRUN",
    name: "Cost Against Target Budget",
    reason: "Skipped — provide monthly infrastructure budget constraint.",
  },
];

/**
 * Calculates quantitative scores (1-10) based on structural findings.
 *
 * @param {Array} findings List of rule violations
 * @param {boolean} trafficProvided Whether traffic filters (peak RPS) were provided
 * @param {Object} options Additional graph context (e.g. nodeCount)
 */
export function calculateScores(findings = [], trafficProvided = false, options = {}) {
  const { nodeCount = 6 } = options;

  let security = 10.0;
  let reliability = 10.0;
  let scalability = 10.0;

  // Context-aware SPOF scaling factor:
  // For small designs (e.g. 2-4 nodes), SPOFs are expected prototype constraints,
  // so penalty is scaled down. For 8+ node designs, full penalty applies.
  const spofScale = Math.min(1.0, Math.max(0.3, nodeCount / 8));

  for (const finding of findings) {
    if (finding.ruleId === "SPOF_CRITICAL_PATH") {
      // Scaled SPOF penalty
      const deduction = 1.0 * spofScale;
      reliability = Math.max(1.0, reliability - deduction);
      continue;
    }

    const impact = RULE_IMPACT_MAP[finding.ruleId];
    if (impact) {
      if (impact.security) {
        security = Math.max(1.0, security - impact.security);
      }
      if (impact.reliability) {
        reliability = Math.max(1.0, reliability - impact.reliability);
      }
      if (impact.scalability) {
        scalability = Math.max(1.0, scalability - impact.scalability);
      }
    } else {
      // Fallback for unmapped rules
      const deduction = SEVERITY_FALLBACK[finding.severity] || 0.5;
      reliability = Math.max(1.0, reliability - deduction);
    }
  }

  // Round dimension scores to 1 decimal place
  security = Math.round(security * 10) / 10;
  reliability = Math.round(reliability * 10) / 10;
  scalability = Math.round(scalability * 10) / 10;

  // Weakest-Link Overall Score Formula:
  // 60% weight on the lowest scoring dimension, 40% on the average.
  // This ensures a catastrophic security flaw cannot hide behind high reliability.
  const minDim = Math.min(security, reliability, scalability);
  const avgDim = (security + reliability + scalability) / 3;
  const overall = Math.round((0.6 * minDim + 0.4 * avgDim) * 10) / 10;

  return {
    overall,
    dimensions: {
      security,
      reliability,
      scalability,
    },
    partial: !trafficProvided,
    note: !trafficProvided
      ? "Partial score — traffic data not provided. Add filters for a complete assessment."
      : "Complete score incorporating structural topology and traffic parameters.",
    skippedRules: !trafficProvided ? SKIPPED_TRAFFIC_RULES : [],
  };
}

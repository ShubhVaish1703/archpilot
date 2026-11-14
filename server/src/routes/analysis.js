import { Router } from "express";
import { analyzeArchitecture } from "../services/engine/index.js";
import { generateArchitectureVariants } from "../services/rag/generator.js";

const router = Router();

const VALID_NODE_KINDS = new Set([
  "client",
  "api",
  "loadbalancer",
  "server",
  "database",
  "cache",
  "queue",
  "storage",
  "firewall",
  "auth",
  "cdn",
  "dns",
  "worker",
  "replica",
]);

function normalizeEdge(edge) {
  return {
    ...edge,
    data: {
      ...edge?.data,
      type: edge?.data?.type || "sync",
    },
  };
}

/**
 * POST /api/analyze
 * Evaluates the React Flow graph against deterministic structural rules
 */
router.post("/analyze", (req, res) => {
  try {
    const {
      nodes = [],
      edges = [],
      trafficFilters = null,
      description = "",
      concerns = "",
    } = req.body || {};

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({
        error: "Invalid payload: 'nodes' and 'edges' must be arrays.",
      });
    }

    for (const node of nodes) {
      const kind = node?.data?.kind;
      if (kind && !VALID_NODE_KINDS.has(kind)) {
        return res.status(400).json({
          error: `Invalid node kind: '${kind}'. Allowed kinds are: ${Array.from(VALID_NODE_KINDS).join(", ")}`,
        });
      }
    }

    const normalizedEdges = edges.map(normalizeEdge);

    const userIntent =
      description || concerns ? { description, concerns } : null;

    const result = analyzeArchitecture(
      nodes,
      normalizedEdges,
      trafficFilters,
      userIntent
    );
    return res.status(200).json(result);
  } catch (error) {
    console.error("Analysis Error:", error);
    return res.status(500).json({
      error: "Failed to evaluate architecture graph",
      details: error.message,
    });
  }
});

/**
 * POST /api/generate-variants
 * Synthesizes 4 RAG-grounded architecture variants and dually audits each with the deterministic engine
 */
router.post("/generate-variants", async (req, res) => {
  try {
    const {
      nodes = [],
      edges = [],
      trafficFilters = null,
      description = "",
      concerns = "",
    } = req.body || {};

    if (!Array.isArray(nodes) || !Array.isArray(edges)) {
      return res.status(400).json({
        error: "Invalid payload: 'nodes' and 'edges' must be arrays.",
      });
    }

    for (const node of nodes) {
      const kind = node?.data?.kind;
      if (kind && !VALID_NODE_KINDS.has(kind)) {
        return res.status(400).json({
          error: `Invalid node kind: '${kind}'. Allowed kinds are: ${Array.from(VALID_NODE_KINDS).join(", ")}`,
        });
      }
    }

    const normalizedEdges = edges.map(normalizeEdge);

    const userIntent =
      description || concerns ? { description, concerns } : null;

    const result = await generateArchitectureVariants({
      nodes,
      edges: normalizedEdges,
      userIntent,
      trafficFilters,
    });

    if (result.blockedByGatekeeper) {
      return res.status(400).json(result);
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("Variant Generation Error:", error);
    return res.status(500).json({
      error: "Failed to generate architecture variants",
      details: error.message,
    });
  }
});

export default router;

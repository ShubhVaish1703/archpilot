import { Router } from "express";
import { analyzeArchitecture } from "../services/engine/index.js";
import { generateArchitectureVariants } from "../services/rag/generator.js";

const router = Router();

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

    const userIntent =
      description || concerns ? { description, concerns } : null;

    const result = analyzeArchitecture(
      nodes,
      edges,
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

    const userIntent =
      description || concerns ? { description, concerns } : null;

    const result = await generateArchitectureVariants({
      nodes,
      edges,
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

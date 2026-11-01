import { Router } from "express";
import { analyzeArchitecture } from "../services/engine/index.js";

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

export default router;

import express from "express";
import cors from "cors";
import analysisRouter from "./src/routes/analysis.js";

const app = express();
const PORT = process.env.PORT || 5001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: "5mb" }));

// Health Check Endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "archpilot-engine",
    timestamp: new Date().toISOString(),
  });
});

// Architecture Evaluation Routes
app.use("/api", analysisRouter);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: `Cannot ${req.method} ${req.url}` });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({
    error: "Internal server error",
    details: err.message,
  });
});

if (process.env.NODE_ENV !== "test") {
  app.listen(PORT, () => {
    console.log(`🚀 ArchPilot Express Engine running on http://localhost:${PORT}`);
    console.log(`👉 POST /api/analyze ready to evaluate system design graphs`);
  });
}

export default app;

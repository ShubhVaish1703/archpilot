import assert from "node:assert";
import {
  buildPrompt,
  getDeterministicVariants,
  generateArchitectureVariants,
} from "../src/services/rag/generator.js";

console.log("🧪 Running ArchPilot LLM Generator & Dual-Engine Audit Tests...\n");

// --- TEST 1: Prompt Construction ---
{
  const mockAnalysis = {
    nodesCount: 4,
    edgesCount: 3,
    scoring: { overall: 5.1, dimensions: { security: 4.0, reliability: 5.0, scalability: 7.5 } },
    spofs: ["server-1", "db-1"],
    findings: [
      { ruleId: "SEC_CLIENT_DIRECT_DB", title: "Direct DB Access", description: "Client talks to DB" },
      { ruleId: "SPOF_CRITICAL_PATH", title: "Single Point of Failure", description: "Single server" },
    ],
  };

  const mockRagChunks = [
    { docTitle: "01 Scaling", sectionTitle: "Stateless Tier", content: "Web servers must be stateless..." },
    { docTitle: "03 Database", sectionTitle: "Master-Slave", content: "Read replicas scale read QPS..." },
  ];

  const prompt = buildPrompt({
    userIntent: { description: "Fintech payment processing", concerns: "Zero downtime" },
    originalAnalysis: mockAnalysis,
    ragChunks: mockRagChunks,
    trafficFilters: { peakRps: 10000 },
  });

  assert.ok(prompt.includes("Fintech payment processing"), "Prompt must include user description");
  assert.ok(prompt.includes("SEC_CLIENT_DIRECT_DB"), "Prompt must include detected engine rule findings");
  assert.ok(prompt.includes("Web servers must be stateless"), "Prompt must include RAG knowledge excerpts");
  assert.ok(prompt.includes("cost_optimized"), "Prompt must mandate cost_optimized variant");
  assert.ok(prompt.includes("high_availability"), "Prompt must mandate high_availability variant");
  assert.ok(prompt.includes("STRICT CANVAS GRAPH & COORDINATE RULES"), "Prompt must include coordinate rules");
  console.log("✅ Test 1 Passed: RAG prompt successfully synthesizes intent, engine findings, and book knowledge");
}

// --- TEST 2: Deterministic 4-Variant Fallback Quality & Schema ---
{
  const mockAnalysis = { findings: [] };
  const variants = getDeterministicVariants(mockAnalysis, { description: "Test System" });

  assert.strictEqual(variants.length, 4, "Must generate exactly 4 architectural variants");
  const variantIds = variants.map((v) => v.id);
  assert.deepStrictEqual(
    variantIds,
    ["cost_optimized", "high_availability", "high_throughput", "global_distributed"],
    "Must output all 4 canonical variant IDs"
  );

  for (const v of variants) {
    assert.ok(v.name, `Variant ${v.id} must have a name`);
    assert.ok(v.metrics.targetQps, `Variant ${v.id} must specify targetQps`);
    assert.ok(v.metrics.targetSla, `Variant ${v.id} must specify targetSla`);
    assert.ok(v.tradeoffs.pros.length >= 2, `Variant ${v.id} must have at least 2 pros`);
    assert.ok(v.tradeoffs.cons.length >= 1, `Variant ${v.id} must have at least 1 con`);
    assert.ok(v.graph.nodes.length >= 4, `Variant ${v.id} graph must have nodes`);
    assert.ok(v.graph.edges.length >= 3, `Variant ${v.id} graph must have edges`);

    // Verify coordinates are on clean tiered bounds
    for (const node of v.graph.nodes) {
      assert.ok(node.position.x >= 50 && node.position.x <= 950, `Node ${node.id} X coord must be within canvas bounds`);
      assert.ok(node.position.y >= 50 && node.position.y <= 550, `Node ${node.id} Y coord must be within canvas bounds`);
    }
  }
  console.log("✅ Test 2 Passed: 4-variant synthesis produces valid schemas, trade-offs, and tiered coordinates");
}

// --- TEST 3: Gatekeeper Blocks Incomplete Designs ---
{
  // Broken graph with an orphan cache
  const brokenNodes = [
    { id: "client-1", data: { kind: "client", label: "Client" } },
    { id: "server-1", data: { kind: "server", label: "App Server" } },
    { id: "orphan-cache", data: { kind: "cache", label: "Unconnected Cache" } },
  ];
  const brokenEdges = [{ source: "client-1", target: "server-1" }];

  const result = await generateArchitectureVariants({
    nodes: brokenNodes,
    edges: brokenEdges,
    userIntent: { description: "Broken Test" },
  });

  assert.strictEqual(result.success, false, "Gatekeeper must block generation on incomplete design");
  assert.strictEqual(result.blockedByGatekeeper, true);
  assert.strictEqual(result.variants.length, 0);
  assert.ok(result.reason.includes("basic structural flaw"));
  console.log("✅ Test 3 Passed: Gatekeeper blocks LLM variant generation on incomplete architecture");
}

// --- TEST 4: Dual-Engine Audit on Complete Architecture ---
{
  // A complete design that has a single-server SPOF and direct client-to-DB breach
  const originalNodes = [
    { id: "client-1", data: { kind: "client", label: "Client" } },
    { id: "server-1", data: { kind: "server", label: "Single Server" } },
    { id: "db-1", data: { kind: "database", label: "Exposed DB" } },
  ];
  const originalEdges = [
    { source: "client-1", target: "server-1" },
    { source: "server-1", target: "db-1" },
  ];

  const result = await generateArchitectureVariants({
    nodes: originalNodes,
    edges: originalEdges,
    userIntent: { description: "Payment Gateway", concerns: "Avoid single point of failure" },
    apiKey: null, // tests deterministic fallback generation with dual audit
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.blockedByGatekeeper, false);
  assert.strictEqual(result.variants.length, 4);

  // Check the High-Availability variant
  const haVariant = result.variants.find((v) => v.id === "high_availability");
  assert.ok(haVariant, "Must include high_availability variant");

  // DUAL-ENGINE VERIFICATION CHECKS:
  assert.ok(haVariant.engineAudit, "Variant must contain mathematically verified engineAudit");
  assert.strictEqual(haVariant.engineAudit.spofs.length, 0, "High-Availability variant must mathematically eliminate all SPOFs");
  assert.strictEqual(haVariant.engineAudit.overall, 10, "High-Availability variant must achieve clean 10/10 engine score");
  assert.ok(
    haVariant.engineAudit.resolvedRules.includes("SEC_NO_AUTH"),
    "Engine audit must identify that SEC_NO_AUTH was resolved"
  );
  assert.ok(
    haVariant.engineAudit.resolvedRules.includes("SPOF_CRITICAL_PATH"),
    "Engine audit must identify that SPOF_CRITICAL_PATH was resolved"
  );
  console.log("✅ Test 4 Passed: Dual-Engine Audit verifies generated variants mathematically and tracks resolved issues");
}

console.log("\n🎉 ALL 4 LLM GENERATOR & DUAL-ENGINE AUDIT TESTS PASSED SUCCESSFULLY!\n");

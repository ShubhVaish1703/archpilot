import assert from "node:assert";
import { analyzeArchitecture, evaluateGatekeeper } from "../src/services/engine/index.js";

console.log("🧪 Running ArchPilot Architecture Completeness Gatekeeper Tests...\n");

// --- TEST 1: Blank Canvas (Mode: BLANK_SLATE) ---
{
  const result = analyzeArchitecture([], []);
  assert.strictEqual(result.gatekeeper.canGenerateVariants, true, "Empty canvas should permit generation from scratch");
  assert.strictEqual(result.gatekeeper.mode, "BLANK_SLATE");
  assert.strictEqual(result.gatekeeper.blockingCount, 0);
  console.log("✅ Test 1 Passed: Blank canvas (0 nodes) correctly classified as BLANK_SLATE and allowed");
}

// --- TEST 2: Incomplete Design with Orphan Node ---
{
  const nodes = [
    { id: "client-1", data: { kind: "client", label: "Client" } },
    { id: "server-1", data: { kind: "server", label: "App Server" } },
    { id: "cache-orphan", data: { kind: "cache", label: "Redis Cache" } },
  ];
  const edges = [
    { source: "client-1", target: "server-1" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  assert.strictEqual(result.gatekeeper.canGenerateVariants, false, "Orphan node must block AI variant generation");
  assert.strictEqual(result.gatekeeper.mode, "INCOMPLETE_DESIGN");
  assert.ok(result.gatekeeper.blockingCount >= 1);
  assert.ok(
    result.gatekeeper.blockingFlaws.some((f) => f.ruleId === "TOPO_ORPHAN_NODE"),
    "Must flag TOPO_ORPHAN_NODE as blocking flaw"
  );
  assert.ok(result.gatekeeper.reason.includes("basic structural flaw"));
  console.log("✅ Test 2 Passed: Disconnected orphan component blocks AI generation with clear reason");
}

// --- TEST 3: Incomplete Design with Disconnected Subgraph Islands ---
{
  const nodes = [
    // Island 1
    { id: "client-1", data: { kind: "client", label: "Client" } },
    { id: "server-1", data: { kind: "server", label: "App Server" } },
    // Island 2
    { id: "cache-1", data: { kind: "cache", label: "Redis" } },
    { id: "db-1", data: { kind: "database", label: "Postgres DB" } },
  ];
  const edges = [
    { source: "client-1", target: "server-1" },
    { source: "cache-1", target: "db-1" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  assert.strictEqual(result.gatekeeper.canGenerateVariants, false, "Disconnected subgraphs must block generation");
  assert.strictEqual(result.gatekeeper.mode, "INCOMPLETE_DESIGN");
  assert.ok(
    result.gatekeeper.blockingFlaws.some((f) => f.ruleId === "TOPO_DISCONNECTED_SUBGRAPH"),
    "Must flag TOPO_DISCONNECTED_SUBGRAPH as blocking flaw"
  );
  console.log("✅ Test 3 Passed: Disconnected architecture islands block AI generation");
}

// --- TEST 4: Complete Design with Architectural Flaws (Mode: COMPLETE_DESIGN) ---
{
  // Complete connected chain, but contains SPOFs and direct client-to-DB anti-patterns
  const nodes = [
    { id: "client-1", data: { kind: "client", label: "Client" } },
    { id: "server-1", data: { kind: "server", label: "Single Server" } },
    { id: "db-1", data: { kind: "database", label: "Postgres DB" } },
  ];
  const edges = [
    { source: "client-1", target: "server-1" },
    { source: "server-1", target: "db-1" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  assert.strictEqual(result.gatekeeper.canGenerateVariants, true, "Complete connected design must allow AI variant generation");
  assert.strictEqual(result.gatekeeper.mode, "COMPLETE_DESIGN");
  assert.strictEqual(result.gatekeeper.blockingCount, 0);
  assert.strictEqual(result.gatekeeper.reason, null);
  // Note: findings still contain SPOF_CRITICAL_PATH, but SPOF is an optimization target, not a structural syntax blocker!
  assert.ok(result.spofs.includes("server-1"));
  console.log("✅ Test 4 Passed: Connected architecture with SPOF is allowed (design smell, not structural blocker)");
}

console.log("\n🎉 ALL 4 ARCHITECTURE COMPLETENESS GATEKEEPER TESTS PASSED!\n");

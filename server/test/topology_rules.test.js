/**
 * Unit Tests for ArchPilot New Connectivity, Flow & Topology Rules
 * Run with: node test/topology_rules.test.js
 */

import assert from "node:assert/strict";
import { analyzeArchitecture } from "../src/services/engine/index.js";

console.log("🧪 Running ArchPilot Topology & Connectivity Rules Tests...\n");

// --- TEST 1: Orphan Node Detection ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "orphan1", data: { label: "Forgotten Cache", kind: "cache" } },
  ];
  const edges = [{ source: "c1", target: "api1" }];

  const result = analyzeArchitecture(nodes, edges);
  assert.ok(result.orphanNodes.includes("orphan1"), "orphan1 must be in orphanNodes list");
  const finding = result.findings.find((f) => f.ruleId === "TOPO_ORPHAN_NODE");
  assert.ok(finding, "Must flag TOPO_ORPHAN_NODE");
  assert.ok(finding.affectedNodes.includes("orphan1"));
  console.log("✅ Test 1 Passed: TOPO_ORPHAN_NODE correctly detected");
}

// --- TEST 2: Disconnected Subgraph Islands ---
{
  const nodes = [
    // Island 1: Client -> Gateway
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    // Island 2: Server -> Database (completely disconnected from Island 1)
    { id: "s1", data: { label: "Backend Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];
  const edges = [
    { source: "c1", target: "api1" },
    { source: "s1", target: "db1" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  const islandFinding = result.findings.find(
    (f) => f.ruleId === "TOPO_DISCONNECTED_SUBGRAPH"
  );
  assert.ok(islandFinding, "Must flag TOPO_DISCONNECTED_SUBGRAPH for multiple disconnected clusters");
  assert.equal(islandFinding.severity, "CRITICAL");
  console.log("✅ Test 2 Passed: TOPO_DISCONNECTED_SUBGRAPH correctly flagged critical disconnected clusters");
}

// --- TEST 3: Missing Traffic Entry Point ---
{
  const nodes = [
    { id: "s1", data: { label: "Backend Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];
  const edges = [{ source: "s1", target: "db1" }];

  const result = analyzeArchitecture(nodes, edges);
  const entryFinding = result.findings.find(
    (f) => f.ruleId === "TOPO_NO_ENTRY_POINT"
  );
  assert.ok(entryFinding, "Must flag TOPO_NO_ENTRY_POINT when no client or API gateway exists");
  console.log("✅ Test 3 Passed: TOPO_NO_ENTRY_POINT flagged when no entry point exists");
}

// --- TEST 4: Unreachable Backend Infrastructure ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Reachable Server", kind: "server" } },
    // Isolated worker cluster that receives no incoming traffic from client
    { id: "s2", data: { label: "Ghost Worker", kind: "server" } },
    { id: "db2", data: { label: "Ghost DB", kind: "database" } },
  ];
  const edges = [
    { source: "c1", target: "api1" },
    { source: "api1", target: "s1" },
    { source: "s2", target: "db2" }, // s2 connects to db2, but neither is reachable from c1
  ];

  const result = analyzeArchitecture(nodes, edges);
  assert.ok(result.unreachableNodes.includes("s2"), "s2 must be flagged unreachable");
  assert.ok(result.unreachableNodes.includes("db2"), "db2 must be flagged unreachable");
  const unreachFinding = result.findings.find(
    (f) => f.ruleId === "TOPO_UNREACHABLE_FROM_ENTRY"
  );
  assert.ok(unreachFinding, "Must flag TOPO_UNREACHABLE_FROM_ENTRY");
  console.log("✅ Test 4 Passed: TOPO_UNREACHABLE_FROM_ENTRY correctly detected unreachable nodes");
}

// --- TEST 5: Dead-End Application Server ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Blackhole Server", kind: "server" } },
  ];
  const edges = [
    { source: "c1", target: "api1" },
    { source: "api1", target: "s1" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  const deadEndFinding = result.findings.find(
    (f) => f.ruleId === "TOPO_DEAD_END_SERVER"
  );
  assert.ok(deadEndFinding, "Must flag TOPO_DEAD_END_SERVER for server with 0 outbound connections");
  console.log("✅ Test 5 Passed: TOPO_DEAD_END_SERVER correctly flagged blackhole server");
}

// --- TEST 6: Data Store Lacks Compute Access ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Primary DB", kind: "database" } },
    { id: "db2", data: { label: "Orphaned Analytics DB", kind: "database" } },
  ];
  const edges = [
    { source: "c1", target: "api1" },
    { source: "api1", target: "s1" },
    { source: "s1", target: "db1" },
    // db2 is connected to db1 (e.g. drawn replica arrow), but has NO server or cache writer
    { source: "db1", target: "db2" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  const dbFinding = result.findings.find(
    (f) => f.ruleId === "TOPO_DB_UNREACHABLE"
  );
  assert.ok(dbFinding, "Must flag TOPO_DB_UNREACHABLE");
  console.log("✅ Test 6 Passed: TOPO_DB_UNREACHABLE correctly flagged data store with no compute access");
}

// --- TEST 7: Cache Without Persistent DB ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "cache1", data: { label: "Isolated Redis", kind: "cache" } },
  ];
  const edges = [
    { source: "c1", target: "api1" },
    { source: "api1", target: "s1" },
    { source: "s1", target: "cache1" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  const cacheFinding = result.findings.find(
    (f) => f.ruleId === "REL_CACHE_WITHOUT_DB"
  );
  assert.ok(cacheFinding, "Cache without DB persistence must be flagged");
  console.log("✅ Test 7 Passed: REL_CACHE_WITHOUT_DB correctly flagged isolated volatile cache");
}

console.log("\n🎉 All Topology & Connectivity Tests Passed Successfully!");

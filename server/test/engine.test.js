/**
 * Unit Tests for ArchPilot Structural Engine
 * Run with: node test/engine.test.js
 */

import assert from "node:assert/strict";
import { analyzeArchitecture } from "../src/services/engine/index.js";

console.log("🧪 Running ArchPilot Structural Computation Engine Tests...\n");

// --- TEST 1: Safe Architecture ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "lb1", data: { label: "Load Balancer", kind: "loadbalancer" } },
    { id: "s1", data: { label: "App Server 1", kind: "server" } },
    { id: "s2", data: { label: "App Server 2", kind: "server" } },
    { id: "db1", data: { label: "Database Primary", kind: "database" } },
    { id: "db2", data: { label: "Database Replica", kind: "database" } },
  ];

  const edges = [
    { source: "c1", target: "api1" },
    { source: "api1", target: "lb1" },
    { source: "lb1", target: "s1" },
    { source: "lb1", target: "s2" },
    { source: "s1", target: "db1" },
    { source: "s1", target: "db2" },
    { source: "s2", target: "db1" },
    { source: "s2", target: "db2" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  assert.equal(result.spofs.includes("s1"), false, "Redundant server s1 should not be an articulation point");
  assert.equal(result.spofs.includes("s2"), false, "Redundant server s2 should not be an articulation point");
  assert.equal(result.cycles.length, 0, "Should have no cycles");
  console.log("✅ Test 1 Passed: Redundant cluster has no server SPOF and no cycles");
}

// --- TEST 2: Single Point of Failure (SPOF) on Critical Path ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Single Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { source: "c1", target: "api1" },
    { source: "api1", target: "s1" },
    { source: "s1", target: "db1" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  assert.ok(result.spofs.includes("s1"), "Single Server must be detected as SPOF");
  const spofFinding = result.findings.find((f) => f.ruleId === "SPOF_CRITICAL_PATH");
  assert.ok(spofFinding, "Should generate SPOF_CRITICAL_PATH finding");
  console.log("✅ Test 2 Passed: Single Server correctly identified as critical SPOF");
}

// --- TEST 3: Direct Client to Database Access ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [{ source: "c1", target: "db1" }];

  const result = analyzeArchitecture(nodes, edges);
  const directDbFinding = result.findings.find(
    (f) => f.ruleId === "SEC_CLIENT_DIRECT_DB"
  );
  assert.ok(directDbFinding, "Must flag SEC_CLIENT_DIRECT_DB");
  assert.equal(directDbFinding.severity, "CRITICAL");
  assert.ok(
    result.scoring.dimensions.security <= 4.0,
    "Security score must drop to 4.0 or lower for exposed database"
  );
  assert.ok(
    result.scoring.overall <= 5.5,
    "Overall score must drop to 5.5 or lower due to weakest-link weighting"
  );
  console.log("✅ Test 3 Passed: SEC_CLIENT_DIRECT_DB flagged with CRITICAL severity and score degraded to " + result.scoring.overall);
}

// --- TEST 4: Circular Dependency Detection ---
{
  const nodes = [
    { id: "s1", data: { label: "Order Service", kind: "server" } },
    { id: "s2", data: { label: "Payment Service", kind: "server" } },
  ];

  const edges = [
    { source: "s1", target: "s2" },
    { source: "s2", target: "s1" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  assert.ok(result.cycles.length > 0, "Must detect directed cycle");
  const cycleFinding = result.findings.find(
    (f) => f.ruleId === "REL_CIRCULAR_DEPENDENCY"
  );
  assert.ok(cycleFinding, "Must flag REL_CIRCULAR_DEPENDENCY");
  console.log("✅ Test 4 Passed: REL_CIRCULAR_DEPENDENCY detected across services");
}

// --- TEST 5: Queue Without Consumer ---
{
  const nodes = [
    { id: "s1", data: { label: "Producer Server", kind: "server" } },
    { id: "q1", data: { label: "Dead Queue", kind: "queue" } },
  ];

  const edges = [{ source: "s1", target: "q1" }];

  const result = analyzeArchitecture(nodes, edges);
  const queueFinding = result.findings.find(
    (f) => f.ruleId === "REL_QUEUE_NO_CONSUMER"
  );
  assert.ok(queueFinding, "Must flag REL_QUEUE_NO_CONSUMER");
  console.log("✅ Test 5 Passed: REL_QUEUE_NO_CONSUMER detected for unconsumed queue");
}

// --- TEST 6: Multiple Servers Without Load Balancer ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server A", kind: "server" } },
    { id: "s2", data: { label: "Server B", kind: "server" } },
  ];

  const edges = [
    { source: "c1", target: "s1" },
    { source: "c1", target: "s2" },
  ];

  const result = analyzeArchitecture(nodes, edges);
  const lbFinding = result.findings.find(
    (f) => f.ruleId === "UNDER_NO_LB_MULTI_SERVER"
  );
  assert.ok(lbFinding, "Must flag UNDER_NO_LB_MULTI_SERVER");
  assert.equal(result.scoring.partial, true, "Should report partial score without traffic");
  console.log("✅ Test 6 Passed: UNDER_NO_LB_MULTI_SERVER flagged and partial score reported");
}

console.log("\n🎉 All 6 Structural Computation Engine Tests Passed Successfully!");

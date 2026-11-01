/**
 * Comprehensive Test Suite for ArchPilot Computation Engine & API
 * Tests:
 * 1. Default Frontend Architecture (The exact graph currently loaded in ArchPilot)
 * 2. Mixed Anti-Pattern Topology (SPOF + Cycle + Direct DB + Dead Queue + Bypass)
 * 3. Highly Resilient Distributed System (Clustered servers, replicas, failover)
 * 4. API Request/Response payload verification
 */

import assert from "node:assert/strict";
import { analyzeArchitecture } from "../src/services/engine/index.js";

console.log("=================================================================");
console.log("🚀 ARCHPILOT ENGINE COMPREHENSIVE TEST SUITE");
console.log("=================================================================\n");

// ----------------------------------------------------------------------
// SCENARIO 1: The Exact Graph currently in frontend/src/app/page.tsx
// Client -> API Gateway -> Load Balancer -> App Server -> (Cache & Database)
// ----------------------------------------------------------------------
console.log("▶ SCENARIO 1: Current Frontend Default Architecture");
{
  const defaultFrontendNodes = [
    { id: "client-1", data: { label: "Client", kind: "client" } },
    { id: "api-1", data: { label: "API Gateway", kind: "api" } },
    { id: "lb-1", data: { label: "Load Balancer", kind: "loadbalancer" } },
    { id: "server-1", data: { label: "App Server", kind: "server" } },
    { id: "cache-1", data: { label: "Cache", kind: "cache" } },
    { id: "db-1", data: { label: "Database", kind: "database" } },
  ];

  const defaultFrontendEdges = [
    { id: "client-api", source: "client-1", target: "api-1" },
    { id: "api-lb", source: "api-1", target: "lb-1" },
    { id: "lb-server", source: "lb-1", target: "server-1" },
    { id: "server-cache", source: "server-1", target: "cache-1" },
    { id: "server-db", source: "server-1", target: "db-1" },
  ];

  const result = analyzeArchitecture(defaultFrontendNodes, defaultFrontendEdges);

  console.log(`  Nodes: ${result.nodesCount}, Edges: ${result.edgesCount}`);
  console.log(`  Identified SPOFs: ${JSON.stringify(result.spofs)}`);
  console.log(`  Cycles Detected: ${result.cycles.length}`);
  console.log(`  Findings Count: ${result.findings.length}`);
  console.log(`  Scores:`, result.scoring.dimensions);
  console.log(`  Overall: ${result.scoring.overall}/10 (Partial: ${result.scoring.partial})`);
  console.log(`  Summary: "${result.summary}"`);

  // Assertions:
  // In a single-server setup, server-1 and lb-1 and api-1 are articulation points on critical path!
  assert.ok(result.spofs.includes("server-1"), "Single server-1 should be flagged as SPOF");
  assert.equal(result.cycles.length, 0, "Default graph must have no cycles");
  assert.equal(result.findings.some(f => f.ruleId === "SEC_CLIENT_DIRECT_DB"), false, "No direct DB access");
  console.log("  ✅ Scenario 1 Verified.\n");
}

// ----------------------------------------------------------------------
// SCENARIO 2: Mixed Anti-Pattern Torture Test
// Direct DB + Synchronous Cycle + Dead Queue + Bypass Connection + Multi-server without LB
// ----------------------------------------------------------------------
console.log("▶ SCENARIO 2: Mixed Anti-Patterns Torture Graph");
{
  const nodes = [
    { id: "c1", data: { label: "Mobile App", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Orders Service", kind: "server" } },
    { id: "s2", data: { label: "Payments Service", kind: "server" } },
    { id: "q1", data: { label: "Dead Letter Queue", kind: "queue" } },
    { id: "db1", data: { label: "User Database", kind: "database" } },
  ];

  const edges = [
    // Bypass: Client connects to API Gateway AND directly to Orders Service
    { source: "c1", target: "api1" },
    { source: "c1", target: "s1" },
    { source: "api1", target: "s1" },
    // Critical Security Violation: Client directly connects to Database
    { source: "c1", target: "db1" },
    // Circular Dependency: s1 -> s2 -> s1
    { source: "s1", target: "s2" },
    { source: "s2", target: "s1" },
    // Dead Queue: s1 publishes to q1, but nothing reads from q1
    { source: "s1", target: "q1" },
    // Normal server to DB
    { source: "s1", target: "db1" },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const ruleCodes = result.findings.map((f) => f.ruleId);
  console.log("  Detected Violations:", ruleCodes);

  assert.ok(ruleCodes.includes("SEC_CLIENT_DIRECT_DB"), "Must catch SEC_CLIENT_DIRECT_DB");
  assert.ok(ruleCodes.includes("REL_CIRCULAR_DEPENDENCY"), "Must catch REL_CIRCULAR_DEPENDENCY");
  assert.ok(ruleCodes.includes("REL_QUEUE_NO_CONSUMER"), "Must catch REL_QUEUE_NO_CONSUMER");
  assert.ok(ruleCodes.includes("UNDER_NO_LB_MULTI_SERVER"), "Must catch UNDER_NO_LB_MULTI_SERVER");
  assert.ok(ruleCodes.includes("UNNECESSARY_CONNECTION"), "Must catch UNNECESSARY_CONNECTION");

  console.log(`  Security Score: ${result.scoring.dimensions.security}/10`);
  console.log(`  Reliability Score: ${result.scoring.dimensions.reliability}/10`);
  console.log(`  Scalability Score: ${result.scoring.dimensions.scalability}/10`);
  console.log(`  Overall Score: ${result.scoring.overall}/10`);

  assert.ok(result.scoring.dimensions.security < 8.0, "Security score should be degraded by critical direct DB access");
  assert.ok(result.scoring.dimensions.reliability < 8.0, "Reliability score should be degraded by cycle and dead queue");
  console.log("  ✅ Scenario 2 Verified.\n");
}

// ----------------------------------------------------------------------
// SCENARIO 3: Highly Resilient, Best-Practice Enterprise Architecture
// Multiple redundant Gateways, LBs, 3 clustered Servers, Read Replica DB, Worker Queue with Consumers
// ----------------------------------------------------------------------
console.log("▶ SCENARIO 3: Resilient HA Enterprise Architecture");
{
  const nodes = [
    { id: "c1", data: { label: "Web Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway 1", kind: "api" } },
    { id: "api2", data: { label: "API Gateway 2", kind: "api" } },
    { id: "lb1", data: { label: "Load Balancer 1", kind: "loadbalancer" } },
    { id: "lb2", data: { label: "Load Balancer 2", kind: "loadbalancer" } },
    { id: "s1", data: { label: "App Server A", kind: "server" } },
    { id: "s2", data: { label: "App Server B", kind: "server" } },
    { id: "s3", data: { label: "App Server C", kind: "server" } },
    { id: "q1", data: { label: "Job Queue", kind: "queue" } },
    { id: "worker", data: { label: "Async Worker Server", kind: "server" } },
    { id: "db1", data: { label: "Database Primary", kind: "database" } },
    { id: "db2", data: { label: "Database Replica", kind: "database" } },
  ];

  const edges = [
    // Client to redundant Gateways
    { source: "c1", target: "api1" },
    { source: "c1", target: "api2" },
    // Gateways to Load Balancers
    { source: "api1", target: "lb1" },
    { source: "api2", target: "lb2" },
    // LBs mesh to Servers (full mesh)
    { source: "lb1", target: "s1" },
    { source: "lb1", target: "s2" },
    { source: "lb1", target: "s3" },
    { source: "lb2", target: "s1" },
    { source: "lb2", target: "s2" },
    { source: "lb2", target: "s3" },
    // Servers to Databases (clustered access)
    { source: "s1", target: "db1" },
    { source: "s1", target: "db2" },
    { source: "s2", target: "db1" },
    { source: "s2", target: "db2" },
    { source: "s3", target: "db1" },
    { source: "s3", target: "db2" },
    // Queue with producer and consumer
    { source: "s2", target: "q1" },
    { source: "q1", target: "worker" },
    { source: "worker", target: "db1" },
  ];

  const result = analyzeArchitecture(nodes, edges);

  console.log(`  Identified SPOFs: ${JSON.stringify(result.spofs)}`);
  console.log(`  Findings Count: ${result.findings.length}`);
  console.log(`  Security Score: ${result.scoring.dimensions.security}/10`);
  console.log(`  Reliability Score: ${result.scoring.dimensions.reliability}/10`);
  console.log(`  Scalability Score: ${result.scoring.dimensions.scalability}/10`);

  // An architecture with full redundancy should have NO single-server SPOFs
  assert.equal(result.spofs.includes("s1"), false);
  assert.equal(result.spofs.includes("s2"), false);
  assert.equal(result.spofs.includes("s3"), false);
  assert.equal(result.cycles.length, 0);
  console.log("  ✅ Scenario 3 Verified.\n");
}

console.log("=================================================================");
console.log("🎉 ALL COMPREHENSIVE TEST SUITES PASSED (3/3)");
console.log("=================================================================");

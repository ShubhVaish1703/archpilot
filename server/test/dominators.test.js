/**
 * Unit & Integration Tests for ArchPilot Dominator-Based SPOF Detection
 * Run with: node test/dominators.test.js
 */

import assert from "node:assert/strict";
import { analyzeArchitecture } from "../src/services/engine/index.js";
import * as graphModule from "../src/services/engine/graph.js";

const findSpofs = graphModule.findSpofs;

console.log("🧪 Running ArchPilot Dominator SPOF Detection Tests...\n");

// --- TEST 1: Single Gateway SPOF (Linear Chain) ---
{
  const nodes = [
    { id: "c1", data: { label: "Web Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "App Server", kind: "server" } },
    { id: "db1", data: { label: "Primary DB", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
    { id: "e2", source: "api1", target: "s1", data: { type: "sync" } },
    { id: "e3", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  // api1 and s1 are single points of failure in this linear chain
  assert.ok(result.spofs.includes("api1"), "api1 gateway must be identified as a SPOF");
  assert.ok(result.spofs.includes("s1"), "s1 server must be identified as a SPOF");
  // Entry node c1 must not be classified as a SPOF
  assert.strictEqual(result.spofs.includes("c1"), false, "Entry node c1 must not be a SPOF");

  // Check SPOF_CRITICAL_PATH findings
  const apiFinding = result.findings.find(
    (f) => f.ruleId === "SPOF_CRITICAL_PATH" && f.affectedNodes?.includes("api1")
  );
  assert.ok(apiFinding, "Must emit SPOF_CRITICAL_PATH for api1");
  assert.ok(Array.isArray(apiFinding.dominates), "Finding must include dominates array");
  assert.ok(apiFinding.dominates.includes("s1"), "api1 must dominate s1");
  assert.ok(apiFinding.dominates.includes("db1"), "api1 must dominate db1");
  assert.strictEqual(apiFinding.blastRadius, 2, "api1 blast radius must be 2");
  assert.strictEqual(
    apiFinding.severity,
    "CRITICAL",
    "High blast radius SPOF (ratio 2/4 = 0.5 >= 0.2) must have severity CRITICAL"
  );

  const s1Finding = result.findings.find(
    (f) => f.ruleId === "SPOF_CRITICAL_PATH" && f.affectedNodes?.includes("s1")
  );
  assert.ok(s1Finding, "Must emit SPOF_CRITICAL_PATH for s1");
  assert.ok(s1Finding.dominates.includes("db1"), "s1 must dominate db1");
  assert.strictEqual(s1Finding.blastRadius, 1, "s1 blast radius must be 1");
  assert.strictEqual(
    s1Finding.severity,
    "CRITICAL",
    "High blast radius SPOF (ratio 1/4 = 0.25 >= 0.2) must have severity CRITICAL"
  );

  // Verify severity scaling for low blast radius (< 0.2 ratio -> WARNING):
  // 10-node topology where a leaf server dominates 1 node (ratio 1/10 = 0.1 < 0.2)
  {
    const lowNodes = [
      { id: "c1", data: { label: "Client", kind: "client" } },
      { id: "api1", data: { label: "API 1", kind: "api" } },
      { id: "api2", data: { label: "API 2", kind: "api" } },
      { id: "s1", data: { label: "Server 1", kind: "server" } },
      { id: "s2", data: { label: "Server 2", kind: "server" } },
      { id: "s3", data: { label: "Server 3", kind: "server" } },
      { id: "s4", data: { label: "Server 4", kind: "server" } },
      { id: "s5", data: { label: "Server 5", kind: "server" } },
      { id: "s6", data: { label: "Server 6", kind: "server" } },
      { id: "leaf1", data: { label: "Internal Leaf", kind: "server" } },
    ];
    const lowEdges = [
      { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
      { id: "e2", source: "c1", target: "api2", data: { type: "sync" } },
      { id: "e3", source: "api1", target: "s1", data: { type: "sync" } },
      { id: "e4", source: "api2", target: "s1", data: { type: "sync" } },
      { id: "e5", source: "api1", target: "s2", data: { type: "sync" } },
      { id: "e6", source: "api2", target: "s2", data: { type: "sync" } },
      { id: "e7", source: "s1", target: "s3", data: { type: "sync" } },
      { id: "e8", source: "s2", target: "s3", data: { type: "sync" } },
      { id: "e9", source: "s1", target: "s4", data: { type: "sync" } },
      { id: "e10", source: "s2", target: "s4", data: { type: "sync" } },
      { id: "e11", source: "s1", target: "s5", data: { type: "sync" } },
      { id: "e12", source: "s2", target: "s5", data: { type: "sync" } },
      { id: "e13", source: "s1", target: "s6", data: { type: "sync" } },
      { id: "e14", source: "s2", target: "s6", data: { type: "sync" } },
      { id: "e15", source: "s6", target: "leaf1", data: { type: "sync" } },
    ];
    const lowResult = analyzeArchitecture(lowNodes, lowEdges);
    const s6Finding = lowResult.findings.find(
      (f) => f.ruleId === "SPOF_CRITICAL_PATH" && f.affectedNodes?.includes("s6")
    );
    assert.ok(s6Finding, "s6 must be flagged as a SPOF for leaf1");
    assert.strictEqual(s6Finding.blastRadius, 1, "s6 blast radius must be 1");
    assert.strictEqual(
      s6Finding.severity,
      "WARNING",
      "Low blast radius SPOF (ratio 1/10 = 0.1 < 0.2) must scale severity to WARNING"
    );
  }

  console.log("✅ Test 1 Passed: Single Gateway SPOF correctly detected with blast radius and severity scaling");
}

// --- TEST 2: Two Servers Behind One Load Balancer ---
{
  // Graph: c1 -> api1 -> lb1 -> (s1, s2) -> db1
  // lb1 is a SPOF because removing it cuts off {s1, s2, db1}.
  // s1 and s2 are redundant; removing either leaves the other reachable to reach db1.
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "lb1", data: { label: "Load Balancer", kind: "loadbalancer" } },
    { id: "s1", data: { label: "Server 1", kind: "server" } },
    { id: "s2", data: { label: "Server 2", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
    { id: "e2", source: "api1", target: "lb1", data: { type: "sync" } },
    { id: "e3", source: "lb1", target: "s1", data: { type: "sync" } },
    { id: "e4", source: "lb1", target: "s2", data: { type: "sync" } },
    { id: "e5", source: "s1", target: "db1", data: { type: "sync" } },
    { id: "e6", source: "s2", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  assert.ok(result.spofs.includes("lb1"), "lb1 must be detected as a SPOF");
  assert.strictEqual(result.spofs.includes("s1"), false, "Redundant server s1 must NOT be a SPOF");
  assert.strictEqual(result.spofs.includes("s2"), false, "Redundant server s2 must NOT be a SPOF");

  const lbFinding = result.findings.find(
    (f) => f.ruleId === "SPOF_CRITICAL_PATH" && f.affectedNodes?.includes("lb1")
  );
  assert.ok(lbFinding, "Must emit SPOF finding for lb1");
  assert.strictEqual(lbFinding.blastRadius, 3, "lb1 must dominate 3 nodes (s1, s2, db1)");
  assert.ok(lbFinding.dominates.includes("s1"));
  assert.ok(lbFinding.dominates.includes("s2"));
  assert.ok(lbFinding.dominates.includes("db1"));

  console.log("✅ Test 2 Passed: LB is SPOF, redundant dual servers are not SPOFs");
}

// --- TEST 3: Diamond Graph with No Intermediate SPOF ---
{
  // Graph: c1 -> (api1, api2)
  // Both api1 and api2 connect to both s1 and s2
  // Both s1 and s2 connect to db1
  // Every intermediate stage has dual redundancy; removing any single node leaves the rest reachable.
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API 1", kind: "api" } },
    { id: "api2", data: { label: "API 2", kind: "api" } },
    { id: "s1", data: { label: "Server 1", kind: "server" } },
    { id: "s2", data: { label: "Server 2", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
    { id: "e2", source: "c1", target: "api2", data: { type: "sync" } },
    { id: "e3", source: "api1", target: "s1", data: { type: "sync" } },
    { id: "e4", source: "api1", target: "s2", data: { type: "sync" } },
    { id: "e5", source: "api2", target: "s1", data: { type: "sync" } },
    { id: "e6", source: "api2", target: "s2", data: { type: "sync" } },
    { id: "e7", source: "s1", target: "db1", data: { type: "sync" } },
    { id: "e8", source: "s2", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  assert.strictEqual(result.spofs.length, 0, "Diamond graph must have zero SPOFs");
  assert.strictEqual(result.spofs.includes("api1"), false, "api1 has redundant peer, not a SPOF");
  assert.strictEqual(result.spofs.includes("api2"), false, "api2 has redundant peer, not a SPOF");
  assert.strictEqual(result.spofs.includes("s1"), false, "s1 has redundant peer, not a SPOF");
  assert.strictEqual(result.spofs.includes("s2"), false, "s2 has redundant peer, not a SPOF");

  console.log("✅ Test 3 Passed: Fully redundant diamond topology contains zero intermediate SPOFs");
}

// --- TEST 4: SPOF with Replica (Replication Edges Ignored in Reachability) ---
{
  // Dominator analysis traverses sync and async edges, but MUST ignore replication edges.
  // c1 -> s1 -> db1 (sync)
  // db1 -(replication)-> db_replica
  // Also add an edge c1 -(replication)-> db1: since replication edges are ignored,
  // this edge cannot serve as an alternate request route to bypass s1!
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Primary DB", kind: "database" } },
    { id: "db_rep", data: { label: "Replica DB", kind: "replica" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "s1", target: "db1", data: { type: "sync" } },
    { id: "e3", source: "db1", target: "db_rep", data: { type: "replication" } },
    { id: "e4", source: "c1", target: "db1", data: { type: "replication" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  // s1 must STILL be detected as a SPOF for db1 because replication edges are ignored in reachability
  assert.ok(result.spofs.includes("s1"), "s1 must be detected as SPOF despite replication edge");

  console.log("✅ Test 4 Passed: Replication edges are strictly ignored during dominator reachability");
}

// --- TEST 5: Entry-Point-Only Graph ---
{
  // Graphs consisting solely of entry nodes have no non-entry SPOFs
  const nodes = [
    { id: "c1", data: { label: "Mobile Client", kind: "client" } },
    { id: "c2", data: { label: "Web Client", kind: "client" } },
  ];

  const edges = [];

  const result = analyzeArchitecture(nodes, edges);

  assert.strictEqual(result.spofs.length, 0, "Entry-point-only graph must have zero SPOFs");
  const spofFindings = result.findings.filter((f) => f.ruleId === "SPOF_CRITICAL_PATH");
  assert.strictEqual(spofFindings.length, 0, "No SPOF findings should be emitted");

  console.log("✅ Test 5 Passed: Entry-point-only graph generates zero SPOFs");
}

// --- TEST 6: Dominator Output Schema Validation ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
    { id: "e2", source: "api1", target: "s1", data: { type: "sync" } },
    { id: "e3", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  // Validate findSpofs interface export and returned schema
  assert.strictEqual(
    typeof findSpofs,
    "function",
    "findSpofs must be exported as a function from graph.js"
  );

  const spofs = findSpofs(nodes, edges, ["c1"]);
  assert.ok(Array.isArray(spofs), "findSpofs must return an array");
  assert.ok(spofs.length > 0, "findSpofs must find at least one SPOF");

  for (const item of spofs) {
    assert.strictEqual(typeof item.nodeId, "string", "item.nodeId must be a string");
    assert.strictEqual(typeof item.kind, "string", "item.kind must be a string");
    assert.ok(Array.isArray(item.dominates), "item.dominates must be an array");
    assert.strictEqual(typeof item.blastRadius, "number", "item.blastRadius must be a number");
    assert.strictEqual(
      item.blastRadius,
      item.dominates.length,
      "item.blastRadius must equal dominates.length"
    );
  }

  // Also validate schema inside analyzeArchitecture findings
  const result = analyzeArchitecture(nodes, edges);
  const spofFinding = result.findings.find((f) => f.ruleId === "SPOF_CRITICAL_PATH");
  assert.ok(spofFinding, "SPOF_CRITICAL_PATH finding must exist");
  assert.ok(Array.isArray(spofFinding.dominates), "Finding must have dominates array");
  assert.strictEqual(typeof spofFinding.blastRadius, "number", "Finding must have numeric blastRadius");
  assert.strictEqual(
    spofFinding.blastRadius,
    spofFinding.dominates.length,
    "blastRadius must equal dominates length"
  );

  console.log("✅ Test 6 Passed: Dominator output schema { nodeId, kind, dominates, blastRadius } verified");
}

// --- TEST 7: Gatekeeper Invariant on SPOF Design ---
{
  // Complete connected architecture with SPOFs must maintain COMPLETE_DESIGN mode
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  assert.strictEqual(result.gatekeeper.canGenerateVariants, true, "SPOF design must allow AI variant generation");
  assert.strictEqual(result.gatekeeper.mode, "COMPLETE_DESIGN");
  assert.strictEqual(result.gatekeeper.blockingCount, 0, "SPOFs must not be counted as blocking flaws");
  assert.strictEqual(result.gatekeeper.reason, null);

  console.log("✅ Test 7 Passed: Gatekeeper invariant holds (SPOFs do not block COMPLETE_DESIGN)");
}

console.log("\n🎉 ALL 7 DOMINATOR SPOF TESTS PASSED SUCCESSFULLY!\n");

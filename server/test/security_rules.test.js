/**
 * Unit & Integration Tests for ArchPilot Security & Reliability Rules
 * Run with: node test/security_rules.test.js
 */

import assert from "node:assert/strict";
import { analyzeArchitecture } from "../src/services/engine/index.js";

console.log("🧪 Running ArchPilot Security & Reliability Rules Tests...\n");

// --- TEST 1: Database Without Firewall Flags SEC_DB_NO_FIREWALL ---
{
  // Path: Client -> API Gateway -> Server -> Database (no firewall present)
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

  const result = analyzeArchitecture(nodes, edges);

  const firewallFinding = result.findings.find(
    (f) => f.ruleId === "SEC_DB_NO_FIREWALL"
  );
  assert.ok(
    firewallFinding,
    "Database access without a firewall must flag SEC_DB_NO_FIREWALL"
  );

  console.log("✅ Test 1 Passed: Database without firewall correctly triggers SEC_DB_NO_FIREWALL");
}

// --- TEST 2: Firewall on Every Client-to-DB Path Satisfies Rule ---
{
  // Path: Client -> Firewall -> API Gateway -> Server -> Database
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "fw1", data: { label: "Perimeter Firewall", kind: "firewall" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "fw1", data: { type: "sync" } },
    { id: "e2", source: "fw1", target: "api1", data: { type: "sync" } },
    { id: "e3", source: "api1", target: "s1", data: { type: "sync" } },
    { id: "e4", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const firewallFinding = result.findings.find(
    (f) => f.ruleId === "SEC_DB_NO_FIREWALL"
  );
  assert.strictEqual(
    firewallFinding,
    undefined,
    "Firewall on path to database must satisfy SEC_DB_NO_FIREWALL"
  );

  console.log("✅ Test 2 Passed: Firewall on client-to-DB path cleanly satisfies SEC_DB_NO_FIREWALL");
}

// --- TEST 3: Firewall Bypassed on One Path Flags SEC_DB_NO_FIREWALL ---
{
  // Path A: Client -> Firewall -> Server 1 -> Database (protected)
  // Path B: Client -> Server 2 -> Database (bypasses firewall!)
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "fw1", data: { label: "Firewall", kind: "firewall" } },
    { id: "s1", data: { label: "Protected Server", kind: "server" } },
    { id: "s2", data: { label: "Unprotected Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "fw1", data: { type: "sync" } },
    { id: "e2", source: "fw1", target: "s1", data: { type: "sync" } },
    { id: "e3", source: "s1", target: "db1", data: { type: "sync" } },
    { id: "e4", source: "c1", target: "s2", data: { type: "sync" } },
    { id: "e5", source: "s2", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const firewallFinding = result.findings.find(
    (f) => f.ruleId === "SEC_DB_NO_FIREWALL"
  );
  assert.ok(
    firewallFinding,
    "Firewall must be on EVERY path to DB; bypass path must flag SEC_DB_NO_FIREWALL"
  );

  console.log("✅ Test 3 Passed: Bypassed firewall on alternative path correctly flagged");
}

// --- TEST 4: Direct Client to Server Without Auth or Gateway Flags SEC_NO_AUTH ---
{
  // Client directly connects to server without an intervening auth node or API gateway
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Backend Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const authFinding = result.findings.find(
    (f) => f.ruleId === "SEC_NO_AUTH"
  );
  assert.ok(
    authFinding,
    "Direct client-to-server connection without auth/api gateway must flag SEC_NO_AUTH"
  );

  console.log("✅ Test 4 Passed: Direct client-to-server connection triggers SEC_NO_AUTH");
}

// --- TEST 5: Auth Node on Path Satisfies SEC_NO_AUTH ---
{
  // Client -> Auth Node -> Server -> Database
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "auth1", data: { label: "Auth0 / Keycloak", kind: "auth" } },
    { id: "s1", data: { label: "Backend Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "auth1", data: { type: "sync" } },
    { id: "e2", source: "auth1", target: "s1", data: { type: "sync" } },
    { id: "e3", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const authFinding = result.findings.find(
    (f) => f.ruleId === "SEC_NO_AUTH"
  );
  assert.strictEqual(
    authFinding,
    undefined,
    "Auth node on path between client and server must satisfy SEC_NO_AUTH"
  );

  console.log("✅ Test 5 Passed: Auth node on path satisfies SEC_NO_AUTH");
}

// --- TEST 6: API Gateway on Path Satisfies SEC_NO_AUTH ---
{
  // Client -> API Gateway -> Server -> Database
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "Kong API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Backend Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
    { id: "e2", source: "api1", target: "s1", data: { type: "sync" } },
    { id: "e3", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const authFinding = result.findings.find(
    (f) => f.ruleId === "SEC_NO_AUTH"
  );
  assert.strictEqual(
    authFinding,
    undefined,
    "API Gateway on path between client and server must satisfy SEC_NO_AUTH"
  );

  console.log("✅ Test 6 Passed: API gateway on path satisfies SEC_NO_AUTH");
}

// --- TEST 7: Client-Facing Edge with HTTP or Encrypted: False Triggers SEC_UNENCRYPTED_PATH ---
{
  // 7a: HTTP protocol specified on client edge
  {
    const nodes = [
      { id: "c1", data: { label: "Client", kind: "client" } },
      { id: "api1", data: { label: "API Gateway", kind: "api" } },
      { id: "s1", data: { label: "Server", kind: "server" } },
    ];

    const edges = [
      {
        id: "e1",
        source: "c1",
        target: "api1",
        data: { type: "sync", protocol: "http", encrypted: false },
      },
      { id: "e2", source: "api1", target: "s1", data: { type: "sync" } },
    ];

    const result = analyzeArchitecture(nodes, edges);

    const unencFinding = result.findings.find(
      (f) => f.ruleId === "SEC_UNENCRYPTED_PATH"
    );
    assert.ok(
      unencFinding,
      "Client-facing edge with protocol http must flag SEC_UNENCRYPTED_PATH"
    );
    assert.strictEqual(
      unencFinding.severity,
      "WARNING",
      "SEC_UNENCRYPTED_PATH must have low severity (WARNING)"
    );
  }

  // 7b: Encrypted explicitly false without protocol
  {
    const nodes = [
      { id: "c1", data: { label: "Client", kind: "client" } },
      { id: "api1", data: { label: "API Gateway", kind: "api" } },
    ];

    const edges = [
      {
        id: "e1",
        source: "c1",
        target: "api1",
        data: { type: "sync", encrypted: false },
      },
    ];

    const result = analyzeArchitecture(nodes, edges);

    const unencFinding = result.findings.find(
      (f) => f.ruleId === "SEC_UNENCRYPTED_PATH"
    );
    assert.ok(
      unencFinding,
      "Client-facing edge with encrypted: false must flag SEC_UNENCRYPTED_PATH"
    );
    assert.strictEqual(
      unencFinding.severity,
      "WARNING",
      "SEC_UNENCRYPTED_PATH must have low severity (WARNING)"
    );
  }

  // 7c: HTTP protocol specified with encrypted omitted/undefined (isolating protocol: "http")
  {
    const nodes = [
      { id: "c1", data: { label: "Client", kind: "client" } },
      { id: "api1", data: { label: "API Gateway", kind: "api" } },
    ];

    const edges = [
      {
        id: "e1",
        source: "c1",
        target: "api1",
        data: { type: "sync", protocol: "http" }, // encrypted omitted/undefined
      },
    ];

    const result = analyzeArchitecture(nodes, edges);

    const unencFinding = result.findings.find(
      (f) => f.ruleId === "SEC_UNENCRYPTED_PATH"
    );
    assert.ok(
      unencFinding,
      "Client-facing edge with protocol: 'http' and undefined encryption must flag SEC_UNENCRYPTED_PATH"
    );
    assert.strictEqual(
      unencFinding.severity,
      "WARNING",
      "SEC_UNENCRYPTED_PATH must have low severity (WARNING)"
    );
  }

  console.log("✅ Test 7 Passed: Client-facing edge with HTTP or encrypted:false triggers SEC_UNENCRYPTED_PATH (subtests 7a, 7b, 7c)");
}

// --- TEST 8: Client-Facing Edge with Protocol Unset Skips SEC_UNENCRYPTED_PATH ---
{
  // Edge has no protocol specified and encrypted is not explicitly false
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
    { id: "e2", source: "api1", target: "s1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const unencFinding = result.findings.find(
    (f) => f.ruleId === "SEC_UNENCRYPTED_PATH"
  );
  assert.strictEqual(
    unencFinding,
    undefined,
    "Client-facing edge with protocol unset must skip SEC_UNENCRYPTED_PATH"
  );

  console.log("✅ Test 8 Passed: Client-facing edge with protocol unset skips SEC_UNENCRYPTED_PATH");
}

// --- TEST 9: Client-Facing Edge with HTTPS and Encrypted: True Passes ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
  ];

  const edges = [
    {
      id: "e1",
      source: "c1",
      target: "api1",
      data: { type: "sync", protocol: "https", encrypted: true },
    },
    { id: "e2", source: "api1", target: "s1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const unencFinding = result.findings.find(
    (f) => f.ruleId === "SEC_UNENCRYPTED_PATH"
  );
  assert.strictEqual(
    unencFinding,
    undefined,
    "Client-facing edge with HTTPS and encrypted:true must pass"
  );

  console.log("✅ Test 9 Passed: Client-facing edge with HTTPS and encryption passes cleanly");
}

// --- TEST 10: Database on Critical Path Without Replica Triggers REL_DB_NO_REPLICA ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Postgres Primary", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
    { id: "e2", source: "api1", target: "s1", data: { type: "sync" } },
    { id: "e3", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const replicaFinding = result.findings.find(
    (f) => f.ruleId === "REL_DB_NO_REPLICA"
  );
  assert.ok(
    replicaFinding,
    "Database on critical path without replica must trigger REL_DB_NO_REPLICA"
  );
  assert.ok(
    replicaFinding.affectedNodes?.includes("db1"),
    "Affected nodes must include database db1"
  );

  console.log("✅ Test 10 Passed: Database without replica triggers REL_DB_NO_REPLICA");
}

// --- TEST 11: Database with Replica on Replication Edge Satisfies REL_DB_NO_REPLICA ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "api1", data: { label: "API Gateway", kind: "api" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Postgres Primary", kind: "database" } },
    { id: "db_rep", data: { label: "Postgres Read Replica", kind: "replica" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "api1", data: { type: "sync" } },
    { id: "e2", source: "api1", target: "s1", data: { type: "sync" } },
    { id: "e3", source: "s1", target: "db1", data: { type: "sync" } },
    {
      id: "e4",
      source: "db1",
      target: "db_rep",
      data: { type: "replication" },
    },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const replicaFinding = result.findings.find(
    (f) => f.ruleId === "REL_DB_NO_REPLICA"
  );
  assert.strictEqual(
    replicaFinding,
    undefined,
    "Database with replica connected via replication edge must satisfy REL_DB_NO_REPLICA"
  );

  console.log("✅ Test 11 Passed: Database with replication-edge replica satisfies REL_DB_NO_REPLICA");
}

// --- TEST 12: Database with Replica on Sync Edge Still Triggers REL_DB_NO_REPLICA ---
{
  // If the replica is mistakenly connected via a sync edge instead of a replication edge,
  // it does not provide true asynchronous/replication-tier redundancy
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Postgres Primary", kind: "database" } },
    { id: "db_rep", data: { label: "Replica Node", kind: "replica" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "s1", target: "db1", data: { type: "sync" } },
    {
      id: "e3",
      source: "db1",
      target: "db_rep",
      data: { type: "sync" }, // incorrect edge type
    },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const replicaFinding = result.findings.find(
    (f) => f.ruleId === "REL_DB_NO_REPLICA"
  );
  assert.ok(
    replicaFinding,
    "Replica connected with sync edge instead of replication edge must still flag REL_DB_NO_REPLICA"
  );

  console.log("✅ Test 12 Passed: Non-replication edge to replica correctly flags REL_DB_NO_REPLICA");
}

// --- TEST 13: Multi-Server LB Protection with DNS & CDN Pass-Through ---
{
  // 13a: DNS and CDN pass-through WITH Load Balancer -> UNDER_NO_LB_MULTI_SERVER must NOT be flagged
  {
    const nodes = [
      { id: "c1", data: { label: "Client", kind: "client" } },
      { id: "dns1", data: { label: "Route 53", kind: "dns" } },
      { id: "cdn1", data: { label: "Cloudflare", kind: "cdn" } },
      { id: "lb1", data: { label: "ALB", kind: "loadbalancer" } },
      { id: "s1", data: { label: "App Server 1", kind: "server" } },
      { id: "s2", data: { label: "App Server 2", kind: "server" } },
      { id: "db1", data: { label: "Database", kind: "database" } },
    ];

    const edges = [
      { id: "e1", source: "c1", target: "dns1", data: { type: "sync" } },
      { id: "e2", source: "dns1", target: "cdn1", data: { type: "sync" } },
      { id: "e3", source: "cdn1", target: "lb1", data: { type: "sync" } },
      { id: "e4", source: "lb1", target: "s1", data: { type: "sync" } },
      { id: "e5", source: "lb1", target: "s2", data: { type: "sync" } },
      { id: "e6", source: "s1", target: "db1", data: { type: "sync" } },
      { id: "e7", source: "s2", target: "db1", data: { type: "sync" } },
    ];

    const result = analyzeArchitecture(nodes, edges);

    const noLbFinding = result.findings.find(
      (f) => f.ruleId === "UNDER_NO_LB_MULTI_SERVER"
    );
    assert.strictEqual(
      noLbFinding,
      undefined,
      "Pass-through DNS/CDN before LB must NOT trigger UNDER_NO_LB_MULTI_SERVER"
    );
  }

  // 13b: DNS and CDN pass-through WITHOUT Load Balancer -> UNDER_NO_LB_MULTI_SERVER MUST be flagged
  {
    const nodes = [
      { id: "c1", data: { label: "Client", kind: "client" } },
      { id: "dns1", data: { label: "Route 53", kind: "dns" } },
      { id: "cdn1", data: { label: "Cloudflare", kind: "cdn" } },
      { id: "s1", data: { label: "App Server 1", kind: "server" } },
      { id: "s2", data: { label: "App Server 2", kind: "server" } },
      { id: "db1", data: { label: "Database", kind: "database" } },
    ];

    const edges = [
      { id: "e1", source: "c1", target: "dns1", data: { type: "sync" } },
      { id: "e2", source: "dns1", target: "cdn1", data: { type: "sync" } },
      { id: "e3", source: "cdn1", target: "s1", data: { type: "sync" } },
      { id: "e4", source: "cdn1", target: "s2", data: { type: "sync" } },
      { id: "e5", source: "s1", target: "db1", data: { type: "sync" } },
      { id: "e6", source: "s2", target: "db1", data: { type: "sync" } },
    ];

    const result = analyzeArchitecture(nodes, edges);

    const noLbFinding = result.findings.find(
      (f) => f.ruleId === "UNDER_NO_LB_MULTI_SERVER"
    );
    assert.ok(
      noLbFinding,
      "Multi-server topology without LB must flag UNDER_NO_LB_MULTI_SERVER even with DNS/CDN"
    );
  }

  console.log("✅ Test 13 Passed: Multi-server LB protection functions correctly with DNS & CDN");
}

// --- TEST 14: Gatekeeper Invariant on Security & Replica Violations ---
{
  // An architecture with security issues (missing firewall, unencrypted HTTP, missing replica)
  // remains a COMPLETE_DESIGN for AI generation purposes.
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "db1", data: { label: "Database", kind: "database" } },
  ];

  const edges = [
    {
      id: "e1",
      source: "c1",
      target: "s1",
      data: { type: "sync", protocol: "http", encrypted: false },
    },
    { id: "e2", source: "s1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  assert.strictEqual(
    result.gatekeeper.canGenerateVariants,
    true,
    "Connected design with security findings must maintain canGenerateVariants = true"
  );
  assert.strictEqual(
    result.gatekeeper.mode,
    "COMPLETE_DESIGN",
    "Connected design with security findings must maintain COMPLETE_DESIGN mode"
  );
  assert.strictEqual(
    result.gatekeeper.blockingCount,
    0,
    "Security findings are optimization warnings, not structural blockers"
  );

  console.log("✅ Test 14 Passed: Gatekeeper invariant holds for security and reliability findings");
}

console.log("\n🎉 ALL 14 SECURITY & RELIABILITY RULES TESTS PASSED SUCCESSFULLY!\n");

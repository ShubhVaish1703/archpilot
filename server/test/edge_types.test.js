/**
 * Unit & Integration Tests for ArchPilot Edge Types & Semantic Rules
 * Run with: node test/edge_types.test.js
 */

import assert from "node:assert/strict";
import { analyzeArchitecture } from "../src/services/engine/index.js";

console.log("🧪 Running ArchPilot Edge Types & Semantic Rules Tests...\n");

// --- TEST 1: Synchronous Cycle Flagged (REL_CIRCULAR_DEPENDENCY) ---
{
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server 1", kind: "server" } },
    { id: "s2", data: { label: "Server 2", kind: "server" } },
    { id: "s3", data: { label: "Server 3", kind: "server" } },
  ];

  const edges = [
    { id: "e0", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e1", source: "s1", target: "s2", data: { type: "sync" } },
    { id: "e2", source: "s2", target: "s3", data: { type: "sync" } },
    { id: "e3", source: "s3", target: "s1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const cycleFinding = result.findings.find(
    (f) => f.ruleId === "REL_CIRCULAR_DEPENDENCY"
  );
  assert.ok(cycleFinding, "Synchronous circular loop must trigger REL_CIRCULAR_DEPENDENCY");
  assert.ok(result.cycles.length > 0, "Directed sync cycles array must be non-empty");

  console.log("✅ Test 1 Passed: Synchronous cycle flagged with REL_CIRCULAR_DEPENDENCY");
}

// --- TEST 2: Asynchronous Loop NOT Flagged (REL_CIRCULAR_DEPENDENCY) ---
{
  // Graph: c1 -> s1 -(sync)-> s2 -(async)-> s3 -(sync)-> s1
  // Because the loop passes through an async edge (e.g. event notification),
  // it does not constitute a blocking synchronous circular dependency.
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server 1", kind: "server" } },
    { id: "s2", data: { label: "Server 2", kind: "server" } },
    { id: "s3", data: { label: "Server 3", kind: "server" } },
  ];

  const edges = [
    { id: "e0", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e1", source: "s1", target: "s2", data: { type: "sync" } },
    { id: "e2", source: "s2", target: "s3", data: { type: "async" } },
    { id: "e3", source: "s3", target: "s1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const cycleFinding = result.findings.find(
    (f) => f.ruleId === "REL_CIRCULAR_DEPENDENCY"
  );
  assert.strictEqual(
    cycleFinding,
    undefined,
    "Asynchronous loop must NOT trigger REL_CIRCULAR_DEPENDENCY"
  );
  assert.strictEqual(
    result.cycles.length,
    0,
    "Cycles list must be empty when loop contains an async edge"
  );

  console.log("✅ Test 2 Passed: Asynchronous loop correctly ignored by cycle detection");
}

// --- TEST 3: Queue with Async Producer and Async Worker Consumer Passes ---
{
  // Producer: Server -(async)-> Queue -(async)-> Worker
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "App Server", kind: "server" } },
    { id: "q1", data: { label: "Job Queue", kind: "queue" } },
    { id: "w1", data: { label: "Background Worker", kind: "worker" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "s1", target: "q1", data: { type: "async" } },
    { id: "e3", source: "q1", target: "w1", data: { type: "async" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const missingConsumer = result.findings.find(
    (f) => f.ruleId === "REL_QUEUE_NO_CONSUMER"
  );
  const missingPublisher = result.findings.find(
    (f) => f.ruleId === "REL_QUEUE_NO_PUBLISHER"
  );

  assert.strictEqual(
    missingConsumer,
    undefined,
    "Worker consumer on async edge must satisfy REL_QUEUE_NO_CONSUMER"
  );
  assert.strictEqual(
    missingPublisher,
    undefined,
    "Server publisher on async edge must satisfy REL_QUEUE_NO_PUBLISHER"
  );

  console.log("✅ Test 3 Passed: Queue with async publisher and worker consumer passes cleanly");
}

// --- TEST 4: Queue with Async Server Consumer Passes ---
{
  // Server is also a recognized valid consumer alongside worker
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Publisher Server", kind: "server" } },
    { id: "q1", data: { label: "Event Queue", kind: "queue" } },
    { id: "s2", data: { label: "Consumer Server", kind: "server" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "s1", target: "q1", data: { type: "async" } },
    { id: "e3", source: "q1", target: "s2", data: { type: "async" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const missingConsumer = result.findings.find(
    (f) => f.ruleId === "REL_QUEUE_NO_CONSUMER"
  );
  assert.strictEqual(
    missingConsumer,
    undefined,
    "Server consumer on async edge must satisfy REL_QUEUE_NO_CONSUMER"
  );

  console.log("✅ Test 4 Passed: Queue with async server consumer passes cleanly");
}

// --- TEST 5: Queue with Missing Consumer Flagged ---
{
  // Server publishes to queue, but queue has no consumers
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "q1", data: { label: "Orphaned Queue", kind: "queue" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "s1", target: "q1", data: { type: "async" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const missingConsumer = result.findings.find(
    (f) => f.ruleId === "REL_QUEUE_NO_CONSUMER"
  );
  assert.ok(missingConsumer, "Queue without consumers must flag REL_QUEUE_NO_CONSUMER");
  assert.ok(
    missingConsumer.affectedNodes?.includes("q1"),
    "Affected nodes must include unconsumed queue"
  );

  console.log("✅ Test 5 Passed: Queue with missing consumer correctly flagged");
}

// --- TEST 6: Queue with Missing Publisher Flagged ---
{
  // Worker consumes from queue, but no server or service publishes to queue
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server", kind: "server" } },
    { id: "q1", data: { label: "Unproduced Queue", kind: "queue" } },
    { id: "w1", data: { label: "Worker", kind: "worker" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "q1", target: "w1", data: { type: "async" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  const missingPublisher = result.findings.find(
    (f) => f.ruleId === "REL_QUEUE_NO_PUBLISHER"
  );
  assert.ok(missingPublisher, "Queue without publisher must flag REL_QUEUE_NO_PUBLISHER");
  assert.ok(
    missingPublisher.affectedNodes?.includes("q1"),
    "Affected nodes must include unproduced queue"
  );

  console.log("✅ Test 6 Passed: Queue with missing publisher correctly flagged");
}

// --- TEST 7: Legacy Untyped Edges Default to Sync (Cycle Flagged, No Crash) ---
{
  // Edges omit `data` or `data.type`, simulating legacy architecture.json payload
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Server 1", kind: "server" } },
    { id: "s2", data: { label: "Server 2", kind: "server" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1" }, // no data
    { id: "e2", source: "s1", target: "s2" }, // no data
    { id: "e3", source: "s2", target: "s1" }, // no data
  ];

  // Must not throw TypeError: Cannot read property of undefined
  let result;
  assert.doesNotThrow(() => {
    result = analyzeArchitecture(nodes, edges);
  }, "Engine must tolerate legacy edges without data.type");

  assert.ok(result, "Result must be produced for legacy graph");
  // Since untyped edges default to sync, s1 <-> s2 forms a synchronous cycle
  const cycleFinding = result.findings.find(
    (f) => f.ruleId === "REL_CIRCULAR_DEPENDENCY"
  );
  assert.ok(
    cycleFinding,
    "Legacy untyped edges must default to sync and flag REL_CIRCULAR_DEPENDENCY"
  );

  console.log("✅ Test 7 Passed: Legacy untyped edges safely default to sync and detect cycles");
}

// --- TEST 8: Gatekeeper Invariant on Event-Driven Architecture ---
{
  // Valid event-driven architecture with queues and workers
  const nodes = [
    { id: "c1", data: { label: "Client", kind: "client" } },
    { id: "s1", data: { label: "Ingest Server", kind: "server" } },
    { id: "q1", data: { label: "Events", kind: "queue" } },
    { id: "w1", data: { label: "Worker", kind: "worker" } },
    { id: "db1", data: { label: "Storage DB", kind: "database" } },
  ];

  const edges = [
    { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
    { id: "e2", source: "s1", target: "q1", data: { type: "async" } },
    { id: "e3", source: "q1", target: "w1", data: { type: "async" } },
    { id: "e4", source: "w1", target: "db1", data: { type: "sync" } },
  ];

  const result = analyzeArchitecture(nodes, edges);

  assert.strictEqual(result.gatekeeper.canGenerateVariants, true);
  assert.strictEqual(result.gatekeeper.mode, "COMPLETE_DESIGN");
  assert.strictEqual(result.gatekeeper.blockingCount, 0);

  console.log("✅ Test 8 Passed: Gatekeeper invariant holds for event-driven architecture");
}

// --- TEST 9: Sync Edges to Queue Flag Missing Producer / Consumer ---
{
  // 9a: Producer connects to queue with sync edge, but no consumer exists
  // Connecting a producer via sync edge must still trigger REL_QUEUE_NO_CONSUMER
  {
    const nodes = [
      { id: "c1", data: { label: "Client", kind: "client" } },
      { id: "s1", data: { label: "Server", kind: "server" } },
      { id: "q1", data: { label: "Queue", kind: "queue" } },
    ];
    const edges = [
      { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
      { id: "e2", source: "s1", target: "q1", data: { type: "sync" } },
    ];
    const result = analyzeArchitecture(nodes, edges);
    const missingConsumer = result.findings.find(
      (f) => f.ruleId === "REL_QUEUE_NO_CONSUMER"
    );
    assert.ok(
      missingConsumer,
      "Queue with synchronous producer and missing consumer must flag REL_QUEUE_NO_CONSUMER"
    );
    assert.ok(
      missingConsumer.affectedNodes?.includes("q1"),
      "Affected nodes must include queue q1"
    );
  }

  // 9b: Worker connects to queue with sync edge, but no producer exists
  // Connecting a worker via sync edge must still trigger REL_QUEUE_NO_PUBLISHER
  {
    const nodes = [
      { id: "c1", data: { label: "Client", kind: "client" } },
      { id: "s1", data: { label: "Server", kind: "server" } },
      { id: "q1", data: { label: "Queue", kind: "queue" } },
      { id: "w1", data: { label: "Worker", kind: "worker" } },
    ];
    const edges = [
      { id: "e1", source: "c1", target: "s1", data: { type: "sync" } },
      { id: "e2", source: "q1", target: "w1", data: { type: "sync" } },
    ];
    const result = analyzeArchitecture(nodes, edges);
    const missingPublisher = result.findings.find(
      (f) => f.ruleId === "REL_QUEUE_NO_PUBLISHER"
    );
    assert.ok(
      missingPublisher,
      "Queue with synchronous worker and missing publisher must flag REL_QUEUE_NO_PUBLISHER"
    );
    assert.ok(
      missingPublisher.affectedNodes?.includes("q1"),
      "Affected nodes must include queue q1"
    );
  }

  console.log("✅ Test 9 Passed: Queue with synchronous edges correctly flags missing producer/consumer");
}

console.log("\n🎉 ALL 9 EDGE TYPES & SEMANTIC TESTS PASSED SUCCESSFULLY!\n");

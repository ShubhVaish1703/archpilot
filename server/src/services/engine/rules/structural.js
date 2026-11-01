/**
 * ArchPilot Structural Anti-Pattern Rules Engine (Phase 2)
 *
 * All rules execute in a single linear pass by reading precomputed facts
 * from GraphProfile. No graph traversals or DFS algorithms run in this layer.
 */

/**
 * Evaluates structural rules against the compiled GraphProfile.
 *
 * @param {Object} profile Precomputed graph facts from buildGraphProfile()
 * @returns {Array} List of architectural findings
 */
export function runStructuralRules(profile) {
  const findings = [];
  const { nodeMap } = profile;

  // Helper to format node labels
  const labelOf = (id) => nodeMap.get(id)?.data?.label || id;
  const kindOf = (id) => nodeMap.get(id)?.data?.kind || "component";

  // 1. TOPO_ORPHAN_NODE: Completely isolated components
  for (const orphanId of profile.orphanNodes) {
    findings.push({
      ruleId: "TOPO_ORPHAN_NODE",
      severity: "WARNING",
      title: "Disconnected Orphan Component",
      description: `Component "${labelOf(orphanId)}" (${kindOf(orphanId)}) has no incoming or outgoing connections. It is completely isolated and serves no role in the active system design.`,
      affectedNodes: [orphanId],
      remediation: "Connect this component to the architecture flow or remove it from the canvas.",
    });
  }

  // 2. TOPO_DISCONNECTED_SUBGRAPH: Fragmented architecture clusters
  if (profile.multiNodeComponents.length > 1) {
    const clusterSummaries = profile.multiNodeComponents.map(
      (comp, idx) => `Cluster ${idx + 1}: [${comp.map(labelOf).join(", ")}]`
    );
    findings.push({
      ruleId: "TOPO_DISCONNECTED_SUBGRAPH",
      severity: "CRITICAL",
      title: "Disconnected Subgraph Islands",
      description: `The architecture is split into ${profile.multiNodeComponents.length} disconnected islands that cannot communicate with each other: ${clusterSummaries.join(" | ")}.`,
      affectedNodes: profile.multiNodeComponents.flat(),
      remediation: "Bridge the isolated clusters with appropriate network or service connections.",
    });
  }

  // 3. TOPO_NO_ENTRY_POINT: No Client or API Gateway
  if (profile.noEntryPoint) {
    findings.push({
      ruleId: "TOPO_NO_ENTRY_POINT",
      severity: "WARNING",
      title: "Missing Traffic Entry Point",
      description: "Architecture contains backend infrastructure but lacks a Client or API Gateway to accept user requests.",
      affectedNodes: [],
      remediation: "Add a Client or API Gateway component to define how external traffic enters your system.",
    });
  }

  // 4. TOPO_UNREACHABLE_FROM_ENTRY: Nodes unreachable from any client or gateway
  for (const unreachId of profile.unreachableNodes) {
    // If it's already an orphan, avoid redundant double reporting
    if (profile.orphanNodes.includes(unreachId)) continue;
    findings.push({
      ruleId: "TOPO_UNREACHABLE_FROM_ENTRY",
      severity: "WARNING",
      title: "Unreachable Backend Infrastructure",
      description: `Component "${labelOf(unreachId)}" (${kindOf(unreachId)}) cannot be reached via any directed request path from clients or entry gateways.`,
      affectedNodes: [unreachId],
      remediation: "Ensure there is a valid upstream request chain directing traffic to this component.",
    });
  }

  // 5. TOPO_DEAD_END_SERVER: Server with input traffic but no egress/persistence
  for (const srvId of profile.deadEndServers) {
    findings.push({
      ruleId: "TOPO_DEAD_END_SERVER",
      severity: "WARNING",
      title: "Dead-End Application Server",
      description: `App Server "${labelOf(srvId)}" receives requests but has zero outbound connections to databases, caches, message queues, or downstream services.`,
      affectedNodes: [srvId],
      remediation: "Connect this server to a database, cache, or downstream service to persist or forward results.",
    });
  }

  // 6. TOPO_DB_UNREACHABLE: Data store with no compute writer
  for (const dbId of profile.dbsWithNoServerInput) {
    // Skip if it's already an orphan or completely unreachable
    if (profile.orphanNodes.includes(dbId)) continue;
    findings.push({
      ruleId: "TOPO_DB_UNREACHABLE",
      severity: "WARNING",
      title: "Data Store Lacks Compute Access",
      description: `Data store "${labelOf(dbId)}" (${kindOf(dbId)}) has no incoming connection from an application server or cache. Data cannot be read or written.`,
      affectedNodes: [dbId],
      remediation: "Connect an application server or worker service to read/write to this data store.",
    });
  }

  // 7. SEC_CLIENT_DIRECT_DB: Client directly accesses Database or Storage
  for (const edge of profile.directClientToDbEdges) {
    findings.push({
      ruleId: "SEC_CLIENT_DIRECT_DB",
      severity: "CRITICAL",
      title: "Client Directly Accesses Data Store",
      description: `Client "${labelOf(edge.source)}" directly connects to ${kindOf(edge.target)} "${labelOf(edge.target)}". This bypasses authentication, validation, and exposes private data stores to the public network.`,
      affectedNodes: [edge.source, edge.target],
      remediation: "Remove the direct connection and route all queries through an API Gateway or App Server.",
    });
  }

  // 8. SEC_NO_AUTH: Client directly connects to Server without Gateway
  for (const edge of profile.directClientToServerEdges) {
    findings.push({
      ruleId: "SEC_NO_AUTH",
      severity: "WARNING",
      title: "Missing API Gateway / Auth Boundary",
      description: `Client "${labelOf(edge.source)}" connects directly to App Server "${labelOf(edge.target)}" without an API Gateway for centralized authentication, SSL termination, and rate limiting.`,
      affectedNodes: [edge.source, edge.target],
      remediation: "Insert an API Gateway between the client and application servers.",
    });
  }

  // 9. SEC_DB_NO_FIREWALL: Database directly exposed to Edge / API
  for (const edge of profile.dbExposedToEdgeEdges) {
    if (kindOf(edge.source) === "client") continue; // already covered by SEC_CLIENT_DIRECT_DB
    findings.push({
      ruleId: "SEC_DB_NO_FIREWALL",
      severity: "WARNING",
      title: "Database Exposed to Edge Layer",
      description: `Database "${labelOf(edge.target)}" is directly queried by edge component "${labelOf(edge.source)}". Databases should reside in private subnets and be accessed only by backend application servers.`,
      affectedNodes: [edge.source, edge.target],
      remediation: "Place backend application servers between the edge layer and database.",
    });
  }

  // 10. SPOF_CRITICAL_PATH: Articulation point on critical path
  for (const spofId of profile.criticalPathSPOFs) {
    findings.push({
      ruleId: "SPOF_CRITICAL_PATH",
      severity: "CRITICAL",
      title: "Single Point of Failure (SPOF)",
      description: `Component "${labelOf(spofId)}" (${kindOf(spofId)}) is a critical articulation point. Its outage completely severs client traffic from backend data persistence.`,
      affectedNodes: [spofId],
      remediation: "Provide redundant instances behind a load balancer or configure active-passive replication.",
    });
  }

  // 11. REL_CIRCULAR_DEPENDENCY: Directed cycles between services
  for (const cycle of profile.directedCycles) {
    const readableNames = cycle.map(labelOf);
    findings.push({
      ruleId: "REL_CIRCULAR_DEPENDENCY",
      severity: "CRITICAL",
      title: "Circular Dependency Detected",
      description: `Cyclic dependency chain detected: ${readableNames.join(" -> ")}. Circular synchronous calls trigger deadlocks, resource exhaustion, and cascading outages.`,
      affectedNodes: Array.from(new Set(cycle)),
      remediation: "Break the cycle by re-architecting service responsibilities or introducing an asynchronous message queue.",
    });
  }

  // 12. REL_QUEUE_NO_CONSUMER: Message Queue without consumer
  for (const qId of profile.unconsumedQueues) {
    findings.push({
      ruleId: "REL_QUEUE_NO_CONSUMER",
      severity: "WARNING",
      title: "Message Queue Without Consumer",
      description: `Queue "${labelOf(qId)}" receives messages from upstream producers but has no consumer workers connected. Messages will accumulate and exhaust storage.`,
      affectedNodes: [qId],
      remediation: "Attach a worker service or consumer pool to pull and process messages from this queue.",
    });
  }

  // 13. REL_QUEUE_NO_PUBLISHER: Message Queue without producer
  for (const qId of profile.unproducedQueues) {
    findings.push({
      ruleId: "REL_QUEUE_NO_PUBLISHER",
      severity: "WARNING",
      title: "Message Queue Without Publisher",
      description: `Queue "${labelOf(qId)}" has consumer workers waiting, but no upstream producer is publishing tasks to it.`,
      affectedNodes: [qId],
      remediation: "Connect an upstream producer service to push tasks to this queue.",
    });
  }

  // 14. UNDER_NO_LB_MULTI_SERVER: Multiple Servers without Load Balancer
  if (profile.multipleServersNoLb) {
    findings.push({
      ruleId: "UNDER_NO_LB_MULTI_SERVER",
      severity: "WARNING",
      title: "Multiple Servers Without Load Balancer",
      description: `Architecture has ${profile.byKind.server.length} App Servers but no Load Balancer. Without a load balancer, client traffic cannot be evenly distributed or failover seamlessly.`,
      affectedNodes: profile.byKind.server.map((s) => s.id),
      remediation: "Add a Load Balancer upstream of the application servers to balance traffic.",
    });
  }

  // 15. REL_LB_SINGLE_TARGET: Load Balancer routing to only 1 server
  for (const lbId of profile.lbsWithSingleTarget) {
    findings.push({
      ruleId: "REL_LB_SINGLE_TARGET",
      severity: "INFO",
      title: "Load Balancer With Single Target",
      description: `Load Balancer "${labelOf(lbId)}" routes to only one backend target. Without multiple backend instances, the load balancer adds network hops without providing redundancy.`,
      affectedNodes: [lbId],
      remediation: "Add additional backend server instances to benefit from load balancing and failover.",
    });
  }

  // 16. REL_CACHE_WITHOUT_DB: Cache without Database backing
  for (const cacheId of profile.cachesWithoutDB) {
    findings.push({
      ruleId: "REL_CACHE_WITHOUT_DB",
      severity: "WARNING",
      title: "Cache Without Persistent Data Store",
      description: `Cache "${labelOf(cacheId)}" is configured without a persistent database or storage backing it. Caches are volatile and will lose data upon eviction or restart.`,
      affectedNodes: [cacheId],
      remediation: "Ensure the cache fronts a persistent database to handle cache misses and eviction.",
    });
  }

  // 17. WRONG_FLOW_REVERSED: Database/Storage initiating connection to compute/client
  for (const edge of profile.reversedFlowEdges) {
    findings.push({
      ruleId: "WRONG_FLOW_REVERSED",
      severity: "WARNING",
      title: "Reversed Storage Connection Flow",
      description: `${kindOf(edge.source)} "${labelOf(edge.source)}" is drawn initiating an outbound connection to "${labelOf(edge.target)}". Data stores are passive listeners and should not initiate connections to compute or clients.`,
      affectedNodes: [edge.source, edge.target],
      remediation: "Reverse the direction of the arrow so compute/client connects to the database.",
    });
  }

  // 18. UNNECESSARY_CONNECTION: Redundant transit bypass
  for (const bypass of profile.bypassEdges) {
    findings.push({
      ruleId: "UNNECESSARY_CONNECTION",
      severity: "INFO",
      title: "Redundant Bypass Connection",
      description: `"${labelOf(bypass.source)}" connects to "${labelOf(bypass.target)}" both directly and indirectly through "${labelOf(bypass.via)}". This creates an unnecessary architectural bypass.`,
      affectedNodes: [bypass.source, bypass.via, bypass.target],
      remediation: "Remove the direct connection and route traffic through the intermediate proxy/gateway.",
    });
  }

  return findings;
}

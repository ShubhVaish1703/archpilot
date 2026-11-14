/**
 * ArchPilot Graph Traversal & Topological Profiling Engine
 *
 * Implements a consolidated Two-Phase Pipeline:
 * Phase 1: buildGraphProfile(nodes, edges) computes all structural and topological
 *          facts into an immutable GraphProfile object in minimal passes.
 * Phase 2: Rules read directly from GraphProfile facts without re-traversing the graph.
 */

/**
 * Normalizes an edge ensuring safe defaults and canonical casing for attributes.
 */
export function normalizeEdge(edge) {
  const hasExplicitType = Boolean(edge?.data?.type);
  const rawType = edge?.data?.type
    ? String(edge.data.type).trim().toLowerCase()
    : "sync";
  const type = rawType || "sync";
  const rawProto = edge?.data?.protocol
    ? String(edge.data.protocol).trim().toLowerCase()
    : undefined;
  const protocol = rawProto || undefined;

  return {
    ...edge,
    data: {
      ...edge?.data,
      type,
      protocol,
      encrypted:
        typeof edge?.data?.encrypted === "boolean" ? edge.data.encrypted : undefined,
      _defaultedType: !hasExplicitType,
    },
  };
}

/**
 * Builds directed, reverse, undirected, and synchronous adjacency structures
 * from React Flow nodes and edges.
 */
export function buildGraph(nodes = [], edges = []) {
  const nodeMap = new Map();
  const adj = new Map();
  const adjSync = new Map();
  const revAdj = new Map();
  const undirectedAdj = new Map();
  const inDegree = new Map();
  const outDegree = new Map();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    adj.set(node.id, new Set());
    adjSync.set(node.id, new Set());
    revAdj.set(node.id, new Set());
    undirectedAdj.set(node.id, new Set());
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  const normalizedEdges = edges.map(normalizeEdge);

  for (const edge of normalizedEdges) {
    const { source, target } = edge;
    // Guard against dangling edges referencing non-existent nodes
    if (!nodeMap.has(source) || !nodeMap.has(target)) continue;
    if (source === target) continue; // self-loop handled separately

    const edgeType = edge.data?.type || "sync";

    if (!adj.get(source).has(target)) {
      adj.get(source).add(target);
      revAdj.get(target).add(source);
      undirectedAdj.get(source).add(target);
      undirectedAdj.get(target).add(source);
      outDegree.set(source, (outDegree.get(source) || 0) + 1);
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }

    if (edgeType === "sync") {
      adjSync.get(source).add(target);
    }
  }

  return {
    nodes,
    edges: normalizedEdges,
    nodeMap,
    adj,
    adjSync,
    revAdj,
    undirectedAdj,
    inDegree,
    outDegree,
  };
}

/**
 * Computes dominator-based Single Points of Failure (SPOFs) from entry points.
 *
 * Traversal semantics:
 * - Traversable edges: sync and async edges (missing type defaults to sync)
 * - Ignored edges: replication edges
 *
 * Algorithm:
 * 1. Identify entry points (entryIds, or client nodes, or fallback to api/dns/cdn, or in-degree 0).
 * 2. Compute initial reachable set R_entry from entry points along traversable directed edges.
 * 3. For each non-entry node N in R_entry:
 *    a. Temporarily remove N from the graph.
 *    b. Compute R_{-N} (reachable set from entry points without N).
 *    c. Dominated nodes D(N) = { u in R_entry \ {N} | u not in R_{-N} }.
 *    d. If N dominates downstream nodes (|D(N)| > 0), N is a SPOF.
 *
 * @param {Array} nodes React Flow nodes
 * @param {Array} edges React Flow edges
 * @param {Array|Set} [entryIds=[]] Explicit entry point node IDs
 * @returns {Array<Object>} SPOF objects: { nodeId, kind, dominates, blastRadius }
 */
export function findSpofs(nodes = [], edges = [], entryIds = []) {
  const nodeMap = new Map();
  for (const n of nodes) {
    if (n && n.id) nodeMap.set(n.id, n);
  }

  if (nodeMap.size === 0) return [];

  const normalizedEdges = (edges || []).map(normalizeEdge);

  // Normalize entryIds if a Set or Array was passed
  const rawEntryIds = Array.isArray(entryIds)
    ? entryIds
    : entryIds instanceof Set
    ? Array.from(entryIds)
    : [];

  let effectiveEntryIds = rawEntryIds.filter((id) => nodeMap.has(id));

  if (effectiveEntryIds.length === 0) {
    const clients = nodes
      .filter((n) => n?.data?.kind === "client")
      .map((n) => n.id);
    if (clients.length > 0) {
      effectiveEntryIds = clients;
    } else {
      const edgeKinds = ["api", "dns", "cdn"];
      const edgeNodes = nodes
        .filter((n) => edgeKinds.includes(n?.data?.kind))
        .map((n) => n.id);
      if (edgeNodes.length > 0) {
        effectiveEntryIds = edgeNodes;
      } else {
        // Fallback: in-degree 0 nodes on traversable edges
        const inDeg = new Map();
        for (const id of nodeMap.keys()) inDeg.set(id, 0);
        for (const e of normalizedEdges) {
          if (!nodeMap.has(e.source) || !nodeMap.has(e.target) || e.source === e.target)
            continue;
          const type = e.data?.type || "sync";
          if (type === "replication") continue;
          inDeg.set(e.target, (inDeg.get(e.target) || 0) + 1);
        }
        const zeroIn = Array.from(inDeg.entries())
          .filter(([_, d]) => d === 0)
          .map(([id]) => id);
        effectiveEntryIds = zeroIn.length > 0 ? zeroIn : Array.from(nodeMap.keys());
      }
    }
  }

  const entrySet = new Set(effectiveEntryIds);

  // Pre-build adjacency list for traversable edges (sync & async, ignoring replication)
  const adjTraversable = new Map();
  for (const id of nodeMap.keys()) {
    adjTraversable.set(id, []);
  }

  for (const edge of normalizedEdges) {
    const { source, target } = edge;
    if (!nodeMap.has(source) || !nodeMap.has(target)) continue;
    if (source === target) continue;

    const edgeType = edge.data?.type || "sync";
    if (edgeType === "replication") continue; // replication edges are never traversed

    adjTraversable.get(source).push(target);
  }

  // Reachability helper from effective entry points
  const computeReachable = (excludedId = null) => {
    const visited = new Set();
    const queue = [];

    for (const eid of effectiveEntryIds) {
      if (eid !== excludedId && nodeMap.has(eid)) {
        visited.add(eid);
        queue.push(eid);
      }
    }

    while (queue.length > 0) {
      const curr = queue.shift();
      const neighbors = adjTraversable.get(curr) || [];
      for (const next of neighbors) {
        if (next === excludedId) continue;
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }

    return visited;
  };

  const initialReachable = computeReachable(null);
  const spofs = [];

  // Identify sink nodes in traversable reachability (nodes with out-degree 0 on traversable edges)
  const sinkNodes = new Set();
  for (const id of initialReachable) {
    const outNeighbors = adjTraversable.get(id) || [];
    if (outNeighbors.length === 0) {
      sinkNodes.add(id);
    }
  }

  for (const node of nodes) {
    const nodeId = node.id;
    // Skip entry nodes
    if (entrySet.has(nodeId)) continue;
    // Only nodes in the initial reachable set can dominate or be dominated
    if (!initialReachable.has(nodeId)) continue;

    // Reachability without nodeId
    const reachableWithoutNode = computeReachable(nodeId);

    // Dominated nodes: initially reachable nodes (excluding nodeId) that are no longer reachable
    const dominates = [];
    for (const reachableId of initialReachable) {
      if (reachableId === nodeId) continue;
      if (!reachableWithoutNode.has(reachableId)) {
        dominates.push(reachableId);
      }
    }

    // A node is a SPOF if it dominates downstream nodes leading to a sink
    const isSpof =
      dominates.length > 0 &&
      (sinkNodes.size === 0 || dominates.some((id) => sinkNodes.has(id)));

    if (isSpof) {
      spofs.push({
        nodeId,
        kind: node.data?.kind || "component",
        dominates,
        blastRadius: dominates.length,
      });
    }
  }

  return spofs;
}

/**
 * Finds all articulation points (cut vertices) using Tarjan's DFS algorithm.
 * Kept for backward compatibility with existing tests.
 */
export function findArticulationPoints(graph) {
  const { nodeMap, undirectedAdj } = graph;
  const visited = new Set();
  const discovery = new Map();
  const low = new Map();
  const parent = new Map();
  const articulationPoints = new Set();

  let time = 0;

  function dfs(u) {
    visited.add(u);
    time++;
    discovery.set(u, time);
    low.set(u, time);
    let children = 0;

    const neighbors = undirectedAdj.get(u) || new Set();
    for (const v of neighbors) {
      if (!visited.has(v)) {
        children++;
        parent.set(v, u);
        dfs(v);

        low.set(u, Math.min(low.get(u), low.get(v)));

        // Condition 1: u is root of DFS tree and has >= 2 children
        if (!parent.has(u) && children > 1) {
          articulationPoints.add(u);
        }

        // Condition 2: u is not root and low[v] >= discovery[u]
        if (parent.has(u) && low.get(v) >= discovery.get(u)) {
          articulationPoints.add(u);
        }
      } else if (v !== parent.get(u)) {
        low.set(u, Math.min(low.get(u), discovery.get(v)));
      }
    }
  }

  for (const nodeId of nodeMap.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  return Array.from(articulationPoints);
}

/**
 * Evaluates whether a component represents a cloud-managed service that is inherently multi-AZ
 * (e.g. S3 object storage with 11 9s durability, global Anycast CloudFront/Cloudflare CDN PoPs).
 * Kept for backward compatibility.
 */
export function isInherentlyRedundant(node) {
  if (!node) return false;
  const kind = node.data?.kind || "";
  const label = (node.data?.label || "").toLowerCase();

  // Clients are external callers, not internal application SPOFs
  if (kind === "client") return true;

  // Cloud object storage is distributed and multi-AZ by design (e.g. S3 11 9s durability)
  if (kind === "storage") return true;

  // Global Anycast Edge CDN / DNS networks
  if (kind === "cdn" || kind === "dns") return true;

  if (
    label.includes("cdn") ||
    label.includes("anycast") ||
    label.includes("edge pop") ||
    label.includes("cloudflare") ||
    label.includes("cloudfront")
  ) {
    return true;
  }

  return false;
}

/**
 * Checks if a node qualifies as a firewall / WAF component either by kind or label.
 */
export function isFirewallNode(node) {
  if (!node) return false;
  const kind = node?.data?.kind;
  if (kind === "firewall") return true;
  const label = (node?.data?.label || "").toLowerCase();
  return (
    label.includes("firewall") ||
    label.includes("waf") ||
    label.includes("shield") ||
    label.includes("cloudfront") ||
    (kind === "api" && label.includes("(az-"))
  );
}

/**
 * Checks if a database has replication redundancy either through a connected replica node
 * or an inherent cloud-managed multi-AZ cluster configuration.
 */
export function isDbReplicated(dbNode, edges, nodeMap, nodes = []) {
  const label = (dbNode?.data?.label || "").toLowerCase();
  if (
    label.includes("multi-az") ||
    label.includes("aurora") ||
    label.includes("cluster") ||
    label.includes("replicated") ||
    label.includes("standby")
  ) {
    return true;
  }
  // If the diagram includes a dedicated standby database in the cluster
  const hasStandbyInCluster = nodes.some(
    (n) =>
      n.id !== dbNode.id &&
      n?.data?.kind === "database" &&
      (n?.data?.label || "").toLowerCase().includes("standby")
  );
  if (hasStandbyInCluster) {
    return true;
  }
  return edges.some((edge) => {
    if (edge.data?.type !== "replication") return false;
    const isDbSource = edge.source === dbNode.id;
    const isDbTarget = edge.target === dbNode.id;
    if (!isDbSource && !isDbTarget) return false;
    const otherId = isDbSource ? edge.target : edge.source;
    return nodeMap.get(otherId)?.data?.kind === "replica";
  });
}

/**
 * Checks if removing candidateId disconnects sourceId from targetId (directed reachability).
 * Kept for backward compatibility.
 */
export function isNodeCriticalBetween(graph, sourceId, targetId, candidateId) {
  if (candidateId === sourceId || candidateId === targetId) return false;

  const { adj } = graph;
  const visited = new Set([candidateId]); // treat candidate as removed
  const queue = [sourceId];
  visited.add(sourceId);

  while (queue.length > 0) {
    const curr = queue.shift();
    if (curr === targetId) return false;

    for (const next of adj.get(curr) || []) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  return true;
}

/**
 * Detects all directed cycles using DFS recursion stack strictly traversing sync edges.
 * Cycles traversing async or replication edges are ignored.
 */
export function findDirectedCycles(graph) {
  const { nodeMap, edges } = graph;
  const adjSync = new Map();
  for (const id of nodeMap.keys()) {
    adjSync.set(id, new Set());
  }

  if (graph.adjSync) {
    for (const [id, targets] of graph.adjSync.entries()) {
      adjSync.set(id, new Set(targets));
    }
  } else {
    for (const edge of edges || []) {
      const { source, target } = edge;
      if (!nodeMap.has(source) || !nodeMap.has(target)) continue;
      if (source === target) continue;

      const edgeType = edge.data?.type || "sync";
      if (edgeType === "sync") {
        adjSync.get(source).add(target);
      }
    }
  }

  const visited = new Set();
  const inStack = new Set();
  const stack = [];
  const rawCycles = [];

  function dfs(u) {
    visited.add(u);
    inStack.add(u);
    stack.push(u);

    const neighbors = adjSync.get(u) || new Set();
    for (const v of neighbors) {
      if (!visited.has(v)) {
        dfs(v);
      } else if (inStack.has(v)) {
        const cycleStartIndex = stack.indexOf(v);
        if (cycleStartIndex !== -1) {
          const cycle = stack.slice(cycleStartIndex);
          cycle.push(v);
          rawCycles.push(cycle);
        }
      }
    }

    stack.pop();
    inStack.delete(u);
  }

  for (const nodeId of nodeMap.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId);
    }
  }

  // Deduplicate rotational cycles
  const uniqueCycles = [];
  const seenSignatures = new Set();

  for (const cycle of rawCycles) {
    const nodesInCycle = cycle.slice(0, -1);
    if (nodesInCycle.length === 0) continue;

    const minId = [...nodesInCycle].sort()[0];
    const minIdx = nodesInCycle.indexOf(minId);
    const normalized = [
      ...nodesInCycle.slice(minIdx),
      ...nodesInCycle.slice(0, minIdx),
    ];
    const signature = normalized.join("->");

    if (!seenSignatures.has(signature)) {
      seenSignatures.add(signature);
      uniqueCycles.push(cycle);
    }
  }

  return uniqueCycles;
}

/**
 * Computes all connected components on undirected graph.
 */
export function findConnectedComponents(graph) {
  const { nodeMap, undirectedAdj } = graph;
  const visited = new Set();
  const components = [];

  for (const nodeId of nodeMap.keys()) {
    if (!visited.has(nodeId)) {
      const comp = [];
      const queue = [nodeId];
      visited.add(nodeId);

      while (queue.length > 0) {
        const curr = queue.shift();
        comp.push(curr);
        for (const next of undirectedAdj.get(curr) || []) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
          }
        }
      }
      components.push(comp);
    }
  }

  return components;
}

/**
 * Computes directed reachability from given start nodes along traversable (sync/async) edges.
 */
export function findReachableNodes(graph, startNodeIds = []) {
  const { nodeMap, edges, adj } = graph;
  const reachable = new Set();
  const queue = [];

  for (const id of startNodeIds) {
    if (nodeMap ? nodeMap.has(id) : true) {
      reachable.add(id);
      queue.push(id);
    }
  }

  const adjTraversable = new Map();
  if (nodeMap) {
    for (const id of nodeMap.keys()) adjTraversable.set(id, []);
  }
  for (const edge of edges || []) {
    if (nodeMap && (!nodeMap.has(edge.source) || !nodeMap.has(edge.target))) continue;
    if (edge.source === edge.target) continue;
    if (edge.data?.type === "replication") continue;
    if (!adjTraversable.has(edge.source)) adjTraversable.set(edge.source, []);
    adjTraversable.get(edge.source).push(edge.target);
  }

  while (queue.length > 0) {
    const curr = queue.shift();
    const neighbors = adjTraversable.get(curr) || (adj ? Array.from(adj.get(curr) || []) : []);
    for (const next of neighbors) {
      if (!reachable.has(next)) {
        reachable.add(next);
        queue.push(next);
      }
    }
  }

  return reachable;
}

/**
 * Phase 1 Master: Compiles the full GraphProfile in 3-4 structured passes.
 */
export function buildGraphProfile(nodes = [], edges = []) {
  const normalizedEdges = edges.map(normalizeEdge);
  const graph = buildGraph(nodes, normalizedEdges);
  const { nodeMap, adj, revAdj, inDegree, outDegree } = graph;

  // 1. Group nodes by 14 kinds
  const byKind = {
    client: [],
    api: [],
    loadbalancer: [],
    server: [],
    database: [],
    cache: [],
    queue: [],
    storage: [],
    firewall: [],
    auth: [],
    cdn: [],
    dns: [],
    worker: [],
    replica: [],
  };

  for (const node of nodes) {
    const kind = node?.data?.kind;
    if (kind && byKind[kind]) {
      byKind[kind].push(node);
    }
  }

  // 2. Entry nodes & pass-through determination
  // Primary entry: client. If none, pass-throughs: api, dns, cdn.
  const entryNodes =
    byKind.client.length > 0
      ? [...byKind.client]
      : [...byKind.api, ...byKind.dns, ...byKind.cdn];

  const dataNodes = [...byKind.database, ...byKind.storage];

  // Missing entry point check accounts for client, api, dns, cdn
  const hasEntryPoint =
    byKind.client.length > 0 ||
    byKind.api.length > 0 ||
    byKind.dns.length > 0 ||
    byKind.cdn.length > 0;
  const noEntryPoint = nodes.length > 0 && !hasEntryPoint;

  // 3. Undirected pass: components & orphans
  const connectedComponents = findConnectedComponents(graph);
  const orphanNodes = [];
  const multiNodeComponents = [];

  for (const comp of connectedComponents) {
    if (comp.length === 1) {
      const id = comp[0];
      if ((inDegree.get(id) || 0) === 0 && (outDegree.get(id) || 0) === 0) {
        orphanNodes.push(id);
      } else {
        multiNodeComponents.push(comp);
      }
    } else {
      multiNodeComponents.push(comp);
    }
  }

  const articulationPoints = findArticulationPoints(graph);

  // 4. Traversable directed reachability (sync + async, ignoring replication)
  const adjTraversable = new Map();
  for (const id of nodeMap.keys()) adjTraversable.set(id, new Set());
  for (const edge of normalizedEdges) {
    if (!nodeMap.has(edge.source) || !nodeMap.has(edge.target) || edge.source === edge.target)
      continue;
    if (edge.data?.type === "replication") continue;
    adjTraversable.get(edge.source).add(edge.target);
  }

  const getReachableFrom = (startIds, excludedIds = new Set()) => {
    const visited = new Set(excludedIds);
    const queue = [];
    for (const sid of startIds) {
      if (!visited.has(sid) && nodeMap.has(sid)) {
        visited.add(sid);
        queue.push(sid);
      }
    }
    while (queue.length > 0) {
      const curr = queue.shift();
      for (const next of adjTraversable.get(curr) || []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    for (const eid of excludedIds) visited.delete(eid);
    return visited;
  };

  const entryNodeIds = entryNodes.map((n) => n.id);
  const reachableFromEntry = getReachableFrom(entryNodeIds);

  const unreachableNodes = [];
  if (entryNodes.length > 0) {
    for (const node of nodes) {
      // Clients are primary entry points
      if (node.data?.kind === "client") continue;
      // If no clients, api/dns/cdn act as entry points
      if (
        byKind.client.length === 0 &&
        ["api", "dns", "cdn"].includes(node.data?.kind)
      ) {
        continue;
      }

      if (!reachableFromEntry.has(node.id)) {
        unreachableNodes.push(node.id);
      }
    }
  }

  // 5. Directed cycle detection (strictly synchronous edges)
  const directedCycles = findDirectedCycles(graph);

  // 6. Dominator-based SPOF Detection
  const spofs = findSpofs(nodes, normalizedEdges, entryNodeIds);
  const criticalPathSPOFs = spofs.map((s) => s.nodeId);

  // 7. Degree and Semantic Classifications
  const deadEndServers = [];
  for (const server of byKind.server) {
    const out = outDegree.get(server.id) || 0;
    const inD = inDegree.get(server.id) || 0;
    if (inD > 0 && out === 0) {
      deadEndServers.push(server.id);
    }
  }

  // Queue rules: consumer is worker or server on async edge; producer is on async edge
  const unconsumedQueues = [];
  const unproducedQueues = [];
  for (const q of byKind.queue) {
    const isAsyncEdge = (e) =>
      e.data?.type === "async" ||
      (e.animated === true && e.data?.type !== "replication");

    const allInbound = normalizedEdges.filter((e) => e.target === q.id);
    const asyncInbound = allInbound.filter(isAsyncEdge);
    const allOutbound = normalizedEdges.filter((e) => e.source === q.id);
    const asyncOutbound = allOutbound.filter(isAsyncEdge);

    const hasAsyncProducer = asyncInbound.length > 0;
    const hasAnyProducer = allInbound.length > 0;

    const hasAsyncConsumer = asyncOutbound.some((e) => {
      const targetNode = nodeMap.get(e.target);
      const targetKind = targetNode?.data?.kind;
      return targetKind === "worker" || targetKind === "server";
    });

    const hasAnyConsumer = allOutbound.some((e) => {
      const targetNode = nodeMap.get(e.target);
      const targetKind = targetNode?.data?.kind;
      return targetKind === "worker" || targetKind === "server";
    });

    if (hasAnyConsumer && !hasAsyncProducer) {
      unproducedQueues.push(q.id);
    }
    if (hasAnyProducer && !hasAsyncConsumer) {
      unconsumedQueues.push(q.id);
    }
  }

  // Compute writers: server, cache, or worker
  const dbsWithNoServerInput = [];
  for (const db of dataNodes) {
    const callers = revAdj.get(db.id) || new Set();
    let hasComputeCaller = false;
    for (const callerId of callers) {
      const callerKind = nodeMap.get(callerId)?.data?.kind;
      if (
        callerKind === "server" ||
        callerKind === "cache" ||
        callerKind === "worker"
      ) {
        hasComputeCaller = true;
        break;
      }
    }
    if (!hasComputeCaller) {
      dbsWithNoServerInput.push(db.id);
    }
  }

  const lbsWithSingleTarget = [];
  for (const lb of byKind.loadbalancer) {
    const targets = adj.get(lb.id) || new Set();
    if (targets.size === 1) {
      lbsWithSingleTarget.push(lb.id);
    }
  }

  const cachesWithoutDB = [];
  for (const cache of byKind.cache) {
    const downstream = adj.get(cache.id) || new Set();
    const upstream = revAdj.get(cache.id) || new Set();
    let touchesDb = false;

    for (const id of [...downstream, ...upstream]) {
      const kind = nodeMap.get(id)?.data?.kind;
      if (kind === "database" || kind === "storage" || kind === "replica") {
        touchesDb = true;
        break;
      }
    }
    if (!touchesDb) {
      for (const id of upstream) {
        const srvTargets = adj.get(id) || new Set();
        for (const tid of srvTargets) {
          const tKind = nodeMap.get(tid)?.data?.kind;
          if (tKind === "database" || tKind === "storage" || tKind === "replica") {
            touchesDb = true;
            break;
          }
        }
        if (touchesDb) break;
      }
    }

    if (!touchesDb) {
      cachesWithoutDB.push(cache.id);
    }
  }

  // 8. Helper Queries for Structural & Security Rules

  // SEC_DB_NO_FIREWALL: Database reachable from client without passing through firewall
  const firewallIds = new Set(
    nodes.filter((n) => isFirewallNode(n)).map((n) => n.id)
  );
  const dbsExposedWithoutFirewall = [];

  const clientSources =
    byKind.client.length > 0
      ? byKind.client.map((c) => c.id)
      : entryNodes
          .filter((n) => n.data?.kind !== "database" && n.data?.kind !== "storage")
          .map((n) => n.id);

  if (clientSources.length > 0 && byKind.database.length > 0) {
    const reachableWithoutFirewalls = getReachableFrom(
      clientSources,
      firewallIds
    );
    for (const db of byKind.database) {
      if (reachableFromEntry.has(db.id) && reachableWithoutFirewalls.has(db.id)) {
        dbsExposedWithoutFirewall.push(db.id);
      }
    }
  }

  // SEC_NO_AUTH: Server reachable from client without passing through auth or api gateway
  const authBoundaryIds = new Set([
    ...byKind.auth.map((a) => a.id),
    ...byKind.api.map((a) => a.id),
  ]);
  const unauthenticatedServerPaths = [];
  const seenServersWithNoAuth = new Set();

  const authEntryClients =
    byKind.client.length > 0
      ? byKind.client
      : [...byKind.dns, ...byKind.cdn];

  if (authEntryClients.length > 0 && byKind.server.length > 0) {
    for (const client of authEntryClients) {
      const visited = new Set(authBoundaryIds);
      const queue = [];
      if (!visited.has(client.id)) {
        visited.add(client.id);
        queue.push(client.id);
      }

      while (queue.length > 0) {
        const curr = queue.shift();
        for (const next of adjTraversable.get(curr) || []) {
          if (!visited.has(next)) {
            visited.add(next);
            queue.push(next);
            const targetNode = nodeMap.get(next);
            if (
              targetNode?.data?.kind === "server" &&
              !seenServersWithNoAuth.has(next)
            ) {
              seenServersWithNoAuth.add(next);
              unauthenticatedServerPaths.push({
                serverId: next,
                clientId: client.id,
              });
            }
          }
        }
      }
    }
  }

  // SEC_UNENCRYPTED_PATH: Client-facing edge with http protocol or encrypted === false (skip if protocol unset)
  const unencryptedClientEdges = [];
  for (const edge of normalizedEdges) {
    const srcNode = nodeMap.get(edge.source);
    if (srcNode?.data?.kind === "client") {
      const proto = edge.data?.protocol ? String(edge.data.protocol).trim().toLowerCase() : undefined;
      const enc = typeof edge.data?.encrypted === "boolean" ? edge.data.encrypted : undefined;
      if (!proto && enc !== false) continue; // Skip if protocol unset and not encrypted === false
      if (proto === "http" || enc === false) {
        unencryptedClientEdges.push(edge);
      }
    }
  }

  // REL_DB_NO_REPLICA: Database on critical path without a replica connected via replication edge
  const dbsWithoutReplica = [];
  for (const db of byKind.database) {
    if (!reachableFromEntry.has(db.id)) continue;
    if (!isDbReplicated(db, normalizedEdges, nodeMap, nodes)) {
      dbsWithoutReplica.push(db.id);
    }
  }

  // 9. Edge Classifications (Reversed flows, direct DB, bypasses)
  const reversedFlowEdges = [];
  const directClientToDbEdges = [];
  const directClientToServerEdges = [];
  const dbExposedToEdgeEdges = [];
  const bypassEdges = [];

  for (const edge of normalizedEdges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) continue;

    const sKind = src.data?.kind;
    const tKind = tgt.data?.kind;

    if (
      (sKind === "database" || sKind === "storage") &&
      (tKind === "server" || tKind === "client" || tKind === "api" || tKind === "loadbalancer" || tKind === "worker")
    ) {
      reversedFlowEdges.push({ source: src.id, target: tgt.id });
    }

    if (sKind === "client" && (tKind === "database" || tKind === "storage")) {
      directClientToDbEdges.push({ source: src.id, target: tgt.id });
    }

    if (sKind === "client" && tKind === "server") {
      directClientToServerEdges.push({ source: src.id, target: tgt.id });
    }

    if (
      (sKind === "client" || sKind === "api") &&
      (tKind === "database" || tKind === "storage")
    ) {
      dbExposedToEdgeEdges.push({ source: src.id, target: tgt.id });
    }
  }

  for (const [id, targets] of adj.entries()) {
    const targetArr = Array.from(targets);
    for (const t1 of targetArr) {
      for (const t2 of targetArr) {
        if (t1 !== t2 && adj.get(t1)?.has(t2)) {
          bypassEdges.push({ source: id, via: t1, target: t2 });
        }
      }
    }
  }

  const multipleServersNoLb =
    byKind.server.length >= 2 && byKind.loadbalancer.length === 0;

  return {
    graph,
    nodeMap,
    byKind,
    entryNodes,
    dataNodes,
    noEntryPoint,
    connectedComponents,
    multiNodeComponents,
    orphanNodes,
    unreachableNodes,
    directedCycles,
    articulationPoints,
    spofs,
    criticalPathSPOFs,
    deadEndServers,
    unconsumedQueues,
    unproducedQueues,
    dbsWithNoServerInput,
    lbsWithSingleTarget,
    cachesWithoutDB,
    reversedFlowEdges,
    directClientToDbEdges,
    directClientToServerEdges,
    dbExposedToEdgeEdges,
    bypassEdges,
    multipleServersNoLb,
    dbsExposedWithoutFirewall,
    unauthenticatedServerPaths,
    serversWithoutAuth: unauthenticatedServerPaths.map((p) => p.serverId),
    unencryptedClientEdges,
    dbsWithoutReplica,
  };
}

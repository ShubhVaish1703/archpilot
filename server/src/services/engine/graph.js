/**
 * ArchPilot Graph Traversal & Topological Profiling Engine
 *
 * Implements a consolidated Two-Phase Pipeline:
 * Phase 1: buildGraphProfile(nodes, edges) computes all structural and topological
 *          facts into an immutable GraphProfile object in minimal passes.
 * Phase 2: Rules read directly from GraphProfile facts without re-traversing the graph.
 */

/**
 * Builds directed, reverse, and undirected adjacency structures from React Flow nodes and edges.
 */
export function buildGraph(nodes = [], edges = []) {
  const nodeMap = new Map();
  const adj = new Map();
  const revAdj = new Map();
  const undirectedAdj = new Map();
  const inDegree = new Map();
  const outDegree = new Map();

  for (const node of nodes) {
    nodeMap.set(node.id, node);
    adj.set(node.id, new Set());
    revAdj.set(node.id, new Set());
    undirectedAdj.set(node.id, new Set());
    inDegree.set(node.id, 0);
    outDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    const { source, target } = edge;
    // Guard against dangling edges referencing non-existent nodes
    if (!nodeMap.has(source) || !nodeMap.has(target)) continue;
    if (source === target) continue; // self-loop handled separately

    if (!adj.get(source).has(target)) {
      adj.get(source).add(target);
      revAdj.get(target).add(source);
      undirectedAdj.get(source).add(target);
      undirectedAdj.get(target).add(source);
      outDegree.set(source, (outDegree.get(source) || 0) + 1);
      inDegree.set(target, (inDegree.get(target) || 0) + 1);
    }
  }

  return {
    nodes,
    edges,
    nodeMap,
    adj,
    revAdj,
    undirectedAdj,
    inDegree,
    outDegree,
  };
}

/**
 * Finds all articulation points (cut vertices) using Tarjan's DFS algorithm.
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
 */
export function isInherentlyRedundant(node) {
  if (!node) return false;
  const kind = node.data?.kind || "";
  const label = (node.data?.label || "").toLowerCase();

  // Clients are external callers, not internal application SPOFs
  if (kind === "client") return true;

  // Cloud object storage is distributed and multi-AZ by design (e.g. S3 11 9s durability)
  if (kind === "storage") return true;

  // Global Anycast Edge CDN networks (hundreds of edge PoPs)
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
 * Checks if removing candidateId disconnects sourceId from targetId (directed reachability).
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
 * Detects all directed cycles using DFS recursion stack.
 */
export function findDirectedCycles(graph) {
  const { nodeMap, adj } = graph;
  const visited = new Set();
  const inStack = new Set();
  const stack = [];
  const rawCycles = [];

  function dfs(u) {
    visited.add(u);
    inStack.add(u);
    stack.push(u);

    const neighbors = adj.get(u) || new Set();
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
 * Computes directed reachability from all entry nodes.
 */
export function findReachableNodes(graph, entryNodeIds = []) {
  const { adj } = graph;
  const reachable = new Set();
  const queue = [...entryNodeIds];

  for (const id of entryNodeIds) {
    reachable.add(id);
  }

  while (queue.length > 0) {
    const curr = queue.shift();
    for (const next of adj.get(curr) || []) {
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
  const graph = buildGraph(nodes, edges);
  const { nodeMap, adj, revAdj, inDegree, outDegree } = graph;

  // 1. Group nodes by kind
  const byKind = {
    client: [],
    api: [],
    loadbalancer: [],
    server: [],
    database: [],
    cache: [],
    queue: [],
    storage: [],
  };

  for (const node of nodes) {
    const kind = node.data?.kind;
    if (byKind[kind]) {
      byKind[kind].push(node);
    }
  }

  const entryNodes = [...byKind.client, ...byKind.api];
  const dataNodes = [...byKind.database, ...byKind.storage];
  const noEntryPoint = nodes.length > 0 && entryNodes.length === 0;

  // 2. Undirected Pass: Components, Orphans, Articulation Points
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

  // 3. Directed Reachability Pass
  const entryNodeIds = entryNodes.map((n) => n.id);
  const reachableFromEntry = findReachableNodes(graph, entryNodeIds);

  const unreachableNodes = [];
  if (entryNodes.length > 0) {
    for (const node of nodes) {
      // Clients/APIs themselves are entry points, don't flag them as unreachable from entry
      if (node.data?.kind === "client" || node.data?.kind === "api") continue;
      if (!reachableFromEntry.has(node.id)) {
        unreachableNodes.push(node.id);
      }
    }
  }

  // 4. Directed Cycle Detection Pass
  const directedCycles = findDirectedCycles(graph);

  // 5. Critical Path SPOFs: articulation points that sever Entry -> Data path
  const criticalPathSPOFs = new Set();
  if (entryNodes.length > 0 && dataNodes.length > 0) {
    for (const apId of articulationPoints) {
      const apNode = nodeMap.get(apId);
      if (isInherentlyRedundant(apNode)) continue;

      for (const entry of entryNodes) {
        for (const dataNode of dataNodes) {
          if (isNodeCriticalBetween(graph, entry.id, dataNode.id, apId)) {
            criticalPathSPOFs.add(apId);
            break;
          }
        }
      }
    }
  }

  // 6. Degree and Semantic Classifications
  const deadEndServers = [];
  for (const server of byKind.server) {
    const out = outDegree.get(server.id) || 0;
    const inD = inDegree.get(server.id) || 0;
    if (inD > 0 && out === 0) {
      deadEndServers.push(server.id);
    }
  }

  const unconsumedQueues = [];
  const unproducedQueues = [];
  for (const q of byKind.queue) {
    const out = outDegree.get(q.id) || 0;
    const inD = inDegree.get(q.id) || 0;
    if (inD > 0 && out === 0) unconsumedQueues.push(q.id);
    if (out > 0 && inD === 0) unproducedQueues.push(q.id);
  }

  const dbsWithNoServerInput = [];
  for (const db of dataNodes) {
    const callers = revAdj.get(db.id) || new Set();
    let hasComputeCaller = false;
    for (const callerId of callers) {
      const callerKind = nodeMap.get(callerId)?.data?.kind;
      if (callerKind === "server" || callerKind === "cache") {
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
    // Check if cache connects downstream or upstream to any database/storage
    const downstream = adj.get(cache.id) || new Set();
    const upstream = revAdj.get(cache.id) || new Set();
    let touchesDb = false;

    for (const id of [...downstream, ...upstream]) {
      const kind = nodeMap.get(id)?.data?.kind;
      if (kind === "database" || kind === "storage") {
        touchesDb = true;
        break;
      }
    }
    // Also check if any server connected to this cache also connects to a database
    if (!touchesDb) {
      for (const id of upstream) {
        const srvTargets = adj.get(id) || new Set();
        for (const tid of srvTargets) {
          const tKind = nodeMap.get(tid)?.data?.kind;
          if (tKind === "database" || tKind === "storage") {
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

  // 7. Edge Classifications (Reversed flows, direct DB, bypasses)
  const reversedFlowEdges = [];
  const directClientToDbEdges = [];
  const directClientToServerEdges = [];
  const dbExposedToEdgeEdges = [];
  const bypassEdges = [];

  for (const edge of edges) {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) continue;

    const sKind = src.data?.kind;
    const tKind = tgt.data?.kind;

    // Reversed flow from data stores
    if (
      (sKind === "database" || sKind === "storage") &&
      (tKind === "server" || tKind === "client" || tKind === "api" || tKind === "loadbalancer")
    ) {
      reversedFlowEdges.push({ source: src.id, target: tgt.id });
    }

    // Direct Client -> Database/Storage
    if (sKind === "client" && (tKind === "database" || tKind === "storage")) {
      directClientToDbEdges.push({ source: src.id, target: tgt.id });
    }

    // Direct Client -> Server without Gateway
    if (sKind === "client" && tKind === "server") {
      directClientToServerEdges.push({ source: src.id, target: tgt.id });
    }

    // Database exposed to edge
    if ((sKind === "client" || sKind === "api") && (tKind === "database" || tKind === "storage")) {
      dbExposedToEdgeEdges.push({ source: src.id, target: tgt.id });
    }
  }

  // Transit bypasses: A -> B and A -> C where B -> C exists
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

  const multipleServersNoLb = byKind.server.length >= 2 && byKind.loadbalancer.length === 0;

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
    criticalPathSPOFs: Array.from(criticalPathSPOFs),
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
  };
}

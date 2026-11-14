import type { Node } from "@xyflow/react";
import type { ComponentKind, ArchitectureNodeData } from "./types";

/**
 * Standard column X coordinates for all 14 component kinds.
 * Flow direction: Entry (Left) -> Perimeter -> Ingress -> Compute -> Async/Cache -> Worker -> Storage/Replica (Right).
 */
export const COL_X: Record<ComponentKind, number> = {
  dns: 60,
  cdn: 60,
  client: 60,
  firewall: 220,
  api: 380,
  loadbalancer: 380,
  auth: 380,
  server: 640,
  cache: 900,
  queue: 900,
  worker: 1160,
  database: 1420,
  replica: 1420,
  storage: 1420,
};

/**
 * Default initial spawn positions when adding new components from palette.
 */
export const DEFAULT_NODE_POSITIONS: Record<
  ComponentKind,
  { x: number; y: number }
> = {
  dns: { x: 60, y: 60 },
  cdn: { x: 60, y: 280 },
  client: { x: 60, y: 170 },
  firewall: { x: 220, y: 170 },
  api: { x: 380, y: 100 },
  loadbalancer: { x: 380, y: 220 },
  auth: { x: 380, y: 340 },
  server: { x: 640, y: 170 },
  cache: { x: 900, y: 80 },
  queue: { x: 900, y: 320 },
  worker: { x: 1160, y: 320 },
  database: { x: 1420, y: 100 },
  replica: { x: 1420, y: 240 },
  storage: { x: 1420, y: 380 },
};

/**
 * Computes a vertically centered, staggered Y coordinate for items in the same column.
 */
export function getStaggeredY(
  index: number,
  total: number,
  baseY = 200,
  stepY = 140
): number {
  if (total <= 1) return baseY;
  const startY = baseY - ((total - 1) * stepY) / 2;
  return startY + index * stepY;
}

/**
 * Calculates a default position for a newly dropped component of a given kind,
 * taking into account how many existing nodes of that kind already exist.
 */
export function getDefaultPositionForKind(
  kind: ComponentKind,
  existingCount = 0
): { x: number; y: number } {
  const base = DEFAULT_NODE_POSITIONS[kind] || { x: 180, y: 200 };
  return {
    x: base.x,
    y: base.y + existingCount * 130,
  };
}

/**
 * Automatically lays out architecture nodes into clean, logical tiered columns.
 * Supports all 14 node kinds:
 * - Entry / Edge: dns, cdn, client
 * - Perimeter: firewall
 * - Ingress / Gateway: api, loadbalancer, auth
 * - Compute: server
 * - Cache: cache
 * - Queue: queue
 * - Worker: worker
 * - Storage & Replica: database, replica, storage
 *
 * Staggers items vertically within each column to prevent overlapping.
 */
export function layoutArchitectureGraph(
  nodes: Node<ArchitectureNodeData>[]
): Node<ArchitectureNodeData>[] {
  if (!nodes || nodes.length === 0) return [];

  // Group nodes by architectural tier / role
  const roles: {
    dns_cdn: Node<ArchitectureNodeData>[];
    client: Node<ArchitectureNodeData>[];
    firewall: Node<ArchitectureNodeData>[];
    ingress: Node<ArchitectureNodeData>[];
    compute: Node<ArchitectureNodeData>[];
    cache: Node<ArchitectureNodeData>[];
    queue: Node<ArchitectureNodeData>[];
    worker: Node<ArchitectureNodeData>[];
    storage: Node<ArchitectureNodeData>[];
  } = {
    dns_cdn: [],
    client: [],
    firewall: [],
    ingress: [],
    compute: [],
    cache: [],
    queue: [],
    worker: [],
    storage: [],
  };

  nodes.forEach((node) => {
    const kind = node.data?.kind || "server";
    const label = (node.data?.label || "").toLowerCase();

    if (kind === "dns" || kind === "cdn") {
      roles.dns_cdn.push(node);
    } else if (kind === "client") {
      roles.client.push(node);
    } else if (kind === "firewall") {
      roles.firewall.push(node);
    } else if (kind === "api" || kind === "loadbalancer" || kind === "auth") {
      roles.ingress.push(node);
    } else if (kind === "cache") {
      roles.cache.push(node);
    } else if (kind === "queue") {
      roles.queue.push(node);
    } else if (kind === "worker") {
      roles.worker.push(node);
    } else if (kind === "database" || kind === "replica" || kind === "storage") {
      roles.storage.push(node);
    } else if (
      label.includes("worker") ||
      label.includes("consumer") ||
      label.includes("ingestion") ||
      label.includes("transcoder") ||
      label.includes("task")
    ) {
      roles.worker.push(node);
    } else {
      roles.compute.push(node);
    }
  });

  // Calculate dynamic X spacing based on active tiers
  const hasPerimeter = roles.firewall.length > 0;
  const hasDnsCdn = roles.dns_cdn.length > 0;

  // Base column X positions
  const xClient = 60;
  const xDnsCdn = hasDnsCdn && roles.client.length > 0 ? 60 : 60;
  const xFirewall = 220;
  const xIngress = hasPerimeter ? 380 : 320;
  const xCompute = hasPerimeter ? 640 : 580;
  const xQueueCache = hasPerimeter ? 900 : 840;
  const xWorker = hasPerimeter ? 1160 : 1100;
  const xStorage = hasPerimeter ? 1420 : 1360;

  const nodePositions = new Map<string, { x: number; y: number }>();

  // Layout DNS / CDN pass-through entry nodes
  if (roles.client.length > 0) {
    roles.dns_cdn.forEach((n, i) =>
      nodePositions.set(n.id, {
        x: xDnsCdn,
        y: getStaggeredY(i, roles.dns_cdn.length, 60, 100),
      })
    );
    roles.client.forEach((n, i) =>
      nodePositions.set(n.id, {
        x: xClient,
        y: getStaggeredY(i, roles.client.length, 220, 120),
      })
    );
  } else {
    roles.dns_cdn.forEach((n, i) =>
      nodePositions.set(n.id, {
        x: xDnsCdn,
        y: getStaggeredY(i, roles.dns_cdn.length, 180, 120),
      })
    );
  }

  // Layout Firewall perimeter
  roles.firewall.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: xFirewall,
      y: getStaggeredY(i, roles.firewall.length, 200, 130),
    })
  );

  // Layout Ingress & Auth
  roles.ingress.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: xIngress,
      y: getStaggeredY(i, roles.ingress.length, 200, 130),
    })
  );

  // Layout App Servers / Compute
  roles.compute.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: xCompute,
      y: getStaggeredY(i, roles.compute.length, 200, 140),
    })
  );

  // Layout Cache (Upper tier)
  roles.cache.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: xQueueCache,
      y: getStaggeredY(i, roles.cache.length, 80, 100),
    })
  );

  // Layout Message Queue (Lower tier)
  roles.queue.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: xQueueCache,
      y: getStaggeredY(i, roles.queue.length, 320, 120),
    })
  );

  // Layout Background Workers (Aligned with Queue)
  roles.worker.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: xWorker,
      y: getStaggeredY(i, roles.worker.length, 320, 120),
    })
  );

  // Layout Database, Replicas & Storage
  roles.storage.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: xStorage,
      y: getStaggeredY(i, roles.storage.length, 200, 140),
    })
  );

  return nodes.map((node) => ({
    ...node,
    position: nodePositions.get(node.id) || node.position,
  }));
}

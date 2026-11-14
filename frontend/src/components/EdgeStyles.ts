import {
  MarkerType,
  type Connection,
  type Edge,
} from "@xyflow/react";
import type {
  EdgeType,
  EdgeProtocol,
  EdgeData,
  ArchitectureEdge,
} from "./types";

/**
 * Visual specifications for each edge type:
 * - sync: solid stroke (undefined strokeDasharray)
 * - async: dashed stroke ("6 4")
 * - replication: dotted stroke ("2 4")
 */
export const EDGE_TYPE_CONFIG: Record<
  EdgeType,
  {
    dashArray?: string;
    stroke: string;
    strokeWidth: number;
    description: string;
    label: string;
  }
> = {
  sync: {
    dashArray: undefined,
    stroke: "#64748B",
    strokeWidth: 2,
    description: "Synchronous blocking request/response",
    label: "Sync",
  },
  async: {
    dashArray: "6 4",
    stroke: "#8B5CF6",
    strokeWidth: 2,
    description: "Asynchronous fire-and-forget / pub-sub queue",
    label: "Async",
  },
  replication: {
    dashArray: "2 4",
    stroke: "#0EA5E9",
    strokeWidth: 2.5,
    description: "Data replication stream to replica/standby",
    label: "Replication",
  },
};

/**
 * Edge type option descriptors for inspector dropdowns / selectors.
 */
export const edgeTypeOptions: Array<{
  type: EdgeType;
  title: string;
  subtitle: string;
  strokePreview: string;
  description: string;
}> = [
  {
    type: "sync",
    title: "Synchronous",
    subtitle: "Solid line · Blocking RPC / HTTP",
    strokePreview: "━━━━",
    description: "Evaluated by cycle detection (REL_CIRCULAR_DEPENDENCY).",
  },
  {
    type: "async",
    title: "Asynchronous",
    subtitle: "Dashed line · Event / Queue",
    strokePreview: "╌╌╌╌",
    description: "Breaks circular cycles. Required for queue publish/consume.",
  },
  {
    type: "replication",
    title: "Replication",
    subtitle: "Dotted line · Database sync",
    strokePreview: "····",
    description: "Redundancy sync. Excluded from SPOF dominator traversal.",
  },
];

/**
 * Edge protocol options for inspector selection.
 */
export const edgeProtocolOptions: Array<{
  value: EdgeProtocol | "";
  label: string;
}> = [
  { value: "", label: "None / Unspecified" },
  { value: "https", label: "HTTPS (TLS encrypted)" },
  { value: "http", label: "HTTP (Plaintext · Insecure)" },
  { value: "grpc", label: "gRPC (HTTP/2 Proto)" },
  { value: "tcp", label: "TCP (Raw Socket Stream)" },
  { value: "amqp", label: "AMQP (Message Broker / Queue)" },
];

/**
 * Default label styles for React Flow edges.
 */
export const DEFAULT_EDGE_LABEL_STYLE = {
  fontSize: 10,
  fontWeight: 600,
  fill: "#334155",
};

export const DEFAULT_EDGE_LABEL_BG_STYLE = {
  fill: "#FFFFFF",
  fillOpacity: 0.95,
  stroke: "#CBD5E1",
  strokeWidth: 1,
};

export const DEFAULT_EDGE_LABEL_BG_PADDING: [number, number] = [6, 3];
export const DEFAULT_EDGE_LABEL_BG_BORDER_RADIUS = 6;

/**
 * Returns the SVG strokeDasharray string for an edge type:
 * - sync: undefined (solid)
 * - async: "6 4" (dashed)
 * - replication: "2 4" (dotted)
 */
export function getEdgeStrokeDashArray(type?: EdgeType): string | undefined {
  const edgeType = type || "sync";
  return EDGE_TYPE_CONFIG[edgeType]?.dashArray;
}

/**
 * Returns the stroke color for an edge type.
 */
export function getEdgeStrokeColor(type?: EdgeType): string {
  const edgeType = type || "sync";
  return EDGE_TYPE_CONFIG[edgeType]?.stroke || "#64748B";
}

/**
 * Pure helper to format label text from individual attributes.
 */
export function formatEdgeLabelText(
  type: EdgeType,
  protocol?: EdgeProtocol,
  encrypted?: boolean
): string {
  const base = protocol ? `${type} · ${protocol}` : type;
  return encrypted ? `${base} 🔒` : base;
}

/**
 * Formats an edge label using type, protocol, and encryption status:
 * Example:
 * - "sync"
 * - "sync · http"
 * - "sync · https 🔒"
 * - "async · amqp"
 * - "replication · tcp 🔒"
 */
export function formatEdgeLabel(data?: EdgeData): string {
  if (!data) return "sync";
  if (data.label && data.label.trim().length > 0) return data.label;

  const type = data.type || "sync";
  const protocol = data.protocol;
  const isEncrypted = Boolean(data.encrypted);

  return formatEdgeLabelText(type, protocol, isEncrypted);
}

/**
 * Returns complete styling and label props for a ReactFlow edge given its data.
 */
export function getEdgeStyleProps(data?: EdgeData) {
  const edgeType: EdgeType = data?.type || "sync";
  const config = EDGE_TYPE_CONFIG[edgeType] || EDGE_TYPE_CONFIG.sync;
  const label = formatEdgeLabel(data);

  return {
    label,
    style: {
      stroke: config.stroke,
      strokeWidth: config.strokeWidth,
      strokeDasharray: config.dashArray,
    },
    labelStyle: DEFAULT_EDGE_LABEL_STYLE,
    labelBgStyle: DEFAULT_EDGE_LABEL_BG_STYLE,
    labelBgPadding: DEFAULT_EDGE_LABEL_BG_PADDING,
    labelBgBorderRadius: DEFAULT_EDGE_LABEL_BG_BORDER_RADIUS,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 16,
      height: 16,
      color: config.stroke,
    },
  };
}

/**
 * Applies complete edge styling (stroke, dasharray, label, markerEnd)
 * to an existing or imported edge. Ensures backward compatibility by defaulting
 * missing edge.data.type to "sync".
 */
export function getStyledEdge<T extends Edge<EdgeData>>(edge: T): T {
  const edgeType: EdgeType = edge.data?.type || "sync";
  const updatedData: EdgeData = {
    type: edgeType,
    ...edge.data,
  };
  const styleProps = getEdgeStyleProps(updatedData);

  return {
    ...edge,
    data: updatedData,
    animated: edge.animated ?? true,
    ...styleProps,
    style: {
      ...edge.style,
      ...styleProps.style,
    },
  };
}

/**
 * Factory to create a newly connected edge with default sync data and styling.
 */
export function createStyledEdge(
  connection: Connection,
  data?: EdgeData
): ArchitectureEdge {
  const initialData: EdgeData = {
    type: data?.type || "sync",
    protocol: data?.protocol,
    encrypted: data?.encrypted ?? false,
    ...data,
  };
  const styleProps = getEdgeStyleProps(initialData);

  return {
    ...connection,
    id: `edge-${connection.source}-${connection.target}-${Date.now()}`,
    animated: true,
    data: initialData,
    ...styleProps,
  };
}

/**
 * Normalizes an incoming or legacy edge to ensure data.type defaults to "sync".
 */
export function normalizeEdge(edge: Edge): ArchitectureEdge {
  const existingData = (edge.data || {}) as EdgeData;
  const normalizedData: EdgeData = {
    ...existingData,
    type: existingData.type || "sync",
  };

  return getStyledEdge({
    ...edge,
    data: normalizedData,
  });
}

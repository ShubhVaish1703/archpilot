import type React from "react";
import {
  Activity,
  Cloud,
  Copy,
  Cpu,
  Database,
  Globe,
  HardDrive,
  Layers3,
  Lock,
  Network,
  Route,
  Server,
  Shield,
  Workflow,
} from "lucide-react";
import type {
  ComponentKind,
  ComponentCatalogItem,
  NodeStatus,
  AnalysisResult,
} from "./types";

/**
 * Styling definitions for all 14 node kinds.
 */
export const nodeStyles: Record<
  ComponentKind,
  { background: string; border: string }
> = {
  client: { background: "#F5F3FF", border: "#C4B5FD" },
  dns: { background: "#F7FEE7", border: "#BEF264" },
  cdn: { background: "#F0F9FF", border: "#7DD3FC" },
  firewall: { background: "#FFF1F2", border: "#FDA4AF" },
  auth: { background: "#FAF5FF", border: "#D8B4FE" },
  api: { background: "#EFF6FF", border: "#93C5FD" },
  loadbalancer: { background: "#F0FDFA", border: "#5EEAD4" },
  server: { background: "#ECFEFF", border: "#67E8F9" },
  worker: { background: "#FFF7ED", border: "#FDBA74" },
  queue: { background: "#FDF2F8", border: "#F9A8D4" },
  cache: { background: "#FFFBEB", border: "#FCD34D" },
  database: { background: "#ECFDF5", border: "#6EE7B7" },
  replica: { background: "#F0FDF4", border: "#86EFAC" },
  storage: { background: "#EEF2FF", border: "#A5B4FC" },
};

/**
 * Tailwind badge and icon color mappings for each component color theme.
 */
export const componentColorClasses: Record<string, string> = {
  violet: "bg-violet-50 text-violet-600 border-violet-100",
  lime: "bg-lime-50 text-lime-700 border-lime-100",
  sky: "bg-sky-50 text-sky-600 border-sky-100",
  rose: "bg-rose-50 text-rose-600 border-rose-100",
  purple: "bg-purple-50 text-purple-600 border-purple-100",
  blue: "bg-blue-50 text-blue-600 border-blue-100",
  teal: "bg-teal-50 text-teal-600 border-teal-100",
  cyan: "bg-cyan-50 text-cyan-700 border-cyan-100",
  orange: "bg-orange-50 text-orange-600 border-orange-100",
  pink: "bg-pink-50 text-pink-600 border-pink-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  emerald: "bg-emerald-50 text-emerald-600 border-emerald-100",
  green: "bg-green-50 text-green-600 border-green-100",
  indigo: "bg-indigo-50 text-indigo-600 border-indigo-100",
};

/**
 * Full component catalog containing all 14 node kinds organized by category.
 */
export const componentCatalog: ComponentCatalogItem[] = [
  // Edge & Entry Tier
  {
    kind: "client",
    label: "Client",
    description: "Web or mobile app client",
    icon: Cloud,
    color: "violet",
    category: "Edge & Entry",
  },
  {
    kind: "dns",
    label: "DNS",
    description: "Domain resolution & routing",
    icon: Route,
    color: "lime",
    category: "Edge & Entry",
  },
  {
    kind: "cdn",
    label: "CDN",
    description: "Edge caching & delivery",
    icon: Globe,
    color: "sky",
    category: "Edge & Entry",
  },

  // Routing & Security Perimeter Tier
  {
    kind: "firewall",
    label: "Firewall",
    description: "Subnet boundary & packet filter",
    icon: Shield,
    color: "rose",
    category: "Routing & Security",
  },
  {
    kind: "auth",
    label: "Auth Service",
    description: "Authentication & token validation",
    icon: Lock,
    color: "purple",
    category: "Routing & Security",
  },
  {
    kind: "api",
    label: "API Gateway",
    description: "Entry point for HTTP requests",
    icon: Workflow,
    color: "blue",
    category: "Routing & Security",
  },
  {
    kind: "loadbalancer",
    label: "Load Balancer",
    description: "Traffic distribution across servers",
    icon: Network,
    color: "teal",
    category: "Routing & Security",
  },

  // Compute & Queue Tier
  {
    kind: "server",
    label: "App Server",
    description: "Core backend business logic",
    icon: Server,
    color: "cyan",
    category: "Compute & Queue",
  },
  {
    kind: "worker",
    label: "Background Worker",
    description: "Async task & queue consumer",
    icon: Cpu,
    color: "orange",
    category: "Compute & Queue",
  },
  {
    kind: "queue",
    label: "Message Queue",
    description: "Asynchronous pub/sub queue",
    icon: Activity,
    color: "pink",
    category: "Compute & Queue",
  },

  // Data & Storage Tier
  {
    kind: "cache",
    label: "Cache",
    description: "Fast in-memory cache layer",
    icon: Layers3,
    color: "amber",
    category: "Data & Storage",
  },
  {
    kind: "database",
    label: "Database",
    description: "Primary persistent database",
    icon: Database,
    color: "emerald",
    category: "Data & Storage",
  },
  {
    kind: "replica",
    label: "Database Replica",
    description: "Read replica & secondary standby",
    icon: Copy,
    color: "green",
    category: "Data & Storage",
  },
  {
    kind: "storage",
    label: "Object Storage",
    description: "Files, media & blob storage",
    icon: HardDrive,
    color: "indigo",
    category: "Data & Storage",
  },
];

/**
 * Computes React inline style for a node based on its kind and diagnostic status.
 * Applies visual indicators:
 * - SPOF: Red glowing border with drop shadow
 * - In Cycle: Amber glowing border
 * - Disconnected Orphan: Dashed border with reduced opacity
 * - Unreachable: Purple dashed border
 */
export function getNodeStyle(
  kind: ComponentKind,
  status: NodeStatus = {}
): React.CSSProperties {
  const style =
    nodeStyles[kind] || { background: "#F8FAFC", border: "#CBD5E1" };

  let border = `1px solid ${style.border}`;
  let boxShadow = "0 2px 8px rgba(15, 23, 42, 0.05)";
  let opacity = 1;

  if (status.isSpof) {
    border = "2px solid #EF4444";
    boxShadow = "0 0 16px rgba(239, 68, 68, 0.45)";
  } else if (status.isInCycle) {
    border = "2px solid #F59E0B";
    boxShadow = "0 0 16px rgba(245, 158, 11, 0.45)";
  } else if (status.isOrphan) {
    border = "2px dashed #94A3B8";
    opacity = 0.65;
  } else if (status.isUnreachable) {
    border = "2px dashed #8B5CF6";
    boxShadow = "0 0 12px rgba(139, 92, 246, 0.3)";
  }

  return {
    background: style.background,
    border,
    borderRadius: 12,
    padding: 14,
    width: 170,
    fontWeight: 600,
    fontSize: 13,
    color: "#172033",
    boxShadow,
    opacity,
  };
}

/**
 * Extracts NodeStatus diagnostics from an AnalysisResult for a given nodeId.
 */
export function getNodeStatusFromAnalysis(
  nodeId: string,
  analysisResult: AnalysisResult | null
): NodeStatus {
  if (!analysisResult) return {};

  const isSpof = analysisResult.spofs?.includes(nodeId) ?? false;
  const isOrphan = analysisResult.orphanNodes?.includes(nodeId) ?? false;
  const isInCycle =
    analysisResult.cycles?.some((cycle) => cycle.includes(nodeId)) ?? false;
  const isUnreachable =
    analysisResult.unreachableNodes?.includes(nodeId) ?? false;

  const spofFinding = isSpof
    ? analysisResult.findings.find(
        (f) =>
          (f.ruleId === "SPOF_CRITICAL_PATH" || f.isSpof) &&
          f.affectedNodes?.includes(nodeId)
      )
    : undefined;

  return {
    isSpof,
    isOrphan,
    isInCycle,
    isUnreachable,
    blastRadius: spofFinding?.blastRadius,
    dominates: spofFinding?.dominates,
  };
}

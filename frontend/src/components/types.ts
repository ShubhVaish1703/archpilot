import type { Node, Edge } from "@xyflow/react";
import type { ComponentType } from "react";

/**
 * All 14 supported component kinds in the ArchPilot architecture modeling engine.
 * Existing 8: client, api, loadbalancer, server, database, cache, queue, storage
 * Added 6: firewall, auth, cdn, dns, worker, replica
 */
export type ComponentKind =
  | "client"
  | "api"
  | "loadbalancer"
  | "server"
  | "database"
  | "cache"
  | "queue"
  | "storage"
  | "firewall"
  | "auth"
  | "cdn"
  | "dns"
  | "worker"
  | "replica";

/**
 * Edge connection types supported across graph engine and visual canvas:
 * - sync: Synchronous blocking call (Request/Response, RPC). Default.
 * - async: Asynchronous event, pub/sub, message queue transfer.
 * - replication: Data synchronization to read replica or backup instance.
 */
export type EdgeType = "sync" | "async" | "replication";

/**
 * Optional network protocols for edge connections.
 */
export type EdgeProtocol = "http" | "https" | "grpc" | "tcp" | "amqp";

/**
 * Edge payload stored in edge.data.
 */
export interface EdgeData {
  type?: EdgeType;
  protocol?: EdgeProtocol;
  encrypted?: boolean;
  label?: string;
  [key: string]: unknown;
}

/**
 * Component data stored in node.data.
 */
export interface ArchitectureNodeData {
  label: string;
  kind: ComponentKind;
  config?: Record<string, unknown>;
  isSpof?: boolean;
  blastRadius?: number;
  dominates?: string[];
  [key: string]: unknown;
}

/**
 * Strongly typed React Flow node and edge for ArchPilot.
 */
export type ArchitectureNode = Node<ArchitectureNodeData>;
export type ArchitectureEdge = Edge<EdgeData>;

/**
 * Finding severity scale.
 */
export type FindingSeverity = "CRITICAL" | "WARNING" | "INFO";

/**
 * Architectural diagnostic finding emitted by backend engine.
 */
export interface Finding {
  ruleId?: string;
  id?: string;
  type?: string;
  severity: FindingSeverity | "critical" | "warning" | "info";
  title: string;
  description: string;
  affectedNodes: string[];
  remediation?: string;
  recommendation?: string;
  isSpof?: boolean;
  blastRadius?: number;
  dominates?: string[];
}

/**
 * AI Generation Gatekeeper status.
 */
export type GatekeeperMode =
  | "BLANK_SLATE"
  | "COMPLETE_DESIGN"
  | "INCOMPLETE_DESIGN";

export interface GatekeeperStatus {
  canGenerateVariants: boolean;
  mode: GatekeeperMode;
  blockingCount: number;
  blockingFlaws: Finding[];
  reason: string | null;
}

/**
 * Scoring breakdown.
 */
export interface ScoringDimensions {
  security: number;
  reliability: number;
  scalability: number;
}

export interface SkippedRule {
  code: string;
  name: string;
  reason: string;
}

export interface AnalysisScoring {
  overall: number;
  dimensions: ScoringDimensions;
  partial: boolean;
  note: string;
  skippedRules: SkippedRule[];
}

export interface UserIntent {
  description: string;
  concerns: string;
}

/**
 * Full analysis report returned by POST /api/analyze.
 */
export interface AnalysisResult {
  timestamp: string;
  nodesCount: number;
  edgesCount: number;
  userIntent?: UserIntent | null;
  spofs: string[];
  cycles: string[][];
  orphanNodes?: string[];
  unreachableNodes?: string[];
  connectedComponentsCount?: number;
  findings: Finding[];
  scoring: AnalysisScoring;
  gatekeeper?: GatekeeperStatus;
  summary: string;
}

/**
 * Node visual diagnostic status for canvas rendering.
 */
export interface NodeStatus {
  isSpof?: boolean;
  isOrphan?: boolean;
  isInCycle?: boolean;
  isUnreachable?: boolean;
  blastRadius?: number;
  dominates?: string[];
}

/**
 * Palette categories for catalog display.
 */
export type ComponentCategory =
  | "Edge & Entry"
  | "Routing & Security"
  | "Compute & Queue"
  | "Data & Storage";

/**
 * Component catalog item definition for palette and node creation.
 */
export interface ComponentCatalogItem {
  kind: ComponentKind;
  label: string;
  description: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  color: string;
  category: ComponentCategory;
}

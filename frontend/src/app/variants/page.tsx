"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Handle,
  Position,
  ReactFlowProvider,
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  type Node,
  type Edge,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Download,
  Zap,
  Globe,
  Coins,
  Shield,
  Activity,
  Layers,
  ArrowRight,
  X,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertOctagon,
  Check,
  BookOpen,
  Cloud,
  Workflow,
  Network,
  Server,
  Database,
  Layers3,
  HardDrive,
} from "lucide-react";

export type ComponentKind =
  | "client"
  | "api"
  | "loadbalancer"
  | "server"
  | "database"
  | "cache"
  | "queue"
  | "storage";

type VariantId =
  | "cost_optimized"
  | "high_availability"
  | "high_throughput"
  | "global_distributed";

type ArchitectureNodeData = {
  label: string;
  kind: ComponentKind;
};

type VariantData = {
  id: VariantId;
  name: string;
  tagline: string;
  description: string;
  metrics: {
    targetQps: string;
    targetSla: string;
    estimatedCostTier: string;
    estimatedMonthlyCost: string;
    primaryBottleneckRisk: string;
  };
  tradeoffs: {
    pros: string[];
    cons: string[];
  };
  deepDive?: {
    dataFlowSteps: Array<{
      step: number;
      flow: string;
      type: string;
      description: string;
    }>;
    componentBreakdown: Array<{
      name: string;
      kind: string;
      roleAndContribution: string;
      whenToAvoid: string;
    }>;
  };
  engineAudit: {
    overall: number;
    dimensions: {
      security: number;
      reliability: number;
      scalability: number;
    };
    spofs: string[];
    findingsCount: number;
    resolvedRules: string[];
  };
  graph: {
    nodes: Node<ArchitectureNodeData>[];
    edges: Edge[];
  };
};

// Canonical component styling palette from home page
const nodeStyles: Record<
  ComponentKind,
  { background: string; border: string; text: string }
> = {
  client: { background: "#F5F3FF", border: "#C4B5FD", text: "#6D28D9" },
  api: { background: "#EFF6FF", border: "#93C5FD", text: "#1D4ED8" },
  loadbalancer: { background: "#F0FDFA", border: "#5EEAD4", text: "#0F766E" },
  server: { background: "#ECFEFF", border: "#67E8F9", text: "#0E7490" },
  database: { background: "#ECFDF5", border: "#6EE7B7", text: "#047857" },
  cache: { background: "#FFFBEB", border: "#FCD34D", text: "#B45309" },
  queue: { background: "#FDF2F8", border: "#F9A8D4", text: "#BE185D" },
  storage: { background: "#EEF2FF", border: "#A5B4FC", text: "#4338CA" },
};

// Custom Left-to-Right Architecture Node Component
// Explicit Left (Target) and Right (Source) handles eliminate arrow overlapping!
function ArchitectureCustomNode({ data }: { data: ArchitectureNodeData }) {
  const kind = data.kind || "server";
  const style = nodeStyles[kind] || nodeStyles.server;

  const IconComponent =
    kind === "client"
      ? Cloud
      : kind === "api"
      ? Workflow
      : kind === "loadbalancer"
      ? Network
      : kind === "server"
      ? Server
      : kind === "database"
      ? Database
      : kind === "cache"
      ? Layers3
      : kind === "queue"
      ? Activity
      : HardDrive;

  return (
    <div
      style={{
        background: style.background,
        border: `1.5px solid ${style.border}`,
      }}
      className="relative rounded-xl px-3 py-2 shadow-xs min-w-[145px] max-w-[170px] transition hover:shadow-md"
    >
      {/* Left Input Port (Target) */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !bg-indigo-600 !border-2 !border-white !rounded-full shadow-xs -ml-1"
      />

      <div className="flex items-center gap-2">
        <span
          style={{ color: style.text }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white/90 shadow-2xs"
        >
          <IconComponent size={14} />
        </span>
        <div className="min-w-0 flex-1">
          <span
            style={{ color: style.text }}
            className="block text-[8px] font-extrabold uppercase tracking-wider truncate"
          >
            {kind}
          </span>
          <h4 className="text-[11px] font-bold text-slate-800 truncate leading-tight mt-0.5">
            {data.label}
          </h4>
        </div>
      </div>

      {/* Right Output Port (Source) */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !bg-indigo-600 !border-2 !border-white !rounded-full shadow-xs -mr-1"
      />
    </div>
  );
}

function getComponentRoleAndAvoidance(label: string, kind: string, variantName?: string) {
  const l = label.toLowerCase();
  const k = kind.toLowerCase();

  if (k === "client") {
    return {
      roleAndContribution:
        "Client application entrypoint (Web, Mobile, or API consumer) capturing user interactions, authenticating sessions, and rendering real-time streaming tokens.",
      whenToAvoid:
        "Cannot be avoided for user-facing applications. For headless batch processing or internal ETL pipelines, automated cron triggers or webhooks replace client UI.",
    };
  }
  if (k === "api" || l.includes("gateway") || l.includes("proxy") || l.includes("rate limit") || l.includes("cdn") || l.includes("pop")) {
    return {
      roleAndContribution:
        "Perimeter API Gateway / Reverse Proxy providing TLS termination, token-bucket rate limiting to prevent quota exhaustion, CORS security, and intelligent request routing.",
      whenToAvoid:
        "In early internal development or single-box prototypes with <50 QPS and trusted callers, clients can talk directly to backend services.",
    };
  }
  if (k === "loadbalancer") {
    return {
      roleAndContribution:
        "Distributes incoming traffic across redundant compute nodes, performs continuous health probes, and eliminates ingress single points of failure.",
      whenToAvoid:
        "Can be postponed in single-instance MVP systems where uptime SLA is <99.0% and occasional deployment downtime is acceptable.",
    };
  }
  if (l.includes("gemini") || l.includes("llm") || l.includes("model") || l.includes("ai")) {
    return {
      roleAndContribution:
        "Foundation AI Model service providing high-speed generative reasoning, natural language comprehension, and real-time token streaming.",
      whenToAvoid:
        "Cannot avoid in generative AI systems; can switch between high-speed Flash models and reasoning Pro models depending on task complexity.",
    };
  }
  if (k === "cache" || l.includes("redis") || l.includes("memcached")) {
    return {
      roleAndContribution:
        "Ultra-fast in-memory key-value cache absorbing repetitive queries, sliding-window conversation turns, and hot data with sub-2ms latency.",
      whenToAvoid:
        "Can be avoided if database read queries consistently finish in <10ms and the database CPU remains comfortably below 50%.",
    };
  }
  if (k === "queue" || l.includes("kafka") || l.includes("rabbitmq") || l.includes("sqs") || l.includes("eventbridge")) {
    return {
      roleAndContribution:
        "Durable asynchronous message broker buffering sudden traffic surges, analytics telemetry, and heavy ingestion tasks without locking database tables.",
      whenToAvoid:
        "Can be avoided if all operations execute synchronously in under 100ms and concurrent write traffic is under 200 writes/sec.",
    };
  }
  if (k === "server" && (l.includes("worker") || l.includes("consumer") || l.includes("ingestion"))) {
    return {
      roleAndContribution:
        "Dedicated background worker fleet that pulls tasks from queues, isolates CPU-heavy jobs (document parsing, embedding generation), and commits batched updates.",
      whenToAvoid:
        "Can run as background threads within the main API server process until background tasks consume >20% of compute memory or CPU.",
    };
  }
  if (k === "server") {
    return {
      roleAndContribution:
        "Core stateless application server orchestrating business logic, input validation, streaming connections, and database interactions.",
      whenToAvoid:
        "Essential application compute tier; can be deployed as monolithic containers or serverless functions depending on operational budget.",
    };
  }
  if (k === "database" && (l.includes("vector") || l.includes("pgvector") || l.includes("pinecone") || l.includes("qdrant") || l.includes("milvus"))) {
    return {
      roleAndContribution:
        "Specialized vector database providing sub-15ms approximate nearest neighbor (HNSW/Cosine) similarity search to ground prompts in knowledge (RAG).",
      whenToAvoid:
        "Can be avoided if system does not use document retrieval or semantic search, or if document volume is under 10,000 chunks.",
    };
  }
  if (k === "database") {
    return {
      roleAndContribution:
        "Authoritative transactional persistence layer enforcing ACID compliance, relational integrity, durable state storage, and user credentials.",
      whenToAvoid:
        "Primary database cannot be avoided; read replicas and standby clusters can be postponed until read volume or 99.99% SLA requires them.",
    };
  }
  if (k === "storage" || l.includes("s3") || l.includes("bucket") || l.includes("blob")) {
    return {
      roleAndContribution:
        "Durable object store (e.g. S3 / GCS) engineered for high-availability storage of unstructured assets, uploaded files, and generated media.",
      whenToAvoid:
        "Can be omitted if system processes strictly structured text/numeric data and accepts zero user file or document uploads.",
    };
  }

  return {
    roleAndContribution: `Provides dedicated ${kind} tier functionality inside ${variantName || "the architecture"}.`,
    whenToAvoid: "Can be simplified or consolidated if system throughput and operational scope do not warrant dedicated tier isolation.",
  };
}

function resolveComponentBreakdown(variant: VariantData) {
  const breakdown = variant.deepDive?.componentBreakdown || [];
  const breakdownMap = new Map<string, { roleAndContribution: string; whenToAvoid: string }>();
  for (const item of breakdown) {
    if (item.name) breakdownMap.set(item.name.toLowerCase().trim(), item);
    if (item.kind) breakdownMap.set(item.kind.toLowerCase().trim(), item);
  }

  const nodes = variant.graph?.nodes || [];
  const fullBreakdown: Array<{ name: string; kind: string; roleAndContribution: string; whenToAvoid: string }> = [];
  const seenLabels = new Set<string>();

  for (const node of nodes) {
    const label = node.data?.label || node.id;
    const kind = node.data?.kind || "server";
    const normalizedKey = label.replace(/\s*(1|2|AZ-1|AZ-2|\(AZ-1\)|\(AZ-2\))\s*$/i, "").trim().toLowerCase();

    if (seenLabels.has(normalizedKey)) continue;
    seenLabels.add(normalizedKey);

    const match =
      breakdownMap.get(label.toLowerCase().trim()) ||
      breakdownMap.get(normalizedKey) ||
      breakdownMap.get(kind.toLowerCase());

    const defaults = getComponentRoleAndAvoidance(label, kind, variant.name);

    fullBreakdown.push({
      name: label,
      kind: kind,
      roleAndContribution: match?.roleAndContribution || defaults.roleAndContribution,
      whenToAvoid: match?.whenToAvoid || defaults.whenToAvoid,
    });
  }

  for (const item of breakdown) {
    const itemKey = (item.name || "").replace(/\s*(1|2|AZ-1|AZ-2|\(AZ-1\)|\(AZ-2\))\s*$/i, "").trim().toLowerCase();
    if (!seenLabels.has(itemKey) && !seenLabels.has((item.name || "").toLowerCase().trim())) {
      seenLabels.add(itemKey);
      fullBreakdown.push(item);
    }
  }

  return fullBreakdown;
}

// Initial 4 canonical variants matching backend generator with full worker pipelines
const defaultVariants: Record<VariantId, VariantData> = {
  cost_optimized: {
    id: "cost_optimized",
    name: "Cost-Optimized / Lean MVP",
    tagline: "Minimal monthly cloud spend with Redis session memory & direct Gemini 2.0 Flash integration.",
    description:
      "Lean production deployment for a Gemini-powered chatbot. Combines a streaming API server with in-memory Redis session caching for sliding-window multi-turn memory, an internal asynchronous task queue for document ingestion, and PostgreSQL with pgvector for hybrid storage (<$35/mo).",
    metrics: {
      targetQps: "Up to 300 QPS",
      targetSla: "99.0% (Single AZ)",
      estimatedCostTier: "$",
      estimatedMonthlyCost: "$25 - $45 / mo",
      primaryBottleneckRisk: "External Google Gemini API quota / rate limits under sudden traffic bursts",
    },
    tradeoffs: {
      pros: [
        "Extremely cost effective (<$45/mo) leveraging Gemini 2.0 Flash low-cost token pricing",
        "Redis sliding-window session cache guarantees sub-millisecond multi-turn context retrieval",
        "Background worker handles PDF/text embedding ingestion without blocking token streaming",
      ],
      cons: [
        "Single instance web server and database represent downtime risks during maintenance",
        "Single AZ deployment lacks automated multi-zone failover",
      ],
    },
    deepDive: {
      dataFlowSteps: [
        { step: 1, flow: "Chat Web/Mobile UI -> Reverse Proxy & Rate Limiter", type: "SYNC", description: "Client connects via HTTPS/SSE. Token bucket rate limiter prevents malicious API quota exhaustion." },
        { step: 2, flow: "Reverse Proxy -> Chat Orchestrator Server", type: "SYNC", description: "Proxies connection and initiates Server-Sent Events (SSE) token streaming handshake." },
        { step: 3, flow: "Chat Server -> Redis Session Context", type: "READ_WRITE", description: "Fetches last 10 turns of conversation history for prompt context injection." },
        { step: 4, flow: "Chat Server -> Google Gemini 2.0 Flash API", type: "SYNC", description: "Dispatches prompt with session context; streams returned tokens in real-time to client via SSE." },
        { step: 5, flow: "Chat Server -> PostgreSQL + pgvector DB", type: "WRITE", description: "Commits finalized user prompt and assistant response to persistent conversation log." },
        { step: 6, flow: "Chat Server -> Redis Task Queue", type: "ASYNC", description: "Enqueues uploaded document parsing and RAG embedding generation jobs." },
        { step: 7, flow: "Task Queue -> Async Ingestion Worker", type: "ASYNC", description: "Pulls document ingestion tasks sequentially without consuming web server memory." },
        { step: 8, flow: "Ingestion Worker -> DB & Object Storage", type: "WRITE", description: "Saves raw document files to S3 and writes text embeddings into pgvector for similarity search." }
      ],
      componentBreakdown: [
        {
          name: "Google Gemini 2.0 Flash API",
          kind: "api",
          roleAndContribution: "Primary foundation model providing high-speed reasoning, 1M+ context window, and low-latency token streaming.",
          whenToAvoid: "Cannot avoid in a Gemini chatbot; can switch between Gemini 2.0 Flash and 1.5 Pro depending on task complexity."
        },
        {
          name: "Redis Session Context Cache",
          kind: "cache",
          roleAndContribution: "Sliding-window in-memory store for active conversation turns, ensuring the LLM remembers previous turns without hitting DB.",
          whenToAvoid: "Avoid only if building a 1-turn stateless Q&A tool with zero conversation history."
        },
        {
          name: "PostgreSQL + pgvector",
          kind: "database",
          roleAndContribution: "Unified relational database storing user accounts, chat logs, and vector embeddings for semantic document search (RAG).",
          whenToAvoid: "In early prototypes with no document upload feature, standard PostgreSQL without pgvector is sufficient."
        },
        {
          name: "Async Ingestion Worker",
          kind: "server",
          roleAndContribution: "Background worker that chunks uploaded documents, generates embeddings, and indexes them into the vector store.",
          whenToAvoid: "Can be omitted if the chatbot does not support document uploads or background RAG indexing."
        }
      ]
    },
    engineAudit: {
      overall: 7.4,
      dimensions: { security: 10, reliability: 6.0, scalability: 7.0 },
      spofs: ["server-1", "api-1"],
      findingsCount: 4,
      resolvedRules: ["SEC_CLIENT_DIRECT_DB"],
    },
    graph: {
      nodes: [
        { id: "client-1", type: "default", position: { x: 50, y: 220 }, data: { label: "Chat Web/Mobile UI", kind: "client" } },
        { id: "api-1", type: "default", position: { x: 220, y: 220 }, data: { label: "Reverse Proxy & Rate Limiter", kind: "api" } },
        { id: "server-1", type: "default", position: { x: 420, y: 220 }, data: { label: "Chat Orchestrator Server", kind: "server" } },
        { id: "api-gemini", type: "default", position: { x: 630, y: 100 }, data: { label: "Google Gemini 2.0 Flash API", kind: "api" } },
        { id: "cache-1", type: "default", position: { x: 630, y: 220 }, data: { label: "Redis Session Context", kind: "cache" } },
        { id: "queue-1", type: "default", position: { x: 630, y: 350 }, data: { label: "Redis Task Queue", kind: "queue" } },
        { id: "worker-1", type: "default", position: { x: 790, y: 350 }, data: { label: "Async Ingestion Worker", kind: "server" } },
        { id: "db-1", type: "default", position: { x: 790, y: 180 }, data: { label: "PostgreSQL + pgvector", kind: "database" } },
        { id: "storage-1", type: "default", position: { x: 940, y: 350 }, data: { label: "Object Storage (S3)", kind: "storage" } },
      ],
      edges: [
        { id: "e-c-api", source: "client-1", target: "api-1", label: "HTTPS / SSE Stream", animated: true },
        { id: "e-api-srv", source: "api-1", target: "server-1", label: "Proxy Stream Handshake", animated: true },
        { id: "e-srv-gemini", source: "server-1", target: "api-gemini", label: "Stream Prompt Tokens", animated: true },
        { id: "e-srv-cache", source: "server-1", target: "cache-1", label: "Sliding Window Context", animated: true },
        { id: "e-srv-db", source: "server-1", target: "db-1", label: "Persist Chat Turns", animated: true },
        { id: "e-srv-store", source: "server-1", target: "storage-1", label: "Direct File Presign", animated: true },
        { id: "e-srv-queue", source: "server-1", target: "queue-1", label: "Enqueue Doc Ingestion", animated: true },
        { id: "e-queue-worker", source: "queue-1", target: "worker-1", label: "Pulls Ingestion Job", animated: true },
        { id: "e-worker-db", source: "worker-1", target: "db-1", label: "Index Embeddings", animated: true },
        { id: "e-worker-store", source: "worker-1", target: "storage-1", label: "Store Parsed Assets", animated: true },
      ],
    },
  },
  high_availability: {
    id: "high_availability",
    name: "High-Availability Multi-AZ Tier",
    tagline: "Zero-SPOF resilient architecture with automated multi-zone failover and redundant Gemini endpoints.",
    description:
      "Enterprise Multi-AZ deployment for production chatbot workloads. Redundant streaming load balancers distribute active WebSocket/SSE chat connections across stateless orchestrator fleets, backed by an HA RabbitMQ cluster, Multi-AZ Aurora database, dedicated vector index, and Gemini model fallback routing.",
    metrics: {
      targetQps: "10,000+ QPS",
      targetSla: "99.99% (Four Nines)",
      estimatedCostTier: "$$$",
      estimatedMonthlyCost: "$420 - $680 / mo",
      primaryBottleneckRisk:
        "Cross-AZ synchronization latency for high-concurrency Redis Sentinel chat sessions",
    },
    tradeoffs: {
      pros: [
        "Zero single points of failure across ingress, chat streaming, worker, and persistence tiers",
        "Automated failover between Gemini 2.0 Flash (Primary) and Gemini 1.5 Pro (Fallback)",
        "Dedicated Vector DB cluster provides sub-15ms semantic RAG retrieval",
      ],
      cons: [
        "Higher baseline monthly cloud spend for idle Multi-AZ standby instances",
        "Cross-AZ data transfer fees between streaming servers and database cluster",
      ],
    },
    deepDive: {
      dataFlowSteps: [
        { step: 1, flow: "Client App -> CloudFront Edge Gateways", type: "SYNC", description: "Route53 Anycast resolves client to closest healthy Edge Gateway AZ for SSL termination." },
        { step: 2, flow: "Edge Gateways -> Streaming Load Balancers", type: "SYNC", description: "Dual active-active load balancers multiplex long-lived HTTP/2 Server-Sent Event streaming connections." },
        { step: 3, flow: "Load Balancers -> Chat Orchestrator Fleets (AZ-1 & AZ-2)", type: "SYNC", description: "Stateless chat servers auto-scale across availability zones to handle concurrent conversation volume." },
        { step: 4, flow: "Chat Fleets -> Google Gemini API Egress Gateway", type: "SYNC", description: "Calls Gemini 2.0 Flash with circuit breakers, exponential backoff, and automated fallback to Gemini Pro." },
        { step: 5, flow: "Chat Fleets -> Redis Sentinel Session Cache", type: "READ_WRITE", description: "Replicated session store provides zero-data-loss conversation memory across AZ failovers." },
        { step: 6, flow: "Chat Fleets -> Aurora PostgreSQL & Managed Vector DB", type: "READ_WRITE", description: "Executes cosine similarity RAG search against Vector DB and commits user chat logs to Aurora." },
        { step: 7, flow: "Chat Fleets -> HA Task Queue Cluster (RabbitMQ/SQS)", type: "ASYNC", description: "Buffers asynchronous document processing, background conversation summaries, and audit logs." },
        { step: 8, flow: "HA Queue -> Multi-AZ Ingestion Worker Fleet", type: "ASYNC", description: "Distributed consumer workers chunk user documents and compute embeddings without latency impact on chat." },
        { step: 9, flow: "Worker Fleet -> Multi-AZ Aurora DB & S3 Storage", type: "WRITE", description: "Indexes computed embeddings to vector store and stores raw files in Multi-AZ S3." }
      ],
      componentBreakdown: [
        {
          name: "Dual Streaming Load Balancers",
          kind: "loadbalancer",
          roleAndContribution: "Eliminates ingress SPOF and provides persistent HTTP/2 SSE connection multiplexing for thousands of active chat sessions.",
          whenToAvoid: "In early MVP stage with <100 concurrent users, a single managed reverse proxy is adequate."
        },
        {
          name: "Google Gemini API Egress Gateway",
          kind: "api",
          roleAndContribution: "Manages egress to Gemini LLM with circuit breakers, timeout thresholds, and automated failover between models.",
          whenToAvoid: "Essential for reliable production AI services to avoid third-party provider outages taking down the application."
        },
        {
          name: "Managed Vector DB Cluster",
          kind: "database",
          roleAndContribution: "Dedicated vector database (Pinecone/Qdrant/Milvus) providing sub-15ms HNSW similarity search for RAG grounding.",
          whenToAvoid: "Can use PostgreSQL with pgvector extension until document embedding count exceeds 500,000 vectors."
        },
        {
          name: "Multi-AZ Ingestion Worker Fleet",
          kind: "server",
          roleAndContribution: "Auto-scaled worker fleet dedicated to async background tasks (document chunking, summarization, embedding generation).",
          whenToAvoid: "Can run as background tasks on the app server until async document ingestion exceeds 20% of CPU."
        }
      ]
    },
    engineAudit: {
      overall: 10.0,
      dimensions: { security: 10, reliability: 10, scalability: 10 },
      spofs: [],
      findingsCount: 0,
      resolvedRules: ["SPOF_CRITICAL_PATH", "SEC_CLIENT_DIRECT_DB"],
    },
    graph: {
      nodes: [
        { id: "client-1", type: "default", position: { x: 50, y: 220 }, data: { label: "Chat Web & Mobile UI", kind: "client" } },
        { id: "api-1", type: "default", position: { x: 200, y: 140 }, data: { label: "CloudFront / Edge GW 1", kind: "api" } },
        { id: "api-2", type: "default", position: { x: 200, y: 300 }, data: { label: "CloudFront / Edge GW 2", kind: "api" } },
        { id: "lb-1", type: "default", position: { x: 350, y: 140 }, data: { label: "Streaming Load Balancer 1", kind: "loadbalancer" } },
        { id: "lb-2", type: "default", position: { x: 350, y: 300 }, data: { label: "Streaming Load Balancer 2", kind: "loadbalancer" } },
        { id: "server-1", type: "default", position: { x: 500, y: 140 }, data: { label: "Chat Orchestrator AZ-1", kind: "server" } },
        { id: "server-2", type: "default", position: { x: 500, y: 300 }, data: { label: "Chat Orchestrator AZ-2", kind: "server" } },
        { id: "api-gemini", type: "default", position: { x: 670, y: 60 }, data: { label: "Gemini API Egress Gateway", kind: "api" } },
        { id: "cache-1", type: "default", position: { x: 670, y: 170 }, data: { label: "Redis Sentinel Session Cache", kind: "cache" } },
        { id: "queue-1", type: "default", position: { x: 670, y: 390 }, data: { label: "HA Task Queue (RabbitMQ)", kind: "queue" } },
        { id: "worker-1", type: "default", position: { x: 810, y: 390 }, data: { label: "Multi-AZ Ingestion Worker Fleet", kind: "server" } },
        { id: "db-1", type: "default", position: { x: 810, y: 140 }, data: { label: "Multi-AZ Aurora PostgreSQL", kind: "database" } },
        { id: "db-vector", type: "default", position: { x: 810, y: 260 }, data: { label: "Managed Vector DB Cluster", kind: "database" } },
        { id: "storage-1", type: "default", position: { x: 950, y: 390 }, data: { label: "Multi-AZ S3 Document Storage", kind: "storage" } },
      ],
      edges: [
        { id: "e-c-a1", source: "client-1", target: "api-1", label: "HTTPS / SSE", animated: true },
        { id: "e-c-a2", source: "client-1", target: "api-2", label: "HTTPS / SSE", animated: true },
        { id: "e-a1-lb1", source: "api-1", target: "lb-1", animated: true },
        { id: "e-a1-lb2", source: "api-1", target: "lb-2", animated: true },
        { id: "e-a2-lb1", source: "api-2", target: "lb-1", animated: true },
        { id: "e-a2-lb2", source: "api-2", target: "lb-2", animated: true },
        { id: "e-lb1-s1", source: "lb-1", target: "server-1", animated: true },
        { id: "e-lb1-s2", source: "lb-1", target: "server-2", animated: true },
        { id: "e-lb2-s1", source: "lb-2", target: "server-1", animated: true },
        { id: "e-lb2-s2", source: "lb-2", target: "server-2", animated: true },
        { id: "e-s1-gemini", source: "server-1", target: "api-gemini", label: "Stream Gemini Tokens", animated: true },
        { id: "e-s2-gemini", source: "server-2", target: "api-gemini", label: "Stream Gemini Tokens", animated: true },
        { id: "e-s1-cache", source: "server-1", target: "cache-1", label: "Session Sync", animated: true },
        { id: "e-s2-cache", source: "server-2", target: "cache-1", label: "Session Sync", animated: true },
        { id: "e-s1-db", source: "server-1", target: "db-1", label: "Chat Logs", animated: true },
        { id: "e-s2-db", source: "server-2", target: "db-1", label: "Chat Logs", animated: true },
        { id: "e-s1-vec", source: "server-1", target: "db-vector", label: "RAG Cosine Query", animated: true },
        { id: "e-s2-vec", source: "server-2", target: "db-vector", label: "RAG Cosine Query", animated: true },
        { id: "e-s1-store", source: "server-1", target: "storage-1", animated: true },
        { id: "e-s2-store", source: "server-2", target: "storage-1", animated: true },
        { id: "e-s1-q", source: "server-1", target: "queue-1", label: "Dispatch Ingestion Task", animated: true },
        { id: "e-s2-q", source: "server-2", target: "queue-1", label: "Dispatch Ingestion Task", animated: true },
        { id: "e-q-w", source: "queue-1", target: "worker-1", label: "Pulls Task Batch", animated: true },
        { id: "e-w-db", source: "worker-1", target: "db-1", label: "Commit Metadata", animated: true },
        { id: "e-w-vec", source: "worker-1", target: "db-vector", label: "Upsert Vectors", animated: true },
        { id: "e-w-store", source: "worker-1", target: "storage-1", label: "Store Parsed Files", animated: true },
      ],
    },
  },
  high_throughput: {
    id: "high_throughput",
    name: "High-Throughput / Low-Latency Tier",
    tagline: "Sub-15ms TTFT with Semantic Prompt Caching, Token-Bucket Rate Limiting & Kafka Event Ingestion.",
    description:
      "Optimized for extreme concurrency and high-frequency chatbot interactions. Integrates an in-memory Semantic Prompt Cache that absorbs 60%+ of recurring queries before hitting Gemini API, an HTTP/2 streaming connection fleet, Kafka event stream, and distributed Vector DB.",
    metrics: {
      targetQps: "50,000+ QPS",
      targetSla: "99.95% (<15ms Cache Latency)",
      estimatedCostTier: "$$$$",
      estimatedMonthlyCost: "$750 - $1,200 / mo",
      primaryBottleneckRisk:
        "Vector DB index ingestion throughput during concurrent massive document uploads",
    },
    tradeoffs: {
      pros: [
        "Semantic prompt cache eliminates 60%+ of Gemini API calls, saving thousands in token billing",
        "Token-bucket rate limiter protects backend and LLM quota from runaway billing spikes",
        "Kafka event streaming decouples high-throughput chat telemetry and background embedding creation",
      ],
      cons: [
        "Cache invalidation complexity for dynamic or real-time prompt responses",
        "Higher infrastructure footprint requiring specialized Kafka and Redis cluster operations",
      ],
    },
    deepDive: {
      dataFlowSteps: [
        { step: 1, flow: "High QPS Chat Clients -> Token-Bucket Rate Limiters", type: "SYNC", description: "Validates per-user token quotas and blocks abusive traffic before touching application servers." },
        { step: 2, flow: "Rate Limiters -> HTTP/2 SSE Streaming Load Balancers", type: "SYNC", description: "Distributes high-concurrency streaming connections evenly across the chat compute cluster." },
        { step: 3, flow: "Streaming LBs -> Chat Streaming Fleet (Nodes A & B)", type: "SYNC", description: "Asynchronous event-driven Node.js/Go servers managing tens of thousands of simultaneous SSE streams." },
        { step: 4, flow: "Chat Fleet -> Semantic Prompt Cache (Redis)", type: "READ", description: "Performs semantic vector check; if exact/similar query was answered recently, returns cached response instantly (<10ms)." },
        { step: 5, flow: "Chat Fleet -> Google Gemini 2.0 Flash Egress Pool", type: "SYNC", description: "On cache miss, streams response tokens from Gemini 2.0 Flash with parallel connection pooling." },
        { step: 6, flow: "Chat Fleet -> Sliding Window Session Memory", type: "READ_WRITE", description: "Maintains real-time active conversation state in high-speed Redis cluster." },
        { step: 7, flow: "Chat Fleet -> Partitioned Kafka Event Stream", type: "ASYNC", description: "Batches chat logs, token usage metrics, and document embedding jobs into partitioned Kafka topics." },
        { step: 8, flow: "Kafka Stream -> Partitioned Ingestion Worker Fleet", type: "ASYNC", description: "Consumer worker groups process batch embeddings with Gemini text-embedding-004." },
        { step: 9, flow: "Workers & Servers -> Sharded DB & Distributed Vector DB", type: "WRITE", description: "Writes vectorized chunks to Qdrant/Milvus and stateful records to PostgreSQL sharded cluster." }
      ],
      componentBreakdown: [
        {
          name: "Semantic Prompt Cache (Redis)",
          kind: "cache",
          roleAndContribution: "Caches LLM answers using vector embeddings; identical or semantically equivalent questions return in <10ms with $0 token cost.",
          whenToAvoid: "Avoid if conversations are 100% uniquely personalized and user queries never repeat."
        },
        {
          name: "Token-Bucket Rate Limiter",
          kind: "api",
          roleAndContribution: "Strictly enforces per-user token budgets and request quotas, preventing API billing shocks and DDoS attacks.",
          whenToAvoid: "Avoid in internal closed-network apps with trusted users and prepaid enterprise quotas."
        },
        {
          name: "Partitioned Kafka Event Stream",
          kind: "queue",
          roleAndContribution: "High-throughput log buffer capable of ingesting millions of token events per second without dropping messages.",
          whenToAvoid: "Can use RabbitMQ or Redis Streams until event volume exceeds 25,000 events/second."
        },
        {
          name: "Distributed Vector DB (Qdrant/Milvus)",
          kind: "database",
          roleAndContribution: "High-throughput vector search engine purpose-built for low-latency similarity queries across millions of documents.",
          whenToAvoid: "Can use PostgreSQL pgvector until document volume exceeds 1,000,000 vectors."
        }
      ]
    },
    engineAudit: {
      overall: 10.0,
      dimensions: { security: 10, reliability: 10, scalability: 10 },
      spofs: [],
      findingsCount: 0,
      resolvedRules: ["REL_QUEUE_NO_CONSUMER", "SPOF_CRITICAL_PATH"],
    },
    graph: {
      nodes: [
        { id: "client-1", type: "default", position: { x: 50, y: 220 }, data: { label: "High QPS Chat Clients", kind: "client" } },
        { id: "api-1", type: "default", position: { x: 190, y: 140 }, data: { label: "Token Rate Limiter 1", kind: "api" } },
        { id: "api-2", type: "default", position: { x: 190, y: 300 }, data: { label: "Token Rate Limiter 2", kind: "api" } },
        { id: "lb-1", type: "default", position: { x: 340, y: 140 }, data: { label: "HTTP/2 Streaming LB 1", kind: "loadbalancer" } },
        { id: "lb-2", type: "default", position: { x: 340, y: 300 }, data: { label: "HTTP/2 Streaming LB 2", kind: "loadbalancer" } },
        { id: "server-1", type: "default", position: { x: 490, y: 140 }, data: { label: "Chat Streaming Fleet A", kind: "server" } },
        { id: "server-2", type: "default", position: { x: 490, y: 300 }, data: { label: "Chat Streaming Fleet B", kind: "server" } },
        { id: "api-gemini", type: "default", position: { x: 660, y: 60 }, data: { label: "Gemini 2.0 Flash Egress Pool", kind: "api" } },
        { id: "cache-1", type: "default", position: { x: 660, y: 170 }, data: { label: "Semantic Prompt Cache", kind: "cache" } },
        { id: "cache-2", type: "default", position: { x: 660, y: 270 }, data: { label: "Session Sliding Memory", kind: "cache" } },
        { id: "queue-1", type: "default", position: { x: 660, y: 390 }, data: { label: "Kafka Event Stream", kind: "queue" } },
        { id: "worker-1", type: "default", position: { x: 800, y: 390 }, data: { label: "Batch Ingestion Worker", kind: "server" } },
        { id: "db-1", type: "default", position: { x: 800, y: 140 }, data: { label: "Sharded Postgres Cluster", kind: "database" } },
        { id: "db-vector", type: "default", position: { x: 800, y: 260 }, data: { label: "Distributed Vector DB", kind: "database" } },
        { id: "storage-1", type: "default", position: { x: 940, y: 390 }, data: { label: "Object Storage (S3)", kind: "storage" } },
      ],
      edges: [
        { id: "e-c-a1", source: "client-1", target: "api-1", label: "Token Ingress", animated: true },
        { id: "e-c-a2", source: "client-1", target: "api-2", label: "Token Ingress", animated: true },
        { id: "e-a1-lb1", source: "api-1", target: "lb-1", animated: true },
        { id: "e-a1-lb2", source: "api-1", target: "lb-2", animated: true },
        { id: "e-a2-lb1", source: "api-2", target: "lb-1", animated: true },
        { id: "e-a2-lb2", source: "api-2", target: "lb-2", animated: true },
        { id: "e-lb1-s1", source: "lb-1", target: "server-1", animated: true },
        { id: "e-lb1-s2", source: "lb-1", target: "server-2", animated: true },
        { id: "e-lb2-s1", source: "lb-2", target: "server-1", animated: true },
        { id: "e-lb2-s2", source: "lb-2", target: "server-2", animated: true },
        { id: "e-s1-gemini", source: "server-1", target: "api-gemini", label: "Prompt Stream", animated: true },
        { id: "e-s2-gemini", source: "server-2", target: "api-gemini", label: "Prompt Stream", animated: true },
        { id: "e-s1-c1", source: "server-1", target: "cache-1", label: "Semantic Lookup", animated: true },
        { id: "e-s2-c1", source: "server-2", target: "cache-1", label: "Semantic Lookup", animated: true },
        { id: "e-s1-c2", source: "server-1", target: "cache-2", label: "Sliding Window", animated: true },
        { id: "e-s2-c2", source: "server-2", target: "cache-2", label: "Sliding Window", animated: true },
        { id: "e-s1-db", source: "server-1", target: "db-1", label: "Sharded Log", animated: true },
        { id: "e-s2-db", source: "server-2", target: "db-1", label: "Sharded Log", animated: true },
        { id: "e-s1-vec", source: "server-1", target: "db-vector", label: "Sub-10ms Cosine", animated: true },
        { id: "e-s2-vec", source: "server-2", target: "db-vector", label: "Sub-10ms Cosine", animated: true },
        { id: "e-s1-store", source: "server-1", target: "storage-1", animated: true },
        { id: "e-s2-store", source: "server-2", target: "storage-1", animated: true },
        { id: "e-s1-q", source: "server-1", target: "queue-1", label: "Emit Batch Log", animated: true },
        { id: "e-s2-q", source: "server-2", target: "queue-1", label: "Emit Batch Log", animated: true },
        { id: "e-q-w", source: "queue-1", target: "worker-1", label: "Pull Event Batch", animated: true },
        { id: "e-w-db", source: "worker-1", target: "db-1", label: "Bulk Commit", animated: true },
        { id: "e-w-vec", source: "worker-1", target: "db-vector", label: "Bulk Upsert", animated: true },
        { id: "e-w-store", source: "worker-1", target: "storage-1", label: "Store Documents", animated: true },
      ],
    },
  },
  global_distributed: {
    id: "global_distributed",
    name: "Global Distributed Multi-Region",
    tagline: "Worldwide Anycast edge termination with multi-region Gemini endpoints & replicated vector indices.",
    description:
      "Deploys Edge CDN Point of Presence (PoP) locations worldwide to terminate chat connections within 50ms of global users. Features regional compute fleets routing to Google Cloud Vertex AI multi-region Gemini endpoints, cross-region replicated session memory, and globally synchronized vector stores.",
    metrics: {
      targetQps: "100,000+ QPS",
      targetSla: "99.999% (Five Nines)",
      estimatedCostTier: "$$$$",
      estimatedMonthlyCost: "$1,400+ / mo",
      primaryBottleneckRisk:
        "Cross-region eventual consistency replication delay for conversation state updates",
    },
    tradeoffs: {
      pros: [
        "Sub-50ms Time To First Token (TTFT) for users across Americas, Europe, and Asia-Pacific",
        "Full continental disaster recovery; regional cloud outages fail over without conversational interruption",
        "Vertex AI multi-region Gemini routing avoids regional quota and hardware shortages",
      ],
      cons: [
        "Highest monthly cloud spend due to multi-region infrastructure and cross-region egress bandwidth",
        "Complex conflict resolution for globally distributed chat transcripts",
      ],
    },
    deepDive: {
      dataFlowSteps: [
        { step: 1, flow: "Global Users -> CloudFront / Cloudflare Edge PoPs", type: "SYNC", description: "Anycast DNS routes user to nearest edge location (<30ms) for TLS termination and static asset caching." },
        { step: 2, flow: "Edge PoPs -> Regional Streaming Load Balancers (US / EU)", type: "SYNC", description: "Routes token streaming traffic over AWS/GCP global fiber backbones to the nearest regional compute cluster." },
        { step: 3, flow: "Regional Streaming LBs -> Regional Chat Fleets (US / EU)", type: "SYNC", description: "Local compute clusters terminate SSE connections and manage local sliding-window conversation turns." },
        { step: 4, flow: "Regional Chat Fleets -> Vertex AI Multi-Region Gemini Endpoint", type: "SYNC", description: "Routes prompts to nearest healthy Google Cloud Gemini region with automatic cross-region failover." },
        { step: 5, flow: "Regional Chat Fleets -> Globally Replicated Context Cache", type: "READ_WRITE", description: "Active conversation state synchronized across regions using Redis Enterprise / DynamoDB Global Tables." },
        { step: 6, flow: "Regional Chat Fleets -> Global Multi-Region DB & Replicated Vectors", type: "READ_WRITE", description: "Local low-latency RAG similarity searches against replicated vector indices." },
        { step: 7, flow: "Regional Chat Fleets -> Global EventBridge Stream", type: "ASYNC", description: "Publishes background ingestion and analytics events across continental regions." },
        { step: 8, flow: "Global EventBridge -> Distributed RAG Ingestion Worker Fleet", type: "ASYNC", description: "Workers ingest documents and compute multi-language embeddings in parallel." },
        { step: 9, flow: "Workers -> Global Multi-Region DB & Cross-Region S3 Storage", type: "WRITE", description: "Replicates vectors and document assets across US, EU, and APAC storage buckets." }
      ],
      componentBreakdown: [
        {
          name: "CloudFront Anycast Edge PoPs",
          kind: "api",
          roleAndContribution: "Terminates user TLS at 300+ edge locations globally, reducing initial connection establishment from 300ms to <30ms.",
          whenToAvoid: "Unnecessary if user base is concentrated within a single country or geographical zone."
        },
        {
          name: "Vertex AI Multi-Region Gemini Endpoint",
          kind: "api",
          roleAndContribution: "Accesses Gemini foundation models across multiple Google Cloud regions to guarantee quota availability and zero regional downtime.",
          whenToAvoid: "Direct Google AI Studio API is simpler if multi-region enterprise compliance is not required."
        },
        {
          name: "Globally Distributed Multi-Region DB",
          kind: "database",
          roleAndContribution: "Active-active multi-region database (DynamoDB Global Tables / CockroachDB) providing local read/write access worldwide.",
          whenToAvoid: "Can use a primary database with read replicas until global users require write-local performance."
        },
        {
          name: "Cross-Region Replicated S3 Storage",
          kind: "storage",
          roleAndContribution: "Automatically replicates user uploaded files and chat transcripts across geographical continents for disaster recovery.",
          whenToAvoid: "Can use standard single-region S3 with cross-region backup snapshots until 99.999% SLA is required."
        }
      ]
    },
    engineAudit: {
      overall: 10.0,
      dimensions: { security: 10, reliability: 10, scalability: 10 },
      spofs: [],
      findingsCount: 0,
      resolvedRules: ["SPOF_CRITICAL_PATH"],
    },
    graph: {
      nodes: [
        { id: "client-1", type: "default", position: { x: 50, y: 220 }, data: { label: "Global Chat Users", kind: "client" } },
        { id: "cdn-1", type: "default", position: { x: 190, y: 140 }, data: { label: "Edge CDN PoP 1", kind: "api" } },
        { id: "cdn-2", type: "default", position: { x: 190, y: 300 }, data: { label: "Edge CDN PoP 2", kind: "api" } },
        { id: "lb-us", type: "default", position: { x: 340, y: 140 }, data: { label: "Regional Streaming LB (US)", kind: "loadbalancer" } },
        { id: "lb-eu", type: "default", position: { x: 340, y: 300 }, data: { label: "Regional Streaming LB (EU)", kind: "loadbalancer" } },
        { id: "server-reg1", type: "default", position: { x: 490, y: 140 }, data: { label: "Regional Chat Fleet (US)", kind: "server" } },
        { id: "server-reg2", type: "default", position: { x: 490, y: 300 }, data: { label: "Regional Chat Fleet (EU)", kind: "server" } },
        { id: "api-gemini", type: "default", position: { x: 660, y: 60 }, data: { label: "Vertex AI Gemini Endpoint", kind: "api" } },
        { id: "cache-1", type: "default", position: { x: 660, y: 190 }, data: { label: "Replicated Context Cache", kind: "cache" } },
        { id: "queue-1", type: "default", position: { x: 660, y: 350 }, data: { label: "Global EventBridge Stream", kind: "queue" } },
        { id: "worker-1", type: "default", position: { x: 800, y: 350 }, data: { label: "Distributed RAG Worker", kind: "server" } },
        { id: "db-global", type: "default", position: { x: 800, y: 140 }, data: { label: "Global Multi-Region DB", kind: "database" } },
        { id: "db-vector", type: "default", position: { x: 800, y: 240 }, data: { label: "Replicated Vector Index", kind: "database" } },
        { id: "storage-1", type: "default", position: { x: 940, y: 350 }, data: { label: "Cross-Region S3 Storage", kind: "storage" } },
      ],
      edges: [
        { id: "e-c-cdn1", source: "client-1", target: "cdn-1", label: "Anycast Ingress", animated: true },
        { id: "e-c-cdn2", source: "client-1", target: "cdn-2", label: "Anycast Ingress", animated: true },
        { id: "e-cdn1-lbus", source: "cdn-1", target: "lb-us", animated: true },
        { id: "e-cdn1-lbeu", source: "cdn-1", target: "lb-eu", animated: true },
        { id: "e-cdn2-lbus", source: "cdn-2", target: "lb-us", animated: true },
        { id: "e-cdn2-lbeu", source: "cdn-2", target: "lb-eu", animated: true },
        { id: "e-lbus-s1", source: "lb-us", target: "server-reg1", animated: true },
        { id: "e-lbus-s2", source: "lb-us", target: "server-reg2", animated: true },
        { id: "e-lbeu-s1", source: "lb-eu", target: "server-reg1", animated: true },
        { id: "e-lbeu-s2", source: "lb-eu", target: "server-reg2", animated: true },
        { id: "e-s1-gemini", source: "server-reg1", target: "api-gemini", label: "Multi-Region Stream", animated: true },
        { id: "e-s2-gemini", source: "server-reg2", target: "api-gemini", label: "Multi-Region Stream", animated: true },
        { id: "e-s1-cache", source: "server-reg1", target: "cache-1", label: "Global Context Sync", animated: true },
        { id: "e-s2-cache", source: "server-reg2", target: "cache-1", label: "Global Context Sync", animated: true },
        { id: "e-s1-db", source: "server-reg1", target: "db-global", label: "Local Read/Write", animated: true },
        { id: "e-s2-db", source: "server-reg2", target: "db-global", label: "Local Read/Write", animated: true },
        { id: "e-s1-vec", source: "server-reg1", target: "db-vector", label: "Vector Search", animated: true },
        { id: "e-s2-vec", source: "server-reg2", target: "db-vector", label: "Vector Search", animated: true },
        { id: "e-s1-store", source: "server-reg1", target: "storage-1", animated: true },
        { id: "e-s2-store", source: "server-reg2", target: "storage-1", animated: true },
        { id: "e-s1-q", source: "server-reg1", target: "queue-1", label: "Publish Event", animated: true },
        { id: "e-s2-q", source: "server-reg2", target: "queue-1", label: "Publish Event", animated: true },
        { id: "e-q-w", source: "queue-1", target: "worker-1", label: "Cross-Region Consume", animated: true },
        { id: "e-w-db", source: "worker-1", target: "db-global", label: "Async State Sync", animated: true },
        { id: "e-w-vec", source: "worker-1", target: "db-vector", label: "Replicate Vectors", animated: true },
        { id: "e-w-store", source: "worker-1", target: "storage-1", label: "Replicate Assets", animated: true },
      ],
    },
  },
};

type OriginalAnalysisData = {
  timestamp: string;
  scoring: {
    overall: number;
    dimensions: {
      security: number;
      reliability: number;
      scalability: number;
    };
    partial?: boolean;
    note?: string;
  };
  spofs: string[];
  cycles: string[][];
  findings: Array<{
    ruleId: string;
    severity: string;
    title: string;
    description: string;
    remediation: string;
    affectedNodes?: string[];
  }>;
  summary: string;
};

const defaultOriginalAnalysis: OriginalAnalysisData = {
  timestamp: new Date().toISOString(),
  scoring: {
    overall: 4.8,
    dimensions: {
      security: 6.0,
      reliability: 3.5,
      scalability: 5.0,
    },
    partial: true,
    note: "Evaluated baseline topology without redundancy or caching",
  },
  spofs: ["server-1", "db-1"],
  cycles: [],
  findings: [
    {
      ruleId: "SPOF_CRITICAL_PATH",
      severity: "CRITICAL",
      title: "Single Point of Failure (SPOF)",
      description: "App Server and Database have no failover replicas or redundancy.",
      remediation: "Deploy multi-AZ server replicas and database read/standby replicas behind a load balancer.",
      affectedNodes: ["server-1", "db-1"],
    },
    {
      ruleId: "UNDER_NO_LB_MULTI_SERVER",
      severity: "WARNING",
      title: "Direct Client Ingress Without Load Balancing",
      description: "Direct ingress limits elastic scale and high availability routing.",
      remediation: "Deploy an Application Load Balancer in front of compute tiers.",
      affectedNodes: ["server-1"],
    },
  ],
  summary: "Baseline architecture exhibits 2 single points of failure and lacks tiered load distribution.",
};

/**
 * Automatically calculates spacious, non-overlapping coordinates for any architecture graph.
 * Ensures 260px horizontal column spacing and staggers asynchronous pipelines vertically.
 */
function layoutArchitectureGraph(
  nodes: Node<ArchitectureNodeData>[]
): Node<ArchitectureNodeData>[] {
  if (!nodes || nodes.length === 0) return [];

  // Group nodes by functional architectural role
  const roles: Record<string, Node<ArchitectureNodeData>[]> = {
    client: [],
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

    if (kind === "client") {
      roles.client.push(node);
    } else if (kind === "api" || kind === "loadbalancer") {
      roles.ingress.push(node);
    } else if (kind === "cache") {
      roles.cache.push(node);
    } else if (kind === "queue") {
      roles.queue.push(node);
    } else if (kind === "database" || kind === "storage") {
      roles.storage.push(node);
    } else if (
      label.includes("worker") ||
      label.includes("consumer") ||
      label.includes("ingestion") ||
      label.includes("transcoder") ||
      label.includes("ledger") ||
      label.includes("task")
    ) {
      roles.worker.push(node);
    } else {
      roles.compute.push(node);
    }
  });

  const COL_X = {
    client: 60,
    ingress: 320,
    compute: 580,
    queue: 840,
    cache: 840,
    worker: 1100,
    storage: 1360,
  };

  const getStaggeredY = (index: number, total: number, baseY = 200, stepY = 140) => {
    if (total <= 1) return baseY;
    const startY = baseY - ((total - 1) * stepY) / 2;
    return startY + index * stepY;
  };

  const nodePositions = new Map<string, { x: number; y: number }>();

  roles.client.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.client,
      y: getStaggeredY(i, roles.client.length, 200),
    })
  );

  roles.ingress.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.ingress,
      y: getStaggeredY(i, roles.ingress.length, 200),
    })
  );

  roles.compute.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.compute,
      y: getStaggeredY(i, roles.compute.length, 200),
    })
  );

  roles.cache.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.cache,
      y: getStaggeredY(i, roles.cache.length, 80, 100),
    })
  );

  roles.queue.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.queue,
      y: getStaggeredY(i, roles.queue.length, 320, 120),
    })
  );

  roles.worker.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.worker,
      y: getStaggeredY(i, roles.worker.length, 320, 120),
    })
  );

  roles.storage.forEach((n, i) =>
    nodePositions.set(n.id, {
      x: COL_X.storage,
      y: getStaggeredY(i, roles.storage.length, 200, 140),
    })
  );

  return nodes.map((node) => ({
    ...node,
    position: nodePositions.get(node.id) || node.position,
  }));
}

function VariantsComparisonWorkspace() {
  const router = useRouter();
  const [selectedVariantId, setSelectedVariantId] =
    useState<VariantId>("high_availability");

  const [variantsMap, setVariantsMap] =
    useState<Record<VariantId, VariantData>>(defaultVariants);
  const [originalAnalysis, setOriginalAnalysis] =
    useState<OriginalAnalysisData>(defaultOriginalAnalysis);
  const [executiveSummary, setExecutiveSummary] = useState<string>(
    "4 production architecture topologies generated and audited against system goals."
  );
  const [hasLiveBackendData, setHasLiveBackendData] = useState<boolean>(false);
  const [showComparisonModal, setShowComparisonModal] = useState<boolean>(false);
  const [showDeepDiveModal, setShowDeepDiveModal] = useState<boolean>(false);

  // Register custom Left-to-Right Architecture node type
  const nodeTypes = useMemo(
    () => ({
      architecture: ArchitectureCustomNode,
      default: ArchitectureCustomNode,
    }),
    []
  );

  // Read generated variants and original engine audit from sessionStorage
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("archpilot_variants_data");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.variants && Array.isArray(parsed.variants)) {
          const newMap: Record<VariantId, VariantData> = { ...defaultVariants };
          parsed.variants.forEach((v: VariantData) => {
            if (v.id) {
              newMap[v.id] = v;
            }
          });
          setVariantsMap(newMap);
          setHasLiveBackendData(true);
        }
        if (parsed.originalAnalysis) {
          setOriginalAnalysis(parsed.originalAnalysis);
        }
        if (parsed.executiveSummary) {
          setExecutiveSummary(parsed.executiveSummary);
        }
      }
    } catch (e) {
      console.warn("Failed to load variants from sessionStorage", e);
    }
  }, []);

  const currentVariant = variantsMap[selectedVariantId] || defaultVariants[selectedVariantId];

  // Apply custom architecture node type for Left-to-Right clean ports with automatic overlap-free layout
  const styledNodes = useMemo(() => {
    const spacedNodes = layoutArchitectureGraph(currentVariant.graph.nodes);
    return spacedNodes.map((node) => ({
      ...node,
      type: "architecture",
    }));
  }, [currentVariant]);

  // Apply smoothstep edges with explicit communication labels and direction arrows
  const styledEdges = useMemo(() => {
    return currentVariant.graph.edges.map((edge) => ({
      ...edge,
      type: "smoothstep",
      animated: true,
      style: { stroke: "#6366f1", strokeWidth: 1.5 },
      label: edge.label,
      labelStyle: { fill: "#334155", fontWeight: 700, fontSize: 10 },
      labelBgStyle: {
        fill: "#ffffff",
        fillOpacity: 0.95,
        stroke: "#cbd5e1",
        strokeWidth: 0.5,
      },
      labelBgPadding: [4, 4] as [number, number],
      labelBgBorderRadius: 6,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        width: 14,
        height: 14,
        color: "#6366f1",
      },
    }));
  }, [currentVariant]);

  const handleApplyToCanvas = () => {
    const spacedNodes = layoutArchitectureGraph(currentVariant.graph.nodes);
    const payload = {
      nodes: spacedNodes,
      edges: currentVariant.graph.edges,
      variantName: currentVariant.name,
    };
    sessionStorage.setItem("archpilot_applied_architecture", JSON.stringify(payload));
    router.push("/");
  };

  const originalScore = originalAnalysis?.scoring?.overall ?? 4.8;
  const variantScore = currentVariant.engineAudit.overall;
  const scoreDelta = +(variantScore - originalScore).toFixed(1);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-wrap items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-900">
                Design Variants Comparison
              </span>
              <span className="rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-[11px] font-semibold">
                Dual-Engine Audited
              </span>
              {hasLiveBackendData && (
                <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                  Live AI Generated
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {hasLiveBackendData
                ? "Synthesized from your architecture goals and verified against engine rules."
                : "Compare 4 production architectures generated from system design principles."}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs flex items-center gap-1.5"
          >
            <span>Back to Main Canvas</span>
          </Link>
          <button
            onClick={() => {
              const dataStr =
                "data:text/json;charset=utf-8," +
                encodeURIComponent(JSON.stringify(currentVariant, null, 2));
              const downloadAnchor = document.createElement("a");
              downloadAnchor.setAttribute("href", dataStr);
              downloadAnchor.setAttribute(
                "download",
                `${currentVariant.id}-architecture.json`
              );
              document.body.appendChild(downloadAnchor);
              downloadAnchor.click();
              downloadAnchor.remove();
            }}
            className="px-3.5 py-1.5 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition shadow-2xs flex items-center gap-1.5"
          >
            <Download size={13} />
            <span>Export JSON</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex-1 p-5 max-w-7xl w-full mx-auto flex flex-col gap-4">
        {/* 4 Variant Selector Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Tab 1: Cost-Optimized */}
          <button
            onClick={() => setSelectedVariantId("cost_optimized")}
            className={`p-3.5 rounded-xl text-left transition shadow-2xs flex flex-col justify-between ${
              selectedVariantId === "cost_optimized"
                ? "border-2 border-indigo-600 bg-indigo-50/70 shadow-xs"
                : "border border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Coins size={14} className="text-emerald-600" />
                <span>Cost-Optimized</span>
              </span>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {variantsMap.cost_optimized.metrics.estimatedMonthlyCost.split(" ")[0]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              {variantsMap.cost_optimized.metrics.targetQps}
            </p>
          </button>

          {/* Tab 2: High-Availability */}
          <button
            onClick={() => setSelectedVariantId("high_availability")}
            className={`p-3.5 rounded-xl text-left transition shadow-2xs flex flex-col justify-between ${
              selectedVariantId === "high_availability"
                ? "border-2 border-indigo-600 bg-indigo-50/70 shadow-xs"
                : "border border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Shield size={14} className="text-indigo-600" />
                <span>High-Availability</span>
              </span>
              <span className="text-xs font-mono font-bold text-indigo-700">
                {variantsMap.high_availability.metrics.targetSla.split(" ")[0]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Zero-SPOF Multi-AZ Tier
            </p>
          </button>

          {/* Tab 3: High-Throughput */}
          <button
            onClick={() => setSelectedVariantId("high_throughput")}
            className={`p-3.5 rounded-xl text-left transition shadow-2xs flex flex-col justify-between ${
              selectedVariantId === "high_throughput"
                ? "border-2 border-indigo-600 bg-indigo-50/70 shadow-xs"
                : "border border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Zap size={14} className="text-amber-600" />
                <span>High-Throughput</span>
              </span>
              <span className="text-xs font-mono font-bold text-amber-700">
                {variantsMap.high_throughput.metrics.targetQps.split(" ")[0]}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              P99 Cache-Aside Engine
            </p>
          </button>

          {/* Tab 4: Global Distributed */}
          <button
            onClick={() => setSelectedVariantId("global_distributed")}
            className={`p-3.5 rounded-xl text-left transition shadow-2xs flex flex-col justify-between ${
              selectedVariantId === "global_distributed"
                ? "border-2 border-indigo-600 bg-indigo-50/70 shadow-xs"
                : "border border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Globe size={14} className="text-cyan-600" />
                <span>Global Distributed</span>
              </span>
              <span className="text-xs font-mono font-bold text-cyan-700">
                Multi-Region
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 truncate">
              Anycast &amp; Distributed Edge
            </p>
          </button>
        </div>

        {/* Workspace Split: Canvas (8 cols) & Specifications Panel (4 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[580px]">
          {/* Left: Responsive React Flow Canvas (8 cols) */}
          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-4 flex flex-col shadow-xs overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  {currentVariant.name}
                </h2>
              </div>
              <span className="text-xs font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                Auto-Fit Viewport
              </span>
            </div>

            {/* React Flow Interactive Canvas */}
            <div className="flex-1 w-full min-h-[460px] relative rounded-xl overflow-hidden mt-3 bg-slate-50/50">
              <ReactFlow
                key={currentVariant.id}
                nodes={styledNodes}
                edges={styledEdges}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.25 }}
                nodesDraggable={true}
                nodesConnectable={false}
                zoomOnScroll={true}
                panOnDrag={true}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={20}
                  size={1}
                  color="#cbd5e1"
                />
                <Controls showInteractive={false} />
              </ReactFlow>
            </div>

            {/* Canvas Footer with Engine Verification Metrics */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
              <div className="flex items-center gap-4">
                <span>
                  Engine Status:{" "}
                  <strong className="text-emerald-700 font-semibold">
                    VERIFIED
                  </strong>
                </span>
                <span>
                  SPOFs:{" "}
                  <strong
                    className={
                      currentVariant.engineAudit.spofs.length === 0
                        ? "text-emerald-700 font-semibold"
                        : "text-rose-600 font-semibold"
                    }
                  >
                    {currentVariant.engineAudit.spofs.length}
                  </strong>
                </span>
                <span>
                  Audit Score:{" "}
                  <strong className="text-indigo-700 font-bold">
                    {currentVariant.engineAudit.overall}/10
                  </strong>
                </span>
              </div>
              <span className="text-xs italic text-slate-400">
                Relative coordinates centered via fitView
              </span>
            </div>
          </div>

          {/* Right: Specifications, Trade-offs & Actions Side Panel (4 cols) */}
          <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold uppercase tracking-wider">
                    {currentVariant.metrics.estimatedCostTier} Tier
                  </span>
                  <span className="text-xs font-bold text-slate-700 font-mono">
                    {currentVariant.metrics.estimatedMonthlyCost}
                  </span>
                </div>
                <h3 className="text-base font-bold text-slate-900 mt-2">
                  {currentVariant.name}
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {currentVariant.description}
                </p>
              </div>

              {/* Metric Badges */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Target SLA
                  </span>
                  <div className="text-sm font-bold text-emerald-700 mt-0.5">
                    {currentVariant.metrics.targetSla}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-xl">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase">
                    Throughput
                  </span>
                  <div className="text-sm font-bold text-indigo-700 mt-0.5">
                    {currentVariant.metrics.targetQps}
                  </div>
                </div>
              </div>

              {/* Pros & Cons Section */}
              <div className="space-y-3.5 pt-1">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                    <CheckCircle2 size={14} />
                    <span>Key Advantages (Pros)</span>
                  </span>
                  <ul className="mt-1.5 space-y-1.5 text-xs text-slate-700">
                    {currentVariant.tradeoffs.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-600 font-bold shrink-0 mt-0.5">
                          ✓
                        </span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-700 flex items-center gap-1.5">
                    <AlertTriangle size={14} />
                    <span>Accepted Trade-offs (Cons)</span>
                  </span>
                  <ul className="mt-1.5 space-y-1.5 text-xs text-slate-700">
                    {currentVariant.tradeoffs.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-rose-600 font-bold shrink-0 mt-0.5">
                          ✕
                        </span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2 pt-4 border-t border-slate-100">
              {/* Architecture Deep Dive & Data Flow Button */}
              <button
                id="deep-dive-btn"
                onClick={() => setShowDeepDiveModal(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <BookOpen size={14} className="text-emerald-700" />
                <span>Architecture Deep Dive &amp; Data Flow</span>
              </button>

              {/* Compare with Original Design Button */}
              <button
                id="compare-report-btn"
                onClick={() => setShowComparisonModal(true)}
                className="w-full py-2.5 px-3 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <Activity size={14} />
                <span>Compare with My Design Report</span>
              </button>

              {/* Apply to Main Canvas Button */}
              <button
                onClick={handleApplyToCanvas}
                className="w-full py-2.5 px-3 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 text-xs font-bold transition flex items-center justify-center gap-2 shadow-2xs"
              >
                <span>Apply Architecture to Canvas</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Score Comparison Modal */}
      {showComparisonModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4 sm:p-6 overflow-y-auto">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-xs">
                  <Activity size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-800">
                      Architecture Audit Comparison
                    </h3>
                    <span className="rounded-md bg-indigo-100 text-indigo-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                      Before vs. After
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your Canvas Design vs. Generated Variant:{" "}
                    <strong className="text-slate-700">{currentVariant.name}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowComparisonModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-5 overflow-y-auto p-6">
              {/* Score Delta Hero Ribbon */}
              <div className="grid grid-cols-1 md:grid-cols-11 gap-3 items-center">
                {/* Before: Original Design */}
                <div className="md:col-span-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Original Architecture
                    </span>
                    <span className="rounded bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                      Your Canvas
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-800">
                      {originalScore}
                    </span>
                    <span className="text-xs font-semibold text-slate-400">/10</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <strong className="text-rose-600 font-bold">
                        {originalAnalysis.spofs.length}
                      </strong>{" "}
                      SPOFs
                    </span>
                    <span>•</span>
                    <span>
                      <strong className="text-slate-700 font-bold">
                        {originalAnalysis.findings.length}
                      </strong>{" "}
                      Engine Findings
                    </span>
                  </div>
                </div>

                {/* Middle: Delta Bridge */}
                <div className="md:col-span-1 flex flex-col items-center justify-center py-1">
                  <div
                    className={`px-2.5 py-1 rounded-full text-xs font-black shadow-xs ${
                      scoreDelta >= 0
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : "bg-amber-100 text-amber-800 border border-amber-300"
                    }`}
                  >
                    {scoreDelta >= 0 ? `+${scoreDelta}` : scoreDelta}
                  </div>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400 mt-1">
                    Delta
                  </span>
                </div>

                {/* After: Variant Architecture */}
                <div className="md:col-span-5 rounded-2xl border border-indigo-200 bg-indigo-50/40 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                      Generated Variant
                    </span>
                    <span className="rounded bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                      {currentVariant.id.replace("_", " ")}
                    </span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="text-3xl font-black text-indigo-900">
                      {variantScore}
                    </span>
                    <span className="text-xs font-semibold text-indigo-400">/10</span>
                  </div>
                  <div className="mt-3 flex items-center gap-3 text-xs text-slate-600">
                    <span className="flex items-center gap-1">
                      <strong
                        className={
                          currentVariant.engineAudit.spofs.length === 0
                            ? "text-emerald-700 font-bold"
                            : "text-amber-600 font-bold"
                        }
                      >
                        {currentVariant.engineAudit.spofs.length}
                      </strong>{" "}
                      SPOFs
                      {currentVariant.id === "cost_optimized" && currentVariant.engineAudit.spofs.length > 0 && (
                        <span className="text-[10px] text-amber-700 font-medium ml-1">
                          (Accepted MVP Trade-Off)
                        </span>
                      )}
                    </span>
                    <span>•</span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 size={13} />
                      Dual-Engine Audited
                    </span>
                  </div>
                </div>
              </div>

              {/* Context Note for MVP Trade-off */}
              {currentVariant.id === "cost_optimized" && currentVariant.engineAudit.spofs.length > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Cost-Optimized / Lean MVP Trade-Off:</span> Single-instance compute and database tiers are intentionally maintained to guarantee monthly cloud spend remains under $35/mo. For 100% redundancy with zero single points of failure, switch to the <strong>High-Availability Multi-AZ Tier</strong> or <strong>High-Throughput Tier</strong>.
                  </div>
                </div>
              )}

              {/* Three Dimensions Comparison */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                  Score Dimensions Comparison
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {/* Security */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className="text-[11px] font-semibold text-slate-500">Security</span>
                    <div className="mt-1 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">
                        {originalAnalysis.scoring.dimensions.security}/10
                      </span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <span className="text-indigo-700">
                        {currentVariant.engineAudit.dimensions.security}/10
                      </span>
                    </div>
                  </div>

                  {/* Reliability */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className="text-[11px] font-semibold text-slate-500">Reliability</span>
                    <div className="mt-1 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">
                        {originalAnalysis.scoring.dimensions.reliability}/10
                      </span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <span className="text-indigo-700">
                        {currentVariant.engineAudit.dimensions.reliability}/10
                      </span>
                    </div>
                  </div>

                  {/* Scalability */}
                  <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-3">
                    <span className="text-[11px] font-semibold text-slate-500">Scalability</span>
                    <div className="mt-1 flex items-center justify-between text-xs font-bold">
                      <span className="text-slate-600">
                        {originalAnalysis.scoring.dimensions.scalability}/10
                      </span>
                      <ArrowRight size={12} className="text-slate-400" />
                      <span className="text-indigo-700">
                        {currentVariant.engineAudit.dimensions.scalability}/10
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resolved Issues & Architectural Hardening */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      Eliminated Flaws &amp; Resolved Issues ({currentVariant.engineAudit.resolvedRules.length})
                    </h4>
                  </div>
                  <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Mathematically Audited
                  </span>
                </div>

                {currentVariant.engineAudit.resolvedRules.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">
                    Original architecture had clean structural topology; this variant reinforces scale and operational boundaries.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {currentVariant.engineAudit.resolvedRules.map((ruleId) => {
                      const matchedFinding = originalAnalysis.findings.find(
                        (f) => f.ruleId === ruleId
                      );
                      return (
                        <div
                          key={ruleId}
                          className="flex items-start justify-between gap-3 p-3 rounded-xl border border-emerald-100 bg-emerald-50/50"
                        >
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">
                                {matchedFinding?.title || ruleId}
                              </span>
                              <code className="text-[10px] font-mono font-semibold bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600">
                                {ruleId}
                              </code>
                            </div>
                            <p className="text-xs text-slate-600">
                              {matchedFinding?.description ||
                                "Identified topological risk eliminated in this generated architecture."}
                            </p>
                            {matchedFinding?.remediation && (
                              <p className="text-[11px] text-emerald-800 font-medium">
                                Remediated via: {matchedFinding.remediation}
                              </p>
                            )}
                          </div>
                          <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-extrabold uppercase tracking-wide">
                            <Check size={11} />
                            Resolved
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Trade-Offs in this Variant */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5">
                  <span className="text-xs font-bold text-emerald-800 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle2 size={13} />
                    <span>Variant Advantages</span>
                  </span>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                    {currentVariant.tradeoffs.pros.map((pro, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-emerald-600 font-bold">✓</span>
                        <span>{pro}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                    <AlertTriangle size={13} className="text-amber-500" />
                    <span>Accepted Trade-Offs</span>
                  </span>
                  <ul className="mt-2 space-y-1.5 text-xs text-slate-700">
                    {currentVariant.tradeoffs.cons.map((con, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-rose-600 font-bold">✕</span>
                        <span>{con}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
              <span className="text-xs text-slate-500 italic">
                Evaluated with Tarjan&apos;s Bridge &amp; Deterministic Rules Engine
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowComparisonModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close Comparison
                </button>
                <button
                  onClick={handleApplyToCanvas}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition"
                >
                  <span>Apply This Variant to Canvas</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Architecture Deep Dive & Data Flow Modal */}
      {showDeepDiveModal && (
        <div
          id="deep-dive-modal-overlay"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowDeepDiveModal(false);
          }}
        >
          <div
            id="deep-dive-modal-card"
            className="relative flex max-h-[90vh] w-full max-w-4xl flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                  <BookOpen size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-900">
                      Architecture Deep Dive &amp; Data Flow Guide
                    </h3>
                    <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                      {currentVariant.name}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    Comprehensive step-by-step traffic journey, component contributions, and architectural avoidance thresholds
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowDeepDiveModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
                aria-label="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 space-y-6 overflow-y-auto p-6 text-slate-800">
              {/* Architecture Overview Banner */}
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                      Architecture Strategy
                    </span>
                    <h4 className="text-base font-bold text-slate-900 mt-0.5">
                      {currentVariant.tagline}
                    </h4>
                    <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                      {currentVariant.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 border-t sm:border-t-0 sm:border-l border-emerald-200 pt-3 sm:pt-0 sm:pl-4">
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Target QPS</div>
                      <div className="text-sm font-black text-slate-800">{currentVariant.metrics.targetQps}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Target SLA</div>
                      <div className="text-sm font-black text-slate-800">{currentVariant.metrics.targetSla}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">Audit Score</div>
                      <div className="text-sm font-black text-emerald-700">
                        {currentVariant.engineAudit.overall}/10
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 1: End-to-End Data Flow Journey */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Workflow size={16} className="text-indigo-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      End-to-End Data Flow &amp; Worker Communication Pipeline
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    Step-by-step traffic journey
                  </span>
                </div>

                <div className="space-y-2.5">
                  {(currentVariant.deepDive?.dataFlowSteps || [
                    { step: 1, flow: "Client App -> Reverse Proxy / Gateway", type: "SYNC", description: "Inbound client traffic arrives at the public gateway for TLS termination and rate limiting." },
                    { step: 2, flow: "Gateway -> Application Layer", type: "SYNC", description: "Gateway routes request to active application microservices." },
                    { step: 3, flow: "App Server -> Database & Cache", type: "READ_WRITE", description: "Synchronous reads and writes to stateful persistence layers." },
                    { step: 4, flow: "App Server -> Message Queue -> Workers", type: "ASYNC", description: "Asynchronous processing jobs delegated to dedicated consumer worker fleets." }
                  ]).map((flowItem) => {
                    const typeBadgeClass =
                      flowItem.type.toUpperCase() === "SYNC"
                        ? "bg-blue-100 text-blue-800 border-blue-200"
                        : flowItem.type.toUpperCase() === "ASYNC"
                        ? "bg-purple-100 text-purple-800 border-purple-200"
                        : flowItem.type.toUpperCase() === "READ"
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : flowItem.type.toUpperCase() === "WRITE"
                        ? "bg-amber-100 text-amber-800 border-amber-200"
                        : "bg-cyan-100 text-cyan-800 border-cyan-200";

                    return (
                      <div
                        key={flowItem.step}
                        className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-slate-300 transition"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[11px] font-bold text-white shadow-2xs">
                          {flowItem.step}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-bold text-slate-900">
                              {flowItem.flow}
                            </span>
                            <span
                              className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${typeBadgeClass}`}
                            >
                              {flowItem.type}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                            {flowItem.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Section 2: Component Breakdown & When to Avoid */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers3 size={16} className="text-emerald-600" />
                    <h4 className="text-sm font-bold text-slate-900">
                      Component Roles &amp; Avoidance Thresholds
                    </h4>
                  </div>
                  <span className="text-xs text-slate-400">
                    Why it exists &amp; when you can postpone it
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {resolveComponentBreakdown(currentVariant).map((comp, idx) => {
                    const kindStyle = nodeStyles[comp.kind as ComponentKind] || nodeStyles.server;
                    return (
                      <div
                        key={idx}
                        className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition"
                      >
                        <div>
                          {/* Component Header Badge */}
                          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {comp.name}
                            </h5>
                            <span
                              style={{
                                backgroundColor: kindStyle.background,
                                borderColor: kindStyle.border,
                                color: kindStyle.text,
                              }}
                              className="shrink-0 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                            >
                              {comp.kind}
                            </span>
                          </div>

                          {/* Role & Contribution */}
                          <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-2.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                              <Sparkles size={12} className="text-emerald-600" />
                              <span>Role &amp; System Contribution</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                              {comp.roleAndContribution}
                            </p>
                          </div>

                          {/* When You Can Avoid It */}
                          <div className="mt-2.5 rounded-lg border border-amber-200/80 bg-amber-50/50 p-2.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                              <AlertTriangle size={12} className="text-amber-600" />
                              <span>When You Can Safely Avoid It</span>
                            </div>
                            <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                              {comp.whenToAvoid}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3.5">
              <span className="text-xs text-slate-500 italic">
                Synthesized with domain-first decomposition &amp; zero-SPOF principles
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowDeepDiveModal(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Close Guide
                </button>
                <button
                  onClick={() => {
                    setShowDeepDiveModal(false);
                    handleApplyToCanvas();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 transition"
                >
                  <span>Apply This Variant to Canvas</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VariantsPage() {
  return (
    <ReactFlowProvider>
      <VariantsComparisonWorkspace />
    </ReactFlowProvider>
  );
}

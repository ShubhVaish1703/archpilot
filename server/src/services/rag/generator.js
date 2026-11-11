import { GoogleGenerativeAI } from "@google/generative-ai";
import { analyzeArchitecture } from "../engine/index.js";
import { retrieveRelevantKnowledge } from "./retriever.js";

/**
 * Builds the comprehensive prompt for Gemini LLM to synthesize 4 architecture variants.
 */
export function buildPrompt({
  userIntent,
  originalAnalysis,
  ragChunks,
  trafficFilters,
}) {
  const { nodesCount, edgesCount, scoring, spofs, findings } = originalAnalysis;

  const findingsSummary = findings.length === 0
    ? "Clean architecture with no structural rule violations."
    : findings
        .map((f, i) => `${i + 1}. [${f.ruleId}] ${f.title}: ${f.description}`)
        .join("\n");

  const ragExcerpts = ragChunks.length === 0
    ? "Standard distributed system design best practices (Alex Xu Chapters 1-15)."
    : ragChunks
        .map(
          (c, i) =>
            `--- KNOWLEDGE SNIPPET ${i + 1} (${c.docTitle} - ${c.sectionTitle}) ---\n${c.content}`
        )
        .join("\n\n");

  return `You are a Principal Distributed Systems Architect and authoritative expert on high-scale architecture patterns from Alex Xu's "System Design Interview" series.

Your task is to analyze the user's project context and engine audit findings, then synthesize EXACTLY 4 distinct, production-ready architecture variants.

================================================================================
1. USER PROJECT GOALS & INTENT
================================================================================
- System Description: ${userIntent?.description || "High-scale web application"}
- Core Concerns / Failure Modes: ${userIntent?.concerns || "Ensure reliability, avoid bottlenecks, and scale gracefully"}
${trafficFilters ? `- Peak RPS: ${trafficFilters.peakRps || "N/A"}, Expected Users: ${trafficFilters.expectedUsers || "N/A"}` : ""}

================================================================================
2. ORIGINAL ARCHITECTURE AUDIT (Computed by ArchPilot Deterministic Engine)
================================================================================
- Original Nodes Count: ${nodesCount}, Edges Count: ${edgesCount}
- Overall Score: ${scoring?.overall ?? 0}/10 (Security: ${scoring?.dimensions?.security ?? 0}, Reliability: ${scoring?.dimensions?.reliability ?? 0}, Scalability: ${scoring?.dimensions?.scalability ?? 0})
- Identified Single Points of Failure (SPOFs): ${spofs.length > 0 ? spofs.join(", ") : "None"}
- Structural Anti-Patterns & Violations Detected:
${findingsSummary}

================================================================================
3. GROUNDED RAG SYSTEM DESIGN KNOWLEDGE (Reference Material)
================================================================================
${ragExcerpts}

================================================================================
4. DOMAIN-SPECIFIC APPLICATION ARCHITECTURE & WORKER COMMUNICATION REQUIREMENTS
================================================================================
Do NOT produce generic toy boxes (e.g. avoid simply labeling nodes "Server 1", "Server 2").
Analyze the user's specific application domain and synthesize real functional services and data pathways:

1. DOMAIN FUNCTIONAL DECOMPOSITION:
   - Identify the user's specific domain (e.g., LLM Chatbot / Gemini API, E-Commerce, Video Streaming, Social Messaging) and assign concrete functional components:
   - For AI / Chatbot / Gemini systems:
     * Include Token-Bucket Rate Limiter & Gateway (kind: "api") to prevent LLM quota exhaustion and API key exposure.
     * Include Real-Time Chat Orchestration / SSE Streaming Server (kind: "server") managing WebSocket/SSE connections.
     * Include Google Gemini API Egress Gateway (kind: "api") managing model calls with circuit breaking and fallback.
     * Include Redis Sliding-Window Session Context Cache (kind: "cache") for multi-turn conversation memory.
     * Include Vector DB (pgvector / Pinecone / Qdrant) (kind: "database") for RAG document retrieval.
     * Include Asynchronous Ingestion Worker (kind: "server") consuming from Task Queue (kind: "queue") to chunk documents and compute embeddings in background.
   - For E-Commerce / Web systems:
     * Include Order Service, Payment Gateway, Product Catalog, Inventory, Cart Cache, etc.

2. EXPLICIT WORKER COMMUNICATION PIPELINE (MANDATORY ACROSS VARIANTS):
   - Real architectures decouple asynchronous workflows.
   - App Services MUST publish background tasks/events to a Message Queue / Event Broker (kind: "queue", e.g. "Kafka Event Stream" or "SQS Task Queue").
   - A dedicated Worker Fleet (kind: "server", label: e.g. "Async Ingestion Worker" or "Background Consumer Fleet") MUST pull/consume from this queue.
   - Workers MUST communicate with downstream persistence: committing finalized records to databases (kind: "database") and uploading assets/reports to object storage (kind: "storage").
   - NEVER connect a queue directly to a database without a consumer worker (violates REL_QUEUE_NO_CONSUMER).

3. REDUNDANCY & ZERO-SPOF ENFORCEMENT:
   - In High-Availability and High-Throughput variants, deploy dual load balancers and multiple app servers so no single node failure halts traffic.
   - Every queue must be consumed by a worker server.

4. 4 TARGET VARIANTS TO SYNTHESIZE:
   1. "cost_optimized": Lean MVP, consolidates microservices into a modular backend with internal task queue, lowest monthly cloud cost (<$45/mo), acceptable for <500 QPS.
   2. "high_availability": Enterprise Zero-SPOF, Multi-AZ redundant load balancers, auto-scaled stateless app servers (>=2), SQS queue with Multi-AZ worker fleet, primary-standby DB replication with automatic failover, 99.99% SLA.
   3. "high_throughput": Low-latency, P99 <15ms, Redis multi-tier caching (absorbs 90%+ reads), Kafka write buffer stream, partitioned Consumer Worker fleet writing bulk batches to Master DB and Read Replicas, >20,000 QPS.
   4. "global_distributed": Worldwide Anycast GeoDNS routing, CloudFront/Cloudflare Edge CDN, regional app servers (US/EU), regional event queues & worker fleets, multi-region active-active distributed database.

================================================================================
5. STRICT CANVAS GRAPH & COORDINATE RULES
================================================================================
- Allowed node.data.kind values ONLY:
  "client", "api", "loadbalancer", "server", "database", "cache", "queue", "storage"
- Relative Tiered X/Y Coordinates (1500x600 viewBox):
  * Tier 0 (Entry / Client): x = 60, y = 200
  * Tier 1 (Edge & Gateway): x = 320, y = 200 (or y1 = 130, y2 = 270 if dual)
  * Tier 2 (App Services / Microservices): x = 580, y = 200 (or y1 = 130, y2 = 270 if dual)
  * Tier 3 (Cache & Event Queues):
    - Caches on upper tier: x = 840, y = 80
    - Event Queues on lower tier: x = 840, y = 320
  * Tier 4 (Worker Consumer Fleet): x = 1100, y = 320 (aligned with queue on lower tier)
  * Tier 5 (Persistence / Databases / Storage): x = 1360, y = 200 (or y1 = 130, y2 = 270 if dual)
  * CRITICAL SPACING RULE: Cards are 165px wide. Maintain at least 260px horizontal distance between tiers to prevent cards from colliding.
  * CRITICAL STAGGER RULE: NEVER place synchronous servers, queues, and workers in a single flat horizontal line. Always place queues and consumer workers on the lower tier (y = 320) so the graph has clean 2-dimensional breathing room.
  * CRITICAL COMPONENT BREAKDOWN RULE:
    - "componentBreakdown" MUST have a dedicated entry for EVERY SINGLE node present in "graph.nodes" (minimum 6-12 entries).
    - Explain each component's explicit role/system contribution and the concrete operational threshold for when a team can safely avoid it.
    - NEVER output only 1 or 2 items in "componentBreakdown".
- All edges MUST include a descriptive "label" describing the exact communication protocol (e.g. "HTTPS Request", "Publish Event", "Pulls Task Batch", "Bulk DB Commit", "Upload Asset").
- All edges MUST be directed forward from client/gateway toward backend persistence (never reverse flow).
- Never connect client directly to database or storage (must pass through API gateway or server).

================================================================================
6. OUTPUT FORMAT (STRICT JSON ONLY)
================================================================================
You MUST return pure JSON adhering to this exact schema (no markdown formatting, no code blocks):
{
  "executiveSummary": "Overall architectural synthesis summary...",
  "variants": [
    {
      "id": "cost_optimized",
      "name": "Cost-Optimized / Lean MVP",
      "tagline": "Minimal monthly cloud spend with essential baseline reliability.",
      "description": "2-3 sentences explaining architectural choices and why it fits lean workloads.",
      "metrics": {
        "targetQps": "Up to 500 QPS",
        "targetSla": "99.0% Uptime",
        "estimatedCostTier": "$",
        "estimatedMonthlyCost": "$20 - $45 / mo",
        "primaryBottleneckRisk": "Single database instance downtime during patching"
      },
      "tradeoffs": {
        "pros": ["Lowest cloud spend", "Simple single-box setup", "Fast deployment"],
        "cons": ["Contains single points of failure", "Manual recovery required"]
      },
      "remediationSummary": "How this variant solves or accommodates the original design flaws",
      "deepDive": {
        "dataFlowSteps": [
          { "step": 1, "flow": "Client -> API Gateway", "type": "SYNC", "description": "Authenticates and routes traffic." },
          { "step": 2, "flow": "App -> Queue -> Worker", "type": "ASYNC", "description": "Decouples long-running jobs." }
        ],
        "componentBreakdown": [
          {
            "name": "Reverse Proxy / API Gateway",
            "kind": "api",
            "roleAndContribution": "Enforces TLS termination, token-bucket rate limiting to prevent LLM quota exhaustion, and request routing.",
            "whenToAvoid": "Can be omitted in single-server local prototypes where clients directly access the monolith."
          },
          {
            "name": "Application Server Fleet",
            "kind": "server",
            "roleAndContribution": "Orchestrates API calls, validates client inputs, and coordinates downstream services.",
            "whenToAvoid": "Core compute tier cannot be avoided; can use serverless functions for sporadic traffic."
          },
          {
            "name": "Redis Session Context Cache",
            "kind": "cache",
            "roleAndContribution": "Ultra-fast in-memory sliding-window storage for conversation turns and session state.",
            "whenToAvoid": "Avoid if interactions are strictly stateless 1-turn Q&A."
          },
          {
            "name": "Task Message Queue",
            "kind": "queue",
            "roleAndContribution": "Buffers background tasks, document indexing, and analytics to prevent request thread blocking.",
            "whenToAvoid": "Can be omitted if system has zero asynchronous workloads."
          },
          {
            "name": "Async Ingestion Worker",
            "kind": "server",
            "roleAndContribution": "Dedicated consumer fleet processing background queue jobs without consuming API server CPU.",
            "whenToAvoid": "Can run as background threads within the main server process until CPU exceeds 25%."
          },
          {
            "name": "Primary Database & Vector Store",
            "kind": "database",
            "roleAndContribution": "Authoritative transactional data store and vector index for semantic document search.",
            "whenToAvoid": "Authoritative persistence layer cannot be omitted."
          }
        ]
      },
      "graph": {
        "nodes": [
          { "id": "client-1", "type": "default", "position": { "x": 50, "y": 220 }, "data": { "label": "Client App", "kind": "client" } }
        ],
        "edges": [
          { "id": "e-1", "source": "client-1", "target": "api-1", "label": "HTTPS", "animated": true }
        ]
      }
    }
  ]
}`;
}

/**
 * Detects application domain from user intent (e.g., LLM Chatbot, E-commerce, Video Streaming).
 */
export function detectDomain(userIntent) {
  const text = `${userIntent?.description || ""} ${userIntent?.concerns || ""}`.toLowerCase();
  if (
    text.includes("gemini") ||
    text.includes("chatbot") ||
    text.includes("chat") ||
    text.includes("llm") ||
    text.includes("ai ") ||
    text.includes("gpt") ||
    text.includes("rag") ||
    text.includes("prompt") ||
    text.includes("vector")
  ) {
    return "llm_chatbot";
  }
  return "general";
}

/**
 * Returns canonical, deterministic variants tailored to the user's specific domain.
 */
export function getDeterministicVariants(originalAnalysis, userIntent) {
  const domain = detectDomain(userIntent);

  if (domain === "llm_chatbot") {
    return [
      {
        id: "cost_optimized",
        name: "Cost-Optimized / Lean MVP",
        tagline: "Minimal monthly cloud spend with Redis session memory & direct Gemini 2.0 Flash integration.",
        description: "Lean production deployment for a Gemini-powered chatbot. Combines a streaming API server with in-memory Redis session caching for sliding-window multi-turn memory, an internal asynchronous task queue for document ingestion, and PostgreSQL with pgvector for hybrid storage (<$35/mo).",
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
        remediationSummary: "Eliminates direct client-to-database connections by placing a reverse proxy & token rate limiter in front of the Gemini orchestration service.",
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
      {
        id: "high_availability",
        name: "High-Availability Multi-AZ Tier",
        tagline: "Zero-SPOF resilient architecture with automated multi-zone failover and redundant Gemini endpoints.",
        description: "Enterprise Multi-AZ deployment for production chatbot workloads. Redundant streaming load balancers distribute active WebSocket/SSE chat connections across stateless orchestrator fleets, backed by an HA RabbitMQ cluster, Multi-AZ Aurora database, dedicated vector index, and Gemini model fallback routing.",
        metrics: {
          targetQps: "10,000+ QPS",
          targetSla: "99.99% (Four Nines)",
          estimatedCostTier: "$$$",
          estimatedMonthlyCost: "$420 - $680 / mo",
          primaryBottleneckRisk: "Cross-AZ synchronization latency for high-concurrency Redis Sentinel chat sessions",
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
        remediationSummary: "Eliminates all single points of failure with dual streaming load balancers, multi-AZ worker fleets, clustered session cache, and multi-AZ Aurora replication.",
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
      {
        id: "high_throughput",
        name: "High-Throughput / Low-Latency Tier",
        tagline: "Sub-15ms TTFT with Semantic Prompt Caching, Token-Bucket Rate Limiting & Kafka Event Ingestion.",
        description: "Optimized for extreme concurrency and high-frequency chatbot interactions. Integrates an in-memory Semantic Prompt Cache that absorbs 60%+ of recurring queries before hitting Gemini API, an HTTP/2 streaming connection fleet, Kafka event stream, and distributed Vector DB.",
        metrics: {
          targetQps: "50,000+ QPS",
          targetSla: "99.95% (<15ms Cache Latency)",
          estimatedCostTier: "$$$$",
          estimatedMonthlyCost: "$750 - $1,200 / mo",
          primaryBottleneckRisk: "Vector DB index ingestion throughput during concurrent massive document uploads",
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
        remediationSummary: "Eliminates database write contention and Gemini API rate-limiting via semantic prompt caching and partitioned Kafka streaming.",
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
      {
        id: "global_distributed",
        name: "Global Distributed Multi-Region",
        tagline: "Worldwide Anycast edge termination with multi-region Gemini endpoints & replicated vector indices.",
        description: "Deploys Edge CDN Point of Presence (PoP) locations worldwide to terminate chat connections within 50ms of global users. Features regional compute fleets routing to Google Cloud Vertex AI multi-region Gemini endpoints, cross-region replicated session memory, and globally synchronized vector stores.",
        metrics: {
          targetQps: "100,000+ QPS",
          targetSla: "99.999% (Five Nines)",
          estimatedCostTier: "$$$$",
          estimatedMonthlyCost: "$1,400+ / mo",
          primaryBottleneckRisk: "Cross-region eventual consistency replication delay for conversation state updates",
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
        remediationSummary: "Eliminates continental latency bottlenecks and single-region outages via worldwide edge caching and multi-region Gemini failover.",
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
    ];
  }

  // Fallback for general web applications
  return [
    {
      id: "cost_optimized",
      name: "Cost-Optimized / Lean MVP",
      tagline: "Minimal monthly cloud spend with internal worker processing & baseline reliability.",
      description: "Combines a managed application server with an internal asynchronous task queue. Background jobs (emails, image processing, analytics) are queued and consumed by a dedicated worker process without blocking client web requests, maintaining hosting costs under $35/month.",
      metrics: {
        targetQps: "Up to 500 QPS",
        targetSla: "99.0% (Single AZ)",
        estimatedCostTier: "$",
        estimatedMonthlyCost: "$20 - $35 / mo",
        primaryBottleneckRisk: "Single database instance represents a SPOF during maintenance",
      },
      tradeoffs: {
        pros: [
          "Lowest possible monthly cloud spend (<$35/month)",
          "Background worker prevents heavy jobs from blocking HTTP request threads",
          "Fast time-to-market with simple monolithic deployment",
        ],
        cons: [
          "Single point of failure on database and server",
          "Downtime required for OS patching and database migrations",
        ],
      },
      remediationSummary: "Eliminates direct client-to-database exposure by inserting an API Gateway perimeter proxy and asynchronous worker queue.",
      deepDive: {
        dataFlowSteps: [
          { step: 1, flow: "Client App -> Reverse Proxy", type: "SYNC", description: "Client sends HTTPS requests to NGINX reverse proxy for SSL termination." },
          { step: 2, flow: "Reverse Proxy -> App Server", type: "SYNC", description: "Proxy forwards clean HTTP requests to Node/Python/Go monolith application." },
          { step: 3, flow: "App Server -> PostgreSQL DB", type: "READ_WRITE", description: "Fast transactional reads and immediate writes commit to PostgreSQL." },
          { step: 4, flow: "App Server -> Background Task Queue", type: "ASYNC", description: "Heavy operations (emails, media encoding) pushed to in-memory / Redis task queue." },
          { step: 5, flow: "Task Queue -> Async Worker Process", type: "ASYNC", description: "Worker pulls job batches sequentially to prevent compute memory exhaustion." },
          { step: 6, flow: "Worker Process -> DB & S3 Storage", type: "WRITE", description: "Worker commits final job status to DB and stores generated files into S3." }
        ],
        componentBreakdown: [
          {
            name: "Reverse Proxy / Gateway",
            kind: "api",
            roleAndContribution: "Handles SSL termination, HTTP compression, and prevents exposing backend application ports to public internet.",
            whenToAvoid: "Rarely avoid in production. In local development or prototype stages, client can talk to app server directly."
          },
          {
            name: "Background Task Queue",
            kind: "queue",
            roleAndContribution: "Buffers non-critical operations so client HTTP responses return in <50ms without waiting for slow background processing.",
            whenToAvoid: "Avoid when application has zero asynchronous tasks (e.g. pure CRUD read/write with no emails, webhooks, or processing)."
          },
          {
            name: "Async Worker Process",
            kind: "server",
            roleAndContribution: "Dedicated worker loop that consumes queued jobs in the background, isolating heavy CPU bursts from web traffic.",
            whenToAvoid: "Can run as a secondary thread inside the main application process until memory or CPU exceeds 60%."
          }
        ]
      },
      graph: {
        nodes: [
          { id: "client-1", type: "default", position: { x: 50, y: 220 }, data: { label: "Client App", kind: "client" } },
          { id: "api-1", type: "default", position: { x: 230, y: 220 }, data: { label: "Reverse Proxy / Gateway", kind: "api" } },
          { id: "server-1", type: "default", position: { x: 430, y: 220 }, data: { label: "Monolith App Server", kind: "server" } },
          { id: "queue-1", type: "default", position: { x: 620, y: 340 }, data: { label: "Background Task Queue", kind: "queue" } },
          { id: "worker-1", type: "default", position: { x: 780, y: 340 }, data: { label: "Async Worker Process", kind: "server" } },
          { id: "db-1", type: "default", position: { x: 780, y: 140 }, data: { label: "PostgreSQL DB", kind: "database" } },
          { id: "storage-1", type: "default", position: { x: 930, y: 340 }, data: { label: "Object Storage (S3)", kind: "storage" } },
        ],
        edges: [
          { id: "e-c-api", source: "client-1", target: "api-1", label: "HTTPS Traffic", animated: true },
          { id: "e-api-srv", source: "api-1", target: "server-1", label: "Proxy Ingress", animated: true },
          { id: "e-srv-db", source: "server-1", target: "db-1", label: "Transactional Queries", animated: true },
          { id: "e-srv-queue", source: "server-1", target: "queue-1", label: "Dispatches Async Tasks", animated: true },
          { id: "e-queue-worker", source: "queue-1", target: "worker-1", label: "Pulls Task Batch", animated: true },
          { id: "e-worker-db", source: "worker-1", target: "db-1", label: "Updates Job State", animated: true },
          { id: "e-worker-store", source: "worker-1", target: "storage-1", label: "Uploads Media/Files", animated: true },
        ],
      },
    },
    {
      id: "high_availability",
      name: "High-Availability Multi-AZ Tier",
      tagline: "Zero-SPOF resilient architecture with automated multi-zone failover and resilient worker fleet.",
      description: "Distributes stateless application servers and background worker fleets across multiple availability zones behind redundant Multi-AZ Load Balancers. Backed by clustered primary-standby database replication with automated failover.",
      metrics: {
        targetQps: "15,000+ QPS",
        targetSla: "99.99% (Four Nines)",
        estimatedCostTier: "$$$",
        estimatedMonthlyCost: "$380 - $550 / mo",
        primaryBottleneckRisk: "Cross-AZ network latency during synchronous standby replication",
      },
      tradeoffs: {
        pros: [
          "Zero single points of failure across web, app, worker, and persistence tiers",
          "Automated standby database promotion within 30 seconds of primary failure",
          "Stateless compute tier auto-scales across availability zones elastically",
        ],
        cons: [
          "Higher baseline cost for idle standby replica instances",
          "Inter-AZ data transfer fees across private VPC subnets",
        ],
      },
      remediationSummary: "Eliminates all critical SPOFs by adding redundant gateways, multi-AZ load balancers, worker fleets, and replicated database clusters.",
      deepDive: {
        dataFlowSteps: [
          { step: 1, flow: "Client App -> Dual API Gateways", type: "SYNC", description: "Health-checked Anycast DNS routes traffic across Multi-AZ API Gateways." },
          { step: 2, flow: "Gateways -> Dual Load Balancers", type: "SYNC", description: "L7 Load balancers balance traffic across Availability Zone 1 and 2." },
          { step: 3, flow: "Load Balancers -> Multi-AZ App Fleet", type: "SYNC", description: "Stateless App Servers in AZ-1 and AZ-2 process user requests concurrently." },
          { step: 4, flow: "App Fleet -> Primary DB", type: "READ_WRITE", description: "Read/write queries commit to Primary DB; sync engine replicates to Standby in AZ-2." },
          { step: 5, flow: "App Fleet -> Multi-AZ SQS Queue", type: "ASYNC", description: "Events published to highly available managed message broker." },
          { step: 6, flow: "Queue -> Multi-AZ Worker Fleet", type: "ASYNC", description: "Distributed workers consume jobs with automatic Dead-Letter Queue (DLQ) retry." },
          { step: 7, flow: "Worker Fleet -> Primary DB & S3", type: "WRITE", description: "Workers commit finalized transactional states and upload assets to Multi-AZ S3." }
        ],
        componentBreakdown: [
          {
            name: "Multi-AZ Load Balancers (lb-1, lb-2)",
            kind: "loadbalancer",
            roleAndContribution: "Eliminates ingress single point of failure by providing active-active traffic routing across availability zones.",
            whenToAvoid: "Avoid if SLA requirement is <99.5% and 15-minute maintenance windows are acceptable."
          },
          {
            name: "Multi-AZ Worker Fleet (AZ-1 & AZ-2)",
            kind: "server",
            roleAndContribution: "Consumes background queue events across availability zones. If AZ-1 suffers an outage, AZ-2 workers continue processing seamlessly.",
            whenToAvoid: "Avoid until background task volume requires guaranteed processing availability."
          },
          {
            name: "Standby Replicated DB (AZ-2)",
            kind: "database",
            roleAndContribution: "Synchronous standby replica ready for sub-30s automated failover if the primary database host crashes.",
            whenToAvoid: "Avoid on non-critical databases where daily snapshots and 2-hour RTO are acceptable."
          }
        ]
      },
      graph: {
        nodes: [
          { id: "client-1", type: "default", position: { x: 50, y: 220 }, data: { label: "Client App", kind: "client" } },
          { id: "api-1", type: "default", position: { x: 200, y: 140 }, data: { label: "API Gateway 1 (AZ-1)", kind: "api" } },
          { id: "api-2", type: "default", position: { x: 200, y: 300 }, data: { label: "API Gateway 2 (AZ-2)", kind: "api" } },
          { id: "lb-1", type: "default", position: { x: 350, y: 140 }, data: { label: "Load Balancer 1", kind: "loadbalancer" } },
          { id: "lb-2", type: "default", position: { x: 350, y: 300 }, data: { label: "Load Balancer 2", kind: "loadbalancer" } },
          { id: "server-1", type: "default", position: { x: 500, y: 140 }, data: { label: "App Server 1 (AZ-1)", kind: "server" } },
          { id: "server-2", type: "default", position: { x: 500, y: 300 }, data: { label: "App Server 2 (AZ-2)", kind: "server" } },
          { id: "queue-1", type: "default", position: { x: 650, y: 300 }, data: { label: "Multi-AZ SQS Queue", kind: "queue" } },
          { id: "worker-1", type: "default", position: { x: 790, y: 300 }, data: { label: "Worker Fleet (AZ-1/AZ-2)", kind: "server" } },
          { id: "db-primary", type: "default", position: { x: 790, y: 140 }, data: { label: "Primary DB (AZ-1)", kind: "database" } },
          { id: "db-standby", type: "default", position: { x: 940, y: 140 }, data: { label: "Standby DB (AZ-2)", kind: "database" } },
          { id: "storage-1", type: "default", position: { x: 940, y: 300 }, data: { label: "S3 Multi-AZ Storage", kind: "storage" } },
        ],
        edges: [
          { id: "e-c-api1", source: "client-1", target: "api-1", label: "Ingress Flow", animated: true },
          { id: "e-c-api2", source: "client-1", target: "api-2", label: "Ingress Flow", animated: true },
          { id: "e-api1-lb1", source: "api-1", target: "lb-1", animated: true },
          { id: "e-api2-lb2", source: "api-2", target: "lb-2", animated: true },
          { id: "e-lb1-s1", source: "lb-1", target: "server-1", animated: true },
          { id: "e-lb1-s2", source: "lb-1", target: "server-2", animated: true },
          { id: "e-lb2-s1", source: "lb-2", target: "server-1", animated: true },
          { id: "e-lb2-s2", source: "lb-2", target: "server-2", animated: true },
          { id: "e-s1-dbp", source: "server-1", target: "db-primary", label: "Commit Write", animated: true },
          { id: "e-s1-dbs", source: "server-1", target: "db-standby", label: "Failover Link", animated: true },
          { id: "e-s2-dbp", source: "server-2", target: "db-primary", label: "Commit Write", animated: true },
          { id: "e-s2-dbs", source: "server-2", target: "db-standby", label: "Failover Link", animated: true },
          { id: "e-s1-store", source: "server-1", target: "storage-1", label: "Asset Access", animated: true },
          { id: "e-s2-store", source: "server-2", target: "storage-1", label: "Asset Access", animated: true },
          { id: "e-s1-queue", source: "server-1", target: "queue-1", label: "Publishes Events", animated: true },
          { id: "e-s2-queue", source: "server-2", target: "queue-1", label: "Publishes Events", animated: true },
          { id: "e-queue-worker", source: "queue-1", target: "worker-1", label: "Consumes with DLQ", animated: true },
          { id: "e-worker-dbp", source: "worker-1", target: "db-primary", label: "Commits Records", animated: true },
          { id: "e-worker-store", source: "worker-1", target: "storage-1", label: "Stores Assets", animated: true },
        ],
      },
    },
    {
      id: "high_throughput",
      name: "High-Throughput / Low-Latency Tier",
      tagline: "Burst-resilient architecture with multi-tier Redis caching, Kafka streaming, and dedicated partitioned worker fleet.",
      description: "Absorbs extreme traffic surges using redundant L7 load balancers, multi-node stateless app services, and an in-memory Redis cluster that absorbs 90%+ of read requests. Write operations are buffered into Kafka event streams and committed asynchronously by a partitioned Consumer Worker fleet, achieving zero SPOFs and sub-15ms P99 latency.",
      metrics: {
        targetQps: "50,000+ QPS",
        targetSla: "99.95% (<15ms Latency)",
        estimatedCostTier: "$$$$",
        estimatedMonthlyCost: "$650 - $950 / mo",
        primaryBottleneckRisk: "Replication lag on read replicas during massive write surges",
      },
      tradeoffs: {
        pros: [
          "Zero single points of failure across all layers (10/10 Reliability, 10/10 Scalability)",
          "Redis cluster absorbs 90%+ read queries with sub-millisecond response",
          "Kafka message stream absorbs sudden traffic bursts without locking DB tables",
          "Dedicated partitioned Consumer Worker fleet writes batched transactions asynchronously",
        ],
        cons: [
          "Replication lag on read replicas may cause brief eventual consistency",
          "Requires idempotent consumer handling for background tasks",
        ],
      },
      remediationSummary: "Decouples synchronous bottlenecks using dual load balancers, Redis caching, Kafka queue write buffering, and dedicated consumer workers.",
      deepDive: {
        dataFlowSteps: [
          { step: 1, flow: "High QPS Client -> Dual L7 Load Balancers", type: "SYNC", description: "Active-active redundant load balancers distribute 50k+ QPS burst ingress." },
          { step: 2, flow: "Load Balancers -> App Service Fleet", type: "SYNC", description: "Stateless compute nodes scale horizontally to handle high request volumes." },
          { step: 3, flow: "App Fleet -> Redis Read Cache", type: "READ", description: "Sub-millisecond cache-aside lookup absorbs 90%+ of read traffic (<2ms latency)." },
          { step: 4, flow: "Redis Cache -> Read Replica DBs", type: "READ", description: "Cache misses fallback to clustered Read Replicas, completely protecting the primary DB." },
          { step: 5, flow: "App Fleet -> Kafka Stream Broker", type: "ASYNC", description: "Heavy transactional writes and orders pushed to Kafka without waiting for disk I/O." },
          { step: 6, flow: "Kafka Stream -> Consumer Worker Fleet", type: "ASYNC", description: "Dedicated consumer workers pull partitioned message batches concurrently." },
          { step: 7, flow: "Worker Fleet -> Master Write DB", type: "WRITE", description: "Workers execute optimized bulk/batched database writes, eliminating row-level lock contention." },
          { step: 8, flow: "Worker Fleet -> S3 Fast-Store", type: "WRITE", description: "Generated invoices, exports, and media uploaded to S3 asynchronously." },
          { step: 9, flow: "Master Write DB -> Read Replicas", type: "REPLICATION", description: "Asynchronous replication keeps read replicas synchronized." }
        ],
        componentBreakdown: [
          {
            name: "Kafka Stream Broker",
            kind: "queue",
            roleAndContribution: "Buffers high-velocity write traffic into persistent, partitioned event logs, absorbing flash sales and spikes that would crash SQL databases.",
            whenToAvoid: "Avoid if write traffic is <500 events/sec. Redis Streams or SQS require far less operational maintenance."
          },
          {
            name: "Consumer Worker Fleet",
            kind: "server",
            roleAndContribution: "Horizontally scalable consumer fleet that consumes Kafka partitions, debounces duplicate events, and executes bulk database commits.",
            whenToAvoid: "Avoid separate consumer fleet if jobs can be processed synchronously in under 100ms without queueing."
          },
          {
            name: "Redis Cluster (Read Cache)",
            kind: "cache",
            roleAndContribution: "In-memory key-value cache absorbing repetitive queries (hot products, sessions, leaderboards) with sub-2ms response times.",
            whenToAvoid: "Avoid if read data changes continuously or if database query response times are consistently under 10ms."
          },
          {
            name: "Read Replica Cluster",
            kind: "database",
            roleAndContribution: "Distributes heavy analytical and query reads away from the Master Write DB.",
            whenToAvoid: "Avoid until read-to-write ratio exceeds 5:1 or master database CPU exceeds 65%."
          }
        ]
      },
      graph: {
        nodes: [
          { id: "client-1", type: "default", position: { x: 50, y: 220 }, data: { label: "High QPS Client", kind: "client" } },
          { id: "lb-1", type: "default", position: { x: 200, y: 140 }, data: { label: "L7 Load Balancer 1", kind: "loadbalancer" } },
          { id: "lb-2", type: "default", position: { x: 200, y: 300 }, data: { label: "L7 Load Balancer 2", kind: "loadbalancer" } },
          { id: "server-1", type: "default", position: { x: 360, y: 140 }, data: { label: "App Service Fleet 1", kind: "server" } },
          { id: "server-2", type: "default", position: { x: 360, y: 300 }, data: { label: "App Service Fleet 2", kind: "server" } },
          { id: "cache-1", type: "default", position: { x: 520, y: 140 }, data: { label: "Redis Cluster (Read Cache)", kind: "cache" } },
          { id: "queue-1", type: "default", position: { x: 520, y: 300 }, data: { label: "Kafka Stream Broker", kind: "queue" } },
          { id: "worker-1", type: "default", position: { x: 680, y: 300 }, data: { label: "Consumer Worker Fleet", kind: "server" } },
          { id: "db-primary", type: "default", position: { x: 820, y: 220 }, data: { label: "Master Write DB", kind: "database" } },
          { id: "db-read", type: "default", position: { x: 820, y: 80 }, data: { label: "Read Replica Cluster", kind: "database" } },
          { id: "storage-1", type: "default", position: { x: 820, y: 380 }, data: { label: "S3 Fast-Store", kind: "storage" } },
        ],
        edges: [
          { id: "e-c-lb1", source: "client-1", target: "lb-1", label: "Burst Ingress", animated: true },
          { id: "e-c-lb2", source: "client-1", target: "lb-2", label: "Burst Ingress", animated: true },
          { id: "e-lb1-s1", source: "lb-1", target: "server-1", animated: true },
          { id: "e-lb1-s2", source: "lb-1", target: "server-2", animated: true },
          { id: "e-lb2-s1", source: "lb-2", target: "server-1", animated: true },
          { id: "e-lb2-s2", source: "lb-2", target: "server-2", animated: true },
          { id: "e-s1-cache", source: "server-1", target: "cache-1", label: "Sub-ms Cache Lookup", animated: true },
          { id: "e-s2-cache", source: "server-2", target: "cache-1", label: "Sub-ms Cache Lookup", animated: true },
          { id: "e-cache-dbr", source: "cache-1", target: "db-read", label: "Cache Miss Fallback", animated: true },
          { id: "e-s1-queue", source: "server-1", target: "queue-1", label: "Non-blocking Event Stream", animated: true },
          { id: "e-s2-queue", source: "server-2", target: "queue-1", label: "Non-blocking Event Stream", animated: true },
          { id: "e-queue-worker", source: "queue-1", target: "worker-1", label: "Concurrent Partition Consume", animated: true },
          { id: "e-worker-dbp", source: "worker-1", target: "db-primary", label: "Batched Bulk DB Write", animated: true },
          { id: "e-s1-dbp", source: "server-1", target: "db-primary", label: "Transactional Fallback", animated: true },
          { id: "e-s2-dbp", source: "server-2", target: "db-primary", label: "Transactional Fallback", animated: true },
          { id: "e-s1-store", source: "server-1", target: "storage-1", label: "Direct S3 Access", animated: true },
          { id: "e-s2-store", source: "server-2", target: "storage-1", label: "Direct S3 Access", animated: true },
          { id: "e-worker-store", source: "worker-1", target: "storage-1", label: "Asynchronous Upload", animated: true },
          { id: "e-dbp-dbr", source: "db-primary", target: "db-read", label: "Async Replication", animated: true },
        ],
      },
    },
    {
      id: "global_distributed",
      name: "Global Distributed Multi-Region",
      tagline: "Worldwide Anycast edge routing with cross-continental active-active databases and regional event workers.",
      description: "Routes worldwide users to the nearest geographical edge point of presence via Anycast DNS and CloudFront/Cloudflare Edge CDN. Backed by regional compute fleets, localized event queues, and a globally distributed active-active database.",
      metrics: {
        targetQps: "100,000+ QPS",
        targetSla: "99.999% (Five Nines)",
        estimatedCostTier: "$$$$",
        estimatedMonthlyCost: "$1,200+ / mo",
        primaryBottleneckRisk: "Cross-region network egress costs and distributed transaction overhead",
      },
      tradeoffs: {
        pros: [
          "Sub-80ms latency for global users via 300+ CDN edge Point of Presence locations",
          "Full continental disaster recovery across US East, EU Central, and APAC",
          "Global active-active database ensures localized outages do not disrupt service",
          "Regional event queues and workers ensure localized async processing without cross-continent lag",
        ],
        cons: [
          "Highest cloud operational budget and cross-region network egress fees",
          "Complex distributed multi-master conflict resolution (LWW / Vector Clocks)",
        ],
      },
      remediationSummary: "Eliminates regional vulnerability by decentralizing compute, workers, and database across continents.",
      deepDive: {
        dataFlowSteps: [
          { step: 1, flow: "Global Users -> Cloudflare / Edge CDN", type: "SYNC", description: "Anycast GeoDNS routes users to closest edge Point of Presence (PoP) in <30ms." },
          { step: 2, flow: "Edge CDN -> Regional Ingress Fleets", type: "SYNC", description: "Dynamic requests routed to US-East or EU-Central regional compute clusters." },
          { step: 3, flow: "Regional Fleets -> Global Distributed DB", type: "READ_WRITE", description: "Low-latency local writes replicate globally across continents using Spanner/CockroachDB consensus." },
          { step: 4, flow: "Regional Fleets -> Cross-Region EventBridge", type: "ASYNC", description: "Regional asynchronous operations published to distributed event stream." },
          { step: 5, flow: "EventBridge -> Global Worker Fleet", type: "ASYNC", description: "Workers consume regional events and sync state cross-continentally." },
          { step: 6, flow: "Worker Fleet -> Global DB & Multi-Region S3", type: "WRITE", description: "Workers commit state updates and replicate assets across multi-region buckets." }
        ],
        componentBreakdown: [
          {
            name: "Cloudflare / Edge CDN",
            kind: "api",
            roleAndContribution: "Caches static assets at 300+ worldwide PoPs and routes dynamic API requests through optimized private fiber backbones.",
            whenToAvoid: "Avoid if user base is strictly domestic or confined to a single geographic country."
          },
          {
            name: "Cross-Region EventBridge",
            kind: "queue",
            roleAndContribution: "Enables asynchronous cross-region event synchronization without tight coupling between geographic data centers.",
            whenToAvoid: "Avoid until multi-region active-active deployments are genuinely required for legal data residency or disaster recovery."
          },
          {
            name: "Global Active-Active DB",
            kind: "database",
            roleAndContribution: "Distributed SQL/NoSQL engine providing ACID consistency across global regions with automated conflict resolution.",
            whenToAvoid: "Avoid if standard single-region database with read replicas satisfies user latency requirements."
          }
        ]
      },
      graph: {
        nodes: [
          { id: "client-global", type: "default", position: { x: 50, y: 220 }, data: { label: "Global Users (Anycast)", kind: "client" } },
          { id: "cdn-1", type: "default", position: { x: 180, y: 140 }, data: { label: "Cloudflare Edge PoP 1", kind: "api" } },
          { id: "cdn-2", type: "default", position: { x: 180, y: 300 }, data: { label: "Cloudflare Edge PoP 2", kind: "api" } },
          { id: "lb-us", type: "default", position: { x: 330, y: 140 }, data: { label: "US-East Load Balancer", kind: "loadbalancer" } },
          { id: "lb-eu", type: "default", position: { x: 330, y: 300 }, data: { label: "EU-Central Load Balancer", kind: "loadbalancer" } },
          { id: "server-reg1", type: "default", position: { x: 490, y: 140 }, data: { label: "Region US-East Fleet", kind: "server" } },
          { id: "server-reg2", type: "default", position: { x: 490, y: 300 }, data: { label: "Region EU-Central Fleet", kind: "server" } },
          { id: "queue-1", type: "default", position: { x: 650, y: 300 }, data: { label: "Cross-Region EventBridge", kind: "queue" } },
          { id: "worker-1", type: "default", position: { x: 790, y: 300 }, data: { label: "Global Worker Fleet", kind: "server" } },
          { id: "db-global", type: "default", position: { x: 930, y: 140 }, data: { label: "Global Active-Active DB", kind: "database" } },
          { id: "storage-1", type: "default", position: { x: 930, y: 300 }, data: { label: "S3 Multi-Region Storage", kind: "storage" } },
        ],
        edges: [
          { id: "e-c-cdn1", source: "client-global", target: "cdn-1", label: "Edge Anycast GeoDNS", animated: true },
          { id: "e-c-cdn2", source: "client-global", target: "cdn-2", label: "Edge Anycast GeoDNS", animated: true },
          { id: "e-cdn1-lbus", source: "cdn-1", target: "lb-us", animated: true },
          { id: "e-cdn1-lbeu", source: "cdn-1", target: "lb-eu", animated: true },
          { id: "e-cdn2-lbus", source: "cdn-2", target: "lb-us", animated: true },
          { id: "e-cdn2-lbeu", source: "cdn-2", target: "lb-eu", animated: true },
          { id: "e-lbus-s1", source: "lb-us", target: "server-reg1", animated: true },
          { id: "e-lbus-s2", source: "lb-us", target: "server-reg2", animated: true },
          { id: "e-lbeu-s1", source: "lb-eu", target: "server-reg1", animated: true },
          { id: "e-lbeu-s2", source: "lb-eu", target: "server-reg2", animated: true },
          { id: "e-s1-dbg", source: "server-reg1", target: "db-global", label: "Local Read/Write", animated: true },
          { id: "e-s2-dbg", source: "server-reg2", target: "db-global", label: "Local Read/Write", animated: true },
          { id: "e-s1-store", source: "server-reg1", target: "storage-1", animated: true },
          { id: "e-s2-store", source: "server-reg2", target: "storage-1", animated: true },
          { id: "e-s1-queue", source: "server-reg1", target: "queue-1", label: "Emits Regional Events", animated: true },
          { id: "e-s2-queue", source: "server-reg2", target: "queue-1", label: "Emits Regional Events", animated: true },
          { id: "e-queue-worker", source: "queue-1", target: "worker-1", label: "Cross-Region Replicated Consume", animated: true },
          { id: "e-worker-dbg", source: "worker-1", target: "db-global", label: "Async State Sync", animated: true },
          { id: "e-worker-store", source: "worker-1", target: "storage-1", label: "Replicated Asset Store", animated: true },
        ],
      },
    },
  ];
}

/**
 * Provides production-grade role and avoidance descriptions for any component kind and label.
 */
export function getDefaultRoleAndAvoidance(label = "", kind = "server", variantName = "") {
  const l = label.toLowerCase();
  const k = kind.toLowerCase();

  if (k === "client") {
    return {
      roleAndContribution: "Client application entrypoint (Web, Mobile, or API consumer) that captures user interactions, authenticates sessions, and streams real-time responses.",
      whenToAvoid: "Cannot be avoided for user-facing applications. For pure headless backend jobs, automated cron triggers or webhooks replace interactive clients."
    };
  }
  if (k === "api" || l.includes("gateway") || l.includes("proxy") || l.includes("rate limit") || l.includes("cdn") || l.includes("pop")) {
    return {
      roleAndContribution: "Perimeter API Gateway / Reverse Proxy providing TLS termination, token-bucket rate limiting to prevent quota exhaustion, CORS security, and intelligent request routing.",
      whenToAvoid: "In early internal development or single-box prototypes with <50 QPS and trusted callers, clients can talk directly to backend services."
    };
  }
  if (k === "loadbalancer") {
    return {
      roleAndContribution: "Distributes incoming traffic across redundant compute nodes, performs continuous health probes, and eliminates ingress single points of failure.",
      whenToAvoid: "Can be postponed in single-instance MVP systems where uptime SLA is <99.0% and occasional deployment downtime is acceptable."
    };
  }
  if (l.includes("gemini") || l.includes("llm") || l.includes("model") || l.includes("ai")) {
    return {
      roleAndContribution: "Foundation AI Model service providing high-speed generative reasoning, natural language comprehension, and real-time token streaming.",
      whenToAvoid: "Cannot avoid in generative AI systems; can switch between high-speed Flash models and reasoning Pro models depending on task complexity."
    };
  }
  if (k === "cache" || l.includes("redis") || l.includes("memcached")) {
    return {
      roleAndContribution: "Ultra-fast in-memory key-value cache absorbing repetitive queries, sliding-window conversation turns, and hot data with sub-2ms latency.",
      whenToAvoid: "Can be avoided if database read queries consistently finish in <10ms and the database CPU remains comfortably below 50%."
    };
  }
  if (k === "queue" || l.includes("kafka") || l.includes("rabbitmq") || l.includes("sqs") || l.includes("eventbridge")) {
    return {
      roleAndContribution: "Durable asynchronous message broker buffering sudden traffic surges, analytics telemetry, and heavy ingestion tasks without locking database tables.",
      whenToAvoid: "Can be avoided if all operations execute synchronously in under 100ms and concurrent write traffic is under 200 writes/sec."
    };
  }
  if (k === "server" && (l.includes("worker") || l.includes("consumer") || l.includes("ingestion"))) {
    return {
      roleAndContribution: "Dedicated background worker fleet that pulls tasks from queues, isolates CPU-heavy jobs (document parsing, embedding generation), and commits batched updates.",
      whenToAvoid: "Can run as background threads within the main API server process until background tasks consume >20% of compute memory or CPU."
    };
  }
  if (k === "server") {
    return {
      roleAndContribution: "Core stateless application server orchestrating business logic, input validation, streaming connections, and database interactions.",
      whenToAvoid: "Essential application compute tier; can be deployed as monolithic containers or serverless functions depending on operational budget."
    };
  }
  if (k === "database" && (l.includes("vector") || l.includes("pgvector") || l.includes("pinecone") || l.includes("qdrant") || l.includes("milvus"))) {
    return {
      roleAndContribution: "Specialized vector database providing sub-15ms approximate nearest neighbor (HNSW/Cosine) similarity search to ground prompts in knowledge (RAG).",
      whenToAvoid: "Can be avoided if system does not use document retrieval or semantic search, or if document volume is under 10,000 chunks."
    };
  }
  if (k === "database") {
    return {
      roleAndContribution: "Authoritative transactional persistence layer enforcing ACID compliance, relational integrity, durable state storage, and user credentials.",
      whenToAvoid: "Primary database cannot be avoided; read replicas and standby clusters can be postponed until read volume or 99.99% SLA requires them."
    };
  }
  if (k === "storage" || l.includes("s3") || l.includes("bucket") || l.includes("blob")) {
    return {
      roleAndContribution: "Durable object store (e.g. S3 / GCS) engineered for high-availability storage of unstructured assets, uploaded files, and generated media.",
      whenToAvoid: "Can be omitted if system processes strictly structured text/numeric data and accepts zero user file or document uploads."
    };
  }

  return {
    roleAndContribution: `Provides dedicated ${kind} tier functionality inside ${variantName || "the architecture"}.`,
    whenToAvoid: "Can be simplified or consolidated if system throughput and operational scope do not warrant dedicated tier isolation."
  };
}

/**
 * Ensures variant.deepDive.componentBreakdown contains rich entries for EVERY node in variant.graph.nodes.
 */
export function sanitizeVariantBreakdown(variant) {
  if (!variant.deepDive) {
    variant.deepDive = { dataFlowSteps: [], componentBreakdown: [] };
  }
  if (!Array.isArray(variant.deepDive.componentBreakdown)) {
    variant.deepDive.componentBreakdown = [];
  }

  const existing = variant.deepDive.componentBreakdown;
  const existingMap = new Map();
  for (const item of existing) {
    if (item.name) existingMap.set(item.name.toLowerCase().trim(), item);
    if (item.kind) existingMap.set(item.kind.toLowerCase().trim(), item);
  }

  const nodes = variant.graph?.nodes || [];
  const fullBreakdown = [];
  const seenLabels = new Set();

  for (const node of nodes) {
    const label = node.data?.label || node.id;
    const kind = node.data?.kind || "server";
    // Deduplicate Multi-AZ instances like "Load Balancer 1" and "Load Balancer 2"
    const normalizedKey = label.replace(/\s*(1|2|AZ-1|AZ-2|\(AZ-1\)|\(AZ-2\))\s*$/i, "").trim().toLowerCase();

    if (seenLabels.has(normalizedKey)) continue;
    seenLabels.add(normalizedKey);

    const match =
      existingMap.get(label.toLowerCase().trim()) ||
      existingMap.get(normalizedKey) ||
      existingMap.get(kind.toLowerCase());

    const defaults = getDefaultRoleAndAvoidance(label, kind, variant.name);

    fullBreakdown.push({
      name: label,
      kind: kind,
      roleAndContribution: match?.roleAndContribution || defaults.roleAndContribution,
      whenToAvoid: match?.whenToAvoid || defaults.whenToAvoid,
    });
  }

  // Preserve any additional LLM items that might have different names
  for (const item of existing) {
    const itemKey = (item.name || "").replace(/\s*(1|2|AZ-1|AZ-2|\(AZ-1\)|\(AZ-2\))\s*$/i, "").trim().toLowerCase();
    if (!seenLabels.has(itemKey) && !seenLabels.has((item.name || "").toLowerCase().trim())) {
      seenLabels.add(itemKey);
      fullBreakdown.push(item);
    }
  }

  variant.deepDive.componentBreakdown = fullBreakdown;
  return variant;
}

/**
 * Main generator function that:
 * 1. Audits original graph with deterministic engine.
 * 2. Checks Gatekeeper (blocks if design is incomplete).
 * 3. Retrieves relevant RAG knowledge chunks.
 * 4. Calls Gemini LLM (or fallback) to generate 4 variants.
 * 5. DUALLY AUDITS all 4 generated graphs with the deterministic engine!
 */
export async function generateArchitectureVariants({
  nodes = [],
  edges = [],
  userIntent = null,
  trafficFilters = null,
  apiKey = process.env.GEMINI_API_KEY,
}) {
  // Step 1: Deterministic Engine Analysis on Original User Design
  const originalAnalysis = analyzeArchitecture(
    nodes,
    edges,
    trafficFilters,
    userIntent
  );

  // Step 2: Gatekeeper Check
  if (!originalAnalysis.gatekeeper.canGenerateVariants) {
    return {
      success: false,
      blockedByGatekeeper: true,
      originalAnalysis,
      reason: originalAnalysis.gatekeeper.reason,
      variants: [],
    };
  }

  // Step 3: RAG Retrieval from In-Memory Vector Store
  const ragQuery = [
    userIntent?.description || "",
    userIntent?.concerns || "",
    originalAnalysis.findings.map((f) => f.title).join(", "),
  ]
    .filter(Boolean)
    .join(" ");

  const activeComponentKinds = Array.from(
    new Set(nodes.map((n) => n.data?.kind).filter(Boolean))
  );

  let ragChunks = [];
  try {
    ragChunks = await retrieveRelevantKnowledge(ragQuery, {
      engineFindings: originalAnalysis.findings,
      components: activeComponentKinds,
      topK: 4,
      apiKey,
    });
  } catch (err) {
    console.warn("[ArchPilot Generator] RAG retrieval warning:", err.message);
  }

  // Step 4: LLM Generation (or deterministic fallback)
  let rawVariants = [];
  let executiveSummary = "4 production-ready architectural variants synthesized based on your system goals.";

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const candidateModels = [
        "gemini-3.5-flash-lite",
        "gemini-3.5-flash",
        "gemini-3.8-flash",
        "gemini-flash-latest",
      ];

      const prompt = buildPrompt({
        userIntent,
        originalAnalysis,
        ragChunks,
        trafficFilters,
      });

      let text = null;
      let lastModelError = null;

      for (const modelName of candidateModels) {
        try {
          const model = genAI.getGenerativeModel({
            model: modelName,
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.2,
            },
          });
          const response = await model.generateContent(prompt);
          text = response.response.text();
          console.log(`[ArchPilot Generator] Successfully synthesized variants using live ${modelName}.`);
          break;
        } catch (err) {
          lastModelError = err;
          console.warn(`[ArchPilot Generator] Model ${modelName} unavailable (${err.message}). Trying next candidate...`);
        }
      }

      if (!text) {
        throw lastModelError || new Error("All candidate Gemini models unavailable");
      }

      const parsed = JSON.parse(text);
      if (parsed.variants && Array.isArray(parsed.variants)) {
        rawVariants = parsed.variants;
        if (parsed.executiveSummary) executiveSummary = parsed.executiveSummary;
      } else if (Array.isArray(parsed)) {
        rawVariants = parsed;
      }
    } catch (err) {
      console.warn(`[ArchPilot Generator] Gemini API call failed (${err.message}). Using deterministic variant synthesis.`);
      rawVariants = getDeterministicVariants(originalAnalysis, userIntent);
    }
  } else {
    rawVariants = getDeterministicVariants(originalAnalysis, userIntent);
  }

  // Fallback guard if LLM response was empty or malformed
  if (!rawVariants || rawVariants.length === 0) {
    rawVariants = getDeterministicVariants(originalAnalysis, userIntent);
  }

  // Ensure 100% of graph nodes have complete componentBreakdown entries in deepDive
  const sanitizedVariants = rawVariants.map((variant) => sanitizeVariantBreakdown(variant));

  // Step 5: DUAL-ENGINE AUDIT PASS
  // Run analyzeArchitecture() on all 4 generated graphs to mathematically verify scores!
  const auditedVariants = sanitizedVariants.map((variant) => {
    const vNodes = variant.graph?.nodes || [];
    const vEdges = variant.graph?.edges || [];

    // Run deterministic engine on the generated graph
    const variantAudit = analyzeArchitecture(vNodes, vEdges, trafficFilters, userIntent);

    // Identify which original issues were eliminated by this variant
    const originalRuleIds = new Set(originalAnalysis.findings.map((f) => f.ruleId));
    const variantRuleIds = new Set(variantAudit.findings.map((f) => f.ruleId));

    const resolvedRules = Array.from(originalRuleIds).filter(
      (ruleId) => !variantRuleIds.has(ruleId)
    );

    return {
      ...variant,
      engineAudit: {
        overall: variantAudit.scoring.overall,
        dimensions: variantAudit.scoring.dimensions,
        spofs: variantAudit.spofs,
        cyclesCount: variantAudit.cycles.length,
        findingsCount: variantAudit.findings.length,
        findings: variantAudit.findings,
        summary: variantAudit.summary,
        resolvedRules,
        isClean: variantAudit.findings.length === 0,
      },
    };
  });

  return {
    success: true,
    blockedByGatekeeper: false,
    executiveSummary,
    originalAnalysis,
    ragKnowledgeUsed: ragChunks.map((c) => ({
      docTitle: c.docTitle,
      sectionTitle: c.sectionTitle,
      category: c.category,
    })),
    variants: auditedVariants,
    timestamp: new Date().toISOString(),
  };
}

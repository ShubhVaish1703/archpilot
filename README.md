# ArchPilot 🚀

> **AI-Assisted System Architecture Visualizer, Algorithmic Evaluation Engine & Variant Synthesizer**  
> *MCA Minor Project — Production-Grade Distributed Systems Architecture Platform*

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?logo=next.js)](https://nextjs.org/)
[![React Flow](https://img.shields.io/badge/@xyflow/react-12.12.0-blue)](https://reactflow.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey?logo=express)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Interactions_API-4285F4?logo=google)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-59%2F59_Passing-brightgreen)](#-automated-testing)
[![Test Suites](https://img.shields.io/badge/Suites-9%20Passing-brightgreen)](#-automated-testing)
[![Components](https://img.shields.io/badge/Components-14%20Tiers-blue)](#-component-catalog-14-canonical-tiers)
[![Rules](https://img.shields.io/badge/Rules-20%20Deterministic-blueviolet)](#-deterministic-validation-rules-catalog-20-rules)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_0_Errors-3178C6?logo=typescript)](https://www.typescriptlang.org/)

---

## 📌 Project Overview

**ArchPilot** is an end-to-end distributed system design and audit platform. Unlike generic "thin LLM wrappers" that pass raw user prompts directly to AI models to hallucinate advice, ArchPilot enforces a strict **separation of concerns**:

```
                       [ Interactive User Canvas ]
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │         TIER 1: DETERMINISTIC GRAPH ENGINE             │
       │  • Dominator SPOF Analysis (reachability in G \ {N})   │
       │  • Directed Blast Radius & Quantitative Severity       │
       │  • Sync DFS Directed Cycle Detection (deadlock loops)  │
       │  • 20 Deterministic Structural Anti-Pattern Rules      │
       │  • Weakest-Link Composite Scoring (Security, Rel, Scal)│
       │  • Structural Completeness Gatekeeper Circuit Breaker  │
       └────────────────────────────┬───────────────────────────┘
                                    │ (Verified Topological Facts)
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │         TIER 2: OFFLINE IN-MEMORY RAG LAYER            │
       │  • 138 Curated Chunks from Alex Xu's System Design     │
       │  • 768-Dim Normalized Vectors (Gemini Embeddings)      │
       │  • Metadata Boost (+0.12 rule match, +0.05 component)  │
       │  • Sub-20ms RAM Cosine Retrieval (Zero External DB)    │
       └────────────────────────────┬───────────────────────────┘
                                    │ (Grounded Reference Material)
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │        TIER 3: LIVE AI SYNTHESIS & DUAL-ENGINE PASS    │
       │  • Google Gemini Cascade (3.5-flash-lite / 3.5 / 3.8)  │
       │  • Domain-Aware Synthesis (e.g. LLM Chatbot, E-Com)    │
       │  • Synthesizes 4 Production Variants (MVP, HA, Perf, Gl│
       │  • DUAL-ENGINE AUDIT PASS: Mathematically re-audits    │
       │    every generated variant with the deterministic code │
       └────────────────────────────┬───────────────────────────┘
                                    │ (Interactive Preview & Application)
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │        TIER 4: INTERACTIVE VARIANT WORKSPACE           │
       │  • 2D Non-Overlapping Layout Engine (260px columns)    │
       │  • Deep Dive Modal: 100% component roles & avoidance   │
       │  • Before vs. After Score Delta Comparison Ribbon      │
       │  • 1-Click "Apply Architecture to Canvas" Sync         │
       └────────────────────────────────────────────────────────┘
```

---

## ✨ Key Features

### 1. Interactive Visual Canvas (`/`)
- **14 Canonical Component Kinds across 4 Tiers**:
  - *Edge & Entry*: `client`, `dns` (pass-through resolver), `cdn` (edge cache PoP).
  - *Routing & Security*: `firewall` (WAF/perimeter security), `auth` (centralized identity/OAuth), `api` (API Gateway / reverse proxy), `loadbalancer` (traffic distributor).
  - *Compute & Queue*: `server` (stateless compute), `worker` (asynchronous queue consumer), `queue` (message buffer / event stream).
  - *Data & Storage*: `cache` (Redis/Memcached in-memory store), `database` (primary relational/NoSQL DB), `replica` (read replica / standby), `storage` (multi-AZ object store like S3/GCS).
- **Richer Edge Communication Model**:
  - **Synchronous (`sync`)**: Solid stroke (`#64748B`), blocking RPC/HTTP, evaluated in cycle detection.
  - **Asynchronous (`async`)**: Dashed stroke (`#8B5CF6`), non-blocking message queue pub-sub, safely ignored in cycle detection.
  - **Replication (`replication`)**: Dotted stroke (`#0EA5E9`), standby data synchronization, excluded from SPOF reachability traversal.
  - **Protocols & Encryption**: Support for `http`, `https`, `grpc`, `tcp`, `amqp` and a one-click TLS encryption toggle with live `🔒` indicator badges.
- **Real-Time Visual Diagnostics**:
  - 🔴 **Red Glow (`#EF4444`)**: Single Points of Failure (SPOFs) displaying quantitative blast radius and dominated nodes in details.
  - 🟡 **Amber Glow (`#F59E0B`)**: Circular synchronous dependency deadlock loops.
  - 🟣 **Purple Dashed**: Unreachable backend infrastructure.
  - ⚪ **Gray Dashed**: Disconnected orphan nodes.

### 2. Deterministic Graph & Evaluation Engine
- **Dominator-Based SPOF Detection (`findSpofs`)**: Evaluates directed reachability from entry points under node removal ($G \setminus \{N\}$), naturally distinguishing single bottlenecks from redundant clusters (e.g. dual servers behind an LB are not SPOFs, but a lone LB is).
- **Synchronous Cycle Detection**: Directed DFS recursion stack strictly evaluates synchronous edges (`adjSync`); asynchronous messaging loops are safely ignored.
- **20 Rule Verifications**: Enforces 20 structural, security, reliability, scalability, and flow rules including unconsumed queues (`REL_QUEUE_NO_CONSUMER`), unencrypted client endpoints (`SEC_UNENCRYPTED_PATH`), database replica enforcement (`REL_DB_NO_REPLICA`), client-to-DB bypasses (`SEC_CLIENT_DIRECT_DB`), firewall path protection (`SEC_DB_NO_FIREWALL`), and missing authentication (`SEC_NO_AUTH`).
- **Weakest-Link Scoring Formula**:
  $$\text{Overall Score} = 0.6 \times \min(\text{Security}, \text{Reliability}, \text{Scalability}) + 0.4 \times \text{mean}(\text{Security}, \text{Reliability}, \text{Scalability})$$
  *(Prevents fatal security breaches or reliability single-points-of-failure from hiding behind high scalability scores).*
- **Completeness Gatekeeper**: Intelligent circuit breaker that blocks LLM generation on malformed syntax (orphans, disconnected graphs) while allowing valid optimization targets (SPOFs, unencrypted edges remain `COMPLETE_DESIGN`).

### 3. High-Performance In-Memory RAG Layer
- **138 Semantic Chunks**: Curated from Alex Xu’s *System Design Interview* (Volumes 1 & 2) covering scaling fundamentals, multi-AZ database replication, rate limiting, and cache-aside patterns.
- **Normalized Vector Search**: Unit-normalized 768-dimensional embeddings loaded into Node.js heap in **$< 20\text{ ms}$** without external database dependencies (no Pinecone, no Chroma, no Docker required).
- **Hybrid Metadata Rule Boosting**: Chunks addressing active engine findings receive a $+0.12$ relevance boost.

### 4. 4 Production-Ready Architecture Variants (`/variants`)
ArchPilot synthesizes four distinct, battle-tested variants tailored to user intent:
1. **Cost-Optimized / Lean MVP**: Minimal cloud footprint ($<\$35/\text{mo}$), internal task queue, intentional single-instance prototype trade-off.
2. **High-Availability Multi-AZ Tier**: Zero-SPOF enterprise reliability, redundant load balancers, multi-AZ compute fleets, Aurora primary-standby failover ($99.99\%$ SLA).
3. **High-Throughput / Low-Latency Tier**: In-memory Redis caching (absorbing 90%+ reads), Kafka write buffer stream, partitioned consumer worker fleets, sub-15ms P99 latency.
4. **Global Distributed Multi-Region Tier**: Worldwide Anycast edge CDN PoPs, regional compute fleets, and globally synchronized active-active databases ($99.999\%$ SLA).

### 5. Automated 2D Graph Layout Normalizer
- **260px Column Intervals**: Eliminates card collisions by assigning dedicated tier coordinates across Client ($x=60$), Gateway/DNS/CDN/Firewall ($x=320$), Load Balancer/Auth ($x=580$), Compute/Server ($x=840$), Cache ($x=1100, y=80$), Queue ($x=1100, y=320$), Worker ($x=1360, y=320$), Database ($x=1360, y=80$), and Replica/Storage ($x=1620$).
- **Vertical Async Staggering**: Automatically moves asynchronous message queues and background workers down to $y = 320$, creating clean 2-dimensional breathing room.

### 6. Deep Dive & Component Avoidance Modal
- **100% Component Coverage**: Breaks down every single node present on the canvas.
- **Role & System Contribution**: Explains why the component exists and its runtime responsibility.
- **When to Avoid**: Outlines concrete technical thresholds for when a team can safely postpone or simplify the component.

### 7. Workload & Traffic Sizing
- **Dedicated Inspector Controls**: Optional inputs for Peak RPS and Expected Users with 1-click presets: `MVP (300 RPS)`, `Growth (5k RPS)`, `High-Scale (50k+ RPS)`.
- **Fair Audit Transparency**: Differentiates pure structural rules from traffic-dependent capacity rules, showing a clean `Structural Audit` badge when omitted, and `Traffic-Sized (5,000 RPS)` when supplied.

---

## 🧩 Component Catalog (14 Canonical Tiers)

ArchPilot models 14 specialized architectural node kinds organized across 4 operational tiers:

| # | Kind | Display Name | Tier / Category | Visual Style | Icon | Semantic Role & Pass-Through Behavior | Inherently Redundant |
|:---:|:---|:---|:---|:---|:---:|:---|:---:|
| 1 | `client` | Client | Edge & Entry | Violet (`#F5F3FF`, Border `#C4B5FD`) | Cloud | **Primary Entry Point**. External web/mobile users initiating ingress traffic. Initiates reachability and security path evaluations. | Yes |
| 2 | `dns` | DNS | Edge & Entry | Lime (`#F7FEE7`, Border `#BEF264`) | Route | **Pass-Through Entry Node**. Global Anycast domain resolution. If client is absent, acts as fallback entry. Traversed in reachability; does NOT satisfy multi-server load balancing. | Yes |
| 3 | `cdn` | CDN Edge PoP | Edge & Entry | Sky (`#F0F9FF`, Border `#7DD3FC`) | Globe | **Pass-Through Entry Node / Edge Cache**. Static asset caching PoPs. If client is absent, acts as fallback entry. Traversed in reachability; does NOT satisfy load balancer requirement. | Yes |
| 4 | `firewall` | Firewall / WAF | Routing & Security | Rose (`#FFF1F2`, Border `#FDA4AF`) | Shield | **Perimeter Security / WAF**. Packet inspection barrier. Situating a firewall on all directed paths between client and database satisfies `SEC_DB_NO_FIREWALL`. | No |
| 5 | `auth` | Auth Service | Routing & Security | Purple (`#FAF5FF`, Border `#D8B4FE`) | Lock | **Identity & Token Verification**. OAuth/JWT auth boundary. Situating an auth service on client-to-server paths satisfies `SEC_NO_AUTH`. | No |
| 6 | `api` | API Gateway | Routing & Security | Blue (`#EFF6FF`, Border `#93C5FD`) | Workflow | **Entry Gateway / Reverse Proxy**. HTTP ingress proxy with rate limiting and TLS termination. Satisfies `SEC_NO_AUTH` on client-to-server paths. | No |
| 7 | `loadbalancer` | Load Balancer | Routing & Security | Teal (`#F0FDFA`, Border `#5EEAD4`) | Network | **Traffic Routing & Balancing**. Distributes traffic across compute instances. Mandatory when $\ge 2$ application servers exist to avoid `UNDER_NO_LB_MULTI_SERVER`. | No |
| 8 | `server` | App Server | Compute & Queue | Cyan (`#ECFEFF`, Border `#67E8F9`) | Server | **Core Business Compute**. Stateless application server. Must have outbound persistence (`TOPO_DEAD_END_SERVER` if out-degree = 0). Cannot be exposed directly to unauthenticated clients (`SEC_NO_AUTH`). | No |
| 9 | `worker` | Background Worker | Compute & Queue | Orange (`#FFF7ED`, Border `#FDBA74`) | Cpu | **Asynchronous Consumer Compute**. Background queue processor. Valid consumer for queues on `async` edges, satisfying `REL_QUEUE_NO_CONSUMER`. | No |
| 10 | `queue` | Message Queue | Compute & Queue | Pink (`#FDF2F8`, Border `#F9A8D4`) | Activity | **Asynchronous Buffer / Broker**. Decouples producers and consumers (Kafka/RabbitMQ). Requires upstream publisher (`REL_QUEUE_NO_PUBLISHER`) and downstream worker/server consumer (`REL_QUEUE_NO_CONSUMER`). | No |
| 11 | `cache` | In-Memory Cache | Data & Storage | Amber (`#FFFBEB`, Border `#FCD34D`) | Layers | **In-Memory Volatile Store**. Redis/Memcached read accelerator. Requires backing persistent database (`REL_CACHE_WITHOUT_DB`). | No |
| 12 | `database` | Primary Database | Data & Storage | Emerald (`#ECFDF5`, Border `#6EE7B7`) | Database | **Primary Persistent Store**. Relational/NoSQL data store. Requires firewall protection on all paths (`SEC_DB_NO_FIREWALL`) and read replica redundancy on critical paths (`REL_DB_NO_REPLICA`). | No |
| 13 | `replica` | Read Replica | Data & Storage | Green (`#F0FDF4`, Border `#86EFAC`) | Copy | **Read Replica / Standby**. Connected to database via `type: "replication"` edge. Satisfies `REL_DB_NO_REPLICA`. Excluded from directed reachability during SPOF dominator traversal. | No |
| 14 | `storage` | Cloud Storage | Data & Storage | Indigo (`#EEF2FF`, Border `#A5B4FC`) | HardDrive | **Distributed Object Storage**. Cloud blob store (S3/GCS) with multi-AZ replication. Passive listener; cannot accept direct client queries without gateway (`SEC_CLIENT_DIRECT_DB`). | Yes |

### Ingress Entry Point & Pass-Through Mechanics
1. **Primary Entry**: The engine identifies `client` nodes as the primary traffic entry points.
2. **Fallback / Pass-Through Entry**: If no `client` exists, entry points default to `[api, dns, cdn]`. When a `client` is present, `dns` and `cdn` act as intermediate pass-through nodes routing traffic downstream.
3. **Multi-Server Protection Isolation**: `dns` and `cdn` do not act as load balancers; having multiple application servers fronted only by a CDN or DNS still correctly triggers `UNDER_NO_LB_MULTI_SERVER`.

---

## 🔗 Edge Communication Model & Protocols

ArchPilot models directional network connections with typed communication semantics and transport attributes:

```json
{
  "id": "e1-2",
  "source": "server-1",
  "target": "queue-1",
  "data": {
    "type": "async",
    "protocol": "amqp",
    "encrypted": true
  }
}
```

| Edge Type | Canvas Visual Style | Stroke Dash | Stroke Color | Semantic Role & Engine Behavior |
|:---|:---|:---|:---|:---|
| **Synchronous (`sync`)** | **Solid stroke** | `undefined` (solid) | Slate (`#64748B`) | **Blocking Call (RPC / HTTP)**. Default when missing. Traversed in SPOF dominator reachability. **Strictly evaluated in cycle detection (`REL_CIRCULAR_DEPENDENCY`)**. |
| **Asynchronous (`async`)** | **Dashed stroke** | `"6 4"` | Purple (`#8B5CF6`) | **Non-Blocking Event / Message Queue**. Traversed in SPOF dominator reachability. **Ignored in cycle detection** (cycles traversing an async edge do NOT trigger circular dependency). Required for message queue producer/consumer contracts. |
| **Replication (`replication`)** | **Dotted stroke** | `"2 4"` | Sky Blue (`#0EA5E9`) | **Data Synchronization Link**. Connects primary database to read replica / standby. Satisfies `REL_DB_NO_REPLICA`. **Filtered out / ignored in SPOF dominator reachability** so replicas do not create synthetic critical paths or mask compute SPOFs. |

### Edge Metadata Attributes & Inspector
- **Protocols Supported**: `http`, `https`, `grpc`, `tcp`, `amqp`.
- **Encryption Flag**: Boolean `encrypted` (`true` | `false`).
- **Interactive Edge Inspector**: Selecting any edge opens the Edge Inspector panel with connection type toggles, protocol dropdown, inline unencrypted HTTP warnings, and TLS toggle.
- **Dynamic Edge Badges**: Live labels render e.g. `"sync · https 🔒"`, `"async · amqp"`, or `"replication · tcp"`.
- **Security Rule Enforcement (`SEC_UNENCRYPTED_PATH`)**: Flags client-facing edges where `encrypted === false` OR `protocol === "http"`. If protocol is unset and `encrypted` is not `false`, the rule is skipped to guarantee zero false positives on legacy diagrams.
- **Strict Backward Compatibility**: Any edge omitting `data` or `data.type` is automatically normalized to `type: "sync"`. Legacy `architecture.json` diagrams load, render with solid lines, and analyze without error.

---

## 🧮 Dominator-Based Single Point of Failure (SPOF) Detection

ArchPilot computes single points of failure using **Directed Dominator Analysis** via reachability under node removal ($G \setminus \{N\}$), replacing Tarjan's legacy undirected cut-vertex algorithm.

### Why Tarjan's Undirected Cut-Vertex Model Was Replaced
1. **Edge Directionality**: Distributed systems are fundamentally directed acyclic or directed cyclic request-response flows ($A \to B \to C$). Tarjan's algorithm operates on an undirected graph representation, erasing direction and producing false-positive cut-vertices on external client entry nodes or ingress gateways.
2. **Redundancy Blindness (Multipath Clusters)**: Consider a standard high-availability pattern:
   $$\text{Client} \to \text{API} \to \text{Load Balancer} \to [\text{Server 1}, \text{Server 2}] \to \text{Database}$$
   In an undirected graph, the parallel branches form an undirected cycle (`LB -> Server1 -> DB -> Server2 -> LB`), causing Tarjan's algorithm to treat intermediate nodes incorrectly or fail to realize that if the single `Load Balancer` fails, all access halts.
3. **No Quantitative Impact Metric**: Tarjan's algorithm outputs a binary flag (is cut-vertex or not). It cannot measure how many downstream services go dark when a component fails.

### Directed Dominator Analysis Algorithm (`findSpofs`)

```
Algorithm DominatorSPOF(V, E, EntryNodes):
1. E_trav ← { e ∈ E | e.data.type ≠ "replication" }
2. EntryIds ← EntryNodes if non-empty, else { v ∈ V | v.kind ∈ {client, api, dns, cdn} }
3. R_0 ← ReachableFrom(EntryIds, E_trav, excluded = ∅)
4. SPOFs ← []
5. DataNodes ← { v ∈ V | v.kind ∈ {database, storage} }
6. For each N ∈ R_0 \ EntryIds:
     If isInherentlyRedundant(N) then continue
     R_{-N} ← ReachableFrom(EntryIds, E_trav, excluded = {N})
     Dominates(N) ← { v ∈ R_0 \ {N} | v ∉ R_{-N} }
     If |Dominates(N)| > 0 AND (DataNodes = ∅ OR Dominates(N) ∩ DataNodes ≠ ∅):
       blastRadius ← |Dominates(N)|
       severity ← "CRITICAL" if blastRadius / |V| ≥ 0.20 else "WARNING"
       SPOFs.append({ nodeId: N, kind: N.kind, dominates: Dominates(N), blastRadius, severity })
7. Return SPOFs
```

- **Natural Redundancy Awareness**:
  - If Server 1 fails, requests flow through Server 2 $\to$ DB is reachable $\to \text{Dom}(\text{Server 1}) = \emptyset \to$ **Server 1 is NOT a SPOF**.
  - If Server 2 fails, requests flow through Server 1 $\to$ DB is reachable $\to \text{Dom}(\text{Server 2}) = \emptyset \to$ **Server 2 is NOT a SPOF**.
  - If Load Balancer fails, zero paths reach Server 1, Server 2, or DB $\to \text{Dom}(\text{LB}) = \{\text{Server 1}, \text{Server 2}, \text{DB}\} \to$ **LB is a SPOF with Blast Radius = 3**.
- **Quantitative Blast Radius & Severity Scaling**:
  $$\text{Blast Ratio} = \frac{\text{blastRadius}}{|V|}$$
  $$\text{Severity} = \begin{cases} \text{CRITICAL} & \text{if Blast Ratio} \ge 0.20 \\ \text{WARNING} & \text{if Blast Ratio} < 0.20 \end{cases}$$
- **Canvas Highlighting**: SPOF nodes glow red (`#EF4444`) on the canvas, and the evaluation report displays the exact list of dominated downstream components with click-to-focus navigation.

---

## 🛡️ Deterministic Validation Rules Catalog (20 Rules)

ArchPilot evaluates 20 structural, security, reliability, scalability, and flow rules in a single precomputed pass over the graph profile:

| # | Rule ID | Category | Severity | Description & Trigger Condition | Remediation | Score Impact | Gatekeeper |
|:---:|:---|:---|:---:|:---|:---|:---|:---:|
| 1 | `TOPO_ORPHAN_NODE` | Topology | WARNING | Node with in-degree = 0 and out-degree = 0. Isolated component. | Connect component to flow or remove from canvas. | Rel -0.5 | **BLOCKS** |
| 2 | `TOPO_DISCONNECTED_SUBGRAPH` | Topology | CRITICAL | Architecture is fragmented into $\ge 2$ disconnected islands. | Bridge isolated clusters with network/service connections. | Rel -3.5 | **BLOCKS** |
| 3 | `TOPO_NO_ENTRY_POINT` | Topology | WARNING | Backend infrastructure exists without Client, API Gateway, DNS, or CDN. | Add a Client, Gateway, DNS, or CDN entry point. | Scal -2.0<br>Rel -1.0 | **BLOCKS** |
| 4 | `TOPO_UNREACHABLE_FROM_ENTRY` | Topology | WARNING | Component cannot be reached via directed path from entry nodes. | Ensure valid upstream request chain directs traffic to component. | Rel -1.5 | **BLOCKS** |
| 5 | `TOPO_DEAD_END_SERVER` | Topology | WARNING | Server receives traffic but has zero outbound connections to DB, cache, or queue. | Connect server to database, cache, or queue. | Rel -2.0 | Pass |
| 6 | `TOPO_DB_UNREACHABLE` | Topology | WARNING | Database or storage has no incoming compute, cache, or worker caller. | Connect application server or worker to data store. | Rel -2.0 | Pass |
| 7 | `SEC_CLIENT_DIRECT_DB` | Security | CRITICAL | Direct edge from Client to Database or Object Storage (bypasses authentication). | Route all client queries through API Gateway or App Server. | Sec -6.0<br>Rel -1.5 | Pass |
| 8 | `SEC_NO_AUTH` *(Updated)* | Security | WARNING | Path from Client to App Server lacks an Auth service or API Gateway. | Insert API Gateway or Auth component between client and server. | Sec -3.0 | Pass |
| 9 | `SEC_DB_NO_FIREWALL` *(Updated)* | Security | WARNING | At least one directed path from Client to Database lacks a Firewall node. | Place Firewall component on all paths between client and database. | Sec -2.5 | Pass |
| 10 | `SEC_UNENCRYPTED_PATH` *(NEW)* | Security | WARNING | Client-facing edge uses `protocol: "http"` or `encrypted: false` (skipped if protocol unset). | Enable TLS encryption or switch protocol to HTTPS. | Sec -1.0 | Pass |
| 11 | `SPOF_CRITICAL_PATH` *(Updated)* | Reliability | CRITICAL / WARNING | Dominator node whose removal severs downstream reachability. Scaled by blast radius. | Add redundant instances behind Load Balancer or configure failover. | Rel -(1.0 × scale) | Pass |
| 12 | `REL_CIRCULAR_DEPENDENCY` *(Updated)* | Reliability | CRITICAL | Directed cycle traversing strictly synchronous (`sync`) edges. Async loops ignored. | Break cycle or convert connection to asynchronous message queue. | Rel -4.5 | Pass |
| 13 | `REL_QUEUE_NO_CONSUMER` *(Updated)* | Reliability | WARNING | Queue receives messages but lacks consumer edges to Worker or Server. | Attach Worker service or consumer pool to queue. | Rel -2.0 | Pass |
| 14 | `REL_QUEUE_NO_PUBLISHER` *(Updated)* | Reliability | WARNING | Queue has attached consumers but zero upstream producers via async edges. | Connect upstream producer service to push tasks. | Rel -1.0 | Pass |
| 15 | `REL_DB_NO_REPLICA` *(NEW)* | Reliability | WARNING | Primary database on critical path lacks standby replica on `replication` edge. | Add replica component connected via replication edge. | Rel -1.5 | Pass |
| 16 | `REL_CACHE_WITHOUT_DB` | Reliability | WARNING | Volatile cache configured without persistent database backing. | Front persistent database with cache to handle evictions. | Rel -1.5 | Pass |
| 17 | `REL_LB_SINGLE_TARGET` | Scalability | INFO | Load Balancer routes to only 1 backend target. | Add additional backend instances to benefit from load balancing. | Scal -0.5 | Pass |
| 18 | `UNDER_NO_LB_MULTI_SERVER` *(Updated)* | Scalability | WARNING | $\ge 2$ App Servers deployed without Load Balancer (not confused by CDN/DNS). | Place Load Balancer upstream of application servers. | Scal -3.0<br>Rel -1.0 | Pass |
| 19 | `WRONG_FLOW_REVERSED` | Flow | WARNING | Data store (DB/Storage) drawn initiating outbound connection to compute. | Reverse connection arrow so compute initiates requests. | Rel -2.5 | Pass |
| 20 | `UNNECESSARY_CONNECTION` | Topology | INFO | Direct connection bypassing intermediate proxy/gateway ($A \to C$ and $A \to B \to C$). | Route all traffic through intermediate proxy/gateway. | Scal -0.5 | Pass |

---

## 📊 Quantitative Weakest-Link Scoring Model

Scores range from **1.0 to 10.0** across three independent architectural dimensions:

```
┌────────────────────────────────────────────────────────┐
│             DIMENSION SCORE CALCULATION                │
│                                                        │
│  Security    = max(1.0, 10.0 - Σ Security_Deductions)  │
│  Reliability = max(1.0, 10.0 - Σ Rel_Deductions)       │
│  Scalability = max(1.0, 10.0 - Σ Scal_Deductions)      │
│                                                        │
│  Rounded to 1 decimal place: round(Dim * 10) / 10      │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│            WEAKEST-LINK OVERALL SCORE                  │
│                                                        │
│   minDim = min(Security, Reliability, Scalability)     │
│   avgDim = mean(Security, Reliability, Scalability)    │
│                                                        │
│   Overall = round((0.6 * minDim + 0.4 * avgDim) * 10)  │
│             ─────────────────────────────────────────  │
│                                10                      │
└────────────────────────────────────────────────────────┘
```

### Context-Aware SPOF Scaling
To ensure equitable evaluation across graph sizes, SPOF reliability penalties scale dynamically:
$$\text{spofScale} = \min\left(1.0, \max\left(0.3, \frac{\text{nodeCount}}{8}\right)\right)$$
$$\Delta \text{Reliability} = 1.0 \times \text{spofScale}$$

---

## 🛠️ Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16.4.3 (App Router)** | Server and Client React components, static prerendering |
| **UI Library** | **React 19.3.0 & TypeScript 5** | Type-safe interactive user interface |
| **Graph Visualization** | **`@xyflow/react` v12.12.0 (React Flow)** | Interactive node-edge canvas with smoothstep routing |
| **Styling** | **Tailwind CSS v4 & Lucide React** | Modern design system with pastel diagnostic palette |
| **Backend Framework** | **Node.js v22+ & Express 4.21** | REST API endpoints (`/api/analyze`, `/api/generate-variants`) |
| **Graph Algorithms** | **Custom Engine (Directed Dominators, DFS Sync Cycles, Reachability)** | Single points of failure, directed sync cycles, dominator blast radius |
| **Vector RAG Engine** | **In-Memory Dot-Product Cosine** | Fast vector retrieval loaded directly into Node.js RAM |
| **Foundation Model** | **Google Gemini (3.5-flash-lite / 3.8)** | Multi-variant architectural reasoning & prompt streaming |
| **Test Harness** | **Node.js Native Test Runner (`assert`)** | 59 automated tests across 9 test suites (Tiers 1–4) |

---

## 📂 Repository Layout

```
archpilot/
├── README.md                             # Comprehensive project documentation (this file)
├── context.md                            # Complete technical specification & architecture audit
├── TEST_INFRA.md                         # Multi-tier test architecture & test runner catalog
├── frontend/                             # Next.js 16 Frontend Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx                  # Canvas workspace leveraging modular components
│   │   │   ├── variants/
│   │   │   │   └── page.tsx              # 4-variant dashboard, Before-vs-After comparison & deep dive
│   │   │   ├── layout.tsx                # App shell, fonts & metadata
│   │   │   └── globals.css               # Tailwind CSS v4 styling rules
│   │   └── components/                   # Modular UI Components (Encapsulation)
│   │       ├── ComponentPalette.tsx      # 14-item component catalog palette
│   │       ├── EdgeInspector.tsx         # Selected edge type, protocol & encryption inspector
│   │       ├── AnalysisModal.tsx         # Analysis findings modal with SPOF blast radius badges
│   │       ├── EdgeStyles.ts             # Solid, dashed, dotted edge styling & labels
│   │       ├── NodeStyles.ts             # 14-node color themes, diagnostic glows & catalog
│   │       ├── GraphLayout.ts            # 260px column layout normalizer
│   │       └── types.ts                  # Type definitions for nodes, edges, findings
│   ├── package.json                      # Next.js scripts & dependencies
│   ├── tsconfig.json                     # Strict TypeScript configuration
│   └── .env.local                        # NEXT_PUBLIC_API_URL=http://localhost:5001
└── server/                               # Express Analysis Engine & In-Memory RAG Service
    ├── app.js                            # Express server entry point (port 5001)
    ├── package.json                      # Scripts, dependencies & test runner definition
    ├── .env                              # GEMINI_API_KEY configuration
    ├── knowledge/                        # Curated Markdown Corpus (Alex Xu Vol 1 & 2)
    │   ├── 01_scaling_fundamentals.md
    │   ├── 02_load_balancing_and_traffic.md
    │   ├── 03_database_scaling_and_replication.md
    │   ├── 04_caching_strategies.md
    │   ├── 05_message_queues_and_asynchrony.md
    │   ├── 06_storage_and_cdn.md
    │   ├── 07_security_and_api_gateways.md
    │   ├── 08_high_availability_and_fault_tolerance.md
    │   ├── 09_interview_patterns_url_shortener.md
    │   ├── 10_interview_patterns_chat_and_notification.md
    │   ├── 11_interview_patterns_newsfeed_and_fanout.md
    │   ├── 12_interview_patterns_distributed_id_generator.md
    │   └── embeddings.json               # 138 vectorized semantic chunks (768 dimensions)
    ├── scripts/
    │   └── seedEmbeddings.js             # Knowledge chunker & vector embedding generation script
    ├── src/
    │   ├── routes/
    │   │   └── analysis.js               # POST /api/analyze & POST /api/generate-variants
    │   └── services/
    │       ├── engine/                   # Phase 2 Deterministic Graph Engine
    │       │   ├── graph.js              # Dominator findSpofs, sync DFS cycles, reachability
    │       │   ├── scoring.js            # Weakest-link weighted scoring formula & impact map
    │       │   ├── rules/
    │       │   │   └── structural.js     # 20 structural anti-pattern rules
    │       │   └── index.js              # Master analysis entry point & Gatekeeper
    │       └── rag/                      # In-Memory Vector Store & Variant Generator
    │           ├── chunker.js            # Markdown YAML frontmatter and header chunker
    │           ├── similarity.js         # Unit-normalized cosine similarity & rule boosting
    │           ├── retriever.js          # In-memory index loader & query embedder
    │           └── generator.js          # Gemini cascade, domain synthesis & Dual-Engine audit
    └── test/                             # Automated Test Suites (59 Passing Tests)
        ├── engine.test.js                # Core structural computation tests (6 tests)
        ├── topology_rules.test.js        # Topology & connectivity rule tests (7 tests)
        ├── comprehensive.test.js         # End-to-end multi-scenario graph tests (3 tests)
        ├── rag.test.js                   # Chunker, vector math & retrieval tests (5 tests)
        ├── gatekeeper.test.js            # Completeness gatekeeper tests (4 tests)
        ├── generator.test.js             # LLM prompt, variant synthesis & dual audit (4 tests)
        ├── dominators.test.js            # Dominator SPOF reachability & blast radius (7 tests)
        ├── edge_types.test.js            # Edge types, async cycle, queue worker rules (9 tests)
        └── security_rules.test.js        # Firewall paths, auth, encryption, DB replicas (14 tests)
```

---

## ⚡ Quick Start & Installation

### Prerequisites
- **Node.js**: v20+ (tested on Node.js v22.20.0).
- **Package Manager**: `npm` (v10+).
- **Google Gemini API Key**: Obtainable free from [Google AI Studio](https://aistudio.google.com/).

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/archpilot.git
cd archpilot
```

### 2. Backend Setup
```bash
cd server
npm install

# Create .env file with your Gemini API key:
echo "PORT=5001" > .env
echo "GEMINI_API_KEY=your_gemini_api_key_here" >> .env

# Run automated test suites (59 tests across 9 suites):
npm test

# Start the Express server:
npm start
# Server runs on http://localhost:5001
```

### 3. Frontend Setup
In a new terminal:
```bash
cd frontend
npm install

# Verify Next.js environment configuration:
echo "NEXT_PUBLIC_API_URL=http://localhost:5001" > .env.local

# Run development server:
npm run dev
# App opens on http://localhost:3000
```

### 4. Production Build Verification
```bash
cd frontend
npm run build
# Compiles optimized production bundle using Webpack in ~1.5s
```

---

## 🧪 Automated Testing

ArchPilot includes **59 automated unit and integration tests** across **9 test suites** verifying graph theory algorithms, edge typing, security rules, dominator blast radius, vector retrieval, gatekeeper states, and AI generation:

```bash
cd server && npm test
```

### Test Suite Summary:
```
🧪 Running ArchPilot Structural Computation Engine Tests...
  ✅ Test 1 Passed: Redundant cluster has no server SPOF and no cycles
  ✅ Test 2 Passed: Single Server correctly identified as critical SPOF
  ✅ Test 3 Passed: SEC_CLIENT_DIRECT_DB flagged with CRITICAL severity (score 5.1)
  ✅ Test 4 Passed: REL_CIRCULAR_DEPENDENCY detected across services
  ✅ Test 5 Passed: REL_QUEUE_NO_CONSUMER detected for unconsumed queue
  ✅ Test 6 Passed: UNDER_NO_LB_MULTI_SERVER flagged and partial score reported

🧪 Running ArchPilot Topology & Connectivity Rules Tests...
  ✅ Test 1 Passed: TOPO_ORPHAN_NODE correctly detected
  ✅ Test 2 Passed: TOPO_DISCONNECTED_SUBGRAPH correctly flagged critical disconnected clusters
  ✅ Test 3 Passed: TOPO_NO_ENTRY_POINT flagged when no entry point exists
  ✅ Test 4 Passed: TOPO_UNREACHABLE_FROM_ENTRY correctly detected unreachable nodes
  ✅ Test 5 Passed: TOPO_DEAD_END_SERVER correctly flagged blackhole server
  ✅ Test 6 Passed: TOPO_DB_UNREACHABLE correctly flagged data store with no compute access
  ✅ Test 7 Passed: REL_CACHE_WITHOUT_DB correctly flagged isolated volatile cache

🚀 ARCHPILOT ENGINE COMPREHENSIVE TEST SUITE
  ✅ Scenario 1 Verified: Current Frontend Default Architecture (SPOFs detected, partial score)
  ✅ Scenario 2 Verified: Mixed Anti-Patterns Torture Graph (Score 1.7/10)
  ✅ Scenario 3 Verified: Resilient HA Enterprise Architecture (Score 10/10)

🧪 Running ArchPilot RAG, Chunking & Similarity Tests...
  ✅ Test 1 Passed: Markdown frontmatter parsing and section chunking work accurately
  ✅ Test 2 Passed: Cosine similarity and vector normalization adhere to mathematical definitions
  ✅ Test 3 Passed: Hybrid ranking boosts chunks matching active engine rules
  ✅ Test 4 Passed: Loaded 138 chunks from embeddings.json in 18ms
  ✅ Test 5 Passed: Offline rule fallback correctly retrieves knowledge context

🧪 Running ArchPilot Architecture Completeness Gatekeeper Tests...
  ✅ Test 1 Passed: Blank canvas (0 nodes) correctly classified as BLANK_SLATE and allowed
  ✅ Test 2 Passed: Disconnected orphan component blocks AI generation with clear reason
  ✅ Test 3 Passed: Disconnected architecture islands block AI generation
  ✅ Test 4 Passed: Connected architecture with SPOF is allowed (design smell, not structural blocker)

🧪 Running ArchPilot LLM Generator & Dual-Engine Audit Tests...
  ✅ Test 1 Passed: RAG prompt successfully synthesizes intent, engine findings, and book knowledge
  ✅ Test 2 Passed: 4-variant synthesis produces valid schemas, trade-offs, and tiered coordinates
  ✅ Test 3 Passed: Gatekeeper blocks LLM variant generation on incomplete architecture
  ✅ Test 4 Passed: Dual-Engine Audit verifies generated variants mathematically and tracks resolved issues

🧪 Running ArchPilot Dominator SPOF Detection Tests...
  ✅ Test 1 Passed: Linear chain single gateway SPOFs with quantitative blast radius
  ✅ Test 2 Passed: Two servers behind one load balancer (LB is SPOF, servers are NOT)
  ✅ Test 3 Passed: Diamond graph with dual intermediate redundancy contains 0 SPOFs
  ✅ Test 4 Passed: Replication edge filtering preserves SPOF detection on compute paths
  ✅ Test 5 Passed: Entry-point-only graph contains 0 SPOFs
  ✅ Test 6 Passed: Public interface export and schema contract { nodeId, kind, dominates, blastRadius }
  ✅ Test 7 Passed: Gatekeeper invariant maintained for designs with SPOFs (COMPLETE_DESIGN)

🧪 Running ArchPilot Edge Types & Semantic Rules Tests...
  ✅ Test 1 Passed: Synchronous cycle flagged (REL_CIRCULAR_DEPENDENCY)
  ✅ Test 2 Passed: Asynchronous loop ignored by cycle detection
  ✅ Test 3 Passed: Message queue with async producer and worker consumer passes cleanly
  ✅ Test 4 Passed: Message queue with async server consumer passes cleanly
  ✅ Test 5 Passed: Message queue with missing consumer flagged (REL_QUEUE_NO_CONSUMER)
  ✅ Test 6 Passed: Message queue with missing publisher flagged (REL_QUEUE_NO_PUBLISHER)
  ✅ Test 7 Passed: Legacy untyped edges default to sync without crashes
  ✅ Test 8 Passed: Asynchronous event pipeline maintains COMPLETE_DESIGN gatekeeper mode
  ✅ Test 9 Passed: Synchronous queue boundary validation (sync edges properly checked)

🧪 Running ArchPilot Security & Reliability Rules Tests...
  ✅ Test 1 Passed: Database without firewall flagged (SEC_DB_NO_FIREWALL)
  ✅ Test 2 Passed: Firewall on client-to-DB path satisfies SEC_DB_NO_FIREWALL
  ✅ Test 3 Passed: Bypassed firewall on alternative path flagged
  ✅ Test 4 Passed: Direct client-to-server connection flags SEC_NO_AUTH
  ✅ Test 5 Passed: Auth node on path satisfies SEC_NO_AUTH
  ✅ Test 6 Passed: API gateway on path satisfies SEC_NO_AUTH
  ✅ Test 7 Passed: Client-facing unencrypted edge flagged (SEC_UNENCRYPTED_PATH) with WARNING severity
  ✅ Test 8 Passed: Client-facing edge with protocol unset skips SEC_UNENCRYPTED_PATH
  ✅ Test 9 Passed: Client-facing HTTPS edge with encryption passes cleanly
  ✅ Test 10 Passed: Critical path database without replica flags REL_DB_NO_REPLICA
  ✅ Test 11 Passed: Database with replica connected via replication edge satisfies REL_DB_NO_REPLICA
  ✅ Test 12 Passed: Database with replica connected via sync edge still flags REL_DB_NO_REPLICA
  ✅ Test 13 Passed: Multi-server load balancer check handles DNS/CDN pass-through nodes correctly
  ✅ Test 14 Passed: Gatekeeper allows variant generation on security and reliability findings

🎉 ALL 59 UNIT & INTEGRATION TESTS PASSED (9/9 SUITES)
```

---

## 🎓 Academic Presentation & Demo Walkthrough

When presenting ArchPilot for academic evaluations or technical vivas, follow this 4-step sequence:

1. **Step 1 — Build a Baseline System on Canvas (`/`)**:
   - Assemble `Client` $\to$ `API Gateway` $\to$ `App Server` $\to$ `PostgreSQL DB`.
   - Specify goals in the Inspector: *"Chatbot using Google Gemini API"*.
2. **Step 2 — Execute Algorithmic Audit**:
   - Click **"Analyze design"**.
   - Show how the deterministic engine runs **Dominator SPOF Analysis** to identify critical single points of failure with quantified blast radius and computes an un-hallucinated score of **8.3/10**.
3. **Step 3 — Synthesize 4 Variants**:
   - Click **"Generate 4 Variants ✨"** to navigate to `/variants`.
   - Show the Gemini chatbot specialization: SSE token streaming servers, prompt rate limiters, Redis sliding-window memory, and vector ingestion worker fleets.
4. **Step 4 — Verify with Dual-Engine Audit & Deep Dive**:
   - Open **"Compare with My Design Report"** to show the score delta ribbon and proof that `SPOF_CRITICAL_PATH` was eliminated.
   - Open **"Architecture Deep Dive & Data Flow"** to show full component breakdowns and avoidance criteria.
   - Click **"Apply Architecture to Canvas"** to show instant round-trip injection back into the main visual editor.

---

## 📄 License

Released under the [MIT License](./LICENSE).
Developed as an **MCA Minor Project** for academic evaluation and distributed systems research. All rights reserved © 2026.

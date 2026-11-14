# ArchPilot — Project Context & Comprehensive Technical Specification

> **Document Version**: 3.2.0  
> **Repository Root**: `/Users/mac/Desktop/minorproject_MCA/archpilot`  
> **Last Updated**: November 2026  
> **Target Audience**: Developers, Academic Evaluators, and AI Assistants onboarding to this codebase.

---

## 1. Project Mission & Core Philosophy

**ArchPilot** is an AI-assisted System Architecture Visualizer & Evaluation Engine designed to help software engineers, cloud architects, and students design, audit, and optimize high-level distributed systems.

### The Non-Negotiable Core Principle: "Not a Thin LLM Wrapper"
Many AI tools simply pass raw text or diagrams to an LLM and ask for generic advice. ArchPilot rejects this fragile approach. Instead, it enforces a strict **separation of concerns**:

```
                       [User Canvas & Goals]
                                 │
                                 ▼
         ┌───────────────────────────────────────────────┐
         │     PHASE 2: DETERMINISTIC ENGINE (Code)      │
         │  • Dominator SPOF Analysis (reachability G\N) │
         │  • Synchronous DFS directed cycle detection   │
         │  • 20 deterministic structural & sec rules    │
         │  • Weakest-link weighted composite score      │
         │  • Structural Completeness Gatekeeper         │
         └───────────────────────┬───────────────────────┘
                                 │
                         (Verified Facts)
                                 │
                                 ▼
         ┌───────────────────────────────────────────────┐
         │         OFFLINE IN-MEMORY RAG LAYER           │
         │  • Curated Alex Xu System Design Knowledge    │
         │  • Hybrid search: Cosine similarity + rules   │
         │  • Exact < 20ms RAM retrieval (No external DB)│
         └───────────────────────┬───────────────────────┘
                                 │
                    (Grounded System Context)
                                 │
                                 ▼
         ┌───────────────────────────────────────────────┐
         │          PHASE 3: GEMINI LLM SYNTHESIS        │
         │  • Explains deterministic findings            │
         │  • Generates 4 production-grade variants      │
         │  • Suggests trade-offs, sizing & graph diffs  │
         │  • DUAL-ENGINE AUDIT PASS: Mathematically     │
         │    re-audits generated variants with code     │
         └───────────────────────────────────────────────┘
```

1. **Code Computes the Deterministic Truth**:
   - Graph topology: directed dominators, Single Points of Failure (SPOFs) with quantitative blast radius, synchronous cycle detection, reachability, orphan nodes, and degrees.
   - Structural rule evaluation (20 deterministic rules, zero hallucination).
   - Weighted multi-dimensional scoring (1.0–10.0 scale across Security, Reliability, Scalability) with context-aware SPOF scaling and weakest-link composite aggregation.
   - Architectural Completeness Gatekeeping (blocks LLM if the design has basic structural flaws like disconnected subgraphs or missing entry points).
2. **Offline In-Memory RAG Grounds the AI**:
   - 12 comprehensive knowledge documents curated from Alex Xu's *System Design Interview* (Vol 1 & 2) and production distributed systems engineering.
   - Vectorized using Gemini's `text-embedding-004` (768 dimensions), indexed in-memory for instant cosine similarity retrieval.
3. **LLM (Google Gemini) Synthesizes & Explains**:
   - Synthesizes findings into human-readable recommendations.
   - Proposes 4 concrete architecture variants (Cost-Optimized, High-Availability, High-Throughput, Global Distributed).
   - Every generated variant is mathematically re-audited by the deterministic engine.

---

## 2. Tech Stack & Repository Structure

### Stack Overview
* **Frontend**: Next.js 16.4.3 (App Router), React 19.3.0, TypeScript 5, `@xyflow/react` v12.12.0 (React Flow), Tailwind CSS v4, Lucide React icons. Modular UI components encapsulated in `frontend/src/components/`.
* **Backend**: Node.js (v22+), Express 4.21, ES Modules (`"type": "module"`), `@google/generative-ai` v0.24, `gray-matter` v4.0, `dotenv`.
* **Testing**: Node.js native test runner (`assert/strict`), 59 automated unit and integration tests across 9 test suites (Tiers 1–4).

### Repository Layout
```
archpilot/
├── README.md                             # User-facing guide, diagrams, component catalog & test summary
├── context.md                            # Complete technical specification & architecture audit (this file)
├── TEST_INFRA.md                         # Multi-tier test suite architecture & execution catalog
├── frontend/                             # Next.js 16 Web Application
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx                # HTML shell & font configuration
│   │   │   ├── globals.css               # Tailwind CSS v4 setup
│   │   │   ├── page.tsx                  # Interactive visual canvas & inspector workspace (bounded)
│   │   │   └── variants/
│   │   │       └── page.tsx              # 4-variant dashboard, Before-vs-After comparison & deep dive
│   │   └── components/                   # Modular Canvas UI Components (Encapsulation)
│   │       ├── ComponentPalette.tsx      # 14-item component catalog palette across 4 tiers
│   │       ├── EdgeInspector.tsx         # Selected edge type, protocol & TLS encryption inspector
│   │       ├── AnalysisModal.tsx         # Evaluation findings modal with SPOF blast radius badges
│   │       ├── EdgeStyles.ts             # Solid, dashed, dotted edge styling, labels & normalization
│   │       ├── NodeStyles.ts             # 14-node color themes, diagnostic glows & catalog metadata
│   │       ├── GraphLayout.ts            # Deterministic 260px column layout normalizer
│   │       └── types.ts                  # TypeScript definitions for nodes, edges, findings & results
│   ├── .env.local                        # NEXT_PUBLIC_API_URL=http://localhost:5001
│   ├── .env.example                      # Template for frontend environment
│   ├── package.json                      # Next.js dependencies
│   └── tsconfig.json                     # Strict TypeScript config
└── server/                               # Express Analysis Engine & RAG Service
    ├── app.js                            # Express server entry point (port 5001)
    ├── .env                              # Local backend environment (GEMINI_API_KEY)
    ├── .env.example                      # Environment template
    ├── package.json                      # Server dependencies & 9-suite test runner command
    ├── knowledge/                        # Curated System Design Markdown Corpus
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
    │   └── embeddings.json               # 138 semantic chunks + 768-dim normalized vectors
    ├── scripts/
    │   └── seedEmbeddings.js             # Markdown chunker & Gemini vectorization pipeline
    ├── src/
    │   ├── routes/
    │   │   └── analysis.js               # POST /api/analyze & POST /api/generate-variants router
    │   └── services/
    │       ├── engine/                   # Phase 2 Deterministic Graph Engine
    │       │   ├── graph.js              # Dominator findSpofs, sync DFS cycles, reachability, profile
    │       │   ├── scoring.js            # Weakest-link weighted scoring algorithm & impact map
    │       │   ├── rules/
    │       │   │   └── structural.js     # 20 structural anti-pattern rules
    │       │   └── index.js              # Master analysis entry point & Gatekeeper
    │       └── rag/                      # In-Memory Vector Store & Retrieval Service
    │           ├── chunker.js            # Header-based semantic markdown chunking
    │           ├── similarity.js         # Unit-normalized cosine similarity & rule boosting
    │           ├── retriever.js          # In-memory index loader & Gemini query embedder
    │           └── generator.js          # Gemini cascade, domain synthesis & Dual-Engine audit
    └── test/                             # Automated Test Suites (59 Passing Tests Across 9 Suites)
        ├── engine.test.js                # Tier 1: Core structural computation tests (6 tests)
        ├── rag.test.js                   # Tier 1: Chunker, vector math & retrieval tests (5 tests)
        ├── topology_rules.test.js        # Tier 2: Structural topology rule tests (7 tests)
        ├── edge_types.test.js            # Tier 2: Sync cycle, async loop & queue worker tests (9 tests)
        ├── security_rules.test.js        # Tier 2: Firewall cuts, auth boundaries, TLS, replicas (14 tests)
        ├── dominators.test.js            # Tier 3: Dominator SPOF reachability & blast radius (7 tests)
        ├── comprehensive.test.js         # Tier 3: End-to-end multi-scenario graph testing (3 tests)
        ├── gatekeeper.test.js            # Tier 4: Completeness gatekeeper state tests (4 tests)
        └── generator.test.js             # Tier 4: LLM prompt, variant synthesis & dual audit (4 tests)
```

---

## 3. What Has Been Implemented (Completed Work)

### Phase 1 & 1b: Frontend Visual Workspace & Modular Encapsulation

* **14 Canonical Component Kinds across 4 Tiers**:
  1. *Edge & Entry*: `client` (primary entry), `dns` (pass-through Anycast resolver), `cdn` (pass-through edge cache PoP).
  2. *Routing & Security*: `firewall` (WAF/security perimeter), `auth` (centralized OAuth/JWT service), `api` (API Gateway / reverse proxy), `loadbalancer` (traffic balancer).
  3. *Compute & Queue*: `server` (stateless compute), `worker` (asynchronous queue consumer), `queue` (message buffer / event stream).
  4. *Data & Storage*: `cache` (in-memory volatile store), `database` (primary SQL/NoSQL), `replica` (read replica / standby), `storage` (cloud object store).
* **Ingress Entry Point & Pass-Through Semantics**:
  - `client` is the designated primary entry point.
  - If `client` is omitted, `api`, `dns`, and `cdn` serve as entry points.
  - When `client` is present, `dns` and `cdn` act as intermediate pass-through nodes routing traffic downstream.
  - Pass-through nodes do NOT satisfy the load balancer requirement for multi-server setups (`UNDER_NO_LB_MULTI_SERVER`).
* **Richer Edge Communication Model**:
  - **Synchronous (`sync`)**: Solid stroke (`#64748B`), default for untyped edges. Evaluated strictly in cycle detection (`REL_CIRCULAR_DEPENDENCY`).
  - **Asynchronous (`async`)**: Dashed stroke (`#8B5CF6`, `"6 4"` pattern). Non-blocking message queues / event publishers. Cycles traversing async edges do NOT trigger circular dependency. Required for message queue consumer/producer contracts.
  - **Replication (`replication`)**: Dotted stroke (`#0EA5E9`, `"2 4"` pattern). Primary-to-replica data synchronization. Filtered out from SPOF reachability traversal so standbys do not form false online execution paths.
  - **Protocols Supported**: `http`, `https`, `grpc`, `tcp`, `amqp`.
  - **Transport Encryption**: Boolean `encrypted` toggle. Edges render formatted badges e.g. `"sync · https 🔒"`, `"async · amqp"`, or `"replication · tcp"`.
* **Interactive Edge Inspector (`frontend/src/components/EdgeInspector.tsx`)**:
  - Selecting any edge opens the Edge Inspector with 1-click toggles for Connection Type (Sync, Async, Replication), a protocol selector dropdown, an inline security warning for unencrypted HTTP, a TLS encryption toggle, and a connection deletion action.
* **Component Palette (`frontend/src/components/ComponentPalette.tsx`)**:
  - Categorized component drawer organizing all 14 components into 4 semantic tiers with icons, colors, and drag-and-drop / click-to-add support.
* **Real-time Canvas Diagnostic Visualizations**:
  - 🔴 **Red Glow (`#EF4444`)**: Single Points of Failure (SPOFs) displaying quantitative blast radius.
  - 🟡 **Amber Glow (`#F59E0B`)**: Circular dependency call cycles.
  - 🟣 **Purple Dashed Outline (`#8B5CF6`)**: Unreachable backend infrastructure.
  - ⚪ **Gray Dashed Outline (`#94A3B8`)**: Disconnected orphan components.
* **Analysis Modal (`frontend/src/components/AnalysisModal.tsx`)**:
  - Comprehensive evaluation dialog displaying Gatekeeper status, 3-dimensional score gauges, and a dedicated **Dominator SPOF Banner**.
  - Displays each SPOF's **Blast Radius** and lists every dominated node. Clicking any dominated node or the SPOF button automatically focuses the node on the React Flow canvas.
* **Frontend Code Encapsulation**:
  - All canvas styles, types, layout algorithms, palettes, inspectors, and modals are encapsulated under `frontend/src/components/`.
  - `frontend/src/app/page.tsx` was kept bounded and delegates canvas features cleanly.
* **Strict Backward Compatibility**:
  - Legacy diagrams lacking `edge.data` or `edge.data.type` default automatically to `"sync"`.
  - If `protocol` is not set, `SEC_UNENCRYPTED_PATH` is skipped to avoid false-positive warnings on older diagrams.
  - `result.spofs` returns an array of string IDs (`string[]`) for backward-compatible frontend consumers, while rich dominator objects are attached to `SPOF_CRITICAL_PATH` findings.

---

### Phase 2: Deterministic Graph & Evaluation Engine (`server/src/services/engine/`)

The backend engine executes a deterministic analysis pipeline in a single pass without calling external LLMs or vector databases:

#### 1. Dominator-Based Single Point of Failure (SPOF) Analysis (`graph.js`)
* **Algorithm Formulation (`findSpofs`)**:
  1. *Traversable Edge Subgraph*:
     $$E_{\text{trav}} = \{ e \in E \mid \text{normalizeEdge}(e).\text{type} \neq \text{"replication"} \}$$
  2. *Entry Point Resolution*: Defaults to `client` nodes. If none, falls back to `[api, dns, cdn]`. If none, falls back to in-degree 0 nodes on $E_{\text{trav}}$.
  3. *Baseline Reachability ($R_0$)*: Runs BFS from all entry points simultaneously along directed traversable edges.
  4. *Node Removal Iteration ($G \setminus \{N\}$)*: For each non-entry node $N \in R_0$:
     - If $N$ is inherently redundant (`client`, `storage`, `cdn`, `dns`), skip $N$.
     - Recompute reachability $R_{-N}$ on subgraph $G \setminus \{N\}$ starting from entry points.
     - Dominated set: $\text{Dom}(N) = \{ u \in R_0 \setminus \{N\} \mid u \notin R_{-N} \}$.
     - If $|\text{Dom}(N)| > 0$ and severs access to persistent data nodes (if any exist), record $N$ as a SPOF.
     - Blast Radius: $\text{BlastRadius}(N) = |\text{Dom}(N)|$.
  5. *Severity Scaling*:
     $$\text{Blast Ratio} = \frac{\text{BlastRadius}(N)}{|V|}$$
     $$\text{Severity} = \begin{cases} \text{CRITICAL} & \text{if Blast Ratio} \ge 0.20 \\ \text{WARNING} & \text{if Blast Ratio} < 0.20 \end{cases}$$
* **Why Tarjan's Articulation Points Were Replaced**:
  - Tarjan operates on an *undirected* graph. In a microservice cluster where two identical app servers sit behind one load balancer (`Client -> LB -> [Server1, Server2] -> DB`), Tarjan incorrectly treats the server edges as cut-vertices because it does not model directed ingress reachability.
  - Directed dominator analysis tests actual traffic flow: removing Server 1 leaves DB reachable via Server 2, so Server 1 dominates $\emptyset$ and is **not** a SPOF. Removing the Load Balancer disconnects both servers and the database, correctly identifying the LB as a SPOF with blast radius 3.

#### 2. Directed Synchronous Cycle Detection (`graph.js`)
* Depth-first search (DFS) recursion stack evaluates only synchronous edges (`adjSync`).
* Cycles that traverse at least one asynchronous edge (`type: "async"`) or replication edge (`type: "replication"`) are **ignored**, preventing false-positive deadlocks in event-driven message architectures.

#### 3. Graph Profile Compilation (`buildGraphProfile`)
* Resolves node categorizations into all 14 kinds.
* Computes firewall graph-cut coverage: simulates client-to-database reachability with all firewall nodes removed ($G \setminus \text{Firewalls}$). If any database remains reachable, an unshielded path exists.
* Computes authentication boundaries: traces paths from clients to application servers; flags servers reachable without traversing an `auth` service or `api` gateway.
* Inspects client-facing edges for plaintext HTTP or `encrypted === false` (skipping if protocol is unset).
* Checks reachable databases for connected replicas on `replication` edges.
* Evaluates multi-server load balancing without confusion from DNS or CDN pass-through nodes.

#### 4. The Complete 20 Deterministic Rules Catalog (`rules/structural.js`)

ArchPilot evaluates 20 structural, security, reliability, scalability, and flow rules:

| # | Rule ID | Title | Category | Severity | Condition / Trigger | Remediation | Score Impact | Gatekeeper |
|:---:|:---|:---|:---:|:---:|:---|:---|:---|:---:|
| 1 | `TOPO_ORPHAN_NODE` | Disconnected Orphan Component | Topology | WARNING | Node with in-degree = 0 and out-degree = 0. Isolated component. | Connect component to flow or remove from canvas. | Rel -0.5 | **BLOCKS** |
| 2 | `TOPO_DISCONNECTED_SUBGRAPH` | Disconnected Subgraph Islands | Topology | CRITICAL | Architecture is fragmented into $\ge 2$ disconnected islands. | Bridge isolated clusters with network/service connections. | Rel -3.5 | **BLOCKS** |
| 3 | `TOPO_NO_ENTRY_POINT` | Missing Traffic Entry Point | Topology | WARNING | Backend infrastructure exists without Client, API Gateway, DNS, or CDN. | Add a Client, Gateway, DNS, or CDN entry point. | Scal -2.0<br>Rel -1.0 | **BLOCKS** |
| 4 | `TOPO_UNREACHABLE_FROM_ENTRY` | Unreachable Backend Infrastructure | Topology | WARNING | Component cannot be reached via directed path from entry nodes. | Ensure valid upstream request chain directs traffic to component. | Rel -1.5 | **BLOCKS** |
| 5 | `TOPO_DEAD_END_SERVER` | Dead-End Application Server | Topology | WARNING | Server receives traffic but has zero outbound connections to DB, cache, or queue. | Connect server to database, cache, or queue. | Rel -2.0 | Pass |
| 6 | `TOPO_DB_UNREACHABLE` | Data Store Lacks Compute Access | Topology | WARNING | Database or storage has no incoming compute, cache, or worker caller. | Connect application server or worker to data store. | Rel -2.0 | Pass |
| 7 | `SEC_CLIENT_DIRECT_DB` | Client Directly Accesses Data Store | Security | CRITICAL | Direct edge from Client to Database or Object Storage (bypasses authentication). | Route all client queries through API Gateway or App Server. | Sec -6.0<br>Rel -1.5 | Pass |
| 8 | `SEC_NO_AUTH` *(Updated)* | Missing API Gateway / Auth Boundary | Security | WARNING | Path from Client to App Server lacks an Auth service or API Gateway. | Insert API Gateway or Auth component on client-to-server path. | Sec -3.0 | Pass |
| 9 | `SEC_DB_NO_FIREWALL` *(Updated)* | Database Exposed Without Firewall | Security | WARNING | At least one directed path from Client to Database lacks a Firewall node. | Place Firewall component on all paths between client and database. | Sec -2.5 | Pass |
| 10 | `SEC_UNENCRYPTED_PATH` *(NEW)* | Unencrypted Client Communication Path | Security | WARNING | Client-facing edge uses `protocol: "http"` or `encrypted: false` (skipped if protocol unset). | Enable TLS encryption or switch protocol to HTTPS. | Sec -1.0 | Pass |
| 11 | `SPOF_CRITICAL_PATH` *(Updated)* | Single Point of Failure (SPOF) | Reliability | CRITICAL / WARNING | Dominator node whose removal severs downstream reachability. Scaled by blast radius. | Add redundant instances behind Load Balancer or configure failover. | Rel -(1.0 × scale) | Pass |
| 12 | `REL_CIRCULAR_DEPENDENCY` *(Updated)* | Circular Dependency Detected | Reliability | CRITICAL | Directed cycle traversing strictly synchronous (`sync`) edges. Async loops ignored. | Break cycle or introduce asynchronous message queue. | Rel -4.5 | Pass |
| 13 | `REL_QUEUE_NO_CONSUMER` *(Updated)* | Message Queue Without Consumer | Reliability | WARNING | Queue receives messages but lacks consumer edges to Worker or Server. | Attach Worker service or consumer pool to queue. | Rel -2.0 | Pass |
| 14 | `REL_QUEUE_NO_PUBLISHER` *(Updated)* | Message Queue Without Publisher | Reliability | WARNING | Queue has attached consumers but zero upstream producers via async edges. | Connect upstream producer service to push tasks. | Rel -1.0 | Pass |
| 15 | `REL_DB_NO_REPLICA` *(NEW)* | Database Lacks Replication Redundancy | Reliability | WARNING | Primary database on critical path lacks standby replica on `replication` edge. | Add replica component connected via replication edge. | Rel -1.5 | Pass |
| 16 | `REL_CACHE_WITHOUT_DB` | Cache Without Persistent Data Store | Reliability | WARNING | Volatile cache configured without persistent database backing. | Front persistent database with cache to handle evictions. | Rel -1.5 | Pass |
| 17 | `REL_LB_SINGLE_TARGET` | Load Balancer With Single Target | Scalability | INFO | Load Balancer routes to only 1 backend target. | Add additional backend instances to benefit from load balancing. | Scal -0.5 | Pass |
| 18 | `UNDER_NO_LB_MULTI_SERVER` *(Updated)* | Multiple Servers Without Load Balancer | Scalability | WARNING | $\ge 2$ App Servers deployed without Load Balancer (not confused by CDN/DNS). | Place Load Balancer upstream of application servers. | Scal -3.0<br>Rel -1.0 | Pass |
| 19 | `WRONG_FLOW_REVERSED` | Reversed Storage Connection Flow | Flow | WARNING | Passive data store (DB/Storage) drawn initiating outbound connection to compute. | Reverse connection arrow so compute initiates requests. | Rel -2.5 | Pass |
| 20 | `UNNECESSARY_CONNECTION` | Redundant Bypass Connection | Topology | INFO | Direct connection bypassing intermediate proxy/gateway ($A \to C$ and $A \to B \to C$). | Route all traffic through intermediate proxy/gateway. | Scal -0.5 | Pass |

#### 5. Quantitative Weakest-Link Scoring Algorithm (`scoring.js`)
* **Scale**: 1.0 to 10.0 across **Security**, **Reliability**, and **Scalability**.
* **Base & Floor**: Each dimension starts at $10.0$ and floors at $1.0$:
  $$D = \max(1.0, 10.0 - \sum \text{Deductions})$$
* **Context-Aware SPOF Scaling**:
  $$\text{spofScale} = \min\left(1.0, \max\left(0.3, \frac{\text{nodeCount}}{8}\right)\right)$$
  $$\Delta \text{Reliability} = 1.0 \times \text{spofScale}$$
* **Weakest-Link Composite Formula**:
  $$\text{minDim} = \min(\text{Security}, \text{Reliability}, \text{Scalability})$$
  $$\text{avgDim} = \frac{\text{Security} + \text{Reliability} + \text{Scalability}}{3}$$
  $$\text{Overall Score} = \frac{\text{round}((0.6 \times \text{minDim} + 0.4 \times \text{avgDim}) \times 10)}{10}$$
  *(Prevents architectures with critical security breaches from achieving high overall scores).*

#### 6. Architecture Completeness Gatekeeper (`index.js`)
Acts as an intelligent circuit breaker between the deterministic engine and AI generation:
* **Blocking Flaws**: `TOPO_ORPHAN_NODE`, `TOPO_DISCONNECTED_SUBGRAPH`, `TOPO_NO_ENTRY_POINT`, `TOPO_UNREACHABLE_FROM_ENTRY`.
* **Modes**:
  - `INCOMPLETE_DESIGN` (`canGenerateVariants: false`): Graph contains structural syntax flaws. AI generation is blocked and specific remediation steps are returned.
  - `COMPLETE_DESIGN` (`canGenerateVariants: true`): Graph is structurally connected from entry to persistence. Optimization smells (e.g. SPOF, missing LB, missing replica, unencrypted paths) do NOT block generation—they serve as optimization targets.
  - `BLANK_SLATE` (`canGenerateVariants: true`): 0 nodes on canvas. Allows from-scratch architecture synthesis based on user goals.

---

### Phase 2b: In-Memory RAG & Knowledge Layer (`server/src/services/rag/`)
* **Curated Corpus (`server/knowledge/*.md`)**: 12 modular documents covering fundamental scaling principles, caching, messaging, database sharding, rate limiting, and canonical system design case studies (Alex Xu Vol 1 & 2).
* **Semantic Chunker (`chunker.js`)**: Extracts YAML frontmatter (`tags`, `applicable_components`, `related_rules`) and splits markdown by `## ` and `### ` headers into 138 semantic chunks with context enrichment.
* **Vector Engine (`similarity.js`)**: Unit-normalizes vectors ($\|\mathbf{v}\| = 1$) for ultra-fast dot-product cosine similarity. Applies metadata boosts:
  - **+0.12 score boost** if chunk addresses detected engine findings (`relatedRules`).
  - **+0.05 score boost** if chunk matches active canvas components (`applicableComponents`).
* **Seeder Script (`server/scripts/seedEmbeddings.js`)**: Generates `server/knowledge/embeddings.json` (138 chunks, 768 dimensions).
* **In-Memory Retriever (`retriever.js`)**: Loads the entire 138-chunk vector database into Node.js RAM in **$< 20\text{ ms}$**. Zero external databases required.

---

### Phase 3: RAG-Grounded Architecture Variant Generator (`server/src/services/rag/generator.js`)
* **Multi-Model Gemini Cascade**: Resilient fallback across `gemini-3.5-flash-lite`, `gemini-3.5-flash`, `gemini-3.8-flash`, and `gemini-flash-latest`.
* **Domain-Specific Architectural Synthesis**: Intelligently identifies application domain (e.g. LLM Chatbot / Gemini API, E-commerce, Video Streaming) and synthesizes specialized components: Token-Bucket Rate Limiters, SSE streaming servers, Redis sliding-window memory, vector stores, and async ingestion worker fleets.
* **Zero-SPOF Scale Tiers**: Enforces redundant ingress load balancers, multi-AZ compute fleets, clustered message brokers, consumer worker fleets, and primary-standby database replication with automated failover.
* **Component Breakdown Sanitizer**: Automatically inspects `graph.nodes` and ensures 100% of generated nodes receive a detailed role and concrete avoidance threshold.
* **DUAL-ENGINE AUDIT PASS**: Every generated variant is mathematically re-audited by `analyzeArchitecture()`, verifying SLA, SPOFs, cycles, and tracking eliminated original flaws (`resolvedRules`).

---

### Phase 4: Frontend Variant Review & Interactive Canvas Swap (`/variants`)
* **Comparison Dashboard (`/variants`)**:
  - 4 variant tabs with dynamic metrics, SLA, throughput, and cloud spend.
  - Interactive `@xyflow/react` canvas with `fitView`, smooth animated edges, direction arrows, and light theme palette.
* **Automated 2D Graph Layout Normalizer (`GraphLayout.ts`)**:
  - Enforces strict 260px horizontal column spacing: Client ($x=60$), Gateway/DNS/CDN/Firewall ($x=320$), Load Balancer/Auth ($x=580$), Compute/Server ($x=840$), Cache ($x=1100, y=80$), Queue ($x=1100, y=320$), Worker ($x=1360, y=320$), Database ($x=1360, y=80$), and Replica/Storage ($x=1620$).
  - Staggers asynchronous queues and consumer workers down to $y = 320$, eliminating card collision.
* **Architecture Deep Dive & Component Avoidance Modal**:
  - Maps 100% of canvas components with color-coded badges, system roles, and actionable avoidance thresholds.
* **Side-by-Side Before vs. After Score Comparison Modal**:
  - Summary Delta Ribbon: Original Score vs. Variant Score with delta indicator (e.g. `+1.7` 🟢).
  - Multi-dimensional breakdown across Security, Reliability, and Scalability.
  - Tracks resolved original anti-patterns (`resolvedRules`).
* **Bi-Directional Canvas Application**:
  - 1-click **"Apply Architecture to Canvas"** injects the selected variant back into the primary editor (`/`) with toast confirmation.

---

### Phase 4b: Workload & Traffic Scale Controls
* **Dedicated Inspector Inputs**: Optional fields for Peak RPS and Expected Users with 1-click scale presets: `MVP (300 RPS)`, `Growth (5k RPS)`, `High-Scale (50k+ RPS)`.
* **Audit Transparency**: Displays `Structural Audit` badge when traffic is omitted, and `Traffic-Sized (5,000 RPS)` when specified.
* **Cloud-Native Managed Calibration (`isInherentlyRedundant`)**: Recognizes multi-AZ cloud storage (S3 with 11 9s durability), DNS, and global Anycast CDNs (CloudFront/Cloudflare) as inherently distributed rather than hardware SPOFs.

---

## 4. Automated Testing Architecture (59/59 Passing)

ArchPilot validates its architecture engine through **59 automated tests** organized across a strict 4-tier testing hierarchy executed natively with `node:assert/strict`:

```
cd server && npm test
```

### 4-Tier Test Suite Hierarchy:

```
┌────────────────────────────────────────────────────────────────────────┐
│               TIER 4: SYSTEM INVARIANTS & GATEKEEPER                  │
│   • gatekeeper.test.js (4 tests): COMPLETE vs INCOMPLETE invariants    │
│   • generator.test.js (4 tests): Variant schema & Dual-Engine audit   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│            TIER 3: COMBINATORIAL TOPOLOGIES & DOMINATORS              │
│   • dominators.test.js (7 tests): Directed reachability & blast radius│
│   • comprehensive.test.js (3 tests): Multi-tier reference topologies  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│          TIER 2: FUNCTIONAL RULE SEMANTICS & EDGE DYNAMICS            │
│   • topology_rules.test.js (7 tests): Disconnected graphs & orphans   │
│   • edge_types.test.js (9 tests): Sync cycles, async queues, legacy   │
│   • security_rules.test.js (14 tests / 16 execs): Firewall, TLS, auth │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│             TIER 1: UNIT & ALGORITHMIC FOUNDATIONS                    │
│   • engine.test.js (6 tests): Adjacency, degrees, Tarjan baseline     │
│   • rag.test.js (5 tests): Cosine similarity, chunking, rule boost    │
└────────────────────────────────────────────────────────────────────────┘
```

| Suite # | Suite File | Tier | Test Count | Key Areas Covered |
|:---:|:---|:---:|:---:|:---|
| 1 | `server/test/engine.test.js` | Tier 1 | **6** | Core graph construction, in/out degrees, baseline cycles, and backward-compatible checks. |
| 2 | `server/test/rag.test.js` | Tier 1 | **5** | Frontmatter extraction, markdown header chunking, vector normalization, cosine similarity, rule boosting. |
| 3 | `server/test/topology_rules.test.js` | Tier 2 | **7** | `TOPO_ORPHAN_NODE`, `TOPO_DISCONNECTED_SUBGRAPH`, `TOPO_NO_ENTRY_POINT`, `TOPO_UNREACHABLE_FROM_ENTRY`, `TOPO_DEAD_END_SERVER`, `TOPO_DB_UNREACHABLE`, `REL_CACHE_WITHOUT_DB`. |
| 4 | `server/test/edge_types.test.js` | Tier 2 | **9** | Sync cycle detection (`REL_CIRCULAR_DEPENDENCY`), async loop exclusion, queue producer/consumer contracts (`REL_QUEUE_NO_CONSUMER`, `REL_QUEUE_NO_PUBLISHER`), legacy untyped edge fallback to `sync`, sync queue boundary conditions. |
| 5 | `server/test/security_rules.test.js` | Tier 2 | **14** *(16 execs)* | Firewall path enforcement (`SEC_DB_NO_FIREWALL`), API Gateway/Auth coverage (`SEC_NO_AUTH`), unencrypted client edges (`SEC_UNENCRYPTED_PATH` subtests 7a, 7b, 7c), DB replica rule (`REL_DB_NO_REPLICA`), DNS/CDN pass-through (`UNDER_NO_LB_MULTI_SERVER`). |
| 6 | `server/test/dominators.test.js` | Tier 3 | **7** | `findSpofs` interface, linear chain SPOF, dual servers behind single LB, diamond graph zero-SPOF, replication edge filtering, entry-point-only graphs, blast radius severity scaling, gatekeeper SPOF invariant. |
| 7 | `server/test/comprehensive.test.js` | Tier 3 | **3** | Full end-to-end multi-tier system topologies: default starter canvas, anti-pattern torture graph, and zero-SPOF enterprise HA architecture. |
| 8 | `server/test/gatekeeper.test.js` | Tier 4 | **4** | Gatekeeper state transitions: `BLANK_SLATE`, `INCOMPLETE_DESIGN` (orphans/islands), and `COMPLETE_DESIGN` (SPOFs and flaws allowed as optimization targets). |
| 9 | `server/test/generator.test.js` | Tier 4 | **4** | Multi-variant prompt generation, Gemini model cascade, 4-tier synthesis schemas, and Dual-Engine mathematical audit. |
| **Total** | **9 Suites** | **Tiers 1–4** | **59 Tests** *(61 execs)* | **Zero external framework dependencies (`node:assert/strict`).** |

### Verified Console Output:
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

## 5. Data Contracts & Public API Specifications

### Backend Analysis Endpoint: `POST /api/analyze`

#### Request Payload Contract:
```json
{
  "nodes": [
    {
      "id": "client-1",
      "data": {
        "label": "Web Client",
        "kind": "client"
      }
    },
    {
      "id": "fw-1",
      "data": {
        "label": "Cloud Armor WAF",
        "kind": "firewall"
      }
    },
    {
      "id": "server-1",
      "data": {
        "label": "App Server 1",
        "kind": "server"
      }
    },
    {
      "id": "db-1",
      "data": {
        "label": "PostgreSQL Primary",
        "kind": "database"
      }
    },
    {
      "id": "db-replica-1",
      "data": {
        "label": "PostgreSQL Read Replica",
        "kind": "replica"
      }
    }
  ],
  "edges": [
    {
      "id": "e1",
      "source": "client-1",
      "target": "fw-1",
      "data": {
        "type": "sync",
        "protocol": "https",
        "encrypted": true
      }
    },
    {
      "id": "e2",
      "source": "fw-1",
      "target": "server-1",
      "data": {
        "type": "sync",
        "protocol": "grpc",
        "encrypted": true
      }
    },
    {
      "id": "e3",
      "source": "server-1",
      "target": "db-1",
      "data": {
        "type": "sync",
        "protocol": "tcp",
        "encrypted": true
      }
    },
    {
      "id": "e4",
      "source": "db-1",
      "target": "db-replica-1",
      "data": {
        "type": "replication",
        "protocol": "tcp",
        "encrypted": true
      }
    }
  ],
  "context": {
    "projectDescription": "E-Commerce Order Processing API",
    "problemFocus": "High availability and data durability",
    "traffic": {
      "peakRps": 5000,
      "expectedUsers": 100000
    }
  }
}
```

#### Response Payload Contract:
```json
{
  "scores": {
    "security": 10.0,
    "reliability": 8.8,
    "scalability": 9.5,
    "overall": 9.1
  },
  "findings": [
    {
      "ruleId": "SPOF_CRITICAL_PATH",
      "severity": "CRITICAL",
      "message": "Single Point of Failure: 'App Server 1' dominates 2 downstream component(s).",
      "affectedNodes": ["server-1"],
      "dominates": ["db-1", "db-replica-1"],
      "blastRadius": 2,
      "remediation": "Add redundant instances behind a load balancer or configure automated failover."
    }
  ],
  "spofs": ["server-1"],
  "cycles": [],
  "gatekeeper": {
    "mode": "COMPLETE_DESIGN",
    "canGenerateVariants": true,
    "reason": "Architecture satisfies all topological completeness requirements."
  }
}
```

### Public Graph Engine Methods (`server/src/services/engine/graph.js`)
- `findSpofs(nodes, edges, entryIds)`:
  - Traverses directed `sync` and `async` edges; ignores `replication` edges.
  - Computes reachability in $G \setminus \{N\}$.
  - Returns array of `{ nodeId: string, kind: string, dominates: string[], blastRadius: number }`.
- `findDirectedCycles(graph)`:
  - Strictly evaluates `adjSync`. Returns array of cycles (`string[][]`).
- `buildGraphProfile(nodes, edges)`:
  - Groups nodes into 14 kinds, calculates in/out degrees, identifies entry points, evaluates firewall cuts, auth coverage, unencrypted edges, and database replica status.

---

## 6. Project Status & Future Extensions

### Current Status: 100% Production-Verified
The **ArchPilot** architecture evaluation platform has achieved complete implementation and verification:
- **Frontend Workspace**: 14 component kinds across 4 functional tiers, rich edge inspector (sync, async, replication, protocols, TLS), canvas diagnostic glows, SPOF blast radius badges with click-to-focus, 260px column layout normalizer, modular encapsulation under `frontend/src/components/`.
- **Backend Graph Engine**: Dominator analysis via directed reachability ($G \setminus \{N\}$), synchronous cycle detection, 20 deterministic rules, context-aware SPOF scaling, weakest-link composite scoring, and Completeness Gatekeeper circuit breaker.
- **RAG & Knowledge Retrieval**: In-memory vector database loaded from 138 Alex Xu chunks in $<20\text{ ms}$.
- **LLM Variant Synthesis**: Live Gemini cascade with domain-specific synthesis, zero-SPOF topologies, and dual-engine mathematical auditing.
- **Comparison & Application**: Side-by-side Before-vs-After comparison, Deep Dive modal with 100% component breakdown, and round-trip canvas application.
- **Automated Testing**: 59 automated unit and integration tests across 9 test suites spanning Tiers 1–4, executing with 100% pass rate.

### Optional Future Extensions (Post-Minor Project)
- **Multi-Tenant Cloud Sync**: User accounts with PostgreSQL/Prisma or SQLite to persist and share architecture diagrams via public URLs (`GET /api/projects/:id`).
- **Infrastructure as Code (IaC) Export**: One-click generation of Terraform or AWS CloudFormation templates directly from the synthesized architecture graph.
- **Real-Time Cost Calculator**: Live cloud provider pricing API integration (AWS Pricing API) to calculate exact hourly compute and egress estimates.

---

## 7. How to Run & Develop ArchPilot

### Prerequisites
* Node.js v20+ (tested on Node v22.20.0).
* (Optional for live LLM generation) Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

### Backend Setup
```bash
cd server
npm install
npm test              # Runs all 59 automated tests across 9 test suites

# Start Express server:
npm start             # Runs on http://localhost:5001
```

### Frontend Setup
```bash
cd frontend
npm install
npm run build         # Verifies Next.js 16 Webpack production build (0 errors)
npm run dev           # Runs development server on http://localhost:3000
```

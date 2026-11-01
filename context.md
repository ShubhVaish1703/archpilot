# ArchPilot — Project Context & Comprehensive Technical Specification

> **Document Version**: 2.0.0  
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
         │  • Pure graph algorithms (Tarjan SPOF, DFS)   │
         │  • 18 deterministic structural anti-patterns  │
         │  • Mathematically weighted weakest-link score │
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
         └───────────────────────────────────────────────┘
```

1. **Code Computes the Deterministic Truth**:
   - Graph topology: cycles, articulation points (Single Points of Failure), reachability, orphan nodes, degrees.
   - Structural rule evaluation (18 deterministic rules, zero hallucination).
   - Weighted multi-dimensional scoring (0–10 scale across Security, Reliability, Scalability).
   - Architectural Completeness Gatekeeping (blocks LLM if the design has basic structural flaws).
2. **Offline In-Memory RAG Grounds the AI**:
   - 12 comprehensive knowledge documents curated from Alex Xu's *System Design Interview* (Vol 1 & 2) and production distributed systems engineering.
   - Vectorized using Gemini's `text-embedding-004` (768 dimensions), indexed in-memory for instant cosine similarity retrieval.
3. **LLM (Google Gemini) Synthesizes & Explains**:
   - Synthesizes findings into human-readable recommendations.
   - Proposes 4 concrete architecture variants (Cost-Optimized, High-Availability, High-Throughput, Global Distributed).

---

## 2. Tech Stack & Repository Structure

### Stack Overview
* **Frontend**: Next.js 16.4.3 (App Router), React 19.3.0, TypeScript 5, `@xyflow/react` v12.12.0 (React Flow), Tailwind CSS v4, Lucide React icons.
* **Backend**: Node.js (v22+), Express 4.21, ES Modules (`"type": "module"`), `@google/generative-ai` v0.24, `gray-matter` v4.0, `dotenv`.
* **Testing**: Node.js native test runner (`assert/strict`), 25 automated unit tests across 5 test suites.

### Repository Layout
```
archpilot/
├── context.md                            # Comprehensive project context (this document)
├── context.txt                           # Legacy context reference
├── frontend/                             # Next.js 16 Web Application
│   ├── src/
│   │   └── app/
│   │       ├── layout.tsx                # HTML shell & font configuration
│   │       ├── globals.css               # Tailwind CSS v4 setup
│   │       └── page.tsx                  # Interactive visual canvas & inspector workspace
│   ├── .env.local                        # NEXT_PUBLIC_API_URL=http://localhost:5001
│   ├── .env.example                      # Template for frontend environment
│   ├── package.json                      # Next.js dependencies
│   └── tsconfig.json                     # Strict TypeScript config
└── server/                               # Express Analysis Engine & RAG Service
    ├── app.js                            # Express server entry point (port 5001)
    ├── .env                              # Local backend environment (GEMINI_API_KEY)
    ├── .env.example                      # Environment template
    ├── package.json                      # Server dependencies & scripts
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
    │   └── embeddings.json               # 134 semantic chunks + 768-dim normalized vectors
    ├── scripts/
    │   └── seedEmbeddings.js             # Markdown chunker & Gemini vectorization pipeline
    ├── src/
    │   ├── routes/
    │   │   └── analysis.js               # POST /api/analyze router
    │   └── services/
    │       ├── engine/                   # Phase 2 Deterministic Graph Engine
    │       │   ├── graph.js              # Tarjan SPOF, cycles, reachability, orphans, degrees
    │       │   ├── scoring.js            # Weakest-link weighted scoring algorithm
    │       │   ├── rules/
    │       │   │   └── structural.js     # 18 structural anti-pattern rules
    │       │   └── index.js              # Master analysis entry point & Gatekeeper
    │       └── rag/                      # In-Memory Vector Store & Retrieval Service
    │           ├── chunker.js            # Header-based semantic markdown chunking
    │           ├── similarity.js         # Unit-normalized cosine similarity & rule boosting
    │           └── retriever.js          # In-memory index loader & Gemini query embedder
    └── test/                             # Automated Test Suites (25 passing tests)
        ├── engine.test.js                # Core engine verification
        ├── topology_rules.test.js        # Structural rule verification
        ├── comprehensive.test.js         # End-to-end multi-scenario graph testing
        ├── rag.test.js                   # Chunker, vector math & retrieval tests
        └── gatekeeper.test.js            # Completeness gatekeeper state tests
```

---

## 3. What Has Been Implemented (Completed Work)

### Phase 1 & 1b: Frontend Visual Workspace
* **8 Canonical Component Types**: `client`, `api` (API Gateway), `loadbalancer`, `server`, `database`, `cache`, `queue`, `storage`.
* **HTML5 Drag-and-Drop Canvas**: Drag components from sidebar or click-to-add with smart staggered auto-positioning.
* **Directional Arrowhead Edges**: Animated smoothstep edges with visible target arrowheads (`MarkerType.ArrowClosed`) so connection direction is immediately obvious.
* **Real-time Canvas Diagnostic Visualizations**:
  - 🔴 **Red Glow (`#EF4444`)**: Critical Single Points of Failure (SPOFs).
  - 🟡 **Amber Glow (`#F59E0B`)**: Circular dependency call cycles.
  - 🟣 **Purple Dashed Outline (`#8B5CF6`)**: Unreachable backend infrastructure.
  - ⚪ **Gray Dashed Outline (`#94A3B8`)**: Disconnected orphan components.
* **Mandatory User Context Enforcement**:
  - Requires the user to enter their project description and problem focus before triggering analysis.
  - If omitted, automatically opens the inspector, switches to the "Architecture Goals" tab, highlights the input box in amber, and blocks the request.
* **Export Capability**: Downloads full canvas state as a structured `architecture.json`.

---

### Phase 2: Deterministic Graph & Evaluation Engine (`server/src/services/engine/`)
Implemented as a consolidated Two-Phase Pipeline:

#### 1. Graph Topological Profiling (`graph.js`)
* **Articulation Points (Tarjan's Algorithm)**: Computes cut-vertices via depth-first discovery/low-link trees.
* **Critical Path SPOFs**: Filters articulation points that sever directed connectivity between client entry points and backend persistent storage.
* **Directed Cycle Detection**: Uses DFS recursion stacks to detect synchronous circular dependency loops ($A \to B \to C \to A$).
* **Forward Reachability & Orphan Detection**:
  - Identifies true orphans (degree $= 0$).
  - Identifies unreachable nodes (connected, but unreachable from entry points).
* **Semantic Classifications**: Dead-end compute servers, unconsumed queues, unproduced queues, reversed passive storage connections, and single-target load balancers.

#### 2. Structural Anti-Pattern Rules Catalog (`rules/structural.js`)
Evaluates 18 deterministic rules in a single read-only pass:
1. `TOPO_ORPHAN_NODE`: Completely isolated components with zero connections.
2. `TOPO_DISCONNECTED_SUBGRAPH`: Graph fragmented into disconnected clusters.
3. `TOPO_NO_ENTRY_POINT`: Backend components present without Client or API Gateway.
4. `TOPO_UNREACHABLE_FROM_ENTRY`: Backend nodes unreachable from any traffic entry point.
5. `TOPO_DEAD_END_SERVER`: Application server with incoming traffic but zero outbound persistence/messaging.
6. `TOPO_DB_UNREACHABLE`: Data store with no compute writer or cache connection.
7. `SEC_CLIENT_DIRECT_DB`: Client directly connects to Database or Object Storage (bypasses authentication).
8. `SEC_NO_AUTH`: Client connects directly to App Server without an intervening API Gateway.
9. `SEC_DB_NO_FIREWALL`: Database directly exposed to the edge layer without private subnet protection.
10. `SPOF_CRITICAL_PATH`: Articulation point whose outage severs traffic from persistent data storage.
11. `REL_CIRCULAR_DEPENDENCY`: Synchronous circular dependency causing cascading deadlocks.
12. `REL_QUEUE_NO_CONSUMER`: Message queue receiving messages without a consumer worker pool.
13. `REL_QUEUE_NO_PUBLISHER`: Message queue with idle consumers and zero upstream producers.
14. `UNDER_NO_LB_MULTI_SERVER`: Multiple application servers deployed without a load balancer.
15. `REL_LB_SINGLE_TARGET`: Load balancer routing to only 1 backend target.
16. `REL_CACHE_WITHOUT_DB`: Volatile cache configured without persistent database backing.
17. `WRONG_FLOW_REVERSED`: Passive data store (DB/Storage) drawn initiating outbound connections to compute.
18. `UNNECESSARY_CONNECTION`: Redundant transit connection bypassing intermediate proxy/gateway.

#### 3. Quantitative Scoring Algorithm (`scoring.js`)
* **0 to 10 Scale** across 3 core dimensions: **Security**, **Reliability**, and **Scalability**.
* **Specific Rule Penalties**:
  - `SEC_CLIENT_DIRECT_DB`: Deducts **6.0 points** from Security and **1.5 points** from Reliability.
  - `SPOF_CRITICAL_PATH`: Deducts **3.0 points** from Reliability, scaled by graph size:
    $$\text{Scale Factor} = \min\left(1.0, \max\left(0.3, \frac{\text{nodeCount}}{8}\right)\right)$$
* **Weakest-Link Composite Formula**:
  $$\text{Overall Score} = 0.6 \times \min(\text{dimensionScores}) + 0.4 \times \text{avg}(\text{dimensionScores})$$
  *(Prevents architectures with critical security breaches from achieving high overall scores).*

#### 4. Architecture Completeness Gatekeeper (`index.js`)
Acts as an intelligent circuit breaker between the deterministic engine and AI generation:
* **Blocking Flaws**: `TOPO_ORPHAN_NODE`, `TOPO_DISCONNECTED_SUBGRAPH`, `TOPO_NO_ENTRY_POINT`, `TOPO_UNREACHABLE_FROM_ENTRY`.
* **Modes**:
  - `INCOMPLETE_DESIGN` (`canGenerateVariants: false`): Graph contains structural syntax flaws. AI generation is blocked and specific remediation steps are returned.
  - `COMPLETE_DESIGN` (`canGenerateVariants: true`): Graph is structurally connected from entry to persistence. Optimization smells (e.g. SPOF, missing LB) do NOT block generation—they serve as optimization targets.
  - `BLANK_SLATE` (`canGenerateVariants: true`): 0 nodes on canvas. Allows from-scratch architecture synthesis based on user goals.

---

### In-Memory RAG & Knowledge Layer (`server/src/services/rag/`)
* **Curated Corpus (`server/knowledge/*.md`)**: 12 modular documents covering fundamental scaling principles, caching, messaging, database sharding, rate limiting, and canonical system design case studies (Alex Xu Vol 1 & 2).
* **Semantic Chunker (`chunker.js`)**: Extracts YAML frontmatter (`tags`, `applicable_components`, `related_rules`) and splits markdown by `## ` and `### ` headers into 134 semantic chunks with context enrichment.
* **Vector Engine (`similarity.js`)**: Unit-normalizes vectors ($\|\mathbf{v}\| = 1$) for ultra-fast dot-product cosine similarity. Applies metadata boosts:
  - **+0.12 score boost** if chunk addresses detected engine findings (`relatedRules`).
  - **+0.05 score boost** if chunk matches active canvas components (`applicableComponents`).
* **Seeder Script (`server/scripts/seedEmbeddings.js`)**: Supports both offline dry-run testing and live Gemini `text-embedding-004` batching. Generates [`server/knowledge/embeddings.json`](file:///Users/mac/Desktop/minorproject_MCA/archpilot/server/knowledge/embeddings.json) (3 MB).
* **In-Memory Retriever (`retriever.js`)**: Loads the entire 134-chunk vector database into Node.js RAM in **$< 20\text{ ms}$**. Requires zero external databases (no Pinecone, no Chroma, no Docker containers).

---

## 4. Current Test Suite Status (25/25 Passing)

Run test suite: `cd server && npm test`

```
🧪 Running ArchPilot Structural Computation Engine Tests...
✅ Test 1 Passed: Redundant cluster has no server SPOF and no cycles
✅ Test 2 Passed: Single Server correctly identified as critical SPOF
✅ Test 3 Passed: SEC_CLIENT_DIRECT_DB flagged with CRITICAL severity and score degraded to 5.1
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
✅ Test 4 Passed: Loaded 134 chunks from embeddings.json in 17.20ms
✅ Test 5 Passed: Offline rule fallback correctly retrieves knowledge context

🧪 Running ArchPilot Architecture Completeness Gatekeeper Tests...
✅ Test 1 Passed: Blank canvas (0 nodes) correctly classified as BLANK_SLATE and allowed
✅ Test 2 Passed: Disconnected orphan component blocks AI generation with clear reason
✅ Test 3 Passed: Disconnected architecture islands block AI generation
✅ Test 4 Passed: Connected architecture with SPOF is allowed (design smell, not structural blocker)

🎉 ALL 25 ENGINE, TOPOLOGY, RAG, AND GATEKEEPER TESTS PASSED!
```

---

## 5. What Remains to Be Done (Planned Next Phases)

### Phase 3: RAG-Grounded Architecture Variant Generator (`server/src/services/rag/generator.js`)
* Connect Gemini LLM (via `@google/generative-ai`) to synthesize engine findings and retrieved knowledge chunks.
* Produce **4 Distinct Architectural Variants**:
  1. **Cost-Optimized / Lean MVP**: Lowest hosting cost ($<\$50/\text{mo}$), minimal redundancy, acceptable for internal tools or $<500\text{ QPS}$.
  2. **High-Availability (Zero SPOF)**: Multi-AZ load balancers, auto-scaled compute instances, primary-standby database failover.
  3. **High-Throughput / Low-Latency**: Multi-tier Redis caching, read replicas, Kafka asynchronous write buffering, sub-15ms P99 target.
  4. **Global Distributed / Multi-Region**: Anycast GeoDNS routing, edge CDN, active-active or multi-region database replication.
* Response contract for each variant:
  - `name`: Variant title.
  - `description`: Architectural strategy explanation.
  - `estimatedCostTier`: e.g., "$ (Low)", "$$ (Medium)", "$$$$ (Enterprise)".
  - `tradeoffs`: Pros and cons list.
  - `graphChanges`: Recommended additions, edge rewires, and node removals.
  - `graph`: Concrete React Flow `{ nodes, edges }` JSON for instant preview.

### Phase 4: Frontend Variant Review & Interactive Canvas Swap
* Add a "Design Variants" tab inside the Evaluation Report modal.
* Display the 4 variant cards side-by-side with score projections, cost estimates, and trade-offs.
* Provide an **"Apply to Canvas" / "Preview Variant"** button that lets the user visually swap their current canvas graph with the AI-suggested architecture variant.

### Phase 5: Architecture Persistence & Cloud Sync
* Database storage (PostgreSQL or SQLite) to save and load user projects.
* REST API endpoints:
  - `GET /api/projects`: List user diagrams.
  - `POST /api/projects`: Save current canvas state.
  - `GET /api/projects/:id`: Load canvas state.

---

## 6. How to Run & Develop ArchPilot

### Prerequisites
* Node.js v20+ (tested on Node v22.20.0).
* (Optional for live LLM generation) Google Gemini API Key from [Google AI Studio](https://aistudio.google.com/).

### Backend Setup
```bash
cd server
npm install
npm test              # Runs all 25 automated tests

# To generate real Gemini 768-dim embeddings:
GEMINI_API_KEY="your-key" npm run seed:embeddings

# Start Express server:
npm start             # Runs on http://localhost:5001
```

### Frontend Setup
```bash
cd frontend
npm install
npm run dev           # Runs on http://localhost:3000
```

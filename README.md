# ArchPilot 🚀

> **AI-Assisted System Architecture Visualizer, Algorithmic Evaluation Engine & Variant Synthesizer**  
> *MCA Minor Project — Production-Grade Distributed Systems Architecture Platform*

[![Next.js](https://img.shields.io/badge/Next.js-16.4.3-black?logo=next.js)](https://nextjs.org/)
[![React Flow](https://img.shields.io/badge/@xyflow/react-12.12.0-blue)](https://reactflow.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-v22+-green?logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey?logo=express)](https://expressjs.com/)
[![Google Gemini](https://img.shields.io/badge/Google_Gemini-Interactions_API-4285F4?logo=google)](https://ai.google.dev/)
[![Tests](https://img.shields.io/badge/Tests-29%2F29_Passing-brightgreen)](#automated-testing)
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
       │  • Tarjan's Bridge-Finding Algorithm (SPOF cut-vertices)│
       │  • DFS Directed Cycle Detection (deadlock loops)       │
       │  • 18 Deterministic Structural Anti-Pattern Rules      │
       │  • Weakest-Link Composite Scoring (Security, Rel, Scal)│
       │  • Structural Completeness Gatekeeper                  │
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
- **8 Canonical Tiers**: `client`, `api` (Gateway / Reverse Proxy), `loadbalancer`, `server`, `database`, `cache`, `queue`, `storage`.
- **Fluid Drag-and-Drop**: HTML5 drag from catalog or click-to-add with smart staggered auto-placement.
- **Directional Arrowheads**: Smoothstep edges with target markers (`MarkerType.ArrowClosed`) indicating exact protocol traffic flow.
- **Real-Time Visual Diagnostics**:
  - 🔴 **Red Glow (`#EF4444`)**: Critical Single Points of Failure (SPOFs).
  - 🟡 **Amber Glow (`#F59E0B`)**: Circular synchronous dependency call loops.
  - 🟣 **Purple Dashed**: Unreachable backend infrastructure.
  - ⚪ **Gray Dashed**: Disconnected orphan nodes.

### 2. Deterministic Graph & Evaluation Engine
- **Tarjan's Articulation Points**: Mathematical cut-vertex discovery identifies nodes whose outage severs traffic between client ingress and persistence.
- **Cycle Detection**: Depth-first recursion stack detects circular dependencies ($A \to B \to C \to A$).
- **18 Rule Verifications**: Includes unconsumed queues (`REL_QUEUE_NO_CONSUMER`), direct client-to-database bypasses (`SEC_CLIENT_DIRECT_DB`), exposed unauthenticated endpoints (`SEC_NO_AUTH`), and un-replicated monolith servers.
- **Weakest-Link Scoring Formula**:
  $$\text{Overall Score} = 0.6 \times \min(\text{Dimensions}) + 0.4 \times \text{avg}(\text{Dimensions})$$
  *(Prevents fatal security breaches from hiding behind high scalability scores).*
- **Completeness Gatekeeper**: Intelligent circuit breaker that blocks LLM generation on malformed syntax while allowing valid optimization targets and blank-slate synthesis.

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
- **260px Column Intervals**: Eliminates card collisions by assigning dedicated tier coordinates across Client ($x=60$), Gateway ($x=320$), Compute ($x=580$), Cache ($x=840, y=80$), Queue ($x=840, y=320$), Worker ($x=1100, y=320$), and Database ($x=1360$).
- **Vertical Async Staggering**: Automatically moves asynchronous message queues and background workers down to $y = 320$, creating clean 2-dimensional breathing room.

### 6. Deep Dive & Component Avoidance Modal
- **100% Component Coverage**: Breaks down every single node present on the canvas.
- **Role & System Contribution**: Explains why the component exists and its runtime responsibility.
- **When to Avoid**: Outlines concrete technical thresholds for when a team can safely postpone or simplify the component.

### 7. Workload & Traffic Sizing
- **Dedicated Inspector Controls**: Optional inputs for Peak RPS and Expected Users with 1-click presets: `MVP (300 RPS)`, `Growth (5k RPS)`, `High-Scale (50k+ RPS)`.
- **Fair Audit Transparency**: Differentiates pure structural rules from traffic-dependent capacity rules, showing a clean `Structural Audit` badge when omitted, and `Traffic-Sized (5,000 RPS)` when supplied.

---

## 🛠️ Tech Stack

| Domain | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | **Next.js 16.4.3 (App Router)** | Server and Client React components, static prerendering |
| **UI Library** | **React 19.3.0 & TypeScript 5** | Type-safe interactive user interface |
| **Graph Visualization** | **`@xyflow/react` v12.12.0 (React Flow)** | Interactive node-edge canvas with smoothstep routing |
| **Styling** | **Tailwind CSS v4 & Lucide React** | Modern design system with pastel diagnostic palette |
| **Backend Framework** | **Node.js v22+ & Express 4.21** | REST API endpoints (`/api/analyze`, `/api/generate-variants`) |
| **Graph Algorithms** | **Custom Engine (Tarjan's DFS)** | Single points of failure, directed cycles, cut-vertices |
| **Vector RAG Engine** | **In-Memory Dot-Product Cosine** | Fast vector retrieval loaded directly into Node.js RAM |
| **Foundation Model** | **Google Gemini (3.5-flash-lite / 3.8)** | Multi-variant architectural reasoning & prompt streaming |
| **Test Harness** | **Node.js Native Test Runner (`assert`)** | 29 automated tests across 6 test suites |

---

## 📂 Repository Layout

```
archpilot/
├── README.md                             # Comprehensive project documentation (this file)
├── context.md                            # Complete technical specification & architecture audit
├── frontend/                             # Next.js 16 Frontend Web Application
│   ├── src/
│   │   └── app/
│   │       ├── page.tsx                  # Interactive primary canvas, inspector & evaluate modal
│   │       ├── variants/
│   │       │   └── page.tsx              # 4-variant dashboard, Before-vs-After comparison & deep dive
│   │       ├── layout.tsx                # App shell, fonts & metadata
│   │       └── globals.css               # Tailwind CSS v4 styling rules
│   ├── package.json                      # Next.js scripts & dependencies
│   ├── tsconfig.json                     # Strict TypeScript configuration
│   └── .env.local                        # NEXT_PUBLIC_API_URL=http://localhost:5001
└── server/                               # Express Analysis Engine & In-Memory RAG Service
    ├── app.js                            # Express server entry point (port 5001)
    ├── package.json                      # Scripts, dependencies & test commands
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
    │       │   ├── graph.js              # Tarjan SPOF, DFS cycles, reachability, orphans
    │       │   ├── scoring.js            # Weakest-link weighted scoring formula
    │       │   ├── rules/
    │       │   │   └── structural.js     # 18 structural anti-pattern rules
    │       │   └── index.js              # Master analysis entry point & Gatekeeper
    │       └── rag/                      # In-Memory Vector Store & Variant Generator
    │           ├── chunker.js            # Markdown YAML frontmatter and header chunker
    │           ├── similarity.js         # Unit-normalized cosine similarity & rule boosting
    │           ├── retriever.js          # In-memory index loader & query embedder
    │           └── generator.js          # Gemini cascade, domain synthesis & Dual-Engine audit
    └── test/                             # Automated Test Suites (29 Passing Tests)
        ├── engine.test.js                # Core structural computation tests (6 tests)
        ├── topology_rules.test.js        # Topology & connectivity rule tests (7 tests)
        ├── comprehensive.test.js         # End-to-end multi-scenario graph tests (3 tests)
        ├── rag.test.js                   # Chunker, vector math & retrieval tests (5 tests)
        ├── gatekeeper.test.js            # Completeness gatekeeper tests (4 tests)
        └── generator.test.js             # LLM prompt, variant synthesis & dual audit (4 tests)
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

# Run automated test suites (29 tests):
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

ArchPilot includes **29 automated unit and integration tests** verifying graph theory algorithms, structural rules, vector retrieval, gatekeeper states, and AI generation:

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

🎉 ALL 29 UNIT & INTEGRATION TESTS PASSED (6/6 SUITES)
```

---

## 🎓 Academic Presentation & Demo Walkthrough

When presenting ArchPilot for academic evaluations or technical vivas, follow this 4-step sequence:

1. **Step 1 — Build a Baseline System on Canvas (`/`)**:
   - Assemble `Client` $\to$ `API Gateway` $\to$ `App Server` $\to$ `PostgreSQL DB`.
   - Specify goals in the Inspector: *"Chatbot using Google Gemini API"*.
2. **Step 2 — Execute Algorithmic Audit**:
   - Click **"Analyze design"**.
   - Show how the deterministic engine runs Tarjan's algorithm to identify 3 Single Points of Failure and computes an un-hallucinated score of **8.3/10**.
3. **Step 3 — Synthesize 4 Variants**:
   - Click **"Generate 4 Variants ✨"** to navigate to `/variants`.
   - Show the Gemini chatbot specialization: SSE token streaming servers, prompt rate limiters, Redis sliding-window memory, and vector ingestion worker fleets.
4. **Step 4 — Verify with Dual-Engine Audit & Deep Dive**:
   - Open **"Compare with My Design Report"** to show the $+1.7$ score delta ribbon and proof that `SPOF_CRITICAL_PATH` was eliminated.
   - Open **"Architecture Deep Dive & Data Flow"** to show full component breakdowns and avoidance criteria.
   - Click **"Apply Architecture to Canvas"** to show instant round-trip injection back into the main visual editor.

---

## 📄 License
This project is developed as an **MCA Minor Project** for academic evaluation and distributed systems research.
All rights reserved © 2026.

# 🚀 ArchPilot

**AI-Assisted System Architecture Visualizer & Evaluation Engine**

*Design. Analyze. Improve.*

Create system architectures visually, detect structural and design issues, and evaluate **Security**, **Reliability**, and **Scalability** with a deterministic analysis engine backed by a Retrieval-Augmented Generation (RAG) knowledge base.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Why ArchPilot?](#-why-archpilot)
- [Key Features](#-key-features)
- [How It Works](#-how-it-works)
- [System Architecture](#-system-architecture)
- [Technology Stack](#-technology-stack)
- [Architecture Components](#-architecture-components)
- [Analysis Engine](#-analysis-engine)
- [Structural Rules](#-structural-rules)
- [Scoring System](#-scoring-system)
- [RAG Knowledge System](#-rag-knowledge-system)
- [API Reference](#-api-reference)
- [Project Structure](#-project-structure)
- [Installation & Setup](#-installation--setup)
- [Environment Variables](#-environment-variables)
- [Testing](#-testing)
- [Current Status](#-current-status)
- [Roadmap](#-roadmap)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

ArchPilot is a web-based platform for designing and evaluating backend system architectures. Developers and students build a diagram on a drag-and-drop canvas, and the platform checks it for common architectural problems.

ArchPilot is not a simple diagram editor, and it is not a thin LLM wrapper. A **deterministic engine** computes graph properties and detects structural issues. A **RAG knowledge base** supplies curated architecture guidance, so the explanations are grounded in source material.

Every architecture is scored on three dimensions:

- 🔐 **Security**: insecure communication paths and missing security controls.
- 🛡️ **Reliability**: single points of failure, circular dependencies and other reliability risks.
- 📈 **Scalability**: whether the design handles growth and traffic, for example multiple servers without a load balancer.

The goal is to explain not only *what* is wrong with an architecture, but *why* it matters and how to improve it.

---

## 💡 Why ArchPilot?

Architecture decisions affect security, availability, performance and maintainability. It is easy to miss hidden dependencies or weak points when you review a diagram by eye.

ArchPilot provides:

1. **Visual modelling**: design systems from connected components.
2. **Graph analysis**: inspect nodes and directed edges with deterministic algorithms.
3. **Rule-based diagnostics**: detect known anti-patterns.
4. **Scoring**: rate Security, Reliability and Scalability.
5. **Knowledge retrieval**: find relevant explanations in curated documents.

---

## ✨ Key Features

| Feature | Description |
|---|---|
| 🎨 Visual editor | Build diagrams on a drag-and-drop canvas (React Flow) |
| ➡️ Directed connections | Connect components with arrowed edges |
| 🩺 Diagnostics | Highlight structural and design issues on the canvas |
| 🔗 Graph analysis | Reachability, cycles, articulation points, orphans |
| 🔐 Security checks | Insecure client-to-database paths, missing auth and firewall |
| 🛡️ Reliability checks | SPOFs on critical paths, circular dependencies, queue issues |
| 📈 Scalability checks | Multiple servers without a load balancer, single-target LBs |
| 📊 Scores | Per-dimension and weighted overall scores (0–10) |
| ✅ Completeness gate | Distinguishes blank, incomplete and complete designs |
| 📚 RAG retrieval | Ranked chunks from 12 curated architecture documents |
| 📝 Project context | Description and problem focus are part of the analysis request |
| 💾 JSON export | Save the diagram as `architecture.json` |
| 🧪 Automated tests | 25 tests across graph, rules, RAG and gatekeeper logic |

---

## 🔄 How It Works

1. Describe the project and the problem you are solving. Analysis is blocked until this is filled in.
2. Place components on the canvas and connect them to show request and data flow.
3. The frontend sends the graph and project context to `POST /api/analyze`.
4. The backend runs the **completeness gatekeeper**, then the **graph analysis**.
5. The **18 structural rules** run on the graph profile.
6. The **scoring engine** calculates the dimension scores and overall score.
7. The **RAG layer** can supply related knowledge chunks (see [Current Status](#-current-status) for what is wired today).
8. The response returns to the frontend, which shows findings, scores and guidance.

---

## 🏗️ System Architecture

```text
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND · Next.js 16 + React 19 + React Flow                      │
│  Canvas · Palette · Inspector · Project context · Analysis modal    │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  POST /api/analyze
                               │  { nodes, edges, description, concerns }
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│  BACKEND · Express · port 5001                                      │
│                                                                     │
│   routes/analysis.js                                                │
│        │                                                            │
│        ▼                                                            │
│   ENGINE (deterministic, no LLM)                                    │
│     1. Graph profile ........ Tarjan · DFS · reachability · orphans │
│     2. Structural rules ..... 18 rules                              │
│     3. Scoring .............. weakest-link weighted score           │
│     4. Gatekeeper ........... blocks AI if structure is broken      │
│        │                                                            │
│        ▼  findings · scores · gatekeeper · summary                  │
└──────────────────────────────┬──────────────────────────────────────┘
                               │  JSON response
                               ▼
                        Analysis modal (frontend)

┌─────────────────────────────────────────────────────────────────────┐
│  RAG KNOWLEDGE LAYER (separate)                                     │
│  knowledge/*.md (12 docs) → chunker → embeddings.json (138 chunks)  │
│                                     → retriever (cosine + boosts)   │
│  Status: built · not yet called by /api/analyze                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│  PLANNED (Phase 3)                                                  │
│  Gemini generator: explanations + 4 architecture variants           │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🧰 Technology Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| Next.js | 16.4.3 | React framework (App Router) |
| React | 19.3.0 | UI components |
| TypeScript | 5 | Type-safe development |
| @xyflow/react | 12.12 | Node-and-edge canvas |
| Tailwind CSS | v4 | Styling |
| Lucide React | 1.63 | Icons |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 20+ (tested on 22) | Runtime |
| Express | 4.21 | REST API |
| ES Modules | — | Module system |
| @google/generative-ai | 0.24 | Gemini embeddings |
| gray-matter | 4.0 | Markdown frontmatter parsing |
| dotenv | 18 | Environment variables |
| cors | 2.8 | Cross-origin requests from the frontend |

### Algorithms and concepts

- Directed graph representation (nodes and edges)
- **Tarjan's algorithm** for articulation points (single points of failure)
- **Depth-first search** for cycle detection and reachability
- Critical-path analysis for SPOFs
- **Cosine similarity** for retrieval
- Rule-based diagnostics and weighted scoring

---

## 🧩 Architecture Components

The canvas supports 8 component types:

| Component | Kind | Role |
|---|---|---|
| Client | `client` | A user, browser or client app |
| API Gateway | `api` | Entry point for requests and routing |
| Load Balancer | `loadbalancer` | Distributes traffic across servers |
| App Server | `server` | Application and business logic |
| Database | `database` | Persistent data |
| Cache | `cache` | Fast access to frequently used data |
| Message Queue | `queue` | Asynchronous communication |
| Object Storage | `storage` | Files, media and other assets |

---

## ⚙️ Analysis Engine

The engine works on the graph itself. An LLM never calculates graph facts.

**Graph analysis**

- **Articulation points**: nodes whose removal disconnects parts of the graph
- **SPOF analysis**: critical components on important request paths
- **Cycle detection**: directed circular dependencies (DFS)
- **Reachability**: which nodes can be reached from an entry point
- **Orphans**: components with no connections
- **Semantic classification**: component and connection roles for specific checks

**Design completeness gatekeeper**

| State | Meaning | Can generate variants? |
|---|---|:---:|
| `BLANK_SLATE` | Canvas is empty | ✅ |
| `INCOMPLETE_DESIGN` | Structural blockers exist (orphans, islands, no entry point, unreachable backend) | ❌ |
| `COMPLETE_DESIGN` | Structurally sound; design smells such as a SPOF do not block | ✅ |

---

## 🚨 Structural Rules

ArchPilot includes **18 deterministic rules**.

| # | Rule ID | What it detects |
|:---:|---|---|
| 1 | `TOPO_ORPHAN_NODE` | Component with no connections |
| 2 | `TOPO_DISCONNECTED_SUBGRAPH` | Group of components cut off from the rest |
| 3 | `TOPO_NO_ENTRY_POINT` | No client or API gateway |
| 4 | `TOPO_UNREACHABLE_FROM_ENTRY` | Components no request can reach |
| 5 | `TOPO_DEAD_END_SERVER` | Server with no downstream component |
| 6 | `TOPO_DB_UNREACHABLE` | Database with no compute access |
| 7 | `SEC_CLIENT_DIRECT_DB` | Client talks directly to the database |
| 8 | `SEC_NO_AUTH` | Client reaches a server with no gateway or auth layer |
| 9 | `SEC_DB_NO_FIREWALL` | Database exposed without a protective boundary |
| 10 | `SPOF_CRITICAL_PATH` | Single point of failure on a critical path |
| 11 | `REL_CIRCULAR_DEPENDENCY` | Circular synchronous dependency |
| 12 | `REL_QUEUE_NO_CONSUMER` | Queue with no consumer |
| 13 | `REL_QUEUE_NO_PUBLISHER` | Queue with no producer |
| 14 | `UNDER_NO_LB_MULTI_SERVER` | Multiple servers and no load balancer |
| 15 | `REL_LB_SINGLE_TARGET` | Load balancer with only one target |
| 16 | `REL_CACHE_WITHOUT_DB` | Cache with no persistent store behind it |
| 17 | `WRONG_FLOW_REVERSED` | Passive store initiating connections to compute |
| 18 | `UNNECESSARY_CONNECTION` | Redundant connection that bypasses a gateway or proxy |

---

## 📊 Scoring System

Each dimension is scored from 0 to 10: **Security (S)**, **Reliability (R)** and **Scalability (C)**.

The overall score is weighted toward the weakest dimension, so a serious flaw cannot be hidden by good scores elsewhere:

```text
Overall = 0.6 × min(S, R, C) + 0.4 × (S + R + C) / 3
```

**Example penalties**

- `SEC_CLIENT_DIRECT_DB`: −6.0 Security, −1.5 Reliability
- `SPOF_CRITICAL_PATH`: −3.0 Reliability, scaled by graph size

Without traffic data the score is marked **partial**, and the response lists the rules that were skipped.

---

## 🧠 RAG Knowledge System

ArchPilot has a complete RAG pipeline for architecture knowledge. The index is built offline, and retrieval runs in memory.

```text
knowledge/*.md ─► chunker ─► seedEmbeddings ─► embeddings.json ─► retriever
 (12 docs)      (## / ###,    (Gemini or       (138 chunks,       (query embedding,
                 YAML tags)    offline mock)    768-dim)           cosine + rule boosts)
```

| Item | Implementation |
|---|---|
| Knowledge documents | 12 curated Markdown files (Alex Xu's *System Design Interview* and distributed-systems practice) |
| Semantic chunks | 138 |
| Embedding model | Gemini `text-embedding-004` (768 dimensions) |
| Vector index | In memory, loaded once; no external vector database |
| Similarity metric | Cosine similarity on unit-normalized vectors |
| Rule match boost | +0.12 if a chunk addresses a rule the engine fired |
| Component match boost | +0.05 if a chunk covers a component on the canvas |
| Fallback | Metadata-based matching if the embedding API is unavailable |

**Knowledge base topics:** scaling, load balancing, database replication, caching, message queues, object storage and CDN, API gateways and security, high availability, URL shortener, chat and notifications, newsfeed fan-out, distributed ID generation.

> ⚠️ **Important:** the shipped `embeddings.json` contains **offline mock vectors**, not Gemini embeddings. Run `GEMINI_API_KEY=… npm run seed:embeddings` to get semantic retrieval.

---

## 🔌 API Reference

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/health` | Service status |
| `POST` | `/api/analyze` | Analyze an architecture graph |

**`POST /api/analyze`** accepts the graph and the project context:

```json
{
  "projectName": "Payments",
  "description": "Real-time payment processing",
  "concerns": "Single points of failure",
  "nodes": [{ "id": "client-1", "data": { "label": "Client", "kind": "client" } }],
  "edges": [{ "id": "e1", "source": "client-1", "target": "api-1" }],
  "trafficFilters": { "peakRps": 5000, "expectedUsers": 100000 }
}
```

The response includes `findings`, `spofs`, `cycles`, `orphanNodes`, `unreachableNodes`, `scoring`, `gatekeeper` and `summary`. The exact schema is defined in `server/src/services/engine/index.js`.

---

## 📁 Project Structure

```text
archpilot/
├── README.md
├── LICENSE
├── context.md                      # Full technical specification
├── frontend/                       # Next.js 16 web app
│   ├── src/app/
│   │   ├── layout.tsx
│   │   ├── globals.css
│   │   └── page.tsx                # Canvas, palette, inspector, analysis UI
│   ├── package.json
│   └── AGENTS.md
└── server/                         # Express API and analysis engine
    ├── app.js                      # Entry point (port 5001)
    ├── knowledge/                  # 12 Markdown docs + embeddings.json
    ├── scripts/
    │   └── seedEmbeddings.js       # Chunks and embeds the knowledge base
    ├── src/
    │   ├── routes/
    │   │   └── analysis.js         # POST /api/analyze
    │   └── services/
    │       ├── engine/             # graph.js · scoring.js · rules/ · index.js
    │       └── rag/                # chunker.js · similarity.js · retriever.js
    ├── test/                       # 5 suites, 25 tests
    └── package.json
```

---

## 🚀 Installation & Setup

### Prerequisites

- Node.js 20 or later
- npm
- A Google Gemini API key (optional for the engine; needed for live embeddings)

### 1. Clone the repository

```bash
git clone <your-repository-url>
cd archpilot
```

### 2. Start the backend

```bash
cd server
npm install
npm test          # run the test suites
npm start         # http://localhost:5001
```

To build real Gemini embeddings:

```bash
GEMINI_API_KEY=your_gemini_api_key npm run seed:embeddings
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev       # http://localhost:3000
```

Open **http://localhost:3000**.

---

## 🔐 Environment Variables

| Variable | Location | Description |
|---|---|---|
| `GEMINI_API_KEY` | `server/.env` | Gemini API key for embedding generation |
| `PORT` | `server/.env` | Backend port (optional, default `5001`) |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` | Backend base URL (default `http://localhost:5001`) |

> 🔒 **Security note:** never commit `.env` or `.env.local` files containing real credentials. Both are git-ignored in this repository.

---

## 🧪 Testing

ArchPilot has **25 automated tests** in 5 suites:

| Suite | Tests | Covers |
|---|:---:|---|
| `engine.test.js` | 6 | Core engine: SPOFs, security, cycles, queues, load balancing |
| `topology_rules.test.js` | 7 | Connectivity and flow rules |
| `comprehensive.test.js` | 3 | End-to-end architecture scenarios |
| `rag.test.js` | 5 | Chunking, vector math, hybrid ranking, index loading, fallback |
| `gatekeeper.test.js` | 4 | Blank, incomplete and complete design states |

```bash
cd server
npm test
```

---

## ✅ Current Status

| Capability | Status |
|---|:---:|
| Visual architecture editor | ✅ Implemented |
| Eight component types | ✅ Implemented |
| Directional connections | ✅ Implemented |
| Project description and problem focus | ✅ Implemented |
| Architecture JSON export | ✅ Implemented |
| Graph analysis algorithms | ✅ Implemented |
| 18 structural rules | ✅ Implemented |
| Security, Reliability and Scalability scoring | ✅ Implemented |
| Design completeness gatekeeper | ✅ Implemented |
| RAG retrieval layer (chunking, index, ranking) | ✅ Implemented |
| RAG wired into `/api/analyze` | 🟡 Not yet |
| Real Gemini embeddings in `embeddings.json` | 🟡 Requires running the seeder with a key |
| Automated test suite (25 tests) | ✅ Implemented |
| RAG-grounded architecture variants (Phase 3) | 🔜 Planned |
| Project persistence and cloud sync | 🔜 Planned |

---

## 🗺️ Roadmap

1. **Phase 3, Variant generator**: Gemini turns engine findings and retrieved knowledge into four variants: cost-optimized, high-availability, high-throughput and global distributed.
2. **Phase 4, Variant preview and apply**: compare variants and apply one to the canvas.
3. **Phase 5, Persistence**: save, load and manage projects (PostgreSQL or SQLite).
4. **Cloud sync**: access saved designs across sessions and devices.

---

## 🤝 Contributing

Contributions, suggestions and bug reports are welcome.

1. Fork the repository.
2. Create a feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m "Add your feature"`
4. Push the branch: `git push origin feature/your-feature`
5. Open a Pull Request.

**Guidelines**

- The engine computes every graph fact. Do not ask the LLM to count nodes, find SPOFs or detect cycles.
- Keep graph logic in pure, testable functions under `server/src/services/engine/`.
- Use functional state updates (`setNodes`, `setEdges`) in React.

---

## 📄 License

Released under the [MIT License](./LICENSE). © 2026

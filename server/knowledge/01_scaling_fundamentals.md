---
title: "Scaling Fundamentals: From Zero to Millions of Users"
category: "Architecture & Scalability"
tags: ["scalability", "statelessness", "horizontal-scaling", "vertical-scaling", "capacity-planning", "session-management"]
applicable_components: ["client", "api", "loadbalancer", "server", "database", "cache"]
related_rules: ["SPOF_CRITICAL_PATH", "UNDER_NO_LB_MULTI_SERVER", "TOPO_DEAD_END_SERVER"]
---

# Scaling Fundamentals: From Zero to Millions of Users

Scaling a software architecture is an iterative journey. As documented in Alex Xu's *System Design Interview* (Chapter 1: "Scale From Zero To Millions Of Users"), no system is initially built to support 10 million daily active users. Systems evolve through distinct stages of architectural maturity, addressing bottlenecks one layer at a time.

```
Stage 1: Single Server (Compute + DB on 1 machine)
   ↓ (Split compute & storage)
Stage 2: Web Server + Standalone Database
   ↓ (Add Load Balancer + Stateless Web Servers)
Stage 3: Horizontal Compute Tier + Read/Write DB Replication
   ↓ (Add Caching & CDN)
Stage 4: Redis Cache-Aside + CloudFront/Akamai CDN
   ↓ (Decouple heavy tasks)
Stage 5: Message Queues + Asynchronous Worker Fleet
   ↓ (Scale data tier)
Stage 6: Database Sharding & Multi-Region Geo-Distribution
```

---

## 1. Vertical Scaling vs. Horizontal Scaling

| Characteristic | Vertical Scaling (Scale Up) | Horizontal Scaling (Scale Out) |
| :--- | :--- | :--- |
| **Mechanism** | Add more CPU, RAM, or NVMe disks to a single instance. | Add more server instances behind a load balancer. |
| **Hard Ceiling** | Limited by maximum physical hardware limits (e.g., AWS `u-24tb1.metal`). | Theoretically boundless; add hundreds or thousands of commodity nodes. |
| **Availability / SPOF** | **Severe SPOF**: If the single instance crashes or restarts for OS patches, the entire application suffers complete downtime. | **High Fault Tolerance**: If instance $N$ fails, the load balancer reroutes traffic to healthy instances $1 \dots N-1$. |
| **Financial Cost** | Non-linear: Top-tier high-memory instances cost exponentially more per compute unit. | Linear or sub-linear: Commodity virtual machines or containerized tasks (ECS/EKS) scale elastically. |
| **Complexity** | Zero architectural code changes; simplicity in initial prototype. | Requires stateless design, session externalization, distributed tracing, and centralized logging. |

### Rule of Thumb
- Start with vertical scaling **only** for rapid MVP validation or low-traffic internal back-offices.
- Transition to horizontal scaling as soon as public production traffic arrives, or availability SLAs require $\ge 99.9\%$.

---

## 2. Stateless Web Tier & Session Externalization

A cornerstone principle of distributed scalability: **Web servers must be stateless**.

### The Sticky Session Anti-Pattern
If user sessions are stored locally in server memory (`RAM` of `Server-A`), incoming requests from User 1 must always be routed to `Server-A`. 
- This breaks load balancing fairness (traffic hotspots).
- When `Server-A` crashes, all users pinned to it are forcibly logged out and lose in-flight transactional state.
- Auto-scaling down becomes hazardous because terminating an instance drops active user sessions.

```
[Client] ---> [Load Balancer] ---> [Server A (Local RAM: User 1 Session)] ❌ Bad
                             ---> [Server B (Local RAM: User 2 Session)]
```

### The Externalized Session State Pattern
Move all user sessions, shopping carts, and transient auth tokens out of application web servers and into a centralized, persistent or highly available in-memory data store (such as Redis cluster or Amazon DynamoDB).

```
[Client] ---> [Load Balancer] ---> [Stateless App Server 1] --+
                             ---> [Stateless App Server 2] --+--> [Redis / Memcached Session Cluster]
                             ---> [Stateless App Server 3] --+--> [Persistent DB]
```

#### Key Benefits:
1. **True Autoscaling**: Web server instances can spin up or shut down dynamically based on CPU utilization or request count without impacting a single user.
2. **Simplified Failover**: Any healthy server can handle any request for any user simply by fetching their session key from the cache.

---

## 3. Back-of-the-Envelope Capacity Estimations (Alex Xu Ch. 2)

Engineering design choices must be backed by quantitative back-of-the-envelope calculations.

### Latency Numbers Every Distributed Systems Engineer Should Know
- L1 cache reference: $\approx 0.5 \text{ ns}$
- Mutex lock/unlock: $\approx 20 \text{ ns}$
- Main memory (RAM) reference: $\approx 100 \text{ ns}$
- Read 1 MB sequentially from memory: $\approx 3,000 \text{ ns} = 3 \ \mu\text{s}$
- SSD sequential read: $\approx 1,000 \ \mu\text{s} = 1 \text{ ms}$
- Read 1 MB sequentially from SSD: $\approx 1,000 \ \mu\text{s} = 1 \text{ ms}$
- Round-trip within same datacenter: $\approx 500 \ \mu\text{s} = 0.5 \text{ ms}$
- Disk seek (magnetic HDD): $\approx 10,000 \ \mu\text{s} = 10 \text{ ms}$
- Round-trip between California and Netherlands: $\approx 150 \text{ ms}$

### Essential Throughput & Storage Conversions
- 1 day = $86,400 \text{ seconds} \approx 100,000 \text{ seconds}$ (handy rule of thumb for quick mental math).
- **Daily to QPS conversion**:
  $$\text{Average QPS} = \frac{\text{Daily Active Users (DAU)} \times \text{Requests per user}}{86,400}$$
- **Peak QPS estimate**:
  $$\text{Peak QPS} \approx 2 \times \text{Average QPS} \quad (\text{or } 3\times \text{ to } 5\times \text{ for spiky traffic})$$
- **Example**: If a platform has 5 million DAU and each user averages 20 read requests per day:
  $$\text{Total daily requests} = 100\text{M requests/day}$$
  $$\text{Average QPS} = \frac{100,000,000}{86,400} \approx 1,157 \text{ QPS}$$
  $$\text{Peak QPS} = 1,157 \times 2 \approx 2,300 \text{ QPS}$$

---

## 4. Architectural Variant Playbook

When synthesizing architectures across user constraints:

### Variant A: Cost-Optimized / Lean MVP
- **Topology**: Single API Gateway/Reverse Proxy $\to$ 1–2 App Servers $\to$ Managed Relational Database (e.g., PostgreSQL).
- **Session**: Signed JWT tokens stored client-side (HttpOnly cookies) to eliminate the cost of a dedicated Redis cluster.
- **Scale Threshold**: Supports up to $500 \text{ QPS}$; lowest hosting cost ($<\$50/\text{mo}$).

### Variant B: High-Availability (HA)
- **Topology**: Load Balancer (redundant across Multi-AZ) $\to$ Auto-scaled stateless App Server fleet ($\ge 3$ instances) $\to$ Primary-Standby Database with automatic failover $\to$ Redis Sentinel/Cluster for sessions.
- **Target**: Zero single points of failure (eliminates `SPOF_CRITICAL_PATH`).

### Variant C: High-Throughput / Low-Latency
- **Topology**: DNS Anycast $\to$ Multi-AZ L7 Load Balancer $\to$ Stateless Go/Rust/Node Microservices $\to$ Multi-tier Redis Cache $\to$ Read-Replicated Database cluster + Kafka asynchronous write queue.
- **Target**: P99 latency $< 15 \text{ ms}$, throughput $> 20,000 \text{ QPS}$.

### Variant D: Global Distributed
- **Topology**: GeoDNS routing $\to$ Edge CDNs (Cloudflare/CloudFront) $\to$ Regional Load Balancers $\to$ Regional Stateless App Services $\to$ Global distributed database (CockroachDB / DynamoDB Global Tables / Spanner).
- **Target**: Sub-100ms response time worldwide with cross-continental disaster recovery.

---

## 5. ArchPilot Engine Rules Alignment
- **`SPOF_CRITICAL_PATH`**: Flagged whenever a single server instance or single database node acts as an un-replicated bridge between incoming client traffic and storage.
- **`UNDER_NO_LB_MULTI_SERVER`**: Flagged when multiple compute servers exist on the canvas but no load balancer routes incoming requests to them.
- **`TOPO_DEAD_END_SERVER`**: Flagged when an application server receives user requests but lacks any persistence, caching, or messaging downstream.

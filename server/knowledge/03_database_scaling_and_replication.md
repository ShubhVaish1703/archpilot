---
title: "Database Scaling, Replication, and Partitioning Strategies"
category: "Data Persistence & Storage"
tags: ["database", "replication", "sharding", "cap-theorem", "quorum", "sql-vs-nosql", "read-replicas"]
applicable_components: ["server", "database", "storage"]
related_rules: ["SEC_CLIENT_DIRECT_DB", "SEC_DB_NO_FIREWALL", "WRONG_FLOW_REVERSED", "SPOF_CRITICAL_PATH", "TOPO_DB_UNREACHABLE"]
---

# Database Scaling, Replication, and Partitioning Strategies

In almost every modern digital product, the persistent storage tier becomes the primary scalability bottleneck long before the compute layer. Stateless web servers can be duplicated horizontally with ease; databases maintain state, require transactional integrity, and must withstand node failures without corrupting or losing critical records.

As covered in Alex Xu's *System Design Interview* (Chapter 1: "Scale From Zero to Millions" and Chapter 6: "Design A Key-Value Store"), scaling data tiers requires an evolving hierarchy of replication, caching, read/write segregation, and horizontal sharding.

```
                    [Application Server Pool]
                          │             │
                    (Writes)          (Reads)
                          │             │
                          ▼             ▼
              [Primary (Leader) DB]   [Read Replica 1]
                      │                     ▲
             (Binlog Replication)           │
                      │                     │
                      +───────────────> [Read Replica 2]
```

---

## 1. Master-Slave (Primary-Replica) Replication

Most production applications have an asymmetric read-to-write ratio (often **$10:1$ to $100:1$** read heavy). Splitting write queries from read queries maximizes database throughput.

### Mechanism:
1. **Primary Database (Master)**: Exclusively accepts all write operations (`INSERT`, `UPDATE`, `DELETE`, `DDL`). Writes to local storage and appends the mutation to a replication binlog / write-ahead log (WAL).
2. **Secondary Databases (Read Replicas)**: Asynchronously or semi-synchronously pull replication streams from the master and apply changes to their local copies. Serve all read queries (`SELECT`).
3. **Failover**: If the master crashes, a health monitoring consensus agent (e.g., orchestrator, Raft, or cloud managed RDS Multi-AZ) promotes the most up-to-date read replica to become the new primary master.

### Replication Lag Trade-off:
- Under peak write loads, read replicas can lag by hundreds of milliseconds or seconds behind the master (**Replication Lag**).
- **Read-Your-Own-Writes Guarantee**: When a user updates their profile or places an order, their subsequent immediate read request should be directed to the primary master (or routed to a replica only after confirming a timestamp / WAL position) to avoid the user seeing stale data.

---

## 2. The CAP Theorem & Quorum Consensus (Alex Xu Ch. 6)

In distributed data systems spanning multiple physical network nodes, the **CAP Theorem** dictates that a system cannot simultaneously achieve all three guarantees:

- **Consistency (C)**: Every read receives the most recent write or an error. All clients see the identical state at any given moment.
- **Availability (A)**: Every non-failing node returns a non-error response for every request (without guaranteeing it is the latest write).
- **Partition Tolerance (P)**: The system continues to operate despite arbitrary network dropped packets or partitioned subnets.

> **Crucial Reality**: Network partitions ($P$) are physical inevitabilities in distributed infrastructure (cables get cut, switches fail, routers glitch). Therefore, a distributed system must choose between **CP (Consistency + Partition Tolerance)** or **AP (Availability + Partition Tolerance)**.

```
                    Network Partition Occurs
                           /          \
                          /            \
                  Choose CP            Choose AP
           (Reject writes to preserve   (Accept writes on both sides;
            strict global consistency)   tolerate temporary divergence)
```

### Quorum Consensus Formula ($N, W, R$)
For distributed key-value stores (e.g., DynamoDB, Cassandra, Riak):
- $N$ = Number of total replicas for a key.
- $W$ = Write quorum (number of replicas that must acknowledge a write for it to be deemed successful).
- $R$ = Read quorum (number of replicas that must respond to a read query).

$$\text{Strong Consistency Condition: } W + R > N$$

- **Strong Consistency Example**: $N = 3, W = 2, R = 2 \implies 2 + 2 = 4 > 3$. The read set and write set must overlap by at least one node, ensuring the client always reads the latest write.
- **Fast Writes, Eventual Consistency**: $W = 1, R = 1 \implies 1 + 1 = 2 < 3$. Ultra-low write latency, but reads may observe stale data until background gossip or anti-entropy syncs nodes.

---

## 3. Database Sharding (Horizontal Partitioning)

When database size outgrows the disk capacity of a single machine, or write throughput exceeds what a single primary master can process, **horizontal sharding** is mandatory. Sharding partitions data rows across multiple autonomous database instances.

```
[User Shard Router]
       ├──> Hash(User_ID) % 3 == 0 ──> [DB Shard 0 (Users A - G)]
       ├──> Hash(User_ID) % 3 == 1 ──> [DB Shard 1 (Users H - P)]
       └──> Hash(User_ID) % 3 == 2 ──> [DB Shard 2 (Users Q - Z)]
```

### Sharding Key Selection Criteria:
1. **High Cardinality**: The partition key must have millions of distinct values (e.g., `user_id`, `uuid`). Low-cardinality keys like `gender`, `country`, or `status` lead to massive uneven chunks.
2. **Uniform Distribution**: Prevents **Data Skew** and **Celebrity / Hotspot Bottlenecks** (e.g., Justin Bieber or viral influencers generating millions of writes to a single shard).
   - *Celebrity Mitigation*: Add an entropy salt or randomize writes across multiple shards (`user_id + "_" + random(1..5)`), querying all 5 shards and aggregating results on read.

### Sharding Challenges & Solutions:
- **Resharding**: When data grows beyond existing shards, consistent hashing or directory lookup services minimize row migrations.
- **Cross-Shard Joins**: Relational `JOIN` operations across separate physical database servers are prohibitively slow. Applications denormalize data or perform application-level joins.
- **Distributed Transactions**: Atomic multi-shard writes require Two-Phase Commit (2PC) or asynchronous compensation patterns (Saga Pattern with message queues).

---

## 4. SQL vs. NoSQL Selection Matrix

| Criterion | Relational (SQL) | NoSQL (Document / KV / Columnar) |
| :--- | :--- | :--- |
| **Data Schema** | Strict, structured tables with relational foreign keys. | Flexible, schema-less or dynamic JSON-like records. |
| **Transaction Model** | Full ACID (Atomicity, Consistency, Isolation, Durability). | BASE (Basically Available, Soft state, Eventual consistency). |
| **Scaling Axis** | Primarily vertical, read replicas, or complex manual sharding. | Built-in horizontal sharding, partitioned distributed keys. |
| **Ideal Workloads** | Financial ledgers, e-commerce checkouts, relational ERPs. | Telemetry time-series, social media feeds, session state, rapid prototyping. |
| **Examples** | PostgreSQL, MySQL, MariaDB. | MongoDB, DynamoDB, Cassandra, ScyllaDB. |

---

## 5. Architectural Variant Playbook

### Variant A: Cost-Optimized / Lean MVP
- Single managed PostgreSQL or MySQL instance (e.g., AWS RDS db.t4g.small).
- Compute servers connect directly via a connection pool (e.g., PgBouncer).
- Target: $< \$30/\text{mo}$, low administrative overhead.

### Variant B: High-Availability (HA)
- Multi-AZ RDS primary with automatic synchronous standby failover.
- $\ge 2$ Read Replicas across distinct availability zones to distribute read traffic.
- Eliminates `SPOF_CRITICAL_PATH` on the database layer.

### Variant C: High-Throughput / Low-Latency
- Distributed NoSQL (e.g., Amazon DynamoDB or Cassandra) with auto-partitioning.
- Redis caching layer in front of SQL to absorb $90\%+$ of read queries.
- Write-behind logging via Kafka to prevent database disk I/O saturation.

### Variant D: Global Distributed
- Multi-Region Active-Active databases (e.g., CockroachDB, Google Cloud Spanner, DynamoDB Global Tables).
- Conflict resolution using Last-Write-Wins (LWW) or Vector Clocks.
- Users read and write to local regional database replicas with asynchronous inter-region replication.

---

## 6. ArchPilot Engine Rules Alignment
- **`SEC_CLIENT_DIRECT_DB`**: Directly linking a Client component to a Database or Storage node is a critical security vulnerability. It exposes database ports to the public internet and bypasses application-level authentication.
- **`SEC_DB_NO_FIREWALL`**: Connecting an edge API Gateway directly to a Database without an intermediary application server exposes the data tier to DDoS and SQL injection vectors.
- **`WRONG_FLOW_REVERSED`**: Arrows originating from a Database pointing toward an App Server or Client represent reversed architectural flow. Databases are passive listeners; compute components must initiate queries.
- **`TOPO_DB_UNREACHABLE`**: A database node with no incoming connection from an application server or worker represents dead infrastructure.

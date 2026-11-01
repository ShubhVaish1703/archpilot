---
title: "Caching Strategies, Patterns, and Invalidation Mechanisms"
category: "Performance & Caching"
tags: ["cache", "redis", "memcached", "cache-aside", "write-through", "eviction-policy", "cache-stampede", "bloom-filter"]
applicable_components: ["client", "server", "cache", "database"]
related_rules: ["REL_CACHE_WITHOUT_DB", "SPOF_CRITICAL_PATH", "TOPO_DEAD_END_SERVER"]
---

# Caching Strategies, Patterns, and Invalidation Mechanisms

A cache is a high-speed, temporary in-memory data store that holds frequently accessed data to serve read requests with sub-millisecond latencies. In Alex Xu's *System Design Interview* (Chapter 1 & Chapter 6), caching is highlighted as the single most cost-effective technique to reduce database read load by $80\text{--}95\%$.

```
                        +----------------------+
                        |  Application Server  |
                        +----------------------+
                             /            \
                       (1. Read)        (2. Miss: Read DB)
                           /                \
                          v                  v
                 +---------------+    +--------------------+
                 | In-Memory RAM |    | Persistent Storage |
                 | (Redis Cache) |    |  (PostgreSQL DB)   |
                 +---------------+    +--------------------+
                                      (3. Populate Cache)
```

---

## 1. Why Caching Matters: Latency & Throughput Comparison

| Storage Medium | Typical Latency | Throughput (Ops/sec) | Volatility |
| :--- | :--- | :--- | :--- |
| **CPU L1/L2 Cache** | $0.5 \text{ ns} - 7 \text{ ns}$ | Gigabytes/sec | Transient |
| **Main Memory (RAM - Redis)** | $\approx 100 \text{ ns} - 1 \text{ ms}$ | $100,000+ \text{ QPS per core}$ | Volatile (flushed on restart unless RDB/AOF enabled) |
| **NVMe SSD (PostgreSQL/MySQL)** | $\approx 1 \text{ ms} - 5 \text{ ms}$ | $5,000 - 20,000 \text{ QPS}$ | Persistent |
| **Network WAN Database Query** | $\approx 20 \text{ ms} - 100 \text{ ms}$ | Dependent on round-trips | Persistent |

Reading from an in-memory cache is **$1,000\times \text{ to } 10,000\times$ faster** than executing complex SQL disk I/O and query parsing.

---

## 2. Core Caching Patterns

### A. Cache-Aside (Lazy Loading) - Most Prevalent
1. The application server intercepts the read request.
2. It queries the cache first (`GET user:1234`).
3. **Cache Hit**: Data is returned immediately to the client.
4. **Cache Miss**: Application queries the persistent database, writes the result to the cache with an expiration TTL, and returns the response.
- **Pros**: Resilient against cache outages (falls back to DB); caches only actively requested data.
- **Cons**: Cache miss penalty incurs 3 network hops; risk of serving stale data if DB is modified without invalidating the cache.

### B. Read-Through Cache
The application always treats the cache as the primary data source. On a cache miss, the cache library/adapter itself fetches the missing data from the database and populates itself transparently.

### C. Write-Through Cache
Every write operation passes through the cache. The cache synchronously updates the persistent database before acknowledging success to the caller.
- **Pros**: Cache is never stale; read hits are guaranteed fresh.
- **Cons**: Write latency is higher because two stores must be updated synchronously.

### D. Write-Behind (Write-Back) Cache
The application writes data exclusively to the cache, which immediately acknowledges success. The cache asynchronously batches mutations and writes them to the persistent database in background intervals.
- **Pros**: Phenomenal write throughput; ideal for high-frequency write workloads (e.g., video view counts, real-time gaming scores).
- **Cons**: **Risk of data loss** if the cache node crashes before dirty blocks are flushed to persistent disk.

---

## 3. Cache Eviction Policies & Expiration

When cache memory fills up, the eviction policy determines which keys are purged to accommodate new entries:

1. **LRU (Least Recently Used)**: Evicts keys that have not been read or written for the longest duration. Default and best general-purpose policy for web applications.
2. **LFU (Least Frequently Used)**: Tracks access counters and evicts keys accessed the least number of times. Prevents infrequent one-off queries from evicting hot items.
3. **FIFO (First In, First Out)**: Evicts keys in the strict chronological order they were created.
4. **TTL (Time-To-Live)**: Hard expiration timestamp after which the key is automatically purged or marked stale.

---

## 4. Cache Failure Modes & Production Mitigations

### A. Cache Stampede (Thundering Herd)
Occurs when a high-traffic key (e.g., front-page news headline) expires. Hundreds of concurrent requests simultaneously observe a cache miss and execute identical heavy database queries, crashing the database.
- **Mitigation**:
  - **Mutex / Single-Flight Locks**: Only the first worker acquires a distributed lock to query the DB and refresh the cache; other workers wait or receive stale data temporarily.
  - **Probabilistic Early Expiration (XFetch algorithm)**: Background process refreshes the cache before the TTL expires based on request probability.

### B. Cache Penetration
Malicious or erroneous requests query non-existent keys (e.g., `user_id = -99999`). Every request bypasses the cache and hits the database because the key never exists in cache.
- **Mitigation**:
  - **Cache Null Objects**: Store `{"user_id:-99999": null}` in cache with a short TTL (e.g., 60 seconds).
  - **Bloom Filter**: A space-efficient probabilistic data structure placed in front of the cache to determine with $100\%$ certainty whether a key definitely *does not* exist.

### C. Cache Avalanche
Massive numbers of cached items expire at the exact same second, or the entire cache cluster restarts.
- **Mitigation**: Add a random jitter to the TTL (e.g., `TTL = 3600 seconds + random(0..300)`).

---

## 5. Architectural Variant Playbook

### Variant A: Cost-Optimized / Lean MVP
- In-memory process cache (e.g., Node.js `lru-cache` or Go `sync.Map`) inside the application server, or a micro-sized Redis instance.
- Avoid multi-node Redis clusters until read QPS exceeds $1,000 \text{ QPS}$.

### Variant B: High-Availability (HA)
- Redis Sentinel or AWS ElastiCache Multi-AZ with automatic failover.
- Minimum 1 primary and 1 standby replica across distinct Availability Zones.
- Eliminates `SPOF_CRITICAL_PATH` on the cache tier.

### Variant C: High-Throughput / Low-Latency
- Multi-tier caching: Local in-process L1 cache (sub-microsecond) + Distributed Redis L2 cache ($1 \text{ ms}$).
- Read-through caching with Redis Cluster sharded across 6+ master nodes.
- Write-behind buffering for telemetry and aggregate counters.

### Variant D: Global Distributed
- Edge CDN caching for API responses using `Cache-Control: public, s-maxage=60, stale-while-revalidate=30`.
- Regional Redis clusters in each cloud geography, populated via local cache-aside patterns.

---

## 6. ArchPilot Engine Rules Alignment
- **`REL_CACHE_WITHOUT_DB`**: Flagged when a Cache node is placed in an architecture without any downstream persistent Database or Storage node. Caches are volatile; designing an architecture with only cache nodes guarantees total data loss upon reboot.
- **`SPOF_CRITICAL_PATH`**: A single cache instance serving as the sole gateway to backend storage without clustering or standby replicas.

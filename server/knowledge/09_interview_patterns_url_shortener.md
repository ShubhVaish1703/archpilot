---
title: "System Design Pattern: High-Scale URL Shortener (TinyURL / Bitly)"
category: "System Design Case Studies"
tags: ["url-shortener", "base62", "hash-collision", "301-vs-302", "snowflake", "caching"]
applicable_components: ["client", "api", "loadbalancer", "server", "database", "cache"]
related_rules: ["SEC_CLIENT_DIRECT_DB", "SPOF_CRITICAL_PATH", "REL_CACHE_WITHOUT_DB"]
---

# System Design Pattern: High-Scale URL Shortener (TinyURL / Bitly)

Designing a URL shortening service like TinyURL or Bitly is a classic system design interview question (Alex Xu *System Design Interview*, Chapter 8). It evaluates core distributed system tradeoffs: encoding algorithms, read vs. write scalability, caching strategies, and HTTP redirect semantics.

```
+--------+       (1) GET /abc1234        +-----------------+       (2) Lookup Cache        +---------------+
| Client | ────────────────────────────> | L7 Load Balancer| ────────────────────────────> |  Redis Cache  |
+--------+                               +-----------------+                               +---------------+
    │                                             │                                                │
    │ <─── 301 / 302 Redirect (Location URL) ─────+ <─────── (3) Cache Miss: DB Lookup ────────────+
                                                  │                                                │
                                                  v                                                v
                                         +-----------------+                              +-----------------+
                                         | App Server Pool | ───────────────────────────> | Relational / KV |
                                         +-----------------+                              | Database (SQL)  |
                                                                                          +-----------------+
```

---

## 1. Capacity & Estimation (Alex Xu Framework)

- **Write QPS**: Assume 100 million new URLs generated per month:
  $$\text{Write QPS} = \frac{100,000,000}{30 \times 86,400} \approx 40 \text{ URLs/second}$$
- **Read QPS**: Assuming a $10:1$ read-to-write ratio:
  $$\text{Read QPS} = 40 \times 10 = 400 \text{ reads/second}$$
- **Storage Requirement (10 Years)**:
  - Total records = $100\text{M/month} \times 12 \times 10 = 12 \text{ billion URLs}$.
  - Average record size: 500 bytes (ID + Short URL + Original URL + Timestamp).
  - Total storage: $12\text{B} \times 500 \text{ bytes} \approx 6 \text{ Terabytes}$.

---

## 2. URL Encoding: Hash + Collision vs. Base62

The core challenge is mapping a long URL to a short alphanumeric hash of 7 characters.

Allowed character set: `[0-9, a-z, A-Z]` ($10 + 26 + 26 = 62 \text{ characters}$).
With a 7-character string, total combinations:
$$62^7 \approx 3.5 \text{ trillion URLs}$$
This comfortably accommodates 12 billion records with ample headroom.

### Approach A: Cryptographic Hashing (MD5 / SHA-256) + Collision Resolution
1. Hash long URL with MD5 $\implies 128\text{-bit}$ hex string.
2. Take first 7 characters.
3. Check database if 7-character key already exists.
4. **Collision**: If key exists for a *different* long URL, append a predefined salt or counter (e.g., `long_url + salt`) and re-hash.
- **Drawback**: Expensive database lookup needed to detect collisions on every single write.

### Approach B: Distributed Unique ID + Base62 Encoding (Recommended)
1. Generate a globally unique, non-colliding 64-bit integer ID using Twitter Snowflake or an auto-increment sequence.
2. Convert the numeric integer ID to Base62 representation.
- *Example*: Integer ID `2009215674938` $\to$ Base62 converts to `zn9edcu`.
- **Advantage**: **Zero hash collisions** guaranteed by construction. No collision checks required.

---

## 3. HTTP 301 vs. HTTP 302 Redirect Semantics

When a client queries `GET /zn9edcu`:

| HTTP Status Code | Browser Behavior | Impact on Analytics & Load |
| :--- | :--- | :--- |
| **`301 Moved Permanently`** | Browser caches the redirect locally. Future requests to `https://tiny.url/zn9edcu` bypass the shortener server and go directly to the target URL. | **Reduces server load**, but server cannot accurately track click counts or real-time analytics. |
| **`302 Found` (Temporary)** | Browser does *not* cache redirect. Every single click is routed to the shortener service first. | **Enables accurate click tracking**, geographical analytics, and link expiration, but increases server QPS. |

---

## 4. High-Performance Architecture Blueprint

- **Compute Tier**: Stateless web servers behind an Application Load Balancer.
- **Cache Tier (Redis)**: $80/20$ Pareto principle — $20\%$ of hot URLs generate $80\%$ of clicks. Cache hot mapping entries `(short_key -> long_url)` with an LRU eviction policy.
- **Database Tier**: Relational or distributed Key-Value store with an index on `short_url_key`.
- **Reliability Rules Alignment**:
  - `SEC_CLIENT_DIRECT_DB`: Clients never query the URL database directly; all traffic passes through the reverse proxy and app server.
  - `REL_CACHE_WITHOUT_DB`: Redis cache is always backed by persistent SQL/NoSQL storage.

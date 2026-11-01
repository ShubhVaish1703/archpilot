---
title: "Perimeter Security, API Gateways, and Rate Limiting"
category: "Security & API Architecture"
tags: ["api-gateway", "security", "rate-limiting", "token-bucket", "sliding-window", "authentication", "jwt", "vpc-subnets"]
applicable_components: ["client", "api", "server", "database"]
related_rules: ["SEC_CLIENT_DIRECT_DB", "SEC_NO_AUTH", "SEC_DB_NO_FIREWALL"]
---

# Perimeter Security, API Gateways, and Rate Limiting

In microservice and cloud-native architectures, exposing internal backend services or databases directly to public clients introduces catastrophic security and operational liabilities.

As documented in Alex Xu's *System Design Interview* (Chapter 1 & Chapter 4: "Design A Rate Limiter"), an **API Gateway** acts as the single, hardened entry point (perimeter gatekeeper) that centralizes cross-cutting security concerns: authentication, authorization, rate limiting, SSL termination, and request routing.

```
[Public Internet]
       │
       ▼ (HTTPS / TLS 1.3)
+─────────────────────────────────────────────────────────────+
|               API Gateway / Perimeter Proxy                |
|  • SSL Termination     • OAuth2 / JWT Auth Verification    |
|  • DDoS / WAF Guard    • Distributed Rate Limiter (Redis)   |
|  • Request Routing     • CORS & Header Sanitization        |
+─────────────────────────────────────────────────────────────+
       │                             │
       ▼ (Internal Private VPC)       ▼ (Internal Private VPC)
+──────────────────────────+   +──────────────────────────────+
|  User Service (Port 8081)|   |  Order Service (Port 8082)   |
+──────────────────────────+   +──────────────────────────────+
       │                                     │
       ▼ (Private Database Subnet)           ▼
+──────────────────────────+   +──────────────────────────────+
|   User Database (PG)     |   |     Order Database (PG)      |
+──────────────────────────+   +──────────────────────────────+
```

---

## 1. Core Responsibilities of an API Gateway

1. **Centralized Authentication & Authorization**: Validates incoming API keys, OAuth2 tokens, or HMAC signatures. Downstream services receive pre-authenticated claims (e.g., `X-User-Id: 4892`, `X-User-Roles: admin`) without having to repeatedly parse cryptographic signatures.
2. **SSL / TLS Termination**: Handles computationally expensive cryptographic TLS handshakes at the edge. Internal traffic within the private Virtual Private Cloud (VPC) can use plaintext HTTP/2 or lightweight mTLS.
3. **Dynamic Path-Based Routing**: Maps public paths to internal microservices (`/api/v1/users` $\to$ User Service; `/api/v1/payments` $\to$ Payment Service).
4. **Protocol Translation**: Translates external HTTP/1.1 or WebSockets into internal high-performance gRPC or AMQP.
5. **DDoS Protection & Web Application Firewall (WAF)**: Filters SQL injection payloads, cross-site scripting (XSS), and bad bot scrapers.

---

## 2. Rate Limiting Algorithms (Alex Xu Chapter 4)

A rate limiter caps the number of requests a client or IP can send within a specific time window. It prevents resource starvation, protects against brute-force password guessing, and defends against malicious DDoS attacks.

### Comparison of Rate Limiting Algorithms:

| Algorithm | How it Works | Pros | Cons |
| :--- | :--- | :--- | :--- |
| **Token Bucket** (Amazon, Stripe) | Tokens are continuously added to a bucket of capacity $b$ at rate $r$. Each request consumes 1 token. If bucket is empty, request dropped (`HTTP 429`). | Supports bursty traffic; memory efficient; simple to tune. | Tuning capacity $b$ and refill rate $r$ requires empirical testing. |
| **Leaky Bucket** (Shopify) | Requests enter a FIFO queue of fixed size. Requests are dispatched to servers at a constant, fixed outflow rate. | Guarantees smooth, steady request rate; avoids downstream spikes. | Bursts of requests fill the buffer quickly, causing subsequent requests to be dropped. |
| **Fixed Window Counter** | Time is sliced into fixed windows (e.g., 1 minute: 00:00–00:01). A counter increments per request. | Simple memory storage (`INCR key` in Redis). | **Boundary Spike Flaw**: $2\times$ the allowed traffic can hit within a boundary slice (e.g., end of min 1 + start of min 2). |
| **Sliding Window Log** | Timestamps of every request are recorded in a sorted set (e.g., Redis ZSET). Timestamps older than current window are pruned. | Exceptionally accurate; no boundary spikes. | **High memory consumption**: Storing thousands of timestamps per user exhausts RAM. |
| **Sliding Window Counter** (Industry Standard) | Blends the previous window count with the current window count based on fractional time overlap. | Highly accurate ($99.9\%$); minimal memory footprint (only 2 counters per client). | Assumes traffic in previous window was uniformly distributed. |

### Distributed Rate Limiting via Redis Lua Scripting
In horizontal multi-gateway setups, rate limiting counters must reside in a centralized Redis store.
- **Race Condition**: A naive `GET counter` followed by `INCR` can trigger race conditions between concurrent gateway nodes.
- **Solution**: Execute the rate limiting evaluation inside an atomic **Redis Lua script** or use Redis transactions (`MULTI` / `EXEC`).

---

## 3. Defense-in-Depth: Multi-Tier Subnet Segmentation

A secure cloud architecture enforces isolation across three distinct network tiers:

```
+───────────────────────────────────────────────────────────────+
| Public Subnet (Internet Facing)                               |
|   • Internet Gateway, NAT Gateway, Edge Load Balancers        |
+───────────────────────────────────────────────────────────────+
                               │
+──────────────────────────────▼────────────────────────────────+
| Private Application Subnet (Compute)                          |
|   • App Servers, Background Workers, API Gateways             |
|   • Accessible ONLY from Load Balancers (Security Group rules)|
+───────────────────────────────────────────────────────────────+
                               │
+──────────────────────────────▼────────────────────────────────+
| Isolated Database Subnet (Persistence)                        |
|   • Relational Databases (Postgres/MySQL), Redis, Kafka       |
|   • Zero internet routing; accessible ONLY from App Subnet     |
+───────────────────────────────────────────────────────────────+
```

---

## 4. Architectural Variant Playbook

### Variant A: Cost-Optimized / Lean MVP
- Embedded reverse proxy (NGINX or Caddy) handling SSL termination via automated Let's Encrypt certificates.
- In-memory rate limiting middleware (e.g., `express-rate-limit` using memory store).
- Good up to 1 million daily requests; costs $\$0$ beyond base VM.

### Variant B: High-Availability (HA)
- Managed API Gateway (AWS API Gateway, Kong Gateway, or Cloudflare API Shield).
- Clustered Redis backend for distributed rate limiting.
- Strict Network ACLs (NACLs) and Security Groups segregating web, app, and data tiers.

### Variant C: High-Throughput / Low-Latency
- Envoy Proxy or Kong Gateway running on high-performance C++/Rust/Go runtimes.
- JWT verification using local public key caches (JWKS) to avoid network hops on every request.
- P99 gateway overhead $< 1.5 \text{ ms}$.

### Variant D: Global Distributed
- Edge API Gateways (Cloudflare Workers, Fastly Compute@Edge, AWS Lambda@Edge).
- Authentication and rate limiting execute at 300+ edge locations worldwide before traffic ever reaches the origin region.

---

## 5. ArchPilot Engine Rules Alignment
- **`SEC_CLIENT_DIRECT_DB`**: Direct connection between Client and Database nodes. Bypasses authentication, authorizes raw query execution, and exposes private database ports to public internet attackers. Severity: **CRITICAL**.
- **`SEC_NO_AUTH`**: Client connects directly to an App Server without an intervening API Gateway or perimeter authentication boundary. Severity: **WARNING**.
- **`SEC_DB_NO_FIREWALL`**: Edge gateway connects directly to a Database without an intermediate application/compute tier. Severity: **WARNING**.

---
title: "Load Balancing, Traffic Distribution, and Edge Routing"
category: "Networking & Traffic Management"
tags: ["load-balancer", "traffic-routing", "layer-4", "layer-7", "consistent-hashing", "health-checks", "failover", "geo-dns"]
applicable_components: ["client", "api", "loadbalancer", "server"]
related_rules: ["UNDER_NO_LB_MULTI_SERVER", "REL_LB_SINGLE_TARGET", "UNNECESSARY_CONNECTION", "SPOF_CRITICAL_PATH"]
---

# Load Balancing, Traffic Distribution, and Edge Routing

Load balancing is the primary architectural lever for distributing incoming client traffic evenly across pools of downstream servers. In Alex Xu's *System Design Interview* (Chapter 1 & Chapter 5: "Design Consistent Hashing"), load balancers not only avert server overload but also enable zero-downtime rolling deployments, automated health failovers, and geographic latency minimization.

```
                  +--------------------------------+
                  |      Public Internet (DNS)     |
                  +--------------------------------+
                                   |
                          [Anycast / GeoDNS]
                                   |
                  +--------------------------------+
                  |  Edge CDN / L7 Load Balancer   | (SSL Termination, Rate Limiting)
                  +--------------------------------+
                                   |
         +-------------------------+-------------------------+
         |                                                   |
         v                                                   v
[App Server 1 (AZ-1)]                              [App Server 2 (AZ-2)]
```

---

## 1. Layer 4 vs. Layer 7 Load Balancing

| Dimension | Layer 4 (Transport / Network) | Layer 7 (Application) |
| :--- | :--- | :--- |
| **Protocols** | TCP, UDP, TLS passthrough. | HTTP, HTTPS, HTTP/2, gRPC, WebSockets. |
| **Inspection Depth** | Evaluates only IP packet headers and port numbers ($IP:Port$). Cannot inspect URL, HTTP headers, or cookies. | Deep packet inspection: parses HTTP request paths, HTTP methods, headers, cookies, and JWT claims. |
| **Routing Capability** | Basic port/IP based routing. Faster throughput, lower memory overhead. | Advanced path routing (`/api/v1/orders` $\to$ Order Service, `/auth` $\to$ Auth Service), header manipulation, and sticky cookies. |
| **SSL / TLS Handling**| TCP pass-through (servers handle TLS handshake) or basic TLS offload. | Full TLS termination: decrypts incoming traffic, validates certificates, and communicates with internal backends over plaintext VPC or mTLS. |
| **Industry Examples** | AWS Network Load Balancer (NLB), HAProxy (TCP mode), Linux Virtual Server (IPVS). | AWS Application Load Balancer (ALB), NGINX, Envoy, Traefik, Cloudflare. |

---

## 2. Load Balancing Algorithms

### A. Round Robin & Weighted Round Robin
- **Round Robin**: Distributes requests sequentially to servers in circular order ($1 \to 2 \to 3 \to 1$). Assumes all servers have identical hardware compute capacity and requests require equal processing time.
- **Weighted Round Robin**: Assigns a capacity weight (e.g., Server A = 3, Server B = 1). Server A receives 3 consecutive requests for every 1 sent to Server B. Ideal when mixing heterogeneous hardware or instance sizes.

### B. Least Connections / Least Response Time
- **Least Connections**: Evaluates active concurrent connections and routes new requests to the server with the fewest active TCP sessions. Ideal for long-lived connections (e.g., streaming, database pooling, long polling).
- **Least Response Time**: Combines the number of active connections with each server's average latency probe, steering traffic away from degraded or sluggish instances.

### C. Consistent Hashing (Alex Xu Chapter 5)
In standard hash-modulo routing ($\text{Server Index} = \text{hash}(\text{key}) \pmod N$), adding or removing a single server instance ($N \to N+1$ or $N-1$) causes almost all keys to be re-hashed, triggering massive cache invalidations or state migration.

**Consistent Hashing solves this using a virtual circular ring ($[0 \dots 2^{32}-1]$)**:
1. Both server nodes and request keys are mapped onto the same hash ring using a uniform hash function (e.g., Murmur3, SHA-1).
2. To find the server for a key, traverse the ring clockwise from the key's position until encountering the first server node.
3. When a server node is added or removed, **only a small fraction of keys ($k/N$ on average)** need to be redistributed.
4. **Virtual Nodes (Replicas)**: To prevent hot spots and maintain uniform distribution, each physical node is assigned multiple virtual positions across the ring (e.g., 100–300 virtual nodes per physical instance).

```
        Node A (Virtual 1)
           /         \
 Node C (V2)         Node B (V1)
     |                     |
     |     [Hash Ring]     |
     |                     |
 Node B (V2)         Node A (V2)
           \         /
        Node C (Virtual 1)
```

---

## 3. Health Checks and Automated Failover

A load balancer must continuously verify the operational health of every registered target.

### Health Probe Types:
1. **TCP Ping (Layer 4)**: Verifies that the port accepts socket connections within a timeout (e.g., 2000 ms). Does not guarantee the application layer is healthy (e.g., app could be hung in a Java OutOfMemoryError).
2. **HTTP Endpoint Probe (Layer 7)**: Periodically calls a dedicated diagnostic endpoint (e.g., `GET /healthz` or `/actuator/health`). The backend confirms database connectivity, cache reachability, and memory headroom before returning `HTTP 200 OK`.
3. **Active Thresholds**:
   - **Healthy Threshold**: 2 to 3 consecutive successful probes before routing traffic to an instance.
   - **Unhealthy Threshold**: 2 consecutive failures before immediately ejecting the instance from active pool.

---

## 4. Multi-Tier & Multi-Region Traffic Hierarchy

In large-scale production architectures, traffic passes through an onion-style routing hierarchy:

```
[Global User Request]
        │
        ▼
[Anycast DNS / GeoDNS (Route53, Cloudflare)] ──> Directs to closest geographical edge POP
        │
        ▼
[Edge CDN / API Gateway (Cloudflare, CloudFront)] ──> Handles TLS handshake, DDoS filtering (WAF), static assets
        │
        ▼
[Regional Load Balancer (ALB / NLB)] ──> Spans multiple Availability Zones (AZ-1, AZ-2)
        │
        ▼
[Private App Server Fleet] ──> Resides in private VPC subnets with autoscaling groups
```

---

## 5. Architectural Variant Playbook

### Variant A: Cost-Optimized / Lean MVP
- Use a single lightweight reverse proxy (e.g., single NGINX container or AWS ALB shared across services) or route directly through a managed API Gateway.
- If running a single server, omit dedicated load balancer hardware to conserve monthly baseline cloud spend ($~\$25/\text{mo}$ savings on AWS ALB).

### Variant B: High-Availability (HA)
- Deploy Multi-AZ Load Balancers backed by redundant physical appliances.
- Minimum backend fleet: at least 2 compute instances across separate Availability Zones.
- Eliminates `SPOF_CRITICAL_PATH` and safeguards against datacentre-level power or network outages.

### Variant C: High-Throughput / Low-Latency
- Layer 4 Network Load Balancer (NLB) for million+ connections per second with sub-millisecond overhead.
- HTTP/2 or HTTP/3 multiplexing enabled at the edge.
- Connection pooling between reverse proxy and backend servers to eliminate TLS/TCP handshake latency.

### Variant D: Global Distributed
- Anycast BGP routing combined with GeoDNS routing policies.
- Global traffic manager directs European users to `eu-central-1` and US users to `us-east-1`.
- Health-check aware DNS automatically redirects regional traffic across oceans in the event of full-region outages.

---

## 6. ArchPilot Engine Rules Alignment
- **`UNDER_NO_LB_MULTI_SERVER`**: Architecture contains 2 or more compute servers, but lacks a Load Balancer to coordinate traffic. Result: traffic will not be balanced or failover cleanly.
- **`REL_LB_SINGLE_TARGET`**: A Load Balancer connects to exactly 1 downstream server. Adds network latency and management cost without providing high availability.
- **`UNNECESSARY_CONNECTION`**: Client connects directly to both the Load Balancer and internal App Servers, bypassing traffic policing.

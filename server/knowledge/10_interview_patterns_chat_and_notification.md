---
title: "System Design Pattern: Real-Time Chat and Notification Systems"
category: "System Design Case Studies"
tags: ["chat-system", "websockets", "long-polling", "notification-system", "presence-servers", "message-queues", "stateful-services"]
applicable_components: ["client", "api", "loadbalancer", "server", "queue", "cache", "database"]
related_rules: ["REL_QUEUE_NO_CONSUMER", "SPOF_CRITICAL_PATH", "SEC_CLIENT_DIRECT_DB"]
---

# System Design Pattern: Real-Time Chat and Notification Systems

Designing scalable real-time systems—such as WhatsApp, Slack, or a multi-channel notification platform—requires balancing stateful real-time connections with stateless microservices (Alex Xu *System Design Interview*, Chapter 10 & Chapter 12).

```
[Client App]
   ├─── (HTTP/REST) ─────────> [API Gateway] ──> [Stateless Services: Auth, Profile]
   │                                                 │
   └─── (Persistent WebSocket) ─> [WebSocket Gateways] <─+
                                         │               │
                                         ▼               │ (Publish message)
                                  [Message Queue] ───────+
                                  (Kafka / Redis PubSub)
                                         │
                                         ▼
                                  [Chat Worker Pool] ──> [Message History DB] (Cassandra)
```

---

## 1. Communication Protocols: Polling vs. Long Polling vs. WebSockets

| Protocol | Connection Type | Latency | Header Overhead | Best For |
| :--- | :--- | :--- | :--- | :--- |
| **HTTP Polling** | Unidirectional, periodic new TCP connections. | High (up to polling interval). | Very High (repeated HTTP headers sent). | Infrequent checks; legacy dashboards. |
| **HTTP Long Polling** | Unidirectional, client holds request open until server pushes data or timeout. | Moderate. | Moderate. | Fallback when WebSockets are blocked by corporate firewalls. |
| **Server-Sent Events (SSE)** | Unidirectional (Server $\to$ Client over HTTP/2). | Low. | Minimal. | Stock tickers, live sports scores, notification popups (client does not need to send data). |
| **WebSockets** | **Bidirectional, full-duplex persistent TCP connection**. | **Ultra-Low ($< 5 \text{ ms}$)**. | Minimal (2-byte framing overhead after initial handshake). | **Interactive two-way chat**, multiplayer gaming, collaborative whiteboards. |

---

## 2. Real-Time Chat System Architecture (Alex Xu Ch. 12)

A chat system divides naturally into two distinct architectural planes:

### A. Stateless Service Tier
- Handles authentication, user profile management, contact discovery, and group settings.
- Standard HTTP/REST behind a Layer 7 Load Balancer.

### B. Stateful Chat Service Tier
- Maintains millions of active persistent WebSocket connections to client devices.
- **Service Discovery (Zookeeper / Consul)**: When a client logs in, Service Discovery assigns the client to the least-loaded Chat Server based on geographic proximity and connection count.
- **Presence Server**:
  - Monitors user online/offline status via client **Heartbeat Pings** (e.g., client pings every 5 seconds; 3 missed pings marks user offline).
  - Online status is cached in Redis using a key-value pair (`user:1234:status = online`) with a 15-second TTL.

### C. Message Storage Architecture
- **Message Volume**: Billions of messages per day.
- **Access Pattern**: Recent messages are read frequently; old messages are rarely queried, but random access is needed for search.
- **Database Choice**: Distributed Wide-Column Store (Apache Cassandra or ScyllaDB) or DynamoDB.
  - Primary Key: `(conversation_id, message_id)`.
  - Partition Key: `conversation_id` (ensures all messages in a chat reside on the same partition).
  - Clustering Key: `message_id` (Snowflake ID ordered chronologically).

---

## 3. High-Throughput Notification System (Alex Xu Ch. 10)

Sending millions of push notifications (iOS APNs, Android FCM), SMS messages (Twilio), and emails (SendGrid) requires queue-based decoupling to prevent third-party latency from crashing core services.

```
+--------------------+        +---------------------+        +-----------------------+
|  Internal Services | ─────> | Notification Server | ─────> | Specialized Queues    |
| (Order, Billing)   |        | (Validation, Auth)  |        | • APNs Queue (iOS)    |
+--------------------+        +---------------------+        | • FCM Queue (Android) |
                                                             | • SMS Queue (Twilio)  |
                                                             | • Email Queue (SES)   |
                                                             +-----------------------+
                                                                         │
                                                                         ▼
                                                             +-----------------------+
                                                             | Consumer Worker Pool  |
                                                             +-----------------------+
                                                                         │
                                                                         ▼
                                                             [3rd-Party Delivery APIs]
```

### Key Production Guardrails:
1. **Per-Channel Message Queues**: A slowdown or outage in Twilio's SMS API will only backlog the SMS Queue, leaving mobile push notifications and emails unaffected.
2. **Deduplication Engine**: Uses an in-memory Redis cache with event IDs (`order_id + event_type`) to ensure a customer is never billed or notified twice for the same event.
3. **User Preferences & Opt-Out**: Notification servers check the user settings database before enqueueing messages (e.g., quiet hours, un-subscribed marketing).

---

## 4. ArchPilot Engine Rules Alignment
- **`REL_QUEUE_NO_CONSUMER`**: Occurs when notification queues are defined without corresponding worker pools to dispatch requests to APNs/FCM.
- **`SPOF_CRITICAL_PATH`**: A single WebSocket gateway server handling all active connections. If it restarts, all connected clients are dropped simultaneously.

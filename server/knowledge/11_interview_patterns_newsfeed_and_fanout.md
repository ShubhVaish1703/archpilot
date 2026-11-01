---
title: "System Design Pattern: Newsfeed Architecture and Fanout Strategies"
category: "System Design Case Studies"
tags: ["newsfeed", "fanout-on-write", "fanout-on-read", "hybrid-fanout", "redis-caching", "social-graph"]
applicable_components: ["client", "api", "loadbalancer", "server", "queue", "cache", "database"]
related_rules: ["REL_CACHE_WITHOUT_DB", "SPOF_CRITICAL_PATH", "SEC_CLIENT_DIRECT_DB"]
---

# System Design Pattern: Newsfeed Architecture and Fanout Strategies

Designing a scalable Newsfeed system (similar to Twitter timeline, Facebook News Feed, or LinkedIn feed) is a quintessential system design interview topic (Alex Xu *System Design Interview*, Chapter 11). It centers on a fundamental engineering dilemma: **Fanout-on-Write (Push)** versus **Fanout-on-Read (Pull)**.

```
                          [User Publishes Post]
                                    │
                                    ▼
                         [Newsfeed Post Service]
                                    │
                        (Publish to Message Queue)
                                    │
                                    ▼
                       [Fanout Worker Service Pool]
                                    │
                   +────────────────┴────────────────+
                   │                                 │
         (Standard User: Push)             (Celebrity: Skip Push)
                   │                                 │
                   ▼                                 ▼
      [Write Post ID into Follower          [Store Post in Master DB;
        Redis In-Memory Feeds]               Pull on Read Time]
```

---

## 1. Fanout Models Comparison

| Criterion | Fanout-on-Write (Push Model) | Fanout-on-Read (Pull Model) | Hybrid Fanout (Industry Standard) |
| :--- | :--- | :--- | :--- |
| **How it Works** | When a user posts, a worker immediately pushes the post ID into the timeline cache of every follower. | When a user opens their feed, the system pulls recent posts from all followed users and sorts them in real time. | Regular users use Push (instant reads). Celebrities ($>25\text{k}$ followers) use Pull. Merged on read. |
| **Read Latency** | **Ultra-Fast ($O(1)$)**: Feed is precomputed in Redis; reading is a simple `ZREVRANGEBYSCORE`. | **Slow ($O(N \log N)$)**: Must query hundreds of followed accounts and sort on the fly. | **Fast ($< 25 \text{ ms}$)**: Combines precomputed Redis feed with hot celebrity posts. |
| **Write Latency** | High write amplification: A user with 10M followers causes 10M cache writes (**The Justin Bieber Problem**). | **Instant**: Single write to user's post table. | Balanced: Write amplification capped to manageable thresholds. |
| **Inactive Users** | Wastes memory pushing posts to followers who haven't logged in for 6 months. | Zero waste; feeds only computed for active users. | Workers check `last_login_timestamp` and skip inactive followers. |

---

## 2. Multi-Layer Newsfeed Caching Architecture

Storing entire post objects (text, media URLs, author info, likes) in every follower's feed cache causes astronomical RAM costs. High-scale feeds implement a **5-layer segregated caching model**:

1. **Layer 1: Newsfeed Cache (Redis Sorted Set - ZSET)**
   - Key: `feed:user_id`
   - Score: `created_at` timestamp.
   - Value: `post_id` (only the 64-bit integer ID is stored).
   - Capacity: Capped at the latest 800 post IDs per user via `ZREMRANGEBYRANK`.
2. **Layer 2: Post Content Cache (Redis Hash)**
   - Maps `post_id` to post text, author ID, and creation metadata.
3. **Layer 3: Social Graph Cache**
   - In-memory relationship graphs mapping `user_id` to follower IDs and following IDs.
4. **Layer 4: User Profile Cache**
   - User names, avatars, verification badges.
5. **Layer 5: Engagement Counters (Redis Counters)**
   - Real-time like counts, retweet counts, and comment counts updated via atomic `INCR` / `DECR`.

---

## 3. Feed Retrieval Flow (Read Path)

```
[Client App]
     │
     ▼ (GET /v1/feed?limit=20)
[API Gateway] ──> [Newsfeed Read Service]
                         │
                         ├── 1. Fetch Top 20 Post IDs from Redis Feed Cache (ZREVRANGE)
                         ├── 2. Query Celebrity Post Cache for followed VIP accounts
                         ├── 3. Merge & Sort post IDs by timestamp or ranking algorithm
                         ├── 4. Multi-Get (MGET) Post Content & User Profiles from Redis
                         │
                         ▼ (Return hydrated JSON array)
                   [Client UI Renders Feed]
```

---

## 4. ArchPilot Engine Rules Alignment
- **`REL_CACHE_WITHOUT_DB`**: Feed caches in Redis must always be backed by persistent document/relational databases for message durability.
- **`SPOF_CRITICAL_PATH`**: Single fanout worker processing the queue without redundancy creates a massive backlog during peak publishing events.

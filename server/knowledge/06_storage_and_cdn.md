---
title: "Storage Architectures, CDN Edge Caching, and Blob Pipelines"
category: "Storage & Content Delivery"
tags: ["object-storage", "s3", "cdn", "cloudfront", "pre-signed-urls", "edge-caching", "streaming", "delta-sync"]
applicable_components: ["client", "api", "server", "storage", "database"]
related_rules: ["SEC_CLIENT_DIRECT_DB", "SPOF_CRITICAL_PATH", "TOPO_DEAD_END_SERVER"]
---

# Storage Architectures, CDN Edge Caching, and Blob Pipelines

Modern web and mobile applications produce and consume massive volumes of unstructured binary data (images, videos, PDFs, system backups, software packages). Storing binary blobs inside relational database rows as `BLOB` columns degrades database cache efficiency and inflates backup sizes.

As documented in Alex Xu's *System Design Interview* (Chapter 1, Chapter 14: "Design YouTube", and Chapter 15: "Design Google Drive"), modern architectures separate structured metadata (stored in databases) from raw binary objects (stored in distributed Object Storage and distributed globally via CDNs).

```
                      +-----------------------------+
                      |     Client Browser/App      |
                      +-----------------------------+
                        /                         \
         (1. Request Upload Token)          (3. Direct Upload via Pre-signed URL)
                      /                             \
                     v                               v
          +--------------------+          +--------------------+
          | Application Server |          | S3 Object Storage  |
          +--------------------+          +--------------------+
                     │                               │
            (2. Store Metadata)             (4. S3 Event Trigger)
                     v                               v
          +--------------------+          +--------------------+
          | Metadata Database  |          | Transcoding Worker |
          +--------------------+          +--------------------+
```

---

## 1. Storage Classification: Block vs. File vs. Object Storage

| Dimension | Block Storage (e.g., AWS EBS) | File Storage (e.g., AWS EFS, NFS) | Object Storage (e.g., AWS S3, GCS) |
| :--- | :--- | :--- | :--- |
| **Data Format** | Raw physical disk sectors / blocks. | Hierarchical directory tree of files and folders. | Flat address space; key-value objects with rich user metadata. |
| **Access Protocol** | Fibre Channel, iSCSI, NVMe-oF (OS mount). | POSIX file system (SMB, NFS mount). | HTTP REST APIs (`GET`, `PUT`, `DELETE`). |
| **Latency** | Sub-millisecond (ultra-fast disk I/O). | $1 - 5 \text{ ms}$. | $50 - 200 \text{ ms}$ time to first byte. |
| **Scalability** | Fixed volume size; requires manual resizing. | Petabyte scale; automatic file sharing across nodes. | Virtually infinite; petabytes/exabytes with $99.999999999\%$ (11 9s) durability. |
| **Best For** | Database data directories (Postgres `data/`, MySQL `innodb`). | Shared server config, legacy multi-server file shares. | Static assets, media uploads, backups, data lakes. |

---

## 2. Content Delivery Networks (CDN) and Edge Caching

A CDN is a globally distributed network of edge Point of Presence (PoP) proxy servers designed to deliver static and streaming content with minimal geographical latency.

### How CDN Caching Works:
1. User in Sydney requests `https://cdn.example.com/logo.png`.
2. Anycast DNS routes the user to the Sydney edge PoP server.
3. **CDN Hit**: If `logo.png` is cached locally at the Sydney PoP, it returns within $10\text{--}20 \text{ ms}$ without traversing the Pacific Ocean.
4. **CDN Miss**: The Sydney PoP fetches the file from the **Origin Server** (AWS S3 bucket or central application server), caches it locally, and serves the user.

### Cache-Control Best Practices:
- **Hashed Assets (Immutable)**: For JS/CSS bundles with content hashes (e.g., `main.a8f23b.js`):
  `Cache-Control: public, max-age=31536000, immutable`
- **Dynamic Assets**:
  `Cache-Control: public, max-age=0, s-maxage=3600, stale-while-revalidate=60`
- **Origin Shielding**: Adding an intermediate caching tier between edge PoPs and the origin to avoid thundering-herd requests hitting S3 during global cache invalidations.

---

## 3. The Pre-Signed URL Direct Upload Pattern

Uploading large binary files (e.g., a 2GB video file) through an application server creates severe architectural bottlenecks:
- Exhausts server network bandwidth.
- Blocks HTTP request worker threads.
- Requires massive RAM buffers to prevent memory crashes.

### The Secure Direct Upload Solution:
1. **Client requests upload authorization**: Sends file name, size, and MIME type to `POST /api/v1/files/upload-ticket`.
2. **Server generates Pre-Signed URL**: Application server verifies client permissions and generates a cryptographic short-lived pre-signed S3 URL (e.g., valid for 15 minutes) using IAM credentials.
3. **Direct Upload**: Client executes an HTTP `PUT` directly to the S3 bucket using the pre-signed URL.
4. **Async Processing Trigger**: Upon completion, S3 emits an `ObjectCreated` event to an SQS queue or Lambda function to kick off background thumbnailing and virus scanning.

---

## 4. Large-Scale Storage Case Studies (Alex Xu Ch. 14 & 15)

### Case Study A: YouTube Video Transcoding Pipeline (Alex Xu Ch. 14)
- **Direct Chunk Upload**: Video is uploaded in 5MB–10MB chunks to object storage.
- **Transcoding DAG**: Directed Acyclic Graph orchestrates parallel transcoding tasks:
  - Video split into GOPs (Group of Pictures).
  - Transcoded concurrently into multiple bitrates (1080p, 720p, 480p) and codecs (H.264, VP9, AV1).
  - Segmented into HTTP Live Streaming (`.m3u8` playlist and `.ts` slices) or MPEG-DASH.
- **CDN Edge Streaming**: CDN caches popular video segments near viewers to eliminate buffering.

### Case Study B: Google Drive Delta Sync & Block Storage (Alex Xu Ch. 15)
- Files are divided into 4MB blocks.
- Each block is cryptographically hashed with SHA-256 (`block_id = SHA256(content)`).
- **Deduplication**: If another file or version shares identical blocks, only one instance is saved to block/object storage.
- **Delta Sync**: When a user modifies a small section of a 500MB document, only the altered 4MB block is re-uploaded over the network, minimizing bandwidth usage by $99\%+$.

---

## 5. Architectural Variant Playbook

### Variant A: Cost-Optimized / Lean MVP
- Single S3 bucket with public-read permissions managed via bucket policies.
- Serve assets directly from S3 without a CDN (acceptable only for low-traffic internal tools).
- Store thumbnails directly on S3 Standard.

### Variant B: High-Availability (HA)
- CloudFront CDN in front of S3 origin.
- S3 Cross-Region Replication (CRR) configured between primary and backup regions.
- Multi-AZ S3 Standard tier with $99.999999999\%$ (11 9s) durability.

### Variant C: High-Throughput / Low-Latency
- CDN Edge with Byte-Range Requests enabled for instantaneous video seeking.
- S3 Transfer Acceleration (uses AWS globally distributed edge locations to route uploads over Amazon's private fiber backbone).
- Multi-part uploads executing in parallel (50+ concurrent threads).

### Variant D: Global Distributed
- Multi-region S3 buckets with Anycast edge routing.
- Lifecycle management policies automatically tiering older assets:
  $\text{S3 Standard (30 days)} \to \text{S3 Infrequent Access (90 days)} \to \text{S3 Glacier Flexible} \to \text{Glacier Deep Archive}$.
- Reduces storage costs by up to $80\%$.

---

## 6. ArchPilot Engine Rules Alignment
- **`SEC_CLIENT_DIRECT_DB`**: While raw direct database access is forbidden, direct client-to-storage upload is supported **only** when guarded by an API Gateway / App Server generating signed credentials (Pre-Signed URLs).
- **`TOPO_DEAD_END_SERVER`**: App servers that perform file generation without connecting to persistent storage or object buckets.

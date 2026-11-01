import assert from "node:assert";
import { chunkMarkdownDocument } from "../src/services/rag/chunker.js";
import { cosineSimilarity, normalizeVector, dotProduct, rankChunksBySimilarity } from "../src/services/rag/similarity.js";
import { loadEmbeddingsIndex, retrieveRelevantKnowledge } from "../src/services/rag/retriever.js";

console.log("🧪 Running ArchPilot RAG, Chunking & Similarity Tests...\n");

// --- TEST 1: Semantic Chunking ---
{
  const mockDoc = `---
title: "Test Caching Architecture"
category: "Performance"
tags: ["cache", "redis"]
applicable_components: ["server", "cache", "database"]
related_rules: ["REL_CACHE_WITHOUT_DB", "SPOF_CRITICAL_PATH"]
---

# Cache Overview
This is an overview of caching patterns.

## 1. Cache-Aside Pattern
Cache-Aside (Lazy loading) queries cache first before database.

## 2. Write-Through Pattern
Write-Through updates cache and database synchronously.
`;

  const chunks = chunkMarkdownDocument(mockDoc, "test_cache.md");
  assert.ok(chunks.length >= 2, `Expected at least 2 chunks, got ${chunks.length}`);
  assert.strictEqual(chunks[0].docTitle, "Test Caching Architecture");
  assert.deepStrictEqual(chunks[0].applicableComponents, ["server", "cache", "database"]);
  assert.deepStrictEqual(chunks[0].relatedRules, ["REL_CACHE_WITHOUT_DB", "SPOF_CRITICAL_PATH"]);
  console.log("✅ Test 1 Passed: Markdown frontmatter parsing and section chunking work accurately");
}

// --- TEST 2: Vector Math & Cosine Similarity ---
{
  const v1 = [1, 0, 0];
  const v2 = [1, 0, 0];
  const v3 = [0, 1, 0];
  const v4 = [-1, 0, 0];

  assert.strictEqual(Math.round(cosineSimilarity(v1, v2) * 1000) / 1000, 1.0, "Identical vectors must have cosine similarity 1.0");
  assert.strictEqual(cosineSimilarity(v1, v3), 0.0, "Orthogonal vectors must have cosine similarity 0.0");
  assert.strictEqual(Math.round(cosineSimilarity(v1, v4) * 1000) / 1000, -1.0, "Opposite vectors must have cosine similarity -1.0");

  const normalized = normalizeVector([3, 4]);
  assert.strictEqual(Math.round(normalized[0] * 10) / 10, 0.6);
  assert.strictEqual(Math.round(normalized[1] * 10) / 10, 0.8);
  console.log("✅ Test 2 Passed: Cosine similarity and vector normalization adhere to mathematical definitions");
}

// --- TEST 3: Hybrid Ranking with Metadata Rule Boosting ---
{
  const queryVec = [1, 0, 0];
  const testChunks = [
    {
      id: "chunk-1",
      embedding: [0.8, 0.2, 0],
      relatedRules: ["OTHER_RULE"],
      applicableComponents: ["server"],
    },
    {
      id: "chunk-2",
      embedding: [0.75, 0.25, 0],
      relatedRules: ["SEC_CLIENT_DIRECT_DB"], // matches target rule
      applicableComponents: ["database"],
    },
  ];

  // chunk-1 has higher raw similarity (0.97 vs 0.948), but chunk-2 matches SEC_CLIENT_DIRECT_DB (+0.12 boost)
  const ranked = rankChunksBySimilarity(queryVec, testChunks, {
    topK: 2,
    targetRules: ["SEC_CLIENT_DIRECT_DB"],
    targetComponents: ["database"],
  });

  assert.strictEqual(ranked[0].id, "chunk-2", "Chunk matching detected rule and component must be boosted to rank 1");
  assert.ok(ranked[0].hybridScore > ranked[1].hybridScore, "Hybrid score must reflect metadata boost");
  console.log("✅ Test 3 Passed: Hybrid ranking boosts chunks matching active engine rules");
}

// --- TEST 4: Embeddings Index Loading & In-Memory Retrieval ---
{
  const startTime = performance.now();
  const index = loadEmbeddingsIndex();
  const loadDurationMs = performance.now() - startTime;

  assert.ok(index.length > 50, `Expected at least 50 chunks in index, got ${index.length}`);
  assert.ok(loadDurationMs < 50, `Embeddings index should load in < 50ms, took ${loadDurationMs.toFixed(2)}ms`);

  console.log(`✅ Test 4 Passed: Loaded ${index.length} chunks from embeddings.json in ${loadDurationMs.toFixed(2)}ms`);
}

// --- TEST 5: Fallback Rule Matching when API is offline ---
{
  const results = await retrieveRelevantKnowledge("how to prevent direct client access to database", {
    engineFindings: [{ ruleId: "SEC_CLIENT_DIRECT_DB" }],
    components: ["client", "database"],
    topK: 3,
    apiKey: null, // forces offline fallback
  });

  assert.ok(results.length > 0, "Fallback retriever must return relevant chunks");
  assert.ok(
    results.some((r) => r.relatedRules.includes("SEC_CLIENT_DIRECT_DB")),
    "Results must prioritize SEC_CLIENT_DIRECT_DB rule chunks"
  );
  console.log("✅ Test 5 Passed: Offline rule fallback correctly retrieves knowledge context");
}

console.log("\n🎉 ALL 5 RAG & VECTOR ENGINE TESTS PASSED SUCCESSFULLY!\n");

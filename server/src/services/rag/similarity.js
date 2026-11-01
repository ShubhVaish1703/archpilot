/**
 * Vector Math and Similarity Engine for ArchPilot RAG
 */

/**
 * Computes standard Cosine Similarity between two floating-point vectors.
 * Returns a value between -1.0 and 1.0.
 *
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @returns {number} Cosine similarity
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = vecA[i];
    const b = vecB[i];
    dot += a * b;
    normA += a * a;
    normB += b * b;
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Normalizes a vector to unit length (L2 norm = 1.0).
 * Unit normalization allows fast dot-product calculation without square roots.
 *
 * @param {Array<number>} vec
 * @returns {Array<number>} Unit-normalized vector
 */
export function normalizeVector(vec) {
  if (!vec || vec.length === 0) return [];
  let sumSq = 0;
  for (let i = 0; i < vec.length; i++) {
    sumSq += vec[i] * vec[i];
  }
  const norm = Math.sqrt(sumSq);
  if (norm === 0) return vec.slice();

  const normalized = new Float32Array(vec.length);
  for (let i = 0; i < vec.length; i++) {
    normalized[i] = vec[i] / norm;
  }
  return Array.from(normalized);
}

/**
 * Computes inner dot-product between two unit-normalized vectors.
 *
 * @param {Array<number>} vecA
 * @param {Array<number>} vecB
 * @returns {number}
 */
export function dotProduct(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let sum = 0;
  for (let i = 0; i < vecA.length; i++) {
    sum += vecA[i] * vecB[i];
  }
  return sum;
}

/**
 * Ranks chunks by hybrid similarity: Vector Cosine Score + Rule & Component Metadata Boosts.
 *
 * @param {Array<number>} queryVector 768-dim query embedding
 * @param {Array<Object>} chunks List of stored chunks with .embedding property
 * @param {Object} options Ranking configuration
 * @returns {Array<Object>} Top-K matched chunks with scores
 */
export function rankChunksBySimilarity(queryVector, chunks, options = {}) {
  const topK = options.topK || 5;
  const minScore = options.minScore || 0.25;
  const targetRules = new Set(options.targetRules || []);
  const targetComponents = new Set(options.targetComponents || []);

  const scored = [];

  for (const chunk of chunks) {
    if (!chunk.embedding || chunk.embedding.length === 0) continue;

    // Base semantic similarity (0.0 to 1.0)
    let similarity = cosineSimilarity(queryVector, chunk.embedding);
    if (similarity < minScore) continue;

    let hybridScore = similarity;

    // Metadata Rule Boost (+0.12 if chunk addresses detected engine rule)
    if (chunk.relatedRules && targetRules.size > 0) {
      const hasRuleMatch = chunk.relatedRules.some((r) => targetRules.has(r));
      if (hasRuleMatch) {
        hybridScore += 0.12;
      }
    }

    // Metadata Component Boost (+0.05 if chunk covers architecture component)
    if (chunk.applicableComponents && targetComponents.size > 0) {
      const hasComponentMatch = chunk.applicableComponents.some((c) => targetComponents.has(c));
      if (hasComponentMatch) {
        hybridScore += 0.05;
      }
    }

    scored.push({
      ...chunk,
      rawSimilarity: Number(similarity.toFixed(4)),
      hybridScore: Number(hybridScore.toFixed(4)),
    });
  }

  // Sort descending by hybridScore
  scored.sort((a, b) => b.hybridScore - a.hybridScore);

  return scored.slice(0, topK);
}

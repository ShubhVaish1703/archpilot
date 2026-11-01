import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { rankChunksBySimilarity, normalizeVector } from "./similarity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EMBEDDINGS_PATH = path.resolve(__dirname, "../../../knowledge/embeddings.json");

let cachedChunks = null;

/**
 * Loads precomputed embeddings from knowledge/embeddings.json into memory.
 */
export function loadEmbeddingsIndex() {
  if (cachedChunks) return cachedChunks;

  if (!fs.existsSync(EMBEDDINGS_PATH)) {
    console.warn(`[ArchPilot RAG] Warning: Embeddings index not found at ${EMBEDDINGS_PATH}. Run 'npm run seed:embeddings' first.`);
    return [];
  }

  try {
    const raw = fs.readFileSync(EMBEDDINGS_PATH, "utf-8");
    cachedChunks = JSON.parse(raw);
    console.log(`[ArchPilot RAG] Loaded ${cachedChunks.length} knowledge chunks into memory.`);
    return cachedChunks;
  } catch (err) {
    console.error(`[ArchPilot RAG] Failed to parse embeddings index:`, err.message);
    return [];
  }
}

/**
 * Embeds a single query string using Gemini text-embedding-004.
 *
 * @param {string} text Query string
 * @param {string} apiKey Gemini API key
 * @returns {Promise<Array<number>>} 768-dim embedding vector
 */
export async function embedQuery(text, apiKey = process.env.GEMINI_API_KEY) {
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is required to generate query embeddings.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

  const result = await model.embedContent({
    content: { parts: [{ text }] },
    taskType: "RETRIEVAL_QUERY",
  });

  return normalizeVector(result.embedding.values);
}

/**
 * Retrieves the top relevant knowledge chunks for a given query and engine context.
 *
 * @param {string} query Search text
 * @param {Object} context Context from architecture analysis
 * @param {Array<Object>} context.engineFindings Findings from Phase 2 engine
 * @param {Array<string>} context.components Component kinds present on canvas
 * @param {number} context.topK Maximum chunks to return
 * @param {string} context.apiKey Optional API key override
 * @returns {Promise<Array<Object>>} Ranked relevant knowledge chunks
 */
export async function retrieveRelevantKnowledge(query, context = {}) {
  const chunks = loadEmbeddingsIndex();
  if (!chunks || chunks.length === 0) {
    return [];
  }

  const {
    engineFindings = [],
    components = [],
    topK = 4,
    apiKey = process.env.GEMINI_API_KEY,
  } = context;

  // Extract rule IDs for metadata boosting
  const targetRules = engineFindings.map((f) => f.ruleId).filter(Boolean);

  try {
    const queryVector = await embedQuery(query, apiKey);

    return rankChunksBySimilarity(queryVector, chunks, {
      topK,
      targetRules,
      targetComponents: components,
    });
  } catch (err) {
    console.warn(`[ArchPilot RAG] Vector embedding failed (${err.message}). Falling back to metadata rule matching.`);
    // Fallback: rule-based match if API is unavailable or offline
    return fallbackRuleMatch(chunks, targetRules, components, topK);
  }
}

/**
 * Keyword and rule fallback when Gemini embedding API is unreachable.
 */
function fallbackRuleMatch(chunks, targetRules, components, topK) {
  const ruleSet = new Set(targetRules);
  const compSet = new Set(components);

  return chunks
    .map((chunk) => {
      let score = 0;
      if (chunk.relatedRules?.some((r) => ruleSet.has(r))) score += 0.5;
      if (chunk.applicableComponents?.some((c) => compSet.has(c))) score += 0.3;
      return { ...chunk, hybridScore: score, rawSimilarity: 0 };
    })
    .filter((c) => c.hybridScore > 0)
    .sort((a, b) => b.hybridScore - a.hybridScore)
    .slice(0, topK);
}

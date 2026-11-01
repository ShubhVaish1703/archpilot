import "dotenv/config";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { chunkMarkdownDocument } from "../src/services/rag/chunker.js";
import { normalizeVector } from "../src/services/rag/similarity.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWLEDGE_DIR = path.resolve(__dirname, "../knowledge");
const OUTPUT_FILE = path.resolve(KNOWLEDGE_DIR, "embeddings.json");

/**
 * Deterministic pseudo-random 768-dim vector generator for offline dry-runs.
 */
function generateOfflineMockVector(text, dimensions = 768) {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  const vec = new Float32Array(dimensions);
  for (let i = 0; i < dimensions; i++) {
    const pseudo = Math.sin(hash + i * 1337);
    vec[i] = pseudo;
  }
  return normalizeVector(Array.from(vec));
}

/**
 * Main seeding function.
 */
async function runSeeder() {
  console.log("=========================================================");
  console.log("🚀 ArchPilot Knowledge Chunker & Embedding Seeder");
  console.log("=========================================================\n");

  const apiKey = process.env.GEMINI_API_KEY;
  const isDryRun = process.argv.includes("--dry-run") || !apiKey;

  if (isDryRun) {
    if (!apiKey) {
      console.warn("⚠️  GEMINI_API_KEY not detected in environment.");
      console.warn("   Running in OFFLINE / DRY-RUN mode (generating deterministic normalized vectors).");
      console.warn("   To seed with live Gemini embeddings, run: GEMINI_API_KEY=your_key npm run seed:embeddings\n");
    } else {
      console.log("ℹ️  Running in explicit --dry-run mode.\n");
    }
  } else {
    console.log("🔑 GEMINI_API_KEY detected. Connecting to Google Gemini text-embedding-004...\n");
  }

  // 1. Read all markdown files in knowledge directory
  if (!fs.existsSync(KNOWLEDGE_DIR)) {
    throw new Error(`Knowledge directory not found: ${KNOWLEDGE_DIR}`);
  }

  const files = fs.readdirSync(KNOWLEDGE_DIR).filter((f) => f.endsWith(".md")).sort();
  console.log(`Found ${files.length} knowledge documents in ${KNOWLEDGE_DIR}:`);
  files.forEach((f) => console.log(`  - ${f}`));
  console.log("");

  // 2. Chunk all files
  const allChunks = [];
  for (const file of files) {
    const fullPath = path.join(KNOWLEDGE_DIR, file);
    const content = fs.readFileSync(fullPath, "utf-8");
    const docChunks = chunkMarkdownDocument(content, file);
    allChunks.push(...docChunks);
  }

  console.log(`✅ Chunking complete: Generated ${allChunks.length} semantic chunks.\n`);

  // 3. Generate embeddings
  let genAI = null;
  let embeddingModel = null;
  if (!isDryRun) {
    genAI = new GoogleGenerativeAI(apiKey);
    embeddingModel = genAI.getGenerativeModel({ model: "text-embedding-004" });
  }

  const batchSize = 10;
  console.log(`Generating 768-dim embeddings (Batch size: ${batchSize})...`);

  for (let i = 0; i < allChunks.length; i += batchSize) {
    const batch = allChunks.slice(i, i + batchSize);
    process.stdout.write(`  Processing chunks ${i + 1} to ${Math.min(i + batchSize, allChunks.length)} / ${allChunks.length}... `);

    if (isDryRun) {
      // Deterministic offline vector
      for (const chunk of batch) {
        chunk.embedding = generateOfflineMockVector(chunk.content);
      }
      process.stdout.write("[Offline OK]\n");
    } else {
      // Live Gemini text-embedding-004
      try {
        await Promise.all(
          batch.map(async (chunk) => {
            const resp = await embeddingModel.embedContent({
              content: { parts: [{ text: chunk.content }] },
              taskType: "RETRIEVAL_DOCUMENT",
            });
            chunk.embedding = normalizeVector(resp.embedding.values);
          })
        );
        process.stdout.write("[Gemini API OK]\n");
        // Brief pause to respect API rate limits
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        process.stdout.write(`[Error: ${err.message}] -> Fallback to mock\n`);
        for (const chunk of batch) {
          chunk.embedding = generateOfflineMockVector(chunk.content);
        }
      }
    }
  }

  // 4. Save to embeddings.json
  console.log(`\nWriting indexed knowledge base to: ${OUTPUT_FILE}`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(allChunks, null, 2), "utf-8");

  const stats = fs.statSync(OUTPUT_FILE);
  const sizeKb = (stats.size / 1024).toFixed(1);

  console.log("=========================================================");
  console.log(`🎉 Seeding Complete!`);
  console.log(`   Total Documents: ${files.length}`);
  console.log(`   Total Chunks:    ${allChunks.length}`);
  console.log(`   Index Size:      ${sizeKb} KB`);
  console.log(`   Output File:     ${OUTPUT_FILE}`);
  console.log("=========================================================");
}

runSeeder().catch((err) => {
  console.error("❌ Fatal Error during seeding:", err);
  process.exit(1);
});

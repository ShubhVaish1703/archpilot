import matter from "gray-matter";

/**
 * Normalizes text to estimate rough token count (~4 characters per token).
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

/**
 * Creates a URL/anchor-friendly slug.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * Chunks a markdown file content with frontmatter into semantic sections.
 *
 * @param {string} rawMarkdown Full markdown file content with YAML frontmatter
 * @param {string} filename The source filename (e.g., '01_scaling_fundamentals.md')
 * @param {Object} options Configuration options
 * @returns {Array<Object>} List of structured chunks ready for embedding
 */
export function chunkMarkdownDocument(rawMarkdown, filename, options = {}) {
  const maxChunkChars = options.maxChunkChars || 2200; // ~500 tokens
  const minChunkChars = options.minChunkChars || 40;   // discard empty headers
  const overlapChars = options.overlapChars || 200;

  // 1. Parse YAML Frontmatter
  const { data: frontmatter, content: markdownBody } = matter(rawMarkdown);

  const docTitle = frontmatter.title || filename.replace(/\.md$/, "");
  const category = frontmatter.category || "General Architecture";
  const tags = frontmatter.tags || [];
  const applicableComponents = frontmatter.applicable_components || [];
  const relatedRules = frontmatter.related_rules || [];
  const fileSlug = filename.replace(/\.md$/, "");

  const chunks = [];

  // 2. Split by major markdown sections (## or ###)
  // We use positive lookahead to preserve the header delimiter
  const rawSections = markdownBody.split(/(?=\n#{2,3}\s+)/);

  let chunkIndex = 0;

  for (const rawSection of rawSections) {
    const trimmedSection = rawSection.trim();
    if (!trimmedSection || trimmedSection.length < minChunkChars) continue;

    // Extract section header if present
    const headerMatch = trimmedSection.match(/^#{2,3}\s+(.+)$/m);
    const sectionTitle = headerMatch ? headerMatch[1].trim() : "Overview";
    const sectionSlug = slugify(sectionTitle);

    // If section fits within max size, keep it whole
    if (trimmedSection.length <= maxChunkChars) {
      chunkIndex++;
      const enrichedContent = formatChunkContent({
        docTitle,
        sectionTitle,
        category,
        tags,
        body: trimmedSection,
      });

      chunks.push({
        id: `${fileSlug}#${sectionSlug}-${chunkIndex}`,
        file: filename,
        docTitle,
        sectionTitle,
        category,
        tags,
        applicableComponents,
        relatedRules,
        content: enrichedContent,
        rawLength: enrichedContent.length,
        estimatedTokens: estimateTokens(enrichedContent),
      });
    } else {
      // Split large section by paragraphs (\n\n) with overlap
      const paragraphs = trimmedSection.split(/\n{2,}/);
      let currentBuffer = "";
      let subIndex = 1;

      for (let p = 0; p < paragraphs.length; p++) {
        const para = paragraphs[p].trim();
        if (!para) continue;

        if ((currentBuffer + "\n\n" + para).length > maxChunkChars && currentBuffer.length >= minChunkChars) {
          chunkIndex++;
          const enrichedContent = formatChunkContent({
            docTitle,
            sectionTitle: `${sectionTitle} (Part ${subIndex})`,
            category,
            tags,
            body: currentBuffer,
          });

          chunks.push({
            id: `${fileSlug}#${sectionSlug}-p${subIndex}-${chunkIndex}`,
            file: filename,
            docTitle,
            sectionTitle: `${sectionTitle} (Part ${subIndex})`,
            category,
            tags,
            applicableComponents,
            relatedRules,
            content: enrichedContent,
            rawLength: enrichedContent.length,
            estimatedTokens: estimateTokens(enrichedContent),
          });

          subIndex++;
          // Carry over tail of previous buffer as overlap
          const overlap = currentBuffer.slice(-overlapChars);
          currentBuffer = overlap + "\n\n" + para;
        } else {
          currentBuffer = currentBuffer ? `${currentBuffer}\n\n${para}` : para;
        }
      }

      if (currentBuffer.trim().length >= minChunkChars) {
        chunkIndex++;
        const enrichedContent = formatChunkContent({
          docTitle,
          sectionTitle: subIndex > 1 ? `${sectionTitle} (Part ${subIndex})` : sectionTitle,
          category,
          tags,
          body: currentBuffer.trim(),
        });

        chunks.push({
          id: `${fileSlug}#${sectionSlug}-p${subIndex}-${chunkIndex}`,
          file: filename,
          docTitle,
          sectionTitle: subIndex > 1 ? `${sectionTitle} (Part ${subIndex})` : sectionTitle,
          category,
          tags,
          applicableComponents,
          relatedRules,
          content: enrichedContent,
          rawLength: enrichedContent.length,
          estimatedTokens: estimateTokens(enrichedContent),
        });
      }
    }
  }

  return chunks;
}

/**
 * Enriches chunk content with metadata context for maximum embedding quality.
 */
function formatChunkContent({ docTitle, sectionTitle, category, tags, body }) {
  const tagList = Array.isArray(tags) ? tags.join(", ") : tags;
  return `Document: ${docTitle}\nSection: ${sectionTitle}\nCategory: ${category}\nTags: ${tagList}\n\n${body}`;
}

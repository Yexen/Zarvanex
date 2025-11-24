/**
 * Hybrid Search Implementation
 * Combines exact text search, semantic search, and entity index search
 */

import type { IntentType } from './intentClassifier';
import type { ExtractedKeywords } from './keywordExtractor';
import type { Entity, EntityIndex } from './entityIndexer';
import { cosineSimilarity } from './embeddingService';

export interface PersonalizationChunk {
  id: string;
  content: string;
  embedding?: number[];
  entities: string[];
  section?: string;
  index?: number;
  userId: string;
  createdAt: Date;
}

export interface SearchResults {
  exactMatches: PersonalizationChunk[];
  semanticMatches: Array<{ chunk: PersonalizationChunk; similarity: number }>;
  entityMatches: Array<{ entity: string; chunks: PersonalizationChunk[]; context: string }>;
}

export interface ScoredChunk {
  chunk: PersonalizationChunk;
  score: number;
  source: 'exact' | 'semantic' | 'entity';
}

/**
 * Perform hybrid search across all three methods
 */
export async function hybridSearch(
  keywords: ExtractedKeywords,
  intent: IntentType,
  queryEmbedding: number[] | null,
  personalizationDB: IDBDatabase,
  entityIndex: EntityIndex
): Promise<SearchResults> {
  const results: SearchResults = {
    exactMatches: [],
    semanticMatches: [],
    entityMatches: [],
  };

  // Get all personalization chunks
  const allChunks = await getAllChunks(personalizationDB);

  // A) EXACT TEXT SEARCH
  // Fast, local, catches specific names/terms
  const searchTerms = [
    ...keywords.entities,
    ...keywords.concepts,
    ...keywords.relational,
  ];

  for (const term of searchTerms) {
    if (!term) continue;

    const lowerTerm = term.toLowerCase();
    const matches = allChunks.filter(chunk =>
      chunk.content.toLowerCase().includes(lowerTerm)
    );

    results.exactMatches.push(...matches);
  }

  // Deduplicate exact matches
  results.exactMatches = Array.from(
    new Map(results.exactMatches.map(chunk => [chunk.id, chunk])).values()
  );

  // B) SEMANTIC SEARCH
  // Uses embeddings to find conceptually related chunks
  if (queryEmbedding && keywords.concepts?.length > 0) {
    for (const chunk of allChunks) {
      if (!chunk.embedding) continue;

      const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);

      // Threshold for semantic relevance
      if (similarity > 0.7) {
        results.semanticMatches.push({ chunk, similarity });
      }
    }

    // Sort by similarity (highest first)
    results.semanticMatches.sort((a, b) => b.similarity - a.similarity);
  }

  // C) ENTITY INDEX SEARCH
  // Uses pre-built entity index for instant lookup
  for (const entityName of keywords.entities || []) {
    const normalized = entityName.toLowerCase().trim();
    const entity = entityIndex[normalized];

    if (entity) {
      // Get chunks for this entity
      const entityChunks = allChunks.filter(chunk =>
        entity.chunkIds.includes(chunk.id)
      );

      results.entityMatches.push({
        entity: entityName,
        chunks: entityChunks,
        context: entity.context || '',
      });
    }
  }

  return results;
}

/**
 * Rank search results based on intent and search method
 */
export function rankResults(
  searchResults: SearchResults,
  intent: IntentType,
  keywords: ExtractedKeywords
): ScoredChunk[] {
  const scoredChunks: ScoredChunk[] = [];
  const seenChunkIds = new Set<string>();

  // Score exact matches (highest priority for FACTUAL intent)
  for (const chunk of searchResults.exactMatches) {
    if (seenChunkIds.has(chunk.id)) continue;
    seenChunkIds.add(chunk.id);

    let score = 10; // Base score for exact match

    // Intent-based bonuses
    if (intent === 'FACTUAL') score += 5;
    if (intent === 'RELATIONAL') score += 2;

    scoredChunks.push({ chunk, score, source: 'exact' });
  }

  // Score semantic matches (highest priority for CONCEPTUAL/NARRATIVE intent)
  for (const { chunk, similarity } of searchResults.semanticMatches) {
    if (seenChunkIds.has(chunk.id)) continue;
    seenChunkIds.add(chunk.id);

    let score = similarity * 10; // 0-10 based on similarity

    // Intent-based bonuses
    if (intent === 'CONCEPTUAL') score += 3;
    if (intent === 'NARRATIVE') score += 2;
    if (intent === 'EMOTIONAL') score += 2;

    scoredChunks.push({ chunk, score, source: 'semantic' });
  }

  // Score entity matches (highest priority for RELATIONAL/FACTUAL intent)
  for (const entityMatch of searchResults.entityMatches) {
    for (const chunk of entityMatch.chunks) {
      if (seenChunkIds.has(chunk.id)) continue;
      seenChunkIds.add(chunk.id);

      let score = 8; // Base score for entity match

      // Intent-based bonuses
      if (intent === 'RELATIONAL') score += 5;
      if (intent === 'FACTUAL') score += 3;
      if (intent === 'EMOTIONAL') score += 2;

      scoredChunks.push({ chunk, score, source: 'entity' });
    }
  }

  // Sort by score (highest first)
  scoredChunks.sort((a, b) => b.score - a.score);

  return scoredChunks;
}

/**
 * Assemble context from ranked chunks with token budgeting
 */
export interface AssembledContext {
  core: string | null;
  relevant: Array<{ content: string; score: number; source: string }>;
  totalTokens: number;
}

export async function assembleContext(
  rankedChunks: ScoredChunk[],
  intent: IntentType,
  personalizationDB: IDBDatabase,
  tokenBudget: number = 4000
): Promise<AssembledContext> {
  const context: AssembledContext = {
    core: null,
    relevant: [],
    totalTokens: 0,
  };

  // Always load core identity (unless TASK intent)
  if (intent !== 'TASK') {
    const coreChunk = await getCoreChunk(personalizationDB);
    if (coreChunk) {
      context.core = coreChunk.content;
      context.totalTokens += estimateTokens(coreChunk.content);
    }
  }

  // Load ranked chunks until budget exhausted
  for (const { chunk, score, source } of rankedChunks) {
    const chunkTokens = estimateTokens(chunk.content);

    if (context.totalTokens + chunkTokens > tokenBudget) {
      console.log(`[HybridSearcher] Budget exhausted at ${context.totalTokens} tokens`);
      break; // Budget exhausted
    }

    context.relevant.push({
      content: chunk.content,
      score: score,
      source: source,
    });
    context.totalTokens += chunkTokens;
  }

  // For NARRATIVE intent, ensure chunks are in logical order
  if (intent === 'NARRATIVE' && context.relevant.length > 0) {
    // Get full chunks to access index
    const chunksWithIndex = rankedChunks
      .filter(rc => context.relevant.some(r => r.content === rc.chunk.content))
      .map(rc => rc.chunk)
      .filter(c => c.index !== undefined)
      .sort((a, b) => (a.index || 0) - (b.index || 0));

    // Rebuild relevant array in sequence order
    context.relevant = chunksWithIndex.map(chunk => {
      const scoredChunk = rankedChunks.find(rc => rc.chunk.id === chunk.id);
      return {
        content: chunk.content,
        score: scoredChunk?.score || 0,
        source: scoredChunk?.source || 'unknown',
      };
    });
  }

  console.log(`[HybridSearcher] Loaded ${context.relevant.length} chunks, ${context.totalTokens} tokens`);

  return context;
}

/**
 * Build system prompt from assembled context
 */
export function buildSystemPrompt(context: AssembledContext, entityFacts: string): string {
  let prompt = '';

  // Add entity facts first (instant factual knowledge)
  if (entityFacts) {
    prompt += entityFacts;
  }

  // Add core identity
  if (context.core) {
    prompt += `=== USER IDENTITY ===\n${context.core}\n\n`;
  }

  // Add relevant context
  if (context.relevant.length > 0) {
    prompt += `=== RELEVANT CONTEXT ===\n`;
    for (const item of context.relevant) {
      prompt += `${item.content}\n\n`;
    }
  }

  return prompt;
}

// HELPER FUNCTIONS

async function getAllChunks(db: IDBDatabase): Promise<PersonalizationChunk[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['personalization'], 'readonly');
    const store = transaction.objectStore('personalization');
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

async function getCoreChunk(db: IDBDatabase): Promise<PersonalizationChunk | null> {
  const chunks = await getAllChunks(db);
  return chunks.find(chunk => chunk.section === 'core') || null;
}

function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token on average
  return Math.ceil(text.length / 4);
}

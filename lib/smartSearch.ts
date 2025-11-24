/**
 * Smart Search System - Main Orchestrator
 * AI-powered keyword extraction + semantic search + smart summarization
 * Uses cheap models for background processing
 * Now with 3-tier semantic caching for 70-80% cache hit rate
 */

import { classifyIntent, type IntentType } from './intentClassifier';
import { extractSmartKeywords, type ExtractedKeywords } from './keywordExtractor';
import { lookupEntityFacts, formatEntityFactsForPrompt, type EntityIndex } from './entityIndexer';
import { getEmbedding } from './embeddingService';
import {
  hybridSearch,
  rankResults,
  assembleContext,
  buildSystemPrompt,
  type SearchResults,
  type ScoredChunk,
} from './hybridSearcher';
import { memoryStorage } from './memoryStorage';
import { semanticCache } from './cache/semanticCache';

/**
 * Cache invalidation helpers
 * Call these when memories or entities are updated
 */
export async function invalidateCacheForEntity(entityName: string): Promise<void> {
  try {
    await semanticCache.invalidateByEntity(entityName);
    console.log(`[SmartSearch] Invalidated cache for entity: ${entityName}`);
  } catch (error) {
    console.error('[SmartSearch] Error invalidating cache:', error);
  }
}

export async function invalidateCacheForChunk(chunkId: string): Promise<void> {
  try {
    await semanticCache.invalidateByChunk(chunkId);
    console.log(`[SmartSearch] Invalidated cache for chunk: ${chunkId}`);
  } catch (error) {
    console.error('[SmartSearch] Error invalidating cache:', error);
  }
}

export async function invalidateAllCache(): Promise<void> {
  try {
    await semanticCache.invalidateAll();
    console.log('[SmartSearch] Invalidated all cache');
  } catch (error) {
    console.error('[SmartSearch] Error invalidating cache:', error);
  }
}

export interface SmartSearchResult {
  systemPrompt: string;
  intent: IntentType;
  keywords: ExtractedKeywords;
  entityFacts: Record<string, any>;
  totalChunks: number;
  totalTokens: number;
  fromCache?: boolean;
  cacheTier?: number;
  debug: {
    intentClassification: string;
    keywordsExtracted: ExtractedKeywords;
    entityFactsFound: string[];
    searchResults: {
      exactMatches: number;
      semanticMatches: number;
      entityMatches: number;
    };
    rankedChunks: number;
    budgetUsed: number;
  };
}

/**
 * Process user message with smart search system
 * This is the main entry point called on every message
 * NOW WITH SEMANTIC CACHING (70-80% hit rate expected)
 */
export async function processMessageWithSmartSearch(
  userMessage: string,
  userId: string,
  apiKeys: {
    openrouter?: string;
    openai?: string;
  }
): Promise<SmartSearchResult> {
  console.log('[SmartSearch] Processing message:', userMessage.substring(0, 50) + '...');

  try {
    // Initialize systems
    await memoryStorage.init();
    if (!semanticCache.initialized) {
      await semanticCache.initialize();
    }

    // EARLY STEP: Generate query embedding for cache lookup (if OpenAI available)
    let queryEmbedding: number[] | null = null;
    if (apiKeys.openai) {
      try {
        queryEmbedding = await getEmbedding(userMessage, apiKeys.openai);
        console.log('[SmartSearch] Query embedding generated for cache lookup');
      } catch (error) {
        console.warn('[SmartSearch] Failed to generate embedding for cache:', error);
      }
    }

    // CACHE CHECK FIRST
    const cacheResult = await semanticCache.lookup(userMessage, queryEmbedding || undefined);

    if (cacheResult.hit && cacheResult.entry) {
      console.log(`[SmartSearch] ✅ CACHE HIT! Tier ${cacheResult.tier} - Returning cached result`);

      // Return cached result with minimal processing
      return {
        systemPrompt: cacheResult.entry.results.systemPrompt,
        intent: cacheResult.entry.intent,
        keywords: { entities: [], concepts: [], temporal: [], relational: [], emotional: [] },
        entityFacts: {},
        totalChunks: cacheResult.entry.results.chunks?.length || 0,
        totalTokens: Math.ceil(cacheResult.entry.results.systemPrompt.length / 4),
        fromCache: true,
        cacheTier: cacheResult.tier,
        debug: {
          intentClassification: cacheResult.entry.intent,
          keywordsExtracted: { entities: [], concepts: [], temporal: [], relational: [], emotional: [] },
          entityFactsFound: [],
          searchResults: {
            exactMatches: 0,
            semanticMatches: 0,
            entityMatches: 0,
          },
          rankedChunks: 0,
          budgetUsed: 0,
        },
      };
    }

    console.log('[SmartSearch] ❌ Cache miss - Running full search pipeline');

    // STEP 1: Classify Intent (free Gemini)
    const intent = apiKeys.openrouter
      ? await classifyIntent(userMessage, apiKeys.openrouter)
      : 'CONCEPTUAL'; // Fallback

    console.log('[SmartSearch] Intent:', intent);

    // STEP 2: Extract Smart Keywords (free Gemini)
    const keywords = apiKeys.openrouter
      ? await extractSmartKeywords(userMessage, intent, apiKeys.openrouter)
      : { entities: [], concepts: [], temporal: [], relational: [], emotional: [] };

    console.log('[SmartSearch] Keywords:', keywords);

    // STEP 3: Load Entity Index
    const entityIndex: EntityIndex = await memoryStorage.getEntityIndex();
    console.log('[SmartSearch] Entity index loaded:', Object.keys(entityIndex).length, 'entities');

    // STEP 4: Look up Entity Facts (instant factual knowledge)
    const entityFacts = lookupEntityFacts(keywords.entities, entityIndex);
    console.log('[SmartSearch] Entity facts found:', Object.keys(entityFacts));

    // STEP 5: Generate/Refine Query Embedding (for semantic search)
    // If we don't have embedding yet (no OpenAI earlier), or need concept-specific embedding
    if (!queryEmbedding && keywords.concepts.length > 0 && apiKeys.openai) {
      const conceptText = keywords.concepts.join(' ');
      queryEmbedding = await getEmbedding(conceptText, apiKeys.openai);
      console.log('[SmartSearch] Query embedding generated for search');
    }

    // STEP 6: Hybrid Search
    const db = memoryStorage.getDatabase();
    if (!db) {
      throw new Error('Database not initialized');
    }

    const searchResults: SearchResults = await hybridSearch(
      keywords,
      intent,
      queryEmbedding,
      db,
      entityIndex
    );

    console.log('[SmartSearch] Search results:', {
      exactMatches: searchResults.exactMatches.length,
      semanticMatches: searchResults.semanticMatches.length,
      entityMatches: searchResults.entityMatches.length,
    });

    // STEP 7: Rank Results
    const rankedChunks: ScoredChunk[] = rankResults(searchResults, intent, keywords);
    console.log('[SmartSearch] Ranked chunks:', rankedChunks.length);

    // STEP 8: Assemble Context
    const context = await assembleContext(rankedChunks, intent, db, 4000);
    console.log('[SmartSearch] Context assembled:', {
      coreLoaded: !!context.core,
      relevantChunks: context.relevant.length,
      totalTokens: context.totalTokens,
    });

    // STEP 9: Build System Prompt
    const entityFactsPrompt = formatEntityFactsForPrompt(entityFacts);
    const systemPrompt = buildSystemPrompt(context, entityFactsPrompt);

    console.log('[SmartSearch] System prompt built:', systemPrompt.length, 'characters');

    // STEP 10: Cache the results for future use
    if (queryEmbedding) {
      try {
        await semanticCache.store(
          userMessage,
          queryEmbedding,
          intent,
          {
            systemPrompt,
            chunks: rankedChunks.map(rc => ({ id: rc.chunk.id, score: rc.score, source: rc.source })),
            entities: searchResults.entityMatches.map(em => ({ entity: em.entity, context: em.context })),
          },
          0.9 // confidence score - can be made dynamic based on search quality
        );
        console.log('[SmartSearch] ✅ Results cached for future use');
      } catch (cacheError) {
        console.error('[SmartSearch] Failed to cache results:', cacheError);
        // Don't fail the request if caching fails
      }
    } else {
      console.log('[SmartSearch] ⚠️ Skipping cache (no embedding available)');
    }

    // Return complete result with debug info
    return {
      systemPrompt,
      intent,
      keywords,
      entityFacts,
      totalChunks: context.relevant.length,
      totalTokens: context.totalTokens,
      fromCache: false,
      debug: {
        intentClassification: intent,
        keywordsExtracted: keywords,
        entityFactsFound: Object.keys(entityFacts),
        searchResults: {
          exactMatches: searchResults.exactMatches.length,
          semanticMatches: searchResults.semanticMatches.length,
          entityMatches: searchResults.entityMatches.length,
        },
        rankedChunks: rankedChunks.length,
        budgetUsed: context.totalTokens,
      },
    };
  } catch (error) {
    console.error('[SmartSearch] Error:', error);

    // Return empty result on error
    return {
      systemPrompt: '',
      intent: 'CONCEPTUAL',
      keywords: { entities: [], concepts: [], temporal: [], relational: [], emotional: [] },
      entityFacts: {},
      totalChunks: 0,
      totalTokens: 0,
      fromCache: false,
      debug: {
        intentClassification: 'ERROR',
        keywordsExtracted: { entities: [], concepts: [], temporal: [], relational: [], emotional: [] },
        entityFactsFound: [],
        searchResults: {
          exactMatches: 0,
          semanticMatches: 0,
          entityMatches: 0,
        },
        rankedChunks: 0,
        budgetUsed: 0,
      },
    };
  }
}

/**
 * Check if smart search is enabled (has necessary data)
 */
export async function isSmartSearchEnabled(userId: string): Promise<boolean> {
  try {
    await memoryStorage.init();

    const chunks = await memoryStorage.getAllPersonalizationChunks(userId);
    const entityIndex = await memoryStorage.getEntityIndex();

    const hasChunks = chunks.length > 0;
    const hasEntities = Object.keys(entityIndex).length > 0;

    console.log('[SmartSearch] Status:', {
      hasChunks,
      chunkCount: chunks.length,
      hasEntities,
      entityCount: Object.keys(entityIndex).length,
    });

    return hasChunks || hasEntities;
  } catch (error) {
    console.error('[SmartSearch] Error checking status:', error);
    return false;
  }
}

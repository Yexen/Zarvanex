/**
 * Smart Search System - Main Orchestrator
 * AI-powered keyword extraction + semantic search + smart summarization
 * Uses cheap models for background processing
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

export interface SmartSearchResult {
  systemPrompt: string;
  intent: IntentType;
  keywords: ExtractedKeywords;
  entityFacts: Record<string, any>;
  totalChunks: number;
  totalTokens: number;
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
    // Initialize memory storage
    await memoryStorage.init();

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

    // STEP 5: Generate Query Embedding (for semantic search)
    let queryEmbedding: number[] | null = null;
    if (keywords.concepts.length > 0 && apiKeys.openai) {
      const conceptText = keywords.concepts.join(' ');
      queryEmbedding = await getEmbedding(conceptText, apiKeys.openai);
      console.log('[SmartSearch] Query embedding generated');
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

    // Return complete result with debug info
    return {
      systemPrompt,
      intent,
      keywords,
      entityFacts,
      totalChunks: context.relevant.length,
      totalTokens: context.totalTokens,
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

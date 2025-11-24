/**
 * Smart Hard Memory Search - Works with existing Supabase memories
 * Applies smart search techniques to existing hard memory system
 */

import { classifyIntent, type IntentType } from './intentClassifier';
import { extractSmartKeywords, type ExtractedKeywords } from './keywordExtractor';
import { hardMemorySupabase } from './hardMemorySupabase';
import type { Memory } from '@/types/memory';

export interface SmartHardMemoryResult {
  memories: Memory[];
  intent: IntentType;
  keywords: ExtractedKeywords;
  totalMatches: number;
  debug: {
    intentClassification: string;
    keywordsExtracted: ExtractedKeywords;
    searchResults: {
      exactMatches: number;
      entityMatches: number;
      conceptMatches: number;
    };
  };
}

/**
 * Perform smart search on existing Supabase hard memories
 */
export async function smartHardMemorySearch(
  userMessage: string,
  userId: string,
  apiKeys: {
    openrouter?: string;
  }
): Promise<SmartHardMemoryResult> {
  console.log('[SmartHardMemory] Processing query:', userMessage);

  try {
    // STEP 1: Classify Intent
    const intent = apiKeys.openrouter
      ? await classifyIntent(userMessage, apiKeys.openrouter)
      : 'CONCEPTUAL';

    console.log('[SmartHardMemory] Intent:', intent);

    // STEP 2: Extract Keywords
    const keywords = apiKeys.openrouter
      ? await extractSmartKeywords(userMessage, intent, apiKeys.openrouter)
      : fallbackKeywordExtraction(userMessage);

    console.log('[SmartHardMemory] Keywords:', keywords);

    // STEP 3: Get all memories from Supabase
    const allMemories = await hardMemorySupabase.getAllMemories(userId);
    console.log('[SmartHardMemory] Total memories:', allMemories.length);

    if (allMemories.length === 0) {
      return {
        memories: [],
        intent,
        keywords,
        totalMatches: 0,
        debug: {
          intentClassification: intent,
          keywordsExtracted: keywords,
          searchResults: { exactMatches: 0, entityMatches: 0, conceptMatches: 0 },
        },
      };
    }

    // STEP 4: Hybrid Search on memories
    const searchResults = performHybridSearch(allMemories, keywords, intent, userMessage);

    console.log('[SmartHardMemory] Search results:', {
      exactMatches: searchResults.exactMatches.length,
      entityMatches: searchResults.entityMatches.length,
      conceptMatches: searchResults.conceptMatches.length,
    });

    // STEP 5: Rank and deduplicate
    const rankedMemories = rankMemories(searchResults, intent);

    console.log('[SmartHardMemory] Ranked memories:', rankedMemories.length);

    // Return top results (limit based on intent)
    const limit = intent === 'FACTUAL' ? 3 : intent === 'NARRATIVE' ? 5 : 4;
    const topMemories = rankedMemories.slice(0, limit);

    return {
      memories: topMemories,
      intent,
      keywords,
      totalMatches: rankedMemories.length,
      debug: {
        intentClassification: intent,
        keywordsExtracted: keywords,
        searchResults: {
          exactMatches: searchResults.exactMatches.length,
          entityMatches: searchResults.entityMatches.length,
          conceptMatches: searchResults.conceptMatches.length,
        },
      },
    };
  } catch (error) {
    console.error('[SmartHardMemory] Error:', error);

    // Return empty result on error
    return {
      memories: [],
      intent: 'CONCEPTUAL',
      keywords: { entities: [], concepts: [], temporal: [], relational: [], emotional: [] },
      totalMatches: 0,
      debug: {
        intentClassification: 'ERROR',
        keywordsExtracted: { entities: [], concepts: [], temporal: [], relational: [], emotional: [] },
        searchResults: { exactMatches: 0, entityMatches: 0, conceptMatches: 0 },
      },
    };
  }
}

/**
 * Fallback keyword extraction without AI
 */
function fallbackKeywordExtraction(message: string): ExtractedKeywords {
  const keywords: ExtractedKeywords = {
    entities: [],
    concepts: [],
    temporal: [],
    relational: [],
    emotional: [],
  };

  // Extract capitalized words as entities
  const capitalizedWords = message.match(/\b[A-Z][a-z]+\b/g) || [];
  keywords.entities = [...new Set(capitalizedWords)];

  // Extract temporal keywords
  const temporalPatterns = /\b(today|yesterday|tomorrow|recently|lately|when|during)\b/gi;
  const temporalMatches = message.match(temporalPatterns);
  if (temporalMatches) {
    keywords.temporal = [...new Set(temporalMatches.map(m => m.toLowerCase()))];
  }

  // Extract relational keywords
  const relationalPatterns = /\b(my|partner|friend|family|cat|dog|pet)\b/gi;
  const relationalMatches = message.match(relationalPatterns);
  if (relationalMatches) {
    keywords.relational = [...new Set(relationalMatches.map(m => m.toLowerCase()))];
  }

  return keywords;
}

/**
 * Perform hybrid search on memories
 */
interface SearchResults {
  exactMatches: Array<{ memory: Memory; score: number }>;
  entityMatches: Array<{ memory: Memory; score: number }>;
  conceptMatches: Array<{ memory: Memory; score: number }>;
}

function performHybridSearch(
  memories: Memory[],
  keywords: ExtractedKeywords,
  intent: IntentType,
  originalQuery: string
): SearchResults {
  const results: SearchResults = {
    exactMatches: [],
    entityMatches: [],
    conceptMatches: [],
  };

  const queryLower = originalQuery.toLowerCase();

  for (const memory of memories) {
    const titleContent = (memory.title + ' ' + memory.content).toLowerCase();
    const titleContentOriginal = memory.title + ' ' + memory.content;

    // EXACT MATCH: Query appears in title/content
    if (titleContent.includes(queryLower)) {
      results.exactMatches.push({ memory, score: 10 });
      continue;
    }

    // ENTITY MATCH: Entity tags or entity mentions
    let entityScore = 0;
    for (const entity of keywords.entities) {
      const entityTag = `entity:${entity.toLowerCase()}`;
      if (memory.tags.includes(entityTag)) {
        entityScore += 5;
      }
      if (titleContentOriginal.includes(entity)) {
        entityScore += 3;
      }
    }
    if (entityScore > 0) {
      results.entityMatches.push({ memory, score: entityScore });
      continue;
    }

    // CONCEPT MATCH: Keywords in content
    let conceptScore = 0;
    for (const concept of keywords.concepts) {
      if (titleContent.includes(concept.toLowerCase())) {
        conceptScore += 2;
      }
    }
    for (const relational of keywords.relational) {
      if (titleContent.includes(relational)) {
        conceptScore += 2;
      }
    }
    if (conceptScore > 0) {
      results.conceptMatches.push({ memory, score: conceptScore });
    }
  }

  return results;
}

/**
 * Rank memories based on search type and intent
 */
function rankMemories(searchResults: SearchResults, intent: IntentType): Memory[] {
  const scored: Array<{ memory: Memory; totalScore: number }> = [];
  const seenIds = new Set<string>();

  // Helper to add memory with score
  const addMemory = (memory: Memory, baseScore: number, multiplier: number) => {
    if (seenIds.has(memory.id)) return;
    seenIds.add(memory.id);
    scored.push({ memory, totalScore: baseScore * multiplier });
  };

  // Intent-based multipliers
  const intentMultipliers = {
    FACTUAL: { exact: 1.5, entity: 1.3, concept: 0.8 },
    NARRATIVE: { exact: 1.2, entity: 1.0, concept: 1.2 },
    CONCEPTUAL: { exact: 1.0, entity: 0.9, concept: 1.4 },
    RELATIONAL: { exact: 1.1, entity: 1.5, concept: 1.0 },
    EMOTIONAL: { exact: 1.0, entity: 1.1, concept: 1.3 },
    TASK: { exact: 1.0, entity: 0.8, concept: 1.0 },
  };

  const multipliers = intentMultipliers[intent];

  // Add exact matches (highest priority)
  for (const { memory, score } of searchResults.exactMatches) {
    addMemory(memory, score, multipliers.exact);
  }

  // Add entity matches
  for (const { memory, score } of searchResults.entityMatches) {
    addMemory(memory, score, multipliers.entity);
  }

  // Add concept matches
  for (const { memory, score } of searchResults.conceptMatches) {
    addMemory(memory, score, multipliers.concept);
  }

  // Sort by score
  scored.sort((a, b) => b.totalScore - a.totalScore);

  return scored.map(s => s.memory);
}

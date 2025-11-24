/**
 * Personalization Indexing Utility
 * Indexes user personalization data for smart search
 */

import { buildEntityIndex, type EntityIndex } from './entityIndexer';
import { getBatchEmbeddings } from './embeddingService';
import { memoryStorage } from './memoryStorage';
import type { PersonalizationChunk } from './hybridSearcher';

interface IndexingProgress {
  stage: 'splitting' | 'entities' | 'embeddings' | 'storing';
  current: number;
  total: number;
  message: string;
}

/**
 * Index personalization text for smart search
 * This is a one-time operation when user sets up personalization
 */
export async function indexPersonalizationText(
  fullText: string,
  userId: string,
  apiKeys: {
    openrouter?: string;
    openai?: string;
  },
  onProgress?: (progress: IndexingProgress) => void
): Promise<{ chunksCreated: number; entitiesExtracted: number }> {
  console.log('[PersonalizationIndexer] Starting indexing...');

  try {
    // Initialize storage
    await memoryStorage.init();

    // Clear existing data
    await memoryStorage.clearPersonalizationChunks(userId);
    await memoryStorage.clearEntityIndex();

    // STEP 1: Split into chunks
    onProgress?.({
      stage: 'splitting',
      current: 0,
      total: 1,
      message: 'Splitting text into chunks...',
    });

    const chunks = splitIntoChunks(fullText);
    console.log(`[PersonalizationIndexer] Created ${chunks.length} chunks`);

    // STEP 2: Build Entity Index
    if (!apiKeys.openrouter) {
      throw new Error('OpenRouter API key required for entity extraction');
    }

    onProgress?.({
      stage: 'entities',
      current: 0,
      total: chunks.length,
      message: 'Extracting entities...',
    });

    const entityIndex: EntityIndex = await buildEntityIndex(fullText, apiKeys.openrouter);
    console.log(`[PersonalizationIndexer] Extracted ${Object.keys(entityIndex).length} entities`);

    // Store entity index
    for (const [name, entity] of Object.entries(entityIndex)) {
      await memoryStorage.saveEntityToIndex(entity);
    }

    // STEP 3: Extract entities for each chunk
    const chunksWithEntities: PersonalizationChunk[] = chunks.map((chunk, index) => {
      // Find entities mentioned in this chunk
      const chunkEntities: string[] = [];
      for (const [name, entity] of Object.entries(entityIndex)) {
        if (chunk.content.toLowerCase().includes(name.toLowerCase())) {
          chunkEntities.push(name);
          // Add chunk ID to entity's chunk list
          if (!entity.chunkIds.includes(chunk.id)) {
            entity.chunkIds.push(chunk.id);
          }
        }
      }

      return {
        ...chunk,
        entities: chunkEntities,
      };
    });

    // Update entity index with chunk IDs
    for (const [name, entity] of Object.entries(entityIndex)) {
      await memoryStorage.saveEntityToIndex(entity);
    }

    // STEP 4: Generate Embeddings (optional, requires OpenAI API key)
    if (apiKeys.openai) {
      onProgress?.({
        stage: 'embeddings',
        current: 0,
        total: chunks.length,
        message: 'Generating embeddings for semantic search...',
      });

      const chunkTexts = chunksWithEntities.map(c => c.content);
      const embeddings = await getBatchEmbeddings(chunkTexts, apiKeys.openai);

      // Add embeddings to chunks
      for (let i = 0; i < chunksWithEntities.length; i++) {
        chunksWithEntities[i].embedding = embeddings[i];
      }

      console.log('[PersonalizationIndexer] Generated embeddings for all chunks');
    } else {
      console.log('[PersonalizationIndexer] Skipping embeddings (no OpenAI API key)');
    }

    // STEP 5: Store Chunks
    onProgress?.({
      stage: 'storing',
      current: 0,
      total: chunks.length,
      message: 'Storing chunks...',
    });

    for (let i = 0; i < chunksWithEntities.length; i++) {
      await memoryStorage.savePersonalizationChunk(chunksWithEntities[i]);

      onProgress?.({
        stage: 'storing',
        current: i + 1,
        total: chunks.length,
        message: `Storing chunk ${i + 1}/${chunks.length}...`,
      });
    }

    console.log('[PersonalizationIndexer] Indexing complete!');

    return {
      chunksCreated: chunksWithEntities.length,
      entitiesExtracted: Object.keys(entityIndex).length,
    };
  } catch (error) {
    console.error('[PersonalizationIndexer] Error:', error);
    throw error;
  }
}

/**
 * Split text into manageable chunks
 */
function splitIntoChunks(text: string): PersonalizationChunk[] {
  const chunks: PersonalizationChunk[] = [];

  // Split by sections (double newline)
  const sections = text.split('\n\n').filter(s => s.trim().length > 0);

  // Identify core section (first section or section with "core" in it)
  let coreIndex = 0;
  for (let i = 0; i < sections.length; i++) {
    if (sections[i].toLowerCase().includes('core') ||
        sections[i].toLowerCase().includes('identity') ||
        i === 0) {
      coreIndex = i;
      break;
    }
  }

  for (let i = 0; i < sections.length; i++) {
    const content = sections[i].trim();
    if (content.length < 50) continue; // Skip very short sections

    chunks.push({
      id: generateChunkId(),
      content: content,
      entities: [],
      section: i === coreIndex ? 'core' : undefined,
      index: i,
      userId: '', // Will be set by caller
      createdAt: new Date(),
    });
  }

  // If chunks are too large, split further
  const maxChunkSize = 1500; // ~1500 chars per chunk
  const finalChunks: PersonalizationChunk[] = [];

  for (const chunk of chunks) {
    if (chunk.content.length <= maxChunkSize) {
      finalChunks.push(chunk);
    } else {
      // Split large chunk by sentences
      const sentences = chunk.content.split('. ');
      let currentChunk = '';
      let chunkIndex = 0;

      for (const sentence of sentences) {
        if (currentChunk.length + sentence.length > maxChunkSize) {
          if (currentChunk) {
            finalChunks.push({
              ...chunk,
              id: generateChunkId(),
              content: currentChunk.trim(),
              index: chunk.index !== undefined ? chunk.index + chunkIndex : undefined,
            });
            chunkIndex++;
          }
          currentChunk = sentence + '. ';
        } else {
          currentChunk += sentence + '. ';
        }
      }

      if (currentChunk) {
        finalChunks.push({
          ...chunk,
          id: generateChunkId(),
          content: currentChunk.trim(),
          index: chunk.index !== undefined ? chunk.index + chunkIndex : undefined,
        });
      }
    }
  }

  return finalChunks;
}

/**
 * Generate unique chunk ID
 */
function generateChunkId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Get indexing status
 */
export async function getIndexingStatus(userId: string): Promise<{
  isIndexed: boolean;
  chunkCount: number;
  entityCount: number;
  hasEmbeddings: boolean;
}> {
  try {
    await memoryStorage.init();

    const chunks = await memoryStorage.getAllPersonalizationChunks(userId);
    const entityIndex = await memoryStorage.getEntityIndex();

    const hasEmbeddings = chunks.some(chunk => chunk.embedding && chunk.embedding.length > 0);

    return {
      isIndexed: chunks.length > 0,
      chunkCount: chunks.length,
      entityCount: Object.keys(entityIndex).length,
      hasEmbeddings,
    };
  } catch (error) {
    console.error('[PersonalizationIndexer] Error getting status:', error);
    return {
      isIndexed: false,
      chunkCount: 0,
      entityCount: 0,
      hasEmbeddings: false,
    };
  }
}

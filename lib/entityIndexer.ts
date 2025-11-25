/**
 * Entity Index Builder using Gemini
 * Builds fast lookup table for instant factual answers
 */

export type EntityType =
  | 'PERSON'
  | 'ANIMAL'
  | 'PLACE'
  | 'BRAND'
  | 'PRODUCT'
  | 'ORG'
  | 'CONCEPT'
  | 'EVENT';

export interface EntityFacts {
  [key: string]: string;
}

export interface Entity {
  name: string;
  type: EntityType;
  facts: EntityFacts;
  chunkIds: string[];
  context?: string; // Brief context snippet
}

export interface EntityIndex {
  [entityName: string]: Entity;
}

/**
 * Build entity index from personalization text using Gemini
 */
export async function buildEntityIndex(
  fullText: string,
  apiKey: string
): Promise<EntityIndex> {
  // Split into manageable chunks if text is very long
  const maxChunkSize = 15000; // ~15k chars per request
  const textChunks = splitTextIntoChunks(fullText, maxChunkSize);

  let allEntities: EntityIndex = {};

  for (let i = 0; i < textChunks.length; i++) {
    console.log(`[EntityIndexer] Processing chunk ${i + 1}/${textChunks.length}`);

    const prompt = `Extract all named entities from this text and their key facts.

TEXT:
${textChunks[i]}

Return JSON format:
{
  "entity_name_lowercase": {
    "type": "PERSON|ANIMAL|PLACE|BRAND|PRODUCT|ORG|CONCEPT|EVENT",
    "facts": {
      "key": "value",
      ...
    }
  }
}

Include: names, places, brands, products, pets, important concepts, events.
Be thorough. Extract ALL entities mentioned.
Return ONLY valid JSON, nothing else.`;

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://zurvanex.app',
          'X-Title': 'Zurvanex',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.0-flash-exp:free',
          messages: [
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.3,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        console.error('[EntityIndexer] API request failed:', response.statusText);
        continue;
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content?.trim() || '{}';

      // Parse JSON response
      try {
        const entities = JSON.parse(content);

        // Merge with existing entities
        for (const [name, entityData] of Object.entries(entities)) {
          const typedData = entityData as { type: EntityType; facts: EntityFacts };

          if (allEntities[name]) {
            // Merge facts if entity already exists
            allEntities[name].facts = {
              ...allEntities[name].facts,
              ...typedData.facts,
            };
          } else {
            // Add new entity
            allEntities[name] = {
              name: name,
              type: typedData.type,
              facts: typedData.facts,
              chunkIds: [],
            };
          }
        }

        console.log(`[EntityIndexer] Extracted ${Object.keys(entities).length} entities from chunk ${i + 1}`);
      } catch (parseError) {
        console.error('[EntityIndexer] Error parsing JSON:', parseError, 'Content:', content);
      }
    } catch (error) {
      console.error('[EntityIndexer] Error processing chunk:', error);
    }

    // Rate limiting: wait 1 second between requests to be nice to the API
    if (i < textChunks.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  console.log(`[EntityIndexer] Total entities extracted: ${Object.keys(allEntities).length}`);
  return allEntities;
}

/**
 * Split text into chunks for processing
 */
function splitTextIntoChunks(text: string, maxSize: number): string[] {
  const chunks: string[] = [];
  const paragraphs = text.split('\n\n');

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    if (currentChunk.length + paragraph.length > maxSize) {
      if (currentChunk) {
        chunks.push(currentChunk);
        currentChunk = '';
      }

      // If single paragraph is too large, split it
      if (paragraph.length > maxSize) {
        const sentences = paragraph.split('. ');
        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > maxSize) {
            if (currentChunk) {
              chunks.push(currentChunk);
              currentChunk = '';
            }
          }
          currentChunk += sentence + '. ';
        }
      } else {
        currentChunk = paragraph + '\n\n';
      }
    } else {
      currentChunk += paragraph + '\n\n';
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk);
  }

  return chunks;
}

/**
 * Look up entity facts instantly from index
 */
export function lookupEntityFacts(
  entities: string[],
  entityIndex: EntityIndex
): Record<string, Entity> {
  const results: Record<string, Entity> = {};

  for (const entityName of entities) {
    const normalized = entityName.toLowerCase().trim();

    // Check exact match
    if (entityIndex[normalized]) {
      results[normalized] = entityIndex[normalized];
      continue;
    }

    // Check partial match (e.g., "cat" matches "lilou" if lilou is type ANIMAL)
    for (const [indexedName, entity] of Object.entries(entityIndex)) {
      if (
        indexedName.includes(normalized) ||
        normalized.includes(indexedName) ||
        entity.name === entityName
      ) {
        results[indexedName] = entity;
        break;
      }
    }
  }

  return results;
}

/**
 * Format entity facts for system prompt
 */
export function formatEntityFactsForPrompt(entityFacts: Record<string, Entity>): string {
  if (Object.keys(entityFacts).length === 0) {
    return '';
  }

  let prompt = '=== INSTANT FACTS ===\n';

  for (const [name, entity] of Object.entries(entityFacts)) {
    prompt += `\n**${entity.name}** (${entity.type}):\n`;

    for (const [key, value] of Object.entries(entity.facts)) {
      prompt += `  - ${key}: ${value}\n`;
    }
  }

  prompt += '\n';

  return prompt;
}

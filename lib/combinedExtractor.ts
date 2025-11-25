/**
 * Combined Intent + Keyword Extraction
 * Single API call to reduce latency from 2 calls → 1 call
 * Saves ~500ms per query
 */

import type { IntentType } from './intentClassifier';
import type { ExtractedKeywords } from './keywordExtractor';

export interface CombinedExtractionResult {
  intent: IntentType;
  keywords: ExtractedKeywords;
}

/**
 * Extract both intent and keywords in a single API call
 * This is 2x faster than calling them separately
 */
export async function extractIntentAndKeywords(
  message: string,
  apiKey: string
): Promise<CombinedExtractionResult> {
  const prompt = `Analyze this user message and extract BOTH the intent and search keywords in ONE response.

Message: "${message}"

Task 1 - Classify intent into ONE category:
- FACTUAL: Asking for specific facts (names, numbers, dates, "what is X", "who is Y")
- RELATIONAL: Asking about people or relationships ("my partner", "my cat", "uncle")
- NARRATIVE: Asking how/why something happened, wanting a story
- CONCEPTUAL: Asking about ideas, theories, or explanations
- EMOTIONAL: Expressing feelings, seeking emotional support
- TASK: Wanting help with something specific

Task 2 - Extract keywords in these categories:
- "entities": Proper nouns ONLY (names of people, places, brands). NO question words.
- "concepts": Important nouns and topics (profession, job, work, project, hobby)
- "temporal": Time references (dates, "recently", "yesterday")
- "relational": Relationship words (partner, uncle, friend, cat, family)
- "emotional": Emotional states (struggling, happy, worried)

Return ONLY valid JSON with this EXACT structure:
{
  "intent": "FACTUAL",
  "keywords": {
    "entities": ["name1", "name2"],
    "concepts": ["concept1"],
    "temporal": [],
    "relational": ["uncle"],
    "emotional": []
  }
}

Examples:
"What's my uncle's profession?" → {"intent": "FACTUAL", "keywords": {"entities": [], "concepts": ["profession"], "temporal": [], "relational": ["uncle"], "emotional": []}}
"Tell me about Lilou" → {"intent": "RELATIONAL", "keywords": {"entities": ["Lilou"], "concepts": [], "temporal": [], "relational": ["cat"], "emotional": []}}`;

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
        model: 'x-ai/grok-4.1-fast:free',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 250,
      }),
    });

    if (!response.ok) {
      console.error('[CombinedExtractor] API call failed:', response.statusText);
      return getFallbackResult(message);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || '{}';

    try {
      // Extract JSON from markdown code blocks if present
      let jsonContent = content;
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1];
      }

      const result = JSON.parse(jsonContent) as CombinedExtractionResult;

      console.log('[CombinedExtractor] Success:', {
        intent: result.intent,
        keywordCount: Object.values(result.keywords).flat().length,
      });

      // Validate and normalize
      const validIntents: IntentType[] = ['FACTUAL', 'NARRATIVE', 'CONCEPTUAL', 'RELATIONAL', 'EMOTIONAL', 'TASK'];
      const normalizedIntent = validIntents.includes(result.intent) ? result.intent : 'CONCEPTUAL';

      return {
        intent: normalizedIntent,
        keywords: {
          entities: result.keywords?.entities || [],
          concepts: result.keywords?.concepts || [],
          temporal: result.keywords?.temporal || [],
          relational: result.keywords?.relational || [],
          emotional: result.keywords?.emotional || [],
        },
      };
    } catch (parseError) {
      console.error('[CombinedExtractor] Parse error:', parseError, 'Content:', content);
      return getFallbackResult(message);
    }
  } catch (error) {
    console.error('[CombinedExtractor] Network error:', error);
    return getFallbackResult(message);
  }
}

/**
 * Fallback extraction using regex when API fails
 */
function getFallbackResult(message: string): CombinedExtractionResult {
  console.log('[CombinedExtractor] Using fallback extraction');

  const keywords: ExtractedKeywords = {
    entities: [],
    concepts: [],
    temporal: [],
    relational: [],
    emotional: [],
  };

  // Extract capitalized words as entities
  const capitalizedWords = message.match(/\b[A-Z][a-z]+\b/g) || [];
  const questionWords = new Set(['What', 'Who', 'Where', 'When', 'Why', 'How', 'Which']);
  keywords.entities = [...new Set(capitalizedWords.filter(w => !questionWords.has(w)))];

  // Extract temporal
  const temporalMatches = message.match(/\b(today|yesterday|tomorrow|recently|lately|when)\b/gi);
  if (temporalMatches) {
    keywords.temporal = [...new Set(temporalMatches.map(m => m.toLowerCase()))];
  }

  // Extract relational
  const relationalMatches = message.match(/\b(my|partner|friend|family|uncle|aunt|cat|dog|pet)\b/gi);
  if (relationalMatches) {
    keywords.relational = [...new Set(relationalMatches.map(m => m.toLowerCase()))];
  }

  // Extract emotional
  const emotionalMatches = message.match(/\b(happy|sad|angry|worried|anxious|struggling|feeling)\b/gi);
  if (emotionalMatches) {
    keywords.emotional = [...new Set(emotionalMatches.map(m => m.toLowerCase()))];
  }

  // Simple intent classification
  let intent: IntentType = 'CONCEPTUAL';
  if (keywords.relational.length > 0) intent = 'RELATIONAL';
  else if (keywords.emotional.length > 0) intent = 'EMOTIONAL';
  else if (/\b(what|who|where|when)\b/i.test(message)) intent = 'FACTUAL';
  else if (/\b(how|why|tell me about)\b/i.test(message)) intent = 'NARRATIVE';

  return { intent, keywords };
}

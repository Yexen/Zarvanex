/**
 * Smart Keyword Extraction using xAI Grok
 * Extracts intent-aware search terms from user messages
 */

import type { IntentType } from './intentClassifier';

export interface ExtractedKeywords {
  entities: string[];      // Proper nouns, names, places, brands
  concepts: string[];      // Abstract ideas, themes, topics
  temporal: string[];      // Time references: dates, periods, 'recently', 'when I was'
  relational: string[];    // Relationship words: my partner, uncle, friend
  emotional: string[];     // Emotional context: struggling, happy, worried
}

/**
 * Extract smart keywords from user message using xAI Grok
 */
export async function extractSmartKeywords(
  message: string,
  intent: IntentType,
  apiKey: string
): Promise<ExtractedKeywords> {
  const prompt = `Extract search keywords from this message to find relevant information in personal memory.

Message: "${message}"
Intent: ${intent}

Extract these categories:
- "entities": Proper nouns ONLY (names of people, places, brands). DO NOT include question words like "What/Who/Where/When".
- "concepts": Important nouns and topics (profession, job, work, project, hobby, etc.)
- "temporal": Time references (dates, "recently", "yesterday", etc.)
- "relational": Relationship words (partner, uncle, friend, cat, family, etc.)
- "emotional": Emotional states (struggling, happy, worried, etc.)

Examples:
"What's my uncle's profession?" → {"entities": [], "concepts": ["profession"], "relational": ["uncle"]}
"Tell me about Lilou" → {"entities": ["Lilou"], "concepts": [], "relational": ["cat"]}
"When did I move to Paris?" → {"entities": ["Paris"], "concepts": ["move"], "temporal": ["when"]}

Return ONLY valid JSON with these exact keys. Use empty arrays if nothing found.`;

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
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      console.error('Keyword extraction failed:', response.statusText);
      return extractFallbackKeywords(message);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content?.trim() || '{}';

    // Parse JSON response
    try {
      const keywords = JSON.parse(content) as ExtractedKeywords;

      console.log('[KeywordExtractor] Grok response:', keywords);

      // Validate structure and provide defaults
      return {
        entities: keywords.entities || [],
        concepts: keywords.concepts || [],
        temporal: keywords.temporal || [],
        relational: keywords.relational || [],
        emotional: keywords.emotional || [],
      };
    } catch (parseError) {
      console.error('[KeywordExtractor] Error parsing JSON:', parseError, 'Content:', content);
      console.log('[KeywordExtractor] Using fallback extraction');
      return extractFallbackKeywords(message);
    }
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return extractFallbackKeywords(message);
  }
}

/**
 * Fallback keyword extraction using regex (when Grok fails)
 */
function extractFallbackKeywords(message: string): ExtractedKeywords {
  const keywords: ExtractedKeywords = {
    entities: [],
    concepts: [],
    temporal: [],
    relational: [],
    emotional: [],
  };

  // Extract capitalized words as potential entities (excluding question words)
  const capitalizedWords = message.match(/\b[A-Z][a-z]+\b/g) || [];
  const questionWords = new Set(['What', 'Who', 'Where', 'When', 'Why', 'How', 'Which', 'Whose', 'Whom']);
  keywords.entities = [...new Set(capitalizedWords.filter(word => !questionWords.has(word)))];

  // Extract temporal keywords
  const temporalPatterns = [
    /\b(today|yesterday|tomorrow|recently|lately|currently|now|earlier|before|after|when|during)\b/gi,
    /\b\d{4}\b/, // Years
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/gi,
  ];

  temporalPatterns.forEach(pattern => {
    const matches = message.match(pattern);
    if (matches) {
      keywords.temporal.push(...matches.map(m => m.toLowerCase()));
    }
  });

  // Extract relational keywords
  const relationalPatterns = /\b(my|partner|friend|family|uncle|aunt|parent|sibling|brother|sister|wife|husband|boyfriend|girlfriend|cat|dog|pet|father|mother|dad|mom|son|daughter|child|children|cousin|nephew|niece|grandparent|grandmother|grandfather)\b/gi;
  const relationalMatches = message.match(relationalPatterns);
  if (relationalMatches) {
    keywords.relational = [...new Set(relationalMatches.map(m => m.toLowerCase()))];
  }

  // Extract emotional keywords
  const emotionalPatterns = /\b(happy|sad|angry|frustrated|excited|worried|anxious|stressed|calm|peaceful|struggling|feeling|felt|feel)\b/gi;
  const emotionalMatches = message.match(emotionalPatterns);
  if (emotionalMatches) {
    keywords.emotional = [...new Set(emotionalMatches.map(m => m.toLowerCase()))];
  }

  // Extract concept keywords (nouns that aren't capitalized)
  const words = message.toLowerCase().split(/\s+/);
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'as', 'from', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'what', 'who', 'where', 'when', 'why', 'how']);

  // Clean punctuation from words
  const cleanWords = words.map(word => word.replace(/[?.!,;:'"]/, ''));

  keywords.concepts = cleanWords.filter(word =>
    word.length > 3 &&
    !stopWords.has(word) &&
    !keywords.entities.map(e => e.toLowerCase()).includes(word) &&
    !keywords.temporal.includes(word) &&
    !keywords.relational.includes(word) &&
    !keywords.emotional.includes(word)
  ).slice(0, 5); // Limit to top 5 concepts

  return keywords;
}

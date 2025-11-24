/**
 * Smart Keyword Extraction using Gemini
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
 * Extract smart keywords from user message using Gemini
 */
export async function extractSmartKeywords(
  message: string,
  intent: IntentType,
  apiKey: string
): Promise<ExtractedKeywords> {
  const prompt = `Extract search terms from this message to find relevant personal context.

Message: "${message}"
Intent: ${intent}

Return a JSON object:
{
  "entities": ["proper nouns, names, places, brands"],
  "concepts": ["abstract ideas, themes, topics"],
  "temporal": ["time references: dates, periods, 'recently', 'when I was'"],
  "relational": ["relationship words: my partner, uncle, friend"],
  "emotional": ["emotional context: struggling, happy, worried"]
}

Only include relevant categories. Be specific.
Return ONLY valid JSON, nothing else.`;

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://zarvanex.app',
        'X-Title': 'Zarvanex',
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

      // Validate structure and provide defaults
      return {
        entities: keywords.entities || [],
        concepts: keywords.concepts || [],
        temporal: keywords.temporal || [],
        relational: keywords.relational || [],
        emotional: keywords.emotional || [],
      };
    } catch (parseError) {
      console.error('Error parsing keywords JSON:', parseError, 'Content:', content);
      return extractFallbackKeywords(message);
    }
  } catch (error) {
    console.error('Error extracting keywords:', error);
    return extractFallbackKeywords(message);
  }
}

/**
 * Fallback keyword extraction using regex (when Gemini fails)
 */
function extractFallbackKeywords(message: string): ExtractedKeywords {
  const keywords: ExtractedKeywords = {
    entities: [],
    concepts: [],
    temporal: [],
    relational: [],
    emotional: [],
  };

  // Extract capitalized words as potential entities
  const capitalizedWords = message.match(/\b[A-Z][a-z]+\b/g) || [];
  keywords.entities = [...new Set(capitalizedWords)];

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
  const relationalPatterns = /\b(my|partner|friend|family|uncle|aunt|parent|sibling|brother|sister|wife|husband|boyfriend|girlfriend|cat|dog|pet)\b/gi;
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
  const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'must', 'can', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'about', 'as', 'from', 'that', 'this', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them', 'my', 'your', 'his', 'her', 'its', 'our', 'their']);

  keywords.concepts = words.filter(word =>
    word.length > 3 &&
    !stopWords.has(word) &&
    !keywords.entities.includes(word) &&
    !keywords.temporal.includes(word) &&
    !keywords.relational.includes(word) &&
    !keywords.emotional.includes(word)
  ).slice(0, 5); // Limit to top 5 concepts

  return keywords;
}

/**
 * Intent Classification using Gemini
 * Classifies user messages to determine optimal retrieval strategy
 */

export type IntentType =
  | 'FACTUAL'      // Asking for specific facts, names, numbers, dates
  | 'NARRATIVE'    // Asking how/why something happened, wanting a story
  | 'CONCEPTUAL'   // Asking about ideas, theories, explanations
  | 'RELATIONAL'   // Asking about people, relationships, dynamics
  | 'EMOTIONAL'    // Expressing feelings, seeking support
  | 'TASK';        // Wanting help with something specific

/**
 * Classify user message intent using free Gemini model
 */
export async function classifyIntent(
  message: string,
  apiKey: string
): Promise<IntentType> {
  const prompt = `Classify this message into ONE category:
- FACTUAL: Asking for specific facts, names, numbers, dates
- NARRATIVE: Asking how/why something happened, wanting a story
- CONCEPTUAL: Asking about ideas, theories, explanations
- RELATIONAL: Asking about people, relationships, dynamics
- EMOTIONAL: Expressing feelings, seeking support
- TASK: Wanting help with something specific

Message: "${message}"

Respond with ONLY the category name (one word).`;

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
        temperature: 0.3, // Low temperature for consistent classification
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      console.error('Intent classification failed:', response.statusText);
      return 'CONCEPTUAL'; // Default fallback
    }

    const data = await response.json();
    const intent = data.choices[0]?.message?.content?.trim().toUpperCase() || 'CONCEPTUAL';

    // Validate intent is one of the expected types
    const validIntents: IntentType[] = ['FACTUAL', 'NARRATIVE', 'CONCEPTUAL', 'RELATIONAL', 'EMOTIONAL', 'TASK'];
    if (validIntents.includes(intent as IntentType)) {
      return intent as IntentType;
    }

    return 'CONCEPTUAL'; // Default fallback
  } catch (error) {
    console.error('Error classifying intent:', error);
    return 'CONCEPTUAL'; // Default fallback
  }
}

/**
 * Get retrieval strategy based on intent
 */
export function getRetrievalStrategy(intent: IntentType): {
  prioritizeExact: boolean;
  prioritizeSemantic: boolean;
  prioritizeEntity: boolean;
  loadFullChunks: boolean;
  preserveSequence: boolean;
} {
  switch (intent) {
    case 'FACTUAL':
      return {
        prioritizeExact: true,
        prioritizeSemantic: false,
        prioritizeEntity: true,
        loadFullChunks: true,
        preserveSequence: false,
      };

    case 'NARRATIVE':
      return {
        prioritizeExact: false,
        prioritizeSemantic: true,
        prioritizeEntity: false,
        loadFullChunks: true,
        preserveSequence: true, // Important for stories
      };

    case 'CONCEPTUAL':
      return {
        prioritizeExact: false,
        prioritizeSemantic: true,
        prioritizeEntity: false,
        loadFullChunks: true,
        preserveSequence: false,
      };

    case 'RELATIONAL':
      return {
        prioritizeExact: false,
        prioritizeSemantic: false,
        prioritizeEntity: true,
        loadFullChunks: true,
        preserveSequence: false,
      };

    case 'EMOTIONAL':
      return {
        prioritizeExact: false,
        prioritizeSemantic: true,
        prioritizeEntity: true,
        loadFullChunks: true,
        preserveSequence: false,
      };

    case 'TASK':
      return {
        prioritizeExact: false,
        prioritizeSemantic: false,
        prioritizeEntity: false,
        loadFullChunks: false,
        preserveSequence: false,
      };
  }
}

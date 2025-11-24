/**
 * Embedding Service for Semantic Search
 * Supports OpenAI embeddings (cheap) or TF-IDF fallback (free)
 */

/**
 * Generate embedding using OpenAI text-embedding-3-small
 * Cost: ~$0.00002 per 1K tokens
 */
export async function getEmbedding(
  text: string,
  apiKey?: string
): Promise<number[]> {
  if (apiKey) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text,
        }),
      });

      if (!response.ok) {
        console.error('[Embedding] OpenAI API error:', response.statusText);
        return getTfIdfEmbedding(text);
      }

      const data = await response.json();
      return data.data[0].embedding;
    } catch (error) {
      console.error('[Embedding] Error getting OpenAI embedding:', error);
      return getTfIdfEmbedding(text);
    }
  }

  // Fallback to TF-IDF if no API key
  return getTfIdfEmbedding(text);
}

/**
 * Generate embeddings for multiple texts in batch
 */
export async function getBatchEmbeddings(
  texts: string[],
  apiKey?: string
): Promise<number[][]> {
  if (apiKey && texts.length > 0) {
    try {
      // OpenAI supports up to 2048 inputs per request
      const batchSize = 100;
      const allEmbeddings: number[][] = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);

        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input: batch,
          }),
        });

        if (!response.ok) {
          console.error('[Embedding] Batch API error:', response.statusText);
          // Fallback for this batch
          for (const text of batch) {
            allEmbeddings.push(getTfIdfEmbedding(text));
          }
          continue;
        }

        const data = await response.json();
        allEmbeddings.push(...data.data.map((d: any) => d.embedding));

        // Rate limiting: wait 100ms between batches
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      return allEmbeddings;
    } catch (error) {
      console.error('[Embedding] Error in batch embeddings:', error);
    }
  }

  // Fallback to TF-IDF for all texts
  return texts.map(text => getTfIdfEmbedding(text));
}

/**
 * Compute cosine similarity between two embeddings
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    console.error('[Embedding] Vector dimension mismatch');
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) return 0;

  return dotProduct / denominator;
}

/**
 * TF-IDF based embedding (fallback when no API key)
 * Creates a simple bag-of-words vector
 */
function getTfIdfEmbedding(text: string): number[] {
  const words = tokenize(text);
  const wordFreq = new Map<string, number>();

  // Count word frequencies
  for (const word of words) {
    wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
  }

  // Create a fixed-size vector (use common English words as dimensions)
  const dimensions = getCommonWords();
  const vector: number[] = new Array(dimensions.length).fill(0);

  for (let i = 0; i < dimensions.length; i++) {
    const word = dimensions[i];
    if (wordFreq.has(word)) {
      // TF-IDF score (simplified: just term frequency normalized)
      vector[i] = wordFreq.get(word)! / words.length;
    }
  }

  return vector;
}

/**
 * Tokenize text into words
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2);
}

/**
 * Get common words for TF-IDF dimensions
 */
function getCommonWords(): string[] {
  return [
    // Common content words
    'love', 'like', 'want', 'need', 'think', 'know', 'feel', 'say', 'tell', 'ask',
    'time', 'day', 'year', 'life', 'work', 'place', 'way', 'thing', 'people', 'world',
    'family', 'friend', 'partner', 'person', 'child', 'parent', 'home', 'school', 'job',
    'good', 'bad', 'great', 'best', 'new', 'old', 'long', 'right', 'different', 'small',
    'big', 'important', 'happy', 'sad', 'hard', 'easy', 'high', 'low', 'early', 'late',
    'help', 'use', 'make', 'give', 'take', 'find', 'see', 'look', 'come', 'go',
    'get', 'have', 'do', 'say', 'know', 'think', 'feel', 'become', 'leave', 'put',
    'mean', 'keep', 'let', 'begin', 'seem', 'show', 'talk', 'turn', 'start', 'run',
    'move', 'live', 'believe', 'bring', 'happen', 'write', 'provide', 'sit', 'stand', 'lose',
    'pay', 'meet', 'include', 'continue', 'set', 'learn', 'change', 'lead', 'understand', 'watch',
    // Domain-specific words (can be customized)
    'ai', 'model', 'code', 'project', 'tech', 'app', 'software', 'design', 'creative',
    'art', 'music', 'book', 'story', 'idea', 'concept', 'theory', 'research', 'study',
    'health', 'mental', 'physical', 'emotional', 'relationship', 'communication', 'support',
    'cat', 'dog', 'pet', 'animal', 'university', 'degree', 'education', 'learning',
    'brand', 'business', 'company', 'product', 'service', 'customer', 'market', 'value',
  ];
}

/**
 * Estimate token count for text
 */
export function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token on average
  return Math.ceil(text.length / 4);
}

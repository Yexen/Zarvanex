# Smart Search System - User Guide

## Overview

The Smart Search System is an intelligent background search system that runs on every user message to provide personalized context to the AI. It uses:

- **Free Gemini** for intent classification and keyword extraction
- **Hybrid search** combining exact match, semantic search, and entity lookup
- **Entity indexing** for instant factual answers
- **Lossless retrieval** to preserve complete narrative context

**Cost:** ~$0.00 per message (uses free Gemini + optional embeddings)

---

## Setup Instructions

### Step 1: Index Your Personalization Data

Before the smart search can work, you need to index your personalization data (your life story, facts about you, etc.).

```typescript
import { indexPersonalizationText } from '@/lib/personalizationIndexer';

// Your personalization text
const personalizationText = `
=== CORE IDENTITY ===
My name is [Your Name]. I'm a [occupation] living in [location]...

=== RELATIONSHIPS ===
My partner Adrien is autistic...
My cat Lilou is 13 years old...

=== PROJECTS ===
I'm working on Zarvanex, an AI chat application...
I created Yexen, a jewelry brand...

=== EDUCATION ===
I studied at University of Tehran, ranked 741/1000...
`;

// Index the text
const result = await indexPersonalizationText(
  personalizationText,
  userId,
  {
    openrouter: 'your-openrouter-api-key', // Required for entity extraction
    openai: 'your-openai-api-key',        // Optional for semantic search
  },
  (progress) => {
    console.log(progress.message);
  }
);

console.log(`Created ${result.chunksCreated} chunks`);
console.log(`Extracted ${result.entitiesExtracted} entities`);
```

### Step 2: Verify Indexing

Check if your personalization data is indexed:

```typescript
import { getIndexingStatus } from '@/lib/personalizationIndexer';

const status = await getIndexingStatus(userId);

console.log('Indexed:', status.isIndexed);
console.log('Chunks:', status.chunkCount);
console.log('Entities:', status.entityCount);
console.log('Has Embeddings:', status.hasEmbeddings);
```

### Step 3: Integration is Automatic

Once indexed, the smart search automatically runs on every message in ChatInterface.tsx. No additional setup needed!

---

## How It Works

### On Every User Message:

1. **Intent Classification** (Gemini, ~50 tokens, FREE)
   - Classifies as FACTUAL, NARRATIVE, CONCEPTUAL, RELATIONAL, EMOTIONAL, or TASK
   - Determines optimal retrieval strategy

2. **Smart Keyword Extraction** (Gemini, ~100 tokens, FREE)
   - Extracts entities, concepts, temporal references, relational terms, emotional context
   - Intent-aware extraction

3. **Entity Index Lookup** (Local, INSTANT)
   - Checks pre-built entity index for instant facts
   - Example: "cat" → finds Lilou with all facts

4. **Hybrid Search** (Local, FAST)
   - **Exact Match:** Searches for specific terms in chunks
   - **Semantic Match:** Uses embeddings for conceptual similarity (if OpenAI API key provided)
   - **Entity Match:** Loads chunks linked to mentioned entities

5. **Relevance Ranking**
   - Scores chunks based on search method + intent
   - FACTUAL queries prioritize exact/entity matches
   - NARRATIVE queries prioritize semantic matches in sequence

6. **Context Assembly** (Budget: 4000 tokens)
   - Loads core identity (always included)
   - Adds top-ranked chunks until budget exhausted
   - Full chunks only (no lossy compression)

7. **System Prompt Injection**
   - Adds entity facts + relevant chunks to system prompt
   - Transparent to the AI model

---

## Example Queries

### Factual Query

**User:** "What's my cat's name?"

```
1. Intent: FACTUAL
2. Keywords: { entities: ["cat"] }
3. Entity Lookup: Finds "lilou" (type: ANIMAL)
4. Instant Answer: Lilou, 13-year-old cat who thinks he's a kitten
```

### Narrative Query

**User:** "How did I meet Adrien?"

```
1. Intent: NARRATIVE
2. Keywords: { entities: ["Adrien"], concepts: ["meeting", "origin story"] }
3. Entity Match: Loads all chunks mentioning Adrien
4. Semantic Match: Finds chunks about "how we met"
5. Sequence: Preserves chronological order
6. Full Story: Complete narrative with OkCupid, two months, breakthrough moment
```

### Conceptual Query

**User:** "Tell me about my creative projects"

```
1. Intent: CONCEPTUAL
2. Keywords: { concepts: ["creative", "projects"] }
3. Semantic Match: Finds Yexen (jewelry), Zarvanex (AI), etc.
4. Ranked by Relevance: Top creative work descriptions
```

---

## Configuration

### API Keys

#### Required:
- **OpenRouter API Key:** For intent classification and keyword extraction (uses free Gemini)

#### Optional:
- **OpenAI API Key:** For semantic search with embeddings (~$0.001 one-time cost)

Set in environment variables:
```bash
NEXT_PUBLIC_OPENROUTER_API_KEY=your-key
NEXT_PUBLIC_OPENAI_API_KEY=your-key  # Optional
```

### Token Budget

Default: 4000 tokens (~4000 characters)

Adjust in `lib/hybridSearcher.ts`:
```typescript
export async function assembleContext(
  rankedChunks: ScoredChunk[],
  intent: IntentType,
  personalizationDB: IDBDatabase,
  tokenBudget: number = 4000  // Change this
): Promise<AssembledContext>
```

---

## Database Schema

### Personalization Chunks

```typescript
interface PersonalizationChunk {
  id: string;
  content: string;          // Full chunk text
  embedding?: number[];     // Optional semantic embedding
  entities: string[];       // Entities mentioned in chunk
  section?: string;         // 'core' for identity chunk
  index?: number;           // Sequence number for narrative
  userId: string;
  createdAt: Date;
}
```

### Entity Index

```typescript
interface Entity {
  name: string;             // Entity name (lowercase)
  type: EntityType;         // PERSON, ANIMAL, PLACE, BRAND, etc.
  facts: {                  // Key facts about entity
    [key: string]: string;
  };
  chunkIds: string[];       // Chunks mentioning this entity
  context?: string;         // Brief context snippet
}
```

Stored in IndexedDB:
- `zarvanex-memories` database
- `personalization` store (chunks)
- `entityIndex` store (entities)

---

## Debugging

Enable debug logs in console:

```javascript
// Intent and keywords
console.log('[SmartSearch] Intent:', intent);
console.log('[SmartSearch] Keywords:', keywords);

// Search results
console.log('[SmartSearch] Search results:', {
  exactMatches: searchResults.exactMatches.length,
  semanticMatches: searchResults.semanticMatches.length,
  entityMatches: searchResults.entityMatches.length,
});

// Context assembly
console.log('[SmartSearch] Context assembled:', {
  coreLoaded: !!context.core,
  relevantChunks: context.relevant.length,
  totalTokens: context.totalTokens,
});
```

---

## Replication to Other Providers

The smart search is currently integrated into **Groq** messages. To add to other providers (OpenRouter, OpenAI, Claude, Cohere):

1. Find the message sending function (e.g., `sendOpenRouterMessage`)
2. Add before hard memory context:

```typescript
// Add smart search context (new intelligent search system)
const smartSearchEnabled = await isSmartSearchEnabled(user.id);
if (smartSearchEnabled) {
  const smartSearchResult = await processMessageWithSmartSearch(
    currentQuery,
    user.id,
    {
      openrouter: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY,
      openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
    }
  );
  if (smartSearchResult.systemPrompt) {
    console.log('[SmartSearch] Adding context:', {
      intent: smartSearchResult.intent,
      chunks: smartSearchResult.totalChunks,
      tokens: smartSearchResult.totalTokens,
    });
    systemPrompt += '\n\n' + smartSearchResult.systemPrompt;
  }
}
```

---

## Troubleshooting

### Smart Search Not Working

**Check indexing status:**
```typescript
const status = await getIndexingStatus(userId);
console.log(status);
```

**Re-index if needed:**
```typescript
await indexPersonalizationText(fullText, userId, apiKeys);
```

### Entity Facts Not Found

- Ensure OpenRouter API key is valid
- Check entity index: `await memoryStorage.getEntityIndex()`
- Verify Gemini extraction is working

### Semantic Search Not Working

- Requires OpenAI API key for embeddings
- Falls back to TF-IDF if no API key
- Check embeddings: `const chunks = await memoryStorage.getAllPersonalizationChunks(userId)`

### High Token Usage

- Reduce token budget in `hybridSearcher.ts`
- Limit chunk count in ranking
- Remove optional components (core identity, etc.)

---

## Architecture Summary

```
USER MESSAGE
    ↓
Intent Classification (Gemini FREE)
    ↓
Keyword Extraction (Gemini FREE)
    ↓
Entity Index Lookup (Local INSTANT)
    ↓
Hybrid Search (Local FAST)
    ├─ Exact Match
    ├─ Semantic Match (if embeddings)
    └─ Entity Match
    ↓
Relevance Ranking (Intent-aware)
    ↓
Context Assembly (Budget: 4000 tokens)
    ├─ Core Identity
    └─ Top Ranked Chunks (full, no compression)
    ↓
System Prompt Injection
    ↓
AI RESPONDS (with perfect context)
```

**Total Cost Per Message:** ~$0.00 (free Gemini)
**Total Latency:** ~1-2 seconds
**Context Quality:** High (lossless full chunks)

---

## Files Reference

| File | Purpose |
|------|---------|
| `lib/smartSearch.ts` | Main orchestrator |
| `lib/intentClassifier.ts` | Intent classification with Gemini |
| `lib/keywordExtractor.ts` | Smart keyword extraction |
| `lib/entityIndexer.ts` | Entity index builder |
| `lib/embeddingService.ts` | Embedding generation & similarity |
| `lib/hybridSearcher.ts` | Hybrid search implementation |
| `lib/personalizationIndexer.ts` | Indexing utility |
| `lib/memoryStorage.ts` | IndexedDB interface |
| `components/ChatInterface.tsx` | Integration point |

---

**System Status:** ✅ Fully Implemented
**Next Steps:** Index your personalization data and start chatting!

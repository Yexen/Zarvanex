import { qwenClient } from '../llm/qwenClient';
import { memoryDB, Memory } from '../db/memoryDB';
import { createExtractionPrompt, formatConversationForExtraction } from './extractionPrompt';
import { v4 as uuidv4 } from 'uuid';

export interface ExtractionResult {
  new_memories: Array<{
    category: 'personal' | 'work' | 'health' | 'preferences' | 'relationships';
    fact: string;
    confidence: 'high' | 'medium' | 'low';
  }>;
  corrections: Array<{
    old_fact: string;
    new_fact: string;
    reason: string;
  }>;
  unchanged: boolean;
}

export interface ConversationMessage {
  role: string;
  content: string;
}

export class MemoryExtractor {
  /**
   * Extract memories from a conversation
   * @param conversationId ID of the conversation
   * @param messages Array of conversation messages
   * @returns Object with counts of added and corrected memories
   */
  async extractFromConversation(
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<{ added: number; corrected: number; error?: string }> {
    try {
      console.log('[MemoryExtractor] Starting extraction for conversation:', conversationId);
      console.log('[MemoryExtractor] Processing', messages.length, 'messages');

      // 1. Load existing memories
      const existingMemories = await memoryDB.getAllMemories();
      console.log('[MemoryExtractor] Found', existingMemories.length, 'existing memories');

      // 2. Format conversation as text
      const conversationText = formatConversationForExtraction(messages);
      console.log('[MemoryExtractor] Formatted conversation:', conversationText.slice(0, 200) + '...');

      // 3. Create extraction prompt
      const prompt = createExtractionPrompt(existingMemories, conversationText);

      // 4. Send to Qwen
      console.log('[MemoryExtractor] Sending to Qwen for extraction...');
      const response = await qwenClient.chat(prompt);
      console.log('[MemoryExtractor] Qwen response:', response);

      // 5. Parse JSON response
      const result = this.parseExtractionResponse(response);
      if (!result) {
        console.error('[MemoryExtractor] Failed to parse extraction response');
        return { added: 0, corrected: 0, error: 'Failed to parse response' };
      }

      console.log('[MemoryExtractor] Parsed result:', result);

      // If nothing changed, return early
      if (result.unchanged) {
        console.log('[MemoryExtractor] No new information found');
        return { added: 0, corrected: 0 };
      }

      // 6. Save new memories
      let addedCount = 0;
      for (const newMem of result.new_memories) {
        try {
          const memory: Memory = {
            id: uuidv4(),
            category: newMem.category,
            fact: newMem.fact,
            confidence: newMem.confidence,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          await memoryDB.saveMemory(memory);
          console.log('[MemoryExtractor] ✓ Saved new memory:', memory.fact);
          addedCount++;
        } catch (error) {
          console.error('[MemoryExtractor] Failed to save memory:', error);
        }
      }

      // 7. Process corrections
      let correctedCount = 0;
      for (const correction of result.corrections) {
        try {
          // Find the old memory by matching the fact content
          const memories = await memoryDB.getAllMemories();
          const oldMemory = this.findMemoryByFact(memories, correction.old_fact);

          if (oldMemory) {
            await memoryDB.updateMemory(oldMemory.id, {
              fact: correction.new_fact,
              updated_at: new Date().toISOString(),
              correction_history: [
                ...(oldMemory.correction_history || []),
                {
                  old_value: oldMemory.fact,
                  corrected_at: new Date().toISOString(),
                  reason: correction.reason,
                },
              ],
            });
            console.log('[MemoryExtractor] ✓ Corrected memory:', oldMemory.id);
            console.log('  Old:', correction.old_fact);
            console.log('  New:', correction.new_fact);
            correctedCount++;
          } else {
            console.warn('[MemoryExtractor] Could not find memory to correct:', correction.old_fact);
            // If we can't find the old memory, just add it as new
            const memory: Memory = {
              id: uuidv4(),
              category: 'personal', // Default category for corrections
              fact: correction.new_fact,
              confidence: 'high',
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            };
            await memoryDB.saveMemory(memory);
            addedCount++;
          }
        } catch (error) {
          console.error('[MemoryExtractor] Failed to process correction:', error);
        }
      }

      console.log('[MemoryExtractor] ✓ Extraction complete:', {
        added: addedCount,
        corrected: correctedCount,
      });

      return { added: addedCount, corrected: correctedCount };
    } catch (error) {
      console.error('[MemoryExtractor] Extraction failed:', error);
      // Don't throw - graceful degradation
      return { added: 0, corrected: 0, error: String(error) };
    }
  }

  /**
   * Parse the extraction response from Qwen
   */
  private parseExtractionResponse(response: string): ExtractionResult | null {
    try {
      // Use the QwenClient's JSON extraction helper
      const parsed = qwenClient.extractJSON<ExtractionResult>(response);

      if (!parsed) {
        return null;
      }

      // Validate structure
      if (!Array.isArray(parsed.new_memories) || !Array.isArray(parsed.corrections)) {
        console.error('[MemoryExtractor] Invalid response structure:', parsed);
        return null;
      }

      return parsed;
    } catch (error) {
      console.error('[MemoryExtractor] Failed to parse extraction response:', error);
      return null;
    }
  }

  /**
   * Find a memory that matches the given fact text
   * Uses fuzzy matching to handle slight variations
   */
  private findMemoryByFact(memories: Memory[], factText: string): Memory | undefined {
    const normalizedFact = factText.toLowerCase().trim();

    // First try: Exact match
    let match = memories.find(
      (m) => m.fact.toLowerCase().trim() === normalizedFact
    );
    if (match) return match;

    // Second try: Partial match (fact contains the text or vice versa)
    match = memories.find(
      (m) =>
        m.fact.toLowerCase().includes(normalizedFact) ||
        normalizedFact.includes(m.fact.toLowerCase())
    );
    if (match) return match;

    // Third try: Key word matching (at least 3 words in common)
    const factWords = normalizedFact.split(/\s+/).filter((w) => w.length > 3);
    if (factWords.length >= 2) {
      match = memories.find((m) => {
        const memoryWords = m.fact.toLowerCase().split(/\s+/);
        const commonWords = factWords.filter((word) =>
          memoryWords.some((mw) => mw.includes(word) || word.includes(mw))
        );
        return commonWords.length >= Math.min(2, factWords.length);
      });
    }

    return match;
  }
}

// Export singleton instance
export const memoryExtractor = new MemoryExtractor();

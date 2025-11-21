import { Memory } from '../db/memoryDB';

/**
 * Format memories for injection into the system prompt
 * Creates a natural, readable context block about the user
 */
export function formatMemoriesForSystemPrompt(memories: Memory[]): string {
  if (memories.length === 0) {
    return '';
  }

  // Group memories by category
  const grouped: Record<string, Memory[]> = {
    personal: [],
    work: [],
    health: [],
    preferences: [],
    relationships: [],
  };

  for (const memory of memories) {
    if (grouped[memory.category]) {
      grouped[memory.category].push(memory);
    }
  }

  // Filter out empty categories
  const nonEmptyCategories = Object.entries(grouped).filter(
    ([_, mems]) => mems.length > 0
  );

  if (nonEmptyCategories.length === 0) {
    return '';
  }

  // Format as readable context
  let formatted = '\n\n=== CONTEXT ABOUT USER ===\n';
  formatted += '(Information from previous conversations)\n\n';

  const categoryNames: Record<string, string> = {
    personal: 'Personal Information',
    work: 'Work & Projects',
    health: 'Health & Wellness',
    preferences: 'Preferences & Habits',
    relationships: 'Relationships',
  };

  for (const [category, mems] of nonEmptyCategories) {
    formatted += `${categoryNames[category]}:\n`;

    // Sort by confidence (high first) and recency (newest first)
    const sorted = mems.sort((a, b) => {
      const confidenceOrder = { high: 0, medium: 1, low: 2 };
      const confDiff =
        confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
      if (confDiff !== 0) return confDiff;

      return (
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });

    for (const mem of sorted) {
      formatted += `  - ${mem.fact}\n`;
    }
    formatted += '\n';
  }

  formatted += `IMPORTANT INSTRUCTIONS:\n`;
  formatted += `- This context is from past conversations - use it to be more helpful and personalized\n`;
  formatted += `- The user may provide updates that contradict this information - ALWAYS believe the user's latest statements\n`;
  formatted += `- Do NOT explicitly mention "I remember" or reference the memory system\n`;
  formatted += `- Just naturally incorporate this knowledge into your responses\n`;
  formatted += `- If the user corrects something, accept it without arguing\n`;
  formatted += `=== END CONTEXT ===\n\n`;

  return formatted;
}

/**
 * Format memories in a compact format for debugging
 */
export function formatMemoriesCompact(memories: Memory[]): string {
  if (memories.length === 0) {
    return '(No memories)';
  }

  return memories
    .map(
      (m) =>
        `[${m.category}] ${m.fact} (${m.confidence}, ${new Date(m.created_at).toLocaleDateString()})`
    )
    .join('\n');
}

/**
 * Get memory statistics
 */
export function getMemoryStats(memories: Memory[]): {
  total: number;
  byCategory: Record<string, number>;
  byConfidence: Record<string, number>;
  recentCount: number; // Last 7 days
  correctedCount: number;
} {
  const byCategory: Record<string, number> = {
    personal: 0,
    work: 0,
    health: 0,
    preferences: 0,
    relationships: 0,
  };

  const byConfidence: Record<string, number> = {
    high: 0,
    medium: 0,
    low: 0,
  };

  let recentCount = 0;
  let correctedCount = 0;

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  for (const mem of memories) {
    byCategory[mem.category]++;
    byConfidence[mem.confidence]++;

    if (new Date(mem.created_at) >= sevenDaysAgo) {
      recentCount++;
    }

    if (mem.correction_history && mem.correction_history.length > 0) {
      correctedCount++;
    }
  }

  return {
    total: memories.length,
    byCategory,
    byConfidence,
    recentCount,
    correctedCount,
  };
}

/**
 * Filter memories by relevance to current conversation
 * This is an optional optimization - for now, return all memories
 * In the future, could use embeddings or keyword matching
 */
export function filterRelevantMemories(
  memories: Memory[],
  currentMessage?: string
): Memory[] {
  // For now, return all memories
  // TODO: Implement relevance filtering based on current message
  return memories;
}

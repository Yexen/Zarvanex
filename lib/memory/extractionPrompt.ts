import { Memory } from '../db/memoryDB';

export function createExtractionPrompt(
  existingMemories: Memory[],
  conversationText: string
): string {
  const formattedMemories = formatMemoriesForPrompt(existingMemories);

  return `You are a memory extraction system for a personal AI assistant. Your job is to extract important facts about the user and maintain accurate memory.

EXISTING MEMORIES:
${formattedMemories}

NEW CONVERSATION:
${conversationText}

TASK:
Analyze the new conversation and:
1. Extract NEW factual information about the user that should be remembered
2. Identify any CONTRADICTIONS between existing memories and new information
3. If you find contradictions, UPDATE the memory with the CORRECT information from the new conversation (always trust the user's latest statements)

EXTRACTION RULES:
- Only extract FACTUAL information (names, locations, preferences, work, projects, relationships, health info)
- Do NOT extract: opinions, temporary states, questions, or general statements
- Mark confidence level:
  * "high" = User explicitly stated it
  * "medium" = Strongly implied or mentioned in context
  * "low" = Weakly implied or uncertain
- Categories:
  * "personal" = Name, age, location, family, background
  * "work" = Job, projects, career, business
  * "health" = Medical conditions, fitness, diet, wellness
  * "preferences" = Likes, dislikes, habits, routines
  * "relationships" = Friends, family members, colleagues, pets

RESPONSE FORMAT:
Return ONLY valid JSON in this exact format (no other text):

{
  "new_memories": [
    {
      "category": "personal",
      "fact": "User's name is John",
      "confidence": "high"
    }
  ],
  "corrections": [
    {
      "old_fact": "User lives in New York",
      "new_fact": "User lives in San Francisco",
      "reason": "User stated they moved to San Francisco"
    }
  ],
  "unchanged": false
}

IMPORTANT:
- If NO new information found and NO corrections needed, return: {"new_memories": [], "corrections": [], "unchanged": true}
- Always prefer the user's LATEST information over old memories
- Don't duplicate existing accurate memories
- Be conservative - only extract clear, useful facts
- Return ONLY the JSON object, no markdown, no explanations`;
}

function formatMemoriesForPrompt(memories: Memory[]): string {
  if (memories.length === 0) {
    return '(No existing memories)';
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

  let formatted = '';

  const categoryLabels: Record<string, string> = {
    personal: 'Personal Information',
    work: 'Work & Projects',
    health: 'Health',
    preferences: 'Preferences & Habits',
    relationships: 'Relationships',
  };

  for (const [category, mems] of Object.entries(grouped)) {
    if (mems.length > 0) {
      formatted += `\n${categoryLabels[category]}:\n`;
      for (const mem of mems) {
        formatted += `  - ${mem.fact} [confidence: ${mem.confidence}]\n`;
      }
    }
  }

  return formatted || '(No existing memories)';
}

export function formatConversationForExtraction(messages: Array<{ role: string; content: string }>): string {
  return messages
    .map((msg) => {
      const role = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      return `${role}: ${msg.content}`;
    })
    .join('\n\n');
}

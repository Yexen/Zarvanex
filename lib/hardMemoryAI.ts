import { hardMemorySupabase } from './hardMemorySupabase';
import type { Memory } from '@/types/memory';

interface HardMemoryContext {
  foundMemories: Memory[];
  relevantCount: number;
  searchQuery: string;
  tags: string[];
}

interface SaveMemoryRequest {
  title: string;
  content: string;
  tags?: string[];
  folderId?: string;
  conversationId?: string;
}

/**
 * Retrieves Hard Memories for AI context injection
 */
export async function getHardMemoryContext(
  userId: string,
  currentQuery: string,
  options: {
    maxResults?: number;
    searchTags?: string[];
    includeRecent?: boolean;
  } = {}
): Promise<HardMemoryContext> {
  const {
    maxResults = 10,
    searchTags = [],
    includeRecent = true
  } = options;

  console.log('🧠 [Hard Memory] Fetching context for user:', userId, { currentQuery, options });

  try {
    let foundMemories: Memory[] = [];

    // First, try semantic search with the query
    if (currentQuery.trim()) {
      console.log('🧠 [Hard Memory] Searching with query:', currentQuery);
      const searchResults = await hardMemorySupabase.searchMemories(
        currentQuery,
        searchTags,
        userId
      );
      console.log('🧠 [Hard Memory] Search results:', searchResults.length, searchResults.map(m => ({ title: m.title, contentLength: m.content.length })));
      // Take more search results to increase chance of finding relevant long content
      foundMemories.push(...searchResults.slice(0, maxResults * 2));
    } else {
      console.log('🧠 [Hard Memory] Empty query, skipping search');
    }

    // If we don't have enough results and includeRecent is true, get recent memories
    if (foundMemories.length < maxResults && includeRecent) {
      console.log('🧠 [Hard Memory] Not enough search results, fetching recent memories');
      const recentMemories = await hardMemorySupabase.getAllMemories(userId);
      console.log('🧠 [Hard Memory] Recent memories:', recentMemories.length, recentMemories.map(m => ({ title: m.title, contentLength: m.content.length })));
      const remainingSlots = maxResults - foundMemories.length;
      
      // Filter out duplicates and add recent ones
      const foundIds = new Set(foundMemories.map(m => m.id));
      const additionalMemories = recentMemories
        .filter(m => !foundIds.has(m.id))
        .slice(0, remainingSlots);
      
      console.log('🧠 [Hard Memory] Adding additional memories:', additionalMemories.length);
      foundMemories.push(...additionalMemories);
    }

    const context: HardMemoryContext = {
      foundMemories: foundMemories.slice(0, maxResults),
      relevantCount: foundMemories.length,
      searchQuery: currentQuery,
      tags: searchTags
    };

    console.log('🧠 [Hard Memory] Context prepared:', {
      foundMemories: context.foundMemories.length,
      relevantCount: context.relevantCount,
      searchQuery: context.searchQuery,
      memoryTitles: context.foundMemories.map(m => ({ 
        title: m.title, 
        contentLength: m.content.length,
        tags: m.tags 
      }))
    });

    return context;

  } catch (error) {
    console.error('🚨 [Hard Memory] Error in getHardMemoryContext:', error);
    if (error instanceof Error) {
      console.error('🚨 [Hard Memory] Error details:', error.message, error.stack);
    }
    return {
      foundMemories: [],
      relevantCount: 0,
      searchQuery: currentQuery,
      tags: searchTags
    };
  }
}

/**
 * Formats Hard Memory context into a system prompt addition
 */
export function formatHardMemoryForPrompt(context: HardMemoryContext): string {
  if (context.foundMemories.length === 0) {
    return '';
  }

  const parts: string[] = [
    '\n## 🗃️ Hard Memory Context',
    `Found ${context.foundMemories.length} relevant memories from your persistent knowledge base:`
  ];

  context.foundMemories.forEach((memory, index) => {
    const tags = memory.tags.length > 0 ? ` (${memory.tags.map(t => `#${t}`).join(' ')})` : '';
    const date = memory.createdAt.toLocaleDateString();
    
    parts.push(`\n**${index + 1}. ${memory.title}**${tags}`);
    parts.push(`*Created: ${date}*`);
    
    // Include more content for better context, but limit for token efficiency
    // For long content, prioritize the beginning and include key sections
    let content = memory.content;
    if (content.length > 1500) {
      // For very long content, include first 1000 chars and last 300 chars
      content = content.substring(0, 1000) + '\n\n[... content truncated ...]\n\n' + content.substring(content.length - 300);
    } else if (content.length > 800) {
      // For moderately long content, include first 600 chars
      content = content.substring(0, 600) + '...';
    }
    // For content <= 800 chars, include everything
    
    if (content.trim()) {
      parts.push(content);
    }
    
    if (index < context.foundMemories.length - 1) {
      parts.push('---'); // Separator between memories
    }
  });

  parts.push('\n💡 Use this information to provide more informed and contextual responses. Reference these memories when relevant, and suggest creating new memories for important information shared in our conversation.');

  return parts.join('\n');
}

/**
 * Saves a new Hard Memory from AI conversation
 */
export async function saveMemoryFromAI(
  userId: string,
  memoryRequest: SaveMemoryRequest
): Promise<Memory> {
  console.log('🧠 [Hard Memory] Saving memory from AI:', memoryRequest);

  try {
    const memory = await hardMemorySupabase.saveMemory({
      title: memoryRequest.title,
      content: memoryRequest.content,
      tags: memoryRequest.tags || [],
      folderId: memoryRequest.folderId || null,
      conversationSource: memoryRequest.conversationId,
      userId
    });

    console.log('🧠 [Hard Memory] Saved successfully:', memory.id);
    return memory;
  } catch (error) {
    console.error('🚨 Error saving memory from AI:', error);
    throw error;
  }
}

/**
 * Parses slash commands for memory operations
 * ./remember Title | Content | #tag1 #tag2
 * ./recall search terms
 */
export function parseMemoryCommand(input: string): {
  type: 'remember' | 'recall' | null;
  data: any;
} {
  const trimmed = input.trim();

  // Parse ./remember command
  if (trimmed.startsWith('./remember ')) {
    const content = trimmed.replace('./remember ', '');
    const parts = content.split('|').map(s => s.trim());
    
    const title = parts[0] || 'Untitled Memory';
    const memoryContent = parts[1] || '';
    const tagString = parts[2] || '';
    const tags = tagString.match(/#[\w]+/g)?.map(t => t.slice(1)) || [];
    
    return {
      type: 'remember',
      data: { title, content: memoryContent, tags }
    };
  }

  // Parse ./recall command
  if (trimmed.startsWith('./recall ')) {
    const query = trimmed.replace('./recall ', '');
    return {
      type: 'recall',
      data: { query }
    };
  }

  return { type: null, data: null };
}

/**
 * Extracts potential memory-worthy information from conversation
 * This can be used by AI to suggest saving memories
 */
export function extractMemoryWorthyContent(
  userMessage: string,
  aiResponse: string
): {
  shouldSuggest: boolean;
  suggestedTitle?: string;
  suggestedContent?: string;
  suggestedTags?: string[];
} {
  const combinedText = (userMessage + ' ' + aiResponse).toLowerCase();

  // Patterns that suggest memory-worthy content
  const patterns = [
    /(?:remember|save|note|important|keep track|don't forget)/,
    /(?:my name is|i am|i work as|i live in|my goal is)/,
    /(?:project|task|deadline|meeting|appointment)/,
    /(?:learned|discovered|found out|realized)/,
    /(?:recipe|instructions|steps|how to)/,
    /(?:contact|email|phone|address)/
  ];

  const shouldSuggest = patterns.some(pattern => pattern.test(combinedText));

  if (!shouldSuggest) {
    return { shouldSuggest: false };
  }

  // Extract potential title (first meaningful sentence from user)
  const sentences = userMessage.split('.').filter(s => s.trim().length > 10);
  const suggestedTitle = sentences[0]?.trim().substring(0, 50) || 'Important Information';

  // Combine user message and AI response as content
  const suggestedContent = `User: ${userMessage}\n\nAssistant: ${aiResponse}`;

  // Extract hashtags or generate tags based on content
  const extractedTags = combinedText.match(/#[\w]+/g)?.map(t => t.slice(1)) || [];
  const suggestedTags = extractedTags.length > 0 ? extractedTags : ['conversation'];

  return {
    shouldSuggest: true,
    suggestedTitle,
    suggestedContent,
    suggestedTags
  };
}
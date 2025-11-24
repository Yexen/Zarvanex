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
/**
 * Detects if query is asking for specific factual information
 */
function isFactualQuery(query: string): boolean {
  const factualPatterns = [
    /what.*name/i,
    /what.*called/i,
    /name of/i,
    /called\?/i,
    /how many/i,
    /what.*brand/i,
    /which.*university/i,
    /what.*city/i,
    /what.*number/i,
    /specific/i,
    /who.*is/i,
    /where.*from/i,
    /what.*type/i,
    /\b(solo|lilou|yexen|zarvânex|kazerun|tehran)\b/i, // Specific entities you mentioned
    /\bdog\b/i,
    /\bcat\b/i,
    /\bpet\b/i,
    /\buniversity\b/i,
    /\bcity\b/i,
    /\bbrand\b/i,
    /\bcompany\b/i
  ];
  
  // Also check if query contains potential proper nouns (capitalized words)
  const hasProperNouns = /\b[A-Z][a-z]+\b/.test(query);
  const hasNumbers = /\d+/.test(query);
  
  return factualPatterns.some(pattern => pattern.test(query)) || hasProperNouns || hasNumbers;
}

/**
 * Extracts potential entities and proper nouns from query
 */
function extractEntities(query: string): string[] {
  const entities = [];
  
  // Capitalized words (likely proper nouns)
  const capitalizedWords = query.match(/\b[A-Z][a-z]+\b/g) || [];
  entities.push(...capitalizedWords);
  
  // Words that look like names (common patterns)
  const namePatterns = [
    /\b[A-Z][a-z]{2,}\b/g, // Capitalized words 3+ chars
    /\b[A-Z]{2,}\b/g, // All caps (acronyms, brands)
    /\b\d+\b/g // Numbers
  ];
  
  namePatterns.forEach(pattern => {
    const matches = query.match(pattern) || [];
    entities.push(...matches);
  });
  
  // Remove duplicates and common words
  const stopWords = ['What', 'The', 'And', 'Are', 'You', 'How', 'Many', 'Called', 'Name', 'My', 'Is'];
  return [...new Set(entities)].filter(entity => !stopWords.includes(entity));
}

/**
 * Enhanced keyword search with entity recognition
 */
async function performKeywordSearch(userId: string, query: string): Promise<Memory[]> {
  console.log('🧠 [Hard Memory] Performing enhanced keyword search for:', query);
  
  // Get all memories for exact text search
  const allMemories = await hardMemorySupabase.getAllMemories(userId);
  
  // Extract entities and keywords
  const entities = extractEntities(query);
  const keywords = query.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 1) // Include shorter words for names
    .filter(word => !['what', 'the', 'and', 'are', 'you', 'how', 'many', 'called', 'name', 'my', 'is'].includes(word));
  
  console.log('🧠 [Hard Memory] Extracted entities:', entities);
  console.log('🧠 [Hard Memory] Extracted keywords:', keywords);
  
  const matches = allMemories.filter(memory => {
    const searchText = (memory.title + ' ' + memory.content).toLowerCase();
    const originalText = memory.title + ' ' + memory.content; // Keep original casing for entity matching
    
    // Priority 1: Exact phrase match
    if (searchText.includes(query.toLowerCase().trim())) {
      console.log(`🎯 [Hard Memory] Exact phrase match in: ${memory.title}`);
      return true;
    }
    
    // Priority 2: Entity matches (case-sensitive for proper nouns)
    const entityMatches = entities.some(entity => {
      const found = originalText.includes(entity);
      if (found) {
        console.log(`🎯 [Hard Memory] Entity "${entity}" found in: ${memory.title}`);
      }
      return found;
    });
    if (entityMatches) return true;
    
    // Priority 3: Case-insensitive entity matches
    const entityMatchesLower = entities.some(entity => {
      const found = searchText.includes(entity.toLowerCase());
      if (found) {
        console.log(`🎯 [Hard Memory] Entity "${entity}" (lowercase) found in: ${memory.title}`);
      }
      return found;
    });
    if (entityMatchesLower) return true;
    
    // Priority 4: Multiple keyword matches
    const keywordMatches = keywords.filter(keyword => searchText.includes(keyword));
    if (keywordMatches.length >= Math.min(2, keywords.length)) {
      console.log(`🎯 [Hard Memory] Multiple keywords [${keywordMatches.join(', ')}] found in: ${memory.title}`);
      return true;
    }
    
    // Priority 5: Single keyword match for short queries
    if (keywords.length === 1 && searchText.includes(keywords[0])) {
      console.log(`🎯 [Hard Memory] Single keyword "${keywords[0]}" found in: ${memory.title}`);
      return true;
    }
    
    return false;
  });
  
  console.log('🧠 [Hard Memory] Keyword search found:', matches.length, 'memories');
  return matches;
}

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
    const isFactual = isFactualQuery(currentQuery);
    
    console.log('🧠 [Hard Memory] Query classified as:', isFactual ? 'FACTUAL' : 'SEMANTIC');

    if (currentQuery.trim()) {
      if (isFactual) {
        // For factual queries, prioritize exact keyword search
        console.log('🧠 [Hard Memory] Using keyword search for factual query');
        const keywordResults = await performKeywordSearch(userId, currentQuery);
        foundMemories.push(...keywordResults);
        
        // If keyword search didn't find enough, supplement with semantic search
        if (foundMemories.length < maxResults) {
          console.log('🧠 [Hard Memory] Supplementing with semantic search');
          const searchResults = await hardMemorySupabase.searchMemories(
            currentQuery,
            searchTags,
            userId
          );
          
          // Add semantic results that aren't already in keyword results
          const foundIds = new Set(foundMemories.map(m => m.id));
          const additionalResults = searchResults.filter(m => !foundIds.has(m.id));
          foundMemories.push(...additionalResults);
        }
      } else {
        // For conceptual queries, use semantic search first
        console.log('🧠 [Hard Memory] Using semantic search for conceptual query');
        const searchResults = await hardMemorySupabase.searchMemories(
          currentQuery,
          searchTags,
          userId
        );
        foundMemories.push(...searchResults);
        
        // If semantic search didn't find enough, supplement with keyword search
        if (foundMemories.length < maxResults) {
          console.log('🧠 [Hard Memory] Supplementing with keyword search');
          const keywordResults = await performKeywordSearch(userId, currentQuery);
          
          const foundIds = new Set(foundMemories.map(m => m.id));
          const additionalResults = keywordResults.filter(m => !foundIds.has(m.id));
          foundMemories.push(...additionalResults);
        }
      }
      
      console.log('🧠 [Hard Memory] Combined search results:', foundMemories.length, foundMemories.map(m => ({ title: m.title, contentLength: m.content.length })));
      
      // Final fallback: If we still have no results for a factual query, do aggressive substring search
      if (foundMemories.length === 0 && isFactual) {
        console.log('🧠 [Hard Memory] No results found, trying aggressive fallback search');
        const allMemories = await hardMemorySupabase.getAllMemories(userId);
        const queryWords = currentQuery.toLowerCase().replace(/[^\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
        
        const fallbackMatches = allMemories.filter(memory => {
          const searchText = (memory.title + ' ' + memory.content).toLowerCase();
          return queryWords.some(word => searchText.includes(word));
        });
        
        console.log('🧠 [Hard Memory] Fallback search found:', fallbackMatches.length, 'memories');
        foundMemories.push(...fallbackMatches);
      }
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
    
    // Smart content inclusion strategy
    let content = memory.content;
    
    // For factual queries, try to include sections that contain query keywords
    const queryKeywords = context.searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    const hasQueryKeywords = queryKeywords.some(keyword => 
      content.toLowerCase().includes(keyword) || memory.title.toLowerCase().includes(keyword)
    );
    
    if (content.length > 1500) {
      if (hasQueryKeywords) {
        // Find and include sections around query keywords
        const lowerContent = content.toLowerCase();
        const keywordPositions = queryKeywords.map(keyword => 
          lowerContent.indexOf(keyword)
        ).filter(pos => pos >= 0);
        
        if (keywordPositions.length > 0) {
          // Include content around the first keyword match
          const keywordPos = Math.min(...keywordPositions);
          const start = Math.max(0, keywordPos - 400);
          const end = Math.min(content.length, keywordPos + 800);
          content = (start > 0 ? '... ' : '') + content.substring(start, end) + (end < content.length ? ' ...' : '');
        } else {
          // Fallback to beginning + end
          content = content.substring(0, 1000) + '\n\n[... content truncated ...]\n\n' + content.substring(content.length - 300);
        }
      } else {
        // For very long content without query keywords, include beginning + end
        content = content.substring(0, 1000) + '\n\n[... content truncated ...]\n\n' + content.substring(content.length - 300);
      }
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
import { supabase } from '@/lib/supabase';
import type { Conversation, Message } from '@/types';
import { formatConversationTimestamp, getRelativeTimeString } from '@/lib/temporal';

interface MemoryContext {
  recentMessages: Message[];
  relevantTopics: string[];
  conversationSummaries: string[];
  totalMessages: number;
  timespan: string;
}

interface MemoryOptions {
  maxRecentMessages?: number;
  maxSummaries?: number;
  relevanceThreshold?: number;
  includeCrossModel?: boolean;
}

/**
 * Retrieves conversation memory from Supabase for context injection
 */
export async function getConversationMemory(
  userId: string,
  currentQuery: string,
  options: MemoryOptions = {}
): Promise<MemoryContext> {
  const {
    maxRecentMessages = 20,
    maxSummaries = 5,
    relevanceThreshold = 0.3,
    includeCrossModel = true
  } = options;

  console.log('🧠 Fetching conversation memory for user:', userId, { currentQuery, options });

  try {
    // Fetch recent conversations
    const { data: conversations, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(50); // Get last 50 conversations

    if (error) {
      console.error('Error fetching conversation memory:', error);
      return getEmptyMemoryContext();
    }

    if (!conversations || conversations.length === 0) {
      console.log('🧠 No conversation history found');
      return getEmptyMemoryContext();
    }

    // Extract all messages from all conversations
    const allMessages: Message[] = [];
    const conversationSummaries: string[] = [];
    
    for (const conv of conversations) {
      if (Array.isArray(conv.messages)) {
        const messages = conv.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.timestamp),
          modelId: msg.modelId,
          modelName: msg.modelName,
          images: msg.images
        }));
        
        allMessages.push(...messages);
        
        // Create conversation summary
        const userMessages = messages.filter((m: Message) => m.role === 'user').length;
        const aiMessages = messages.filter((m: Message) => m.role === 'assistant').length;
        const models = [...new Set(messages.map((m: Message) => m.modelName).filter(Boolean))];
        
        if (userMessages > 0 && aiMessages > 0) {
          conversationSummaries.push(
            `"${conv.title}" (${userMessages + aiMessages} messages, models: ${models.join(', ') || 'unknown'})`
          );
        }
      }
    }

    console.log('🧠 Total messages found:', allMessages.length);

    // Get most recent messages
    const sortedMessages = allMessages
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxRecentMessages);

    // Find relevant topics/keywords from past conversations
    const relevantTopics = extractRelevantTopics(allMessages, currentQuery, relevanceThreshold);

    // Calculate timespan
    const oldestMessage = allMessages[allMessages.length - 1];
    const timespan = oldestMessage 
      ? getTimespanDescription(new Date(oldestMessage.timestamp), new Date())
      : 'No history';

    const memoryContext: MemoryContext = {
      recentMessages: sortedMessages,
      relevantTopics,
      conversationSummaries: conversationSummaries.slice(0, maxSummaries),
      totalMessages: allMessages.length,
      timespan
    };

    console.log('🧠 Memory context prepared:', {
      recentMessages: memoryContext.recentMessages.length,
      topics: memoryContext.relevantTopics.length,
      summaries: memoryContext.conversationSummaries.length,
      totalMessages: memoryContext.totalMessages,
      timespan: memoryContext.timespan
    });

    return memoryContext;

  } catch (error) {
    console.error('🚨 Error in getConversationMemory:', error);
    return getEmptyMemoryContext();
  }
}

/**
 * Formats memory context into a system prompt addition
 */
export function formatMemoryForPrompt(memory: MemoryContext, userPreferences?: any): string {
  if (memory.totalMessages === 0) {
    return '';
  }

  const parts: string[] = [
    '\n## Conversation Memory Context',
    `You have access to this user's conversation history spanning ${memory.timespan} with ${memory.totalMessages} total messages.`
  ];

  // Add conversation summaries
  if (memory.conversationSummaries.length > 0) {
    parts.push('\n### Previous Conversations:');
    memory.conversationSummaries.forEach(summary => {
      parts.push(`- ${summary}`);
    });
  }

  // Add recent messages context with relative timestamps
  if (memory.recentMessages.length > 0) {
    parts.push(`\n### Recent Messages (last ${memory.recentMessages.length}):`);

    // Group by conversation and show condensed format
    const recentByDate = memory.recentMessages.slice(0, 10); // Show last 10 for prompt
    recentByDate.forEach(msg => {
      const relativeTime = formatConversationTimestamp(msg.timestamp);
      const model = msg.modelName ? ` (${msg.modelName})` : '';
      const content = msg.content.length > 100 ? msg.content.substring(0, 100) + '...' : msg.content;
      parts.push(`- ${relativeTime} - ${msg.role}${model}: ${content}`);
    });
  }

  // Add relevant topics
  if (memory.relevantTopics.length > 0) {
    parts.push(`\n### Topics You've Discussed: ${memory.relevantTopics.join(', ')}`);
  }

  parts.push('\nUse this context to provide more personalized and contextually aware responses. Reference past conversations when relevant, but don\'t overwhelm with details unless specifically asked.');

  return parts.join('\n');
}

/**
 * Extracts relevant topics and keywords from conversation history
 */
function extractRelevantTopics(messages: Message[], currentQuery: string, threshold: number): string[] {
  const topics: Set<string> = new Set();
  const queryWords = currentQuery.toLowerCase().split(' ').filter(word => word.length > 3);

  // Extract topics from user messages (questions/topics they care about)
  const userMessages = messages.filter(m => m.role === 'user');
  
  userMessages.forEach(msg => {
    const content = msg.content.toLowerCase();
    
    // Look for question patterns and key topics
    const topicPatterns = [
      /(?:about|regarding|concerning|related to)\s+([a-zA-Z][a-zA-Z\s]{2,20})/g,
      /(?:how to|ways to|help with)\s+([a-zA-Z][a-zA-Z\s]{2,20})/g,
      /(?:learn|understand|explain)\s+([a-zA-Z][a-zA-Z\s]{2,20})/g,
      /(?:working on|building|creating)\s+([a-zA-Z][a-zA-Z\s]{2,20})/g
    ];

    topicPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const topic = match[1].trim();
        if (topic.length > 3 && topic.length < 25) {
          topics.add(topic);
        }
      }
    });

    // Also check for relevance to current query
    queryWords.forEach(queryWord => {
      if (content.includes(queryWord)) {
        // Extract context around the query word
        const words = content.split(' ');
        const index = words.findIndex(word => word.includes(queryWord));
        if (index > 0) {
          const context = words.slice(Math.max(0, index - 2), Math.min(words.length, index + 3)).join(' ');
          if (context.length > 5 && context.length < 30) {
            topics.add(context.replace(/[^\w\s]/g, '').trim());
          }
        }
      }
    });
  });

  return Array.from(topics).slice(0, 10); // Return top 10 topics
}

/**
 * Describes the timespan between two dates
 */
function getTimespanDescription(start: Date, end: Date): string {
  const diffMs = end.getTime() - start.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffDays === 0) return 'today';
  if (diffDays === 1) return '1 day';
  if (diffDays < 7) return `${diffDays} days`;
  if (diffWeeks === 1) return '1 week';
  if (diffWeeks < 4) return `${diffWeeks} weeks`;
  if (diffMonths === 1) return '1 month';
  return `${diffMonths} months`;
}

/**
 * Returns empty memory context
 */
function getEmptyMemoryContext(): MemoryContext {
  return {
    recentMessages: [],
    relevantTopics: [],
    conversationSummaries: [],
    totalMessages: 0,
    timespan: 'No history'
  };
}
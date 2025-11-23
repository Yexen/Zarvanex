import type { Message } from '@/types';

interface TitleGenerationOptions {
  provider: 'openrouter' | 'groq' | 'openai' | 'claude' | 'cohere' | 'ollama';
  modelId: string;
  userMessage: string;
  assistantMessage?: string;
  conversationContext?: Message[];
}

/**
 * Generate a smart, concise title for a conversation using AI
 */
export async function generateSmartTitle(options: TitleGenerationOptions): Promise<string> {
  const { provider, modelId, userMessage, assistantMessage, conversationContext } = options;

  // Create a concise context for title generation
  const context = conversationContext?.slice(0, 4) || []; // Only first 4 messages for context
  const contextText = context.length > 0 
    ? `Previous context: ${context.map(m => `${m.role}: ${m.content.slice(0, 100)}`).join('\n')}`
    : '';

  const titlePrompt = `Generate a concise, descriptive title (3-6 words) for this conversation. The title should capture the main topic or purpose.

${contextText}

Current exchange:
User: ${userMessage.slice(0, 200)}${userMessage.length > 200 ? '...' : ''}
${assistantMessage ? `Assistant: ${assistantMessage.slice(0, 200)}${assistantMessage.length > 200 ? '...' : ''}` : ''}

Requirements:
- 3-6 words maximum
- Clear and descriptive
- No quotes or special formatting
- Capture the main topic/intent

Title:`;

  try {
    let generatedTitle: string;

    switch (provider) {
      case 'openrouter':
        generatedTitle = await generateTitleWithOpenRouter(titlePrompt, modelId);
        break;
      case 'groq':
        generatedTitle = await generateTitleWithGroq(titlePrompt, modelId);
        break;
      case 'openai':
        generatedTitle = await generateTitleWithOpenAI(titlePrompt, modelId);
        break;
      case 'claude':
        generatedTitle = await generateTitleWithClaude(titlePrompt, modelId);
        break;
      case 'cohere':
        generatedTitle = await generateTitleWithCohere(titlePrompt, modelId);
        break;
      case 'ollama':
        generatedTitle = await generateTitleWithOllama(titlePrompt, modelId);
        break;
      default:
        throw new Error(`Unsupported provider: ${provider}`);
    }

    // Clean and validate the title
    const cleanTitle = cleanGeneratedTitle(generatedTitle);
    
    // Return the clean title or fallback
    return cleanTitle || generateFallbackTitle(userMessage);

  } catch (error) {
    console.error('Error generating smart title:', error);
    return generateFallbackTitle(userMessage);
  }
}

async function generateTitleWithOpenRouter(prompt: string, modelId: string): Promise<string> {
  const response = await fetch('/api/chat/openrouter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      modelId,
      systemPrompt: 'You are a title generator. Respond with ONLY the title, no explanations or extra text.',
    }),
  });

  if (!response.ok) {
    throw new Error('OpenRouter title generation failed');
  }

  // Handle streaming response
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullResponse += parsed.content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  return fullResponse;
}

async function generateTitleWithGroq(prompt: string, modelId: string): Promise<string> {
  const response = await fetch('/api/chat/groq', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{ role: 'user', content: prompt }],
      modelId,
      systemPrompt: 'You are a title generator. Respond with ONLY the title, no explanations or extra text.',
    }),
  });

  if (!response.ok) {
    throw new Error('Groq title generation failed');
  }

  // Similar streaming handling as OpenRouter
  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  let fullResponse = '';

  if (reader) {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullResponse += parsed.content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  return fullResponse;
}

// Placeholder implementations for other providers
async function generateTitleWithOpenAI(prompt: string, modelId: string): Promise<string> {
  // Similar implementation to OpenRouter
  return generateFallbackTitle(prompt);
}

async function generateTitleWithClaude(prompt: string, modelId: string): Promise<string> {
  // Similar implementation to OpenRouter
  return generateFallbackTitle(prompt);
}

async function generateTitleWithCohere(prompt: string, modelId: string): Promise<string> {
  // Similar implementation to OpenRouter
  return generateFallbackTitle(prompt);
}

async function generateTitleWithOllama(prompt: string, modelId: string): Promise<string> {
  // Use the existing Ollama implementation
  const { generateTitle } = await import('@/lib/lmstudio');
  return generateTitle(prompt.split('User: ')[1] || prompt, '', modelId);
}

function cleanGeneratedTitle(title: string): string {
  if (!title) return '';

  // Remove common prefixes and suffixes
  let cleaned = title
    .replace(/^(Title:|Generated title:|Conversation title:)\s*/i, '')
    .replace(/^["']|["']$/g, '') // Remove quotes
    .replace(/^\s*[-•]\s*/, '') // Remove bullet points
    .trim();

  // Limit to reasonable length and word count
  const words = cleaned.split(/\s+/).filter(w => w.length > 0);
  if (words.length > 6) {
    cleaned = words.slice(0, 6).join(' ');
  }

  // Capitalize first letter
  if (cleaned.length > 0) {
    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  return cleaned;
}

function generateFallbackTitle(userMessage: string): string {
  if (!userMessage) return 'New Conversation';

  // Extract key words and create a simple title
  const words = userMessage
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(word => word.length > 2)
    .slice(0, 4);

  if (words.length === 0) return 'New Conversation';

  const title = words.join(' ');
  return title.length > 50 ? title.slice(0, 47) + '...' : title;
}

/**
 * Determine if we should use AI title generation based on provider
 */
export function shouldUseSmartTitles(provider: string): boolean {
  // Enable smart titles for cloud providers
  return ['openrouter', 'groq', 'openai', 'claude', 'cohere'].includes(provider);
}
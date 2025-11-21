import { CohereClient } from 'cohere-ai';
import type { Message } from '@/types';

// Initialize Cohere client
export function createCohereClient(apiKey: string) {
  return new CohereClient({ token: apiKey });
}

/**
 * Send message to Cohere with streaming support
 */
export async function sendCohereMessage(
  messages: Message[],
  modelId: string,
  apiKey: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const cohere = createCohereClient(apiKey);

  // Convert messages to Cohere chat format
  const chatHistory = messages.slice(0, -1).map((msg) => ({
    role: msg.role === 'assistant' ? ('CHATBOT' as const) : ('USER' as const),
    message: msg.content,
  }));

  const lastMessage = messages[messages.length - 1];
  const userMessage = lastMessage.role === 'user' ? lastMessage.content : '';

  try {
    if (onChunk) {
      // Streaming response
      const stream = await cohere.chatStream({
        model: modelId,
        message: userMessage,
        chatHistory: chatHistory,
        temperature: 0.7,
        maxTokens: 4096,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        if (chunk.eventType === 'text-generation') {
          const content = chunk.text;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        }
      }
      return fullResponse;
    } else {
      // Non-streaming response
      const response = await cohere.chat({
        model: modelId,
        message: userMessage,
        chatHistory: chatHistory,
        temperature: 0.7,
        maxTokens: 4096,
      });

      return response.text || '';
    }
  } catch (error) {
    console.error('Cohere API error:', error);
    throw error;
  }
}

/**
 * Available Cohere models
 */
export const COHERE_MODELS = [
  {
    id: 'command-a-03-2025',
    name: 'Command A (March 2025)',
    description: 'Main model for general tasks and conversations',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: false,
    isFree: false,
  },
  {
    id: 'command-a-reasoning-08-2025',
    name: 'Command A Reasoning (Aug 2025)',
    description: 'Deep reasoning model for complex problem-solving',
    contextWindow: 128000,
    hasThinkingMode: true,
    supportsVision: false,
    isFree: false,
  },
  {
    id: 'command-a-translate-08-2025',
    name: 'Command A Translate (Aug 2025)',
    description: 'Specialized model for translation tasks',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: false,
    isFree: false,
  },
  {
    id: 'command-a-vision-07-2025',
    name: 'Command A Vision (July 2025)',
    description: 'Model with image analysis capabilities',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: false,
  },
];

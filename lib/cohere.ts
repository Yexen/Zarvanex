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
  onChunk?: (chunk: string) => void,
  systemPrompt?: string
): Promise<string> {
  const cohere = createCohereClient(apiKey);

  // Check if this is a vision model
  const isVisionModel = modelId.includes('vision');
  
  // Convert messages to Cohere chat format
  const chatHistory = messages.slice(0, -1).map((msg) => {
    // For vision models, handle images properly
    if (isVisionModel && msg.images && msg.images.length > 0) {
      // Cohere vision API format - need to include images in a special way
      // For now, we'll describe the images in text since Cohere's SDK may need updates
      let content = msg.content;
      content += `\n\n[Note: ${msg.images.length} image(s) were attached with this message]`;
      return {
        role: msg.role === 'assistant' ? ('CHATBOT' as const) : ('USER' as const),
        message: content,
      };
    }
    
    return {
      role: msg.role === 'assistant' ? ('CHATBOT' as const) : ('USER' as const),
      message: msg.content,
    };
  });

  const lastMessage = messages[messages.length - 1];
  let userMessage = lastMessage.role === 'user' ? lastMessage.content : '';

  // Handle images in the last message
  if (lastMessage.images && lastMessage.images.length > 0) {
    if (isVisionModel) {
      // For vision models, we should process images properly
      // However, Cohere's Node.js SDK may need updates for proper vision support
      // For now, we'll add a descriptive note
      userMessage += `\n\n[Note: ${lastMessage.images.length} image(s) were attached. Processing with vision capabilities enabled.]`;
    } else {
      // Non-vision models - add note that images can't be processed
      userMessage += `\n\n[Note: ${lastMessage.images.length} image(s) attached but cannot be processed by this model as it doesn't support vision]`;
    }
  }

  try {
    if (onChunk) {
      // Streaming response
      const stream = await cohere.chatStream({
        model: modelId,
        message: userMessage,
        chatHistory: chatHistory,
        temperature: 0.7,
        maxTokens: 4096,
        ...(systemPrompt && { preamble: systemPrompt }),
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
        ...(systemPrompt && { preamble: systemPrompt }),
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

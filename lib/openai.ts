import OpenAI from 'openai';
import type { Message } from '@/types';

// Initialize OpenAI client
export function createOpenAIClient(apiKey: string) {
  return new OpenAI({ apiKey });
}

/**
 * Send message to OpenAI with streaming support
 */
export async function sendOpenAIMessage(
  messages: Message[],
  modelId: string,
  apiKey: string,
  onChunk?: (chunk: string) => void,
  systemPrompt?: string
): Promise<string> {
  const openai = createOpenAIClient(apiKey);

  // Convert our messages to OpenAI format
  const formattedMessages = messages.map((msg) => {
    // If message has images, use multimodal content format
    if (msg.images && msg.images.length > 0) {
      const content = [
        { type: 'text' as const, text: msg.content },
        ...msg.images.map(imageData => ({
          type: 'image_url' as const,
          image_url: {
            url: imageData.startsWith('data:') ? imageData : `data:image/png;base64,${imageData}`,
          },
        })),
      ];

      return {
        role: msg.role,
        content,
      };
    }

    // Regular text message
    return {
      role: msg.role,
      content: msg.content,
    };
  });

  // Add system prompt as first message if provided
  if (systemPrompt) {
    (formattedMessages as any).unshift({
      role: 'system',
      content: systemPrompt,
    });
  }

  try {
    if (onChunk) {
      // Streaming response
      const stream = await openai.chat.completions.create({
        model: modelId,
        messages: formattedMessages as any,
        temperature: 0.7,
        max_tokens: 4096,
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          onChunk(content);
        }
      }
      return fullResponse;
    } else {
      // Non-streaming response
      const completion = await openai.chat.completions.create({
        model: modelId,
        messages: formattedMessages as any,
        temperature: 0.7,
        max_tokens: 4096,
        stream: false,
      });

      return completion.choices[0]?.message?.content || '';
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw error;
  }
}

/**
 * Available OpenAI models
 */
export const OPENAI_MODELS = [
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Most capable GPT-4 model, multimodal',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: false,
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Affordable and fast, multimodal',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: false,
  },
  {
    id: 'o1',
    name: 'o1',
    description: 'Advanced reasoning model',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: false,
    isFree: false,
  },
  {
    id: 'o1-mini',
    name: 'o1 Mini',
    description: 'Fast reasoning model',
    contextWindow: 128000,
    hasThinkingMode: true,
    supportsVision: false,
    isFree: false,
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Previous flagship model',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: false,
  },
];

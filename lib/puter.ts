import type { Message } from '@/types';

// Declare global puter object
declare global {
  interface Window {
    puter: {
      ai: {
        chat: (message: string | any[], options?: { model?: string; stream?: boolean }) => Promise<string | ReadableStream>;
        txt2speech: (text: string, options?: { voice?: string; engine?: string; language?: string }) => Promise<any>;
        img2txt: (imageUrl: string) => Promise<string>;
      };
      auth: {
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        getUser: () => Promise<any>;
      };
    };
  }
}

/**
 * Send message to Puter AI with streaming support
 */
export async function sendPuterMessage(
  messages: Message[],
  modelId: string,
  onChunk?: (chunk: string) => void,
  systemPrompt?: string
): Promise<string> {
  // Check if puter is available
  if (typeof window === 'undefined' || !window.puter) {
    throw new Error('Puter.js is not loaded');
  }

  // Convert messages to Puter format
  const formattedMessages = messages.map((msg) => {
    // If message has images, format as multimodal
    if (msg.images && msg.images.length > 0) {
      return {
        role: msg.role,
        content: [
          { type: 'text', text: msg.content },
          ...msg.images.map(img => ({ type: 'image', data: img }))
        ]
      };
    }

    return {
      role: msg.role,
      content: msg.content
    };
  });

  // Add system prompt if provided
  if (systemPrompt) {
    (formattedMessages as any).unshift({
      role: 'system',
      content: systemPrompt
    });
  }

  try {
    if (onChunk) {
      // Streaming response
      const stream = await window.puter.ai.chat(formattedMessages as any, {
        model: modelId,
        stream: true,
      });

      let fullResponse = '';

      if (stream instanceof ReadableStream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          fullResponse += chunk;
          onChunk(chunk);
        }
      }

      return fullResponse;
    } else {
      // Non-streaming response
      const response = await window.puter.ai.chat(formattedMessages as any, {
        model: modelId,
        stream: false,
      });

      return typeof response === 'string' ? response : '';
    }
  } catch (error) {
    console.error('Puter AI error:', error);
    throw error;
  }
}

/**
 * Available Puter AI models (free, no API key required)
 */
export const PUTER_MODELS = [
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1 (Free)',
    description: 'Latest GPT model via Puter - user-pays model',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gpt-5',
    name: 'GPT-5 (Free)',
    description: 'Advanced GPT model via Puter - user-pays model',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Free)',
    description: 'Multimodal GPT-4o via Puter - user-pays model',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 4 Sonnet (Free)',
    description: 'Claude 4 via Puter - user-pays model',
    contextWindow: 200000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gemini-2.0-flash-exp',
    name: 'Gemini 2.0 Flash (Free)',
    description: 'Google Gemini via Puter - user-pays model',
    contextWindow: 1000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat (Free)',
    description: 'DeepSeek AI via Puter - user-pays model',
    contextWindow: 64000,
    hasThinkingMode: false,
    supportsVision: false,
    isFree: true,
  },
];

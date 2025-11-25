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
    console.log('Calling Puter AI with model:', modelId);
    console.log('Formatted messages:', formattedMessages);

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
    console.error('Puter AI error details:', error);
    console.error('Model ID that failed:', modelId);
    console.error('Error message:', (error as Error).message);
    console.error('Full error object:', JSON.stringify(error, null, 2));
    throw error;
  }
}

/**
 * Available Puter AI models (free, no API key required)
 */
export const PUTER_MODELS = [
  // TIER S - Best Overall
  {
    id: 'google/gemini-3-pro',
    name: 'Gemini 3 Pro (Free)',
    description: '🔥 Released Nov 18, 2025 - Record 1501 Elo score, best multimodal understanding',
    contextWindow: 2000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1 (Free)',
    description: 'Latest OpenAI update via Puter - improved reasoning',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5 (Free)',
    description: 'Top reasoning, coding, writing - via Puter',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'x-ai/grok-4.1-fast',
    name: 'Grok 4.1 Fast (Free)',
    description: '2M context window - fast agentic capabilities',
    contextWindow: 2000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },

  // TIER A - Excellent Specialized
  {
    id: 'deepseek/deepseek-r1',
    name: 'DeepSeek R1 (Free)',
    description: 'Best reasoning model - step-by-step analysis',
    contextWindow: 64000,
    hasThinkingMode: true,
    supportsVision: false,
    isFree: true,
  },
  {
    id: 'claude-opus-4-1',
    name: 'Claude Opus 4.1 (Free)',
    description: 'Maximum capability Claude - via Puter',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'qwen/qwen2.5-vl-72b-instruct',
    name: 'Qwen 2.5-VL-72B (Free)',
    description: 'Best vision/video analysis, OCR - via Puter',
    contextWindow: 32768,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 Thinking (Free)',
    description: 'Deep reasoning, multilingual (Chinese++) - via Puter',
    contextWindow: 128000,
    hasThinkingMode: true,
    supportsVision: false,
    isFree: true,
  },
  {
    id: 'qwen/qwen3-vl-235b-a22b-instruct',
    name: 'Qwen3-VL-235B-A22B (Free)',
    description: 'Massive 235B parameter vision model - via Puter',
    contextWindow: 32768,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: true,
  },

  // TIER B - Fast & Efficient
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Free)',
    description: 'Fast, multimodal, balanced - via Puter',
    contextWindow: 1000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Free)',
    description: 'Reliable, fast, general purpose - via Puter',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5 (Free)',
    description: 'Fastest Claude model - via Puter',
    contextWindow: 200000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },

  // Legacy models (keeping for compatibility)
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

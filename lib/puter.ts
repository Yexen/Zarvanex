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
  if (typeof window === 'undefined') {
    throw new Error('Window is not defined - running on server side?');
  }

  if (!window.puter) {
    throw new Error('Puter.js is not loaded. Please refresh the page and wait for Puter.js to load.');
  }

  if (!window.puter.ai) {
    throw new Error('Puter.ai is not available. The Puter SDK may not be fully initialized.');
  }

  // Check if user is signed in
  try {
    const isSignedIn = await window.puter.auth.isSignedIn();
    if (!isSignedIn) {
      throw new Error('You are not signed in to Puter. Please sign in at puter.com first.');
    }
  } catch (authError) {
    console.error('Auth check error:', authError);
    throw new Error('Could not verify Puter authentication: ' + (authError as Error).message);
  }

  // Convert messages to Puter format
  // Puter expects array of {role, content} objects where content is a string
  const formattedMessages = messages
    .filter(msg => msg.content && msg.content.trim().length > 0) // Only include messages with content
    .map((msg) => {
      return {
        role: msg.role, // 'user' or 'assistant'
        content: msg.content.trim()
      };
    });

  // Prepend system prompt to first user message instead of using system role
  // Puter may not support 'system' role
  if (systemPrompt && formattedMessages.length > 0 && formattedMessages[0].role === 'user') {
    formattedMessages[0] = {
      role: 'user',
      content: `${systemPrompt}\n\n${formattedMessages[0].content}`
    };
  }

  console.log('Final formatted messages:', JSON.stringify(formattedMessages, null, 2));

  // Validate all messages have content
  for (const msg of formattedMessages) {
    if (!msg.content || typeof msg.content !== 'string') {
      throw new Error(`Invalid message format: message missing content. Message: ${JSON.stringify(msg)}`);
    }
  }

  try {
    console.log('Calling Puter AI with model:', modelId);
    console.log('Formatted messages:', formattedMessages);

    if (onChunk) {
      // Streaming response
      console.log('Requesting streaming response...');
      const stream = await window.puter.ai.chat(formattedMessages as any, {
        model: modelId,
        stream: true,
      });

      console.log('Stream received:', typeof stream, stream);
      console.log('Is ReadableStream?', stream instanceof ReadableStream);

      let fullResponse = '';

      if (stream instanceof ReadableStream) {
        console.log('Processing ReadableStream...');
        const reader = stream.getReader();
        const decoder = new TextDecoder();

        let chunkCount = 0;
        while (true) {
          const { done, value } = await reader.read();
          console.log(`Chunk ${chunkCount++}:`, { done, valueType: typeof value, valueLength: value?.length });

          if (done) {
            console.log('Stream complete. Total response length:', fullResponse.length);
            break;
          }

          const chunk = decoder.decode(value, { stream: true });
          console.log('Decoded chunk:', chunk);
          fullResponse += chunk;
          onChunk(chunk);
        }
      } else {
        console.warn('Stream is not a ReadableStream, treating as direct response');
        fullResponse = typeof stream === 'string' ? stream : JSON.stringify(stream);
        onChunk(fullResponse);
      }

      console.log('Final fullResponse:', fullResponse);
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
    console.error('Error type:', typeof error);
    console.error('Error constructor:', error?.constructor?.name);

    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }

    try {
      console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
    } catch (jsonError) {
      console.error('Could not stringify error');
    }

    // Create a more detailed error message
    let errorMessage = 'Puter API call failed. ';
    if (error instanceof Error) {
      errorMessage += error.message;
    } else if (typeof error === 'object' && error !== null) {
      errorMessage += JSON.stringify(error);
    } else {
      errorMessage += String(error);
    }

    throw new Error(errorMessage);
  }
}

/**
 * Available Puter AI models (free, no API key required)
 * Model IDs must match Puter's exact naming convention
 */
export const PUTER_MODELS = [
  // TIER S - Best Overall (Direct Puter Access)
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview (Free)',
    description: '🔥 Latest Gemini - Record 1501 Elo, best multimodal',
    contextWindow: 2000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1 (Free)',
    description: 'Latest OpenAI update - improved reasoning',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5 (Free)',
    description: 'Top reasoning, coding, writing',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-opus-4-1',
    name: 'Claude Opus 4.1 (Free)',
    description: 'Maximum capability Claude',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5 (Free)',
    description: 'Fastest Claude model',
    contextWindow: 200000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'google/gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Free)',
    description: 'Fast, multimodal, balanced',
    contextWindow: 1000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Free)',
    description: 'Reliable, fast, general purpose',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },

  // TIER A - Excellent Specialized (Moonshot, DeepSeek)
  {
    id: 'moonshotai/kimi-k2-thinking',
    name: 'Kimi K2 Thinking (Free)',
    description: 'Deep reasoning, multilingual (Chinese++)',
    contextWindow: 128000,
    hasThinkingMode: true,
    supportsVision: false,
    isFree: true,
  },
  {
    id: 'deepseek-chat',
    name: 'DeepSeek Chat (Free)',
    description: 'DeepSeek AI - step-by-step reasoning',
    contextWindow: 64000,
    hasThinkingMode: false,
    supportsVision: false,
    isFree: true,
  },

  // OpenRouter Models (require openrouter: prefix)
  {
    id: 'openrouter:google/gemini-3-pro-image-preview',
    name: 'Gemini 3 Pro Image (Free)',
    description: '🔥 Gemini 3 Pro optimized for image understanding',
    contextWindow: 2000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'openrouter:qwen/qwen2.5-vl-72b-instruct',
    name: 'Qwen 2.5-VL-72B (Free)',
    description: 'Best vision/video analysis, OCR',
    contextWindow: 32768,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'openrouter:google/gemma-3-27b',
    name: 'Gemma 3 27B (Free)',
    description: 'Google Gemma latest',
    contextWindow: 8192,
    hasThinkingMode: false,
    supportsVision: false,
    isFree: true,
  },

  // Legacy models (keeping for compatibility)
  {
    id: 'gpt-5',
    name: 'GPT-5 (Free)',
    description: 'Advanced GPT model',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-sonnet-4',
    name: 'Claude Sonnet 4 (Free)',
    description: 'Claude 4 Sonnet',
    contextWindow: 200000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-opus-4',
    name: 'Claude Opus 4 (Free)',
    description: 'Claude 4 Opus',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: true,
  },
];

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
  // Puter expects array of {role, content} objects
  // For vision models, content can be an array with text and image_url objects
  const formattedMessages = messages
    .filter(msg => msg.content && msg.content.trim().length > 0) // Only include messages with content
    .map((msg) => {
      // If message has images, format for vision models
      if (msg.images && msg.images.length > 0) {
        // Puter vision format: content is array of {type, text/image_url}
        const content: any[] = [
          { type: 'text', text: msg.content.trim() }
        ];

        // Add images
        for (const imageData of msg.images) {
          // Skip non-image data (like videos or documents that couldn't be processed)
          if (!imageData.startsWith('data:image/') && !imageData.startsWith('data:video/')) {
            continue;
          }

          content.push({
            type: 'image_url',
            image_url: {
              url: imageData
            }
          });
        }

        console.log(`[Puter] Message has ${msg.images.length} media attachments`);

        return {
          role: msg.role,
          content
        };
      }

      // Regular text-only message
      return {
        role: msg.role, // 'user' or 'assistant'
        content: msg.content.trim()
      };
    });

  // Handle system prompt - add as first message if we have messages
  if (systemPrompt) {
    if (formattedMessages.length > 0) {
      // Find the first user message and prepend system prompt
      const firstUserIndex = formattedMessages.findIndex(msg => msg.role === 'user');
      
      if (firstUserIndex >= 0) {
        const firstMsg = formattedMessages[firstUserIndex];

        if (Array.isArray(firstMsg.content)) {
          // Content is array (multimodal) - prepend system prompt to text part
          const textPart = firstMsg.content.find((c: any) => c.type === 'text');
          if (textPart) {
            textPart.text = `${systemPrompt}\n\n${textPart.text}`;
          } else {
            // No text part found, add one
            firstMsg.content.unshift({ type: 'text', text: systemPrompt });
          }
        } else {
          // Content is string - simple prepend
          firstMsg.content = `${systemPrompt}\n\n${firstMsg.content}`;
        }
      } else {
        // No user message found, add system prompt as new user message
        formattedMessages.unshift({
          role: 'user',
          content: systemPrompt
        });
      }
    } else {
      // No messages at all, add system prompt as user message
      formattedMessages.push({
        role: 'user',
        content: systemPrompt
      });
    }
  }

  // If we still have no messages, add a default greeting
  if (formattedMessages.length === 0) {
    formattedMessages.push({
      role: 'user',
      content: 'Hello!'
    });
  }

  console.log('Final formatted messages:', JSON.stringify(formattedMessages, null, 2));

  // Validate all messages have content
  for (const msg of formattedMessages) {
    const hasContent = msg.content && (
      typeof msg.content === 'string' ||
      (Array.isArray(msg.content) && msg.content.length > 0)
    );
    if (!hasContent) {
      throw new Error(`Invalid message format: message missing content. Message: ${JSON.stringify(msg)}`);
    }
  }

  try {
    console.log('Calling Puter AI with model:', modelId);
    console.log('Formatted messages:', formattedMessages);

    // List of fallback models to try in order
    const fallbackModels = [
      modelId, // Try the requested model first
      'gpt-4o', // Reliable fallback
      'claude-sonnet-4-5', // Another fallback
      'gemini-2.5-flash', // Third fallback
      'gpt-3.5-turbo', // Last resort
    ].filter((id, index, arr) => arr.indexOf(id) === index); // Remove duplicates

    let lastError: Error | null = null;
    
    for (const tryModel of fallbackModels) {
      try {
        console.log(`Trying Puter AI with model: ${tryModel}`);
        
        if (onChunk) {
          // Streaming response
          console.log('Requesting streaming response...');
          const stream = await window.puter.ai.chat(formattedMessages as any, {
            model: tryModel,
            stream: true,
          });

          console.log('Stream received:', typeof stream, stream?.constructor?.name);
          console.log('Is ReadableStream?', stream instanceof ReadableStream);
          console.log('Is AsyncGenerator?', stream?.constructor?.name === 'AsyncGenerator');

          let fullResponse = '';

          // Check if it's an AsyncGenerator (Puter's format)
          // TypeScript type guard for async iterables
          const isAsyncIterable = (obj: any): obj is AsyncIterable<any> => {
            return obj && typeof obj[Symbol.asyncIterator] === 'function';
          };

          console.log('Stream analysis:', {
            isAsyncIterable: isAsyncIterable(stream),
            isReadableStream: stream instanceof ReadableStream,
            constructor: stream?.constructor?.name,
            type: typeof stream,
            hasAsyncIterator: !!stream?.[Symbol.asyncIterator]
          });

          if (isAsyncIterable(stream)) {
            console.log('Processing AsyncGenerator...');
            let chunkCount = 0;

            try {
              for await (const chunk of stream) {
                console.log(`Chunk ${chunkCount++}:`, typeof chunk, chunk);

                let content = '';

                // Puter sends chunks as objects with type and text fields
                if (typeof chunk === 'object' && chunk !== null) {
                  // Handle {type: "text", text: "..."} format
                  if (chunk.type === 'text' && chunk.text) {
                    content = chunk.text;
                    console.log('✅ Found text content:', content.substring(0, 50) + '...');
                  }
                  // Handle {content: "..."} format
                  else if (chunk.content) {
                    content = chunk.content;
                    console.log('✅ Found content:', content.substring(0, 50) + '...');
                  }
                  // Handle direct text chunks
                  else if (chunk.text) {
                    content = chunk.text;
                    console.log('✅ Found direct text:', content.substring(0, 50) + '...');
                  }
                  // Skip extra_content chunks (metadata like thought_signature)
                  else if (chunk.type === 'extra_content') {
                    console.log('Skipping extra_content chunk');
                    continue;
                  }
                  // Log unhandled chunk types
                  else {
                    console.log('❓ Unhandled chunk structure:', Object.keys(chunk));
                  }
                }
                // Handle plain string chunks
                else if (typeof chunk === 'string') {
                  content = chunk;
                }

                if (content) {
                  fullResponse += content;
                  onChunk(content);
                }
              }
              console.log('AsyncGenerator complete. Total response length:', fullResponse.length);
            } catch (streamError) {
              console.error('Error reading AsyncGenerator:', streamError);
              throw streamError;
            }
          } else if (stream instanceof ReadableStream) {
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
            console.warn('Stream is not a recognized format, treating as direct response');
            fullResponse = typeof stream === 'string' ? stream : JSON.stringify(stream);
            onChunk(fullResponse);
          }

          console.log(`Final fullResponse from model ${tryModel}:`, fullResponse);
          return fullResponse;
        } else {
          // Non-streaming response
          const response = await window.puter.ai.chat(formattedMessages as any, {
            model: tryModel,
            stream: false,
          });

          return typeof response === 'string' ? response : '';
        }
      } catch (modelError) {
        console.error(`Model ${tryModel} failed:`, modelError);
        lastError = modelError instanceof Error ? modelError : new Error(String(modelError));
        
        // If this is the last model to try, we'll throw the error after the loop
        if (tryModel === fallbackModels[fallbackModels.length - 1]) {
          break;
        }
        
        // Continue to next model
        continue;
      }
    }
    
    // If we get here, all models failed
    throw lastError || new Error('All Puter AI models failed');
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
  // TIER S - Most Reliable Models First
  {
    id: 'gpt-4o',
    name: 'GPT-4o (Free)',
    description: '✅ Reliable, fast, general purpose - best fallback',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5 (Free)',
    description: '✅ Top reasoning, coding, writing',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash (Free)',
    description: '✅ Fast, multimodal, balanced',
    contextWindow: 1000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo (Free)',
    description: '✅ Reliable fallback model',
    contextWindow: 16384,
    hasThinkingMode: false,
    supportsVision: false,
    isFree: true,
  },
  // TIER A - Experimental/Preview Models
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro Preview (Free)',
    description: '🧪 Latest Gemini - may be unstable',
    contextWindow: 2000000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: true,
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1 (Free)',
    description: '🧪 Latest OpenAI - may be unstable',
    contextWindow: 128000,
    hasThinkingMode: false,
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
    id: 'openrouter:cohere/command-r-plus-08-2024',
    name: 'Command R+ (Free)',
    description: 'Cohere Command R Plus - powerful instruction following',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: false,
    isFree: true,
  },
  {
    id: 'openrouter:cohere/command-r-08-2024',
    name: 'Command R (Free)',
    description: 'Cohere Command R - fast and efficient',
    contextWindow: 128000,
    hasThinkingMode: false,
    supportsVision: false,
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

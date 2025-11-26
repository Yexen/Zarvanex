import type { Message } from '@/types';

// Declare global puter object
declare global {
  interface Window {
    puter: {
      ai: {
        // Puter chat API signatures:
        // puter.ai.chat(prompt, imageURL?, testMode?, options?)
        // puter.ai.chat(messages[], options?)
        chat: (
          messageOrPrompt: string | any[],
          imageUrlOrOptions?: string | string[] | { model?: string; stream?: boolean },
          testModeOrOptions?: boolean | { model?: string; stream?: boolean },
          options?: { model?: string; stream?: boolean }
        ) => Promise<string | ReadableStream | AsyncIterable<any>>;
        // Image generation: puter.ai.txt2img(prompt, options?)
        txt2img: (
          prompt: string,
          options?: {
            model?: string;
            quality?: 'high' | 'medium' | 'low' | 'hd' | 'standard';
            input_image?: string; // base64 for img2img
            input_image_mime_type?: string;
          } | boolean // boolean for testMode
        ) => Promise<HTMLImageElement>;
        txt2speech: (text: string, options?: { voice?: string; engine?: string; language?: string }) => Promise<any>;
        img2txt: (imageUrl: string) => Promise<string>;
      };
      auth: {
        isSignedIn: () => Promise<boolean>;
        signIn: () => Promise<void>;
        getUser: () => Promise<any>;
      };
      fs: {
        write: (path: string, data: Blob | string, options?: any) => Promise<any>;
      };
    };
  }
}

/**
 * Image generation model configuration
 */
export interface ImageGenModel {
  id: string;
  name: string;
  description: string;
  provider: string;
  qualityOptions?: ('high' | 'medium' | 'low' | 'hd' | 'standard')[];
  defaultQuality?: string;
  supportsImg2Img?: boolean;
}

/**
 * Available Puter image generation models
 */
export const PUTER_IMAGE_MODELS: ImageGenModel[] = [
  // Google Gemini
  {
    id: 'gemini-2.5-flash-image-preview',
    name: 'Nano Banana (Gemini 2.5 Flash)',
    description: 'Fast, good character consistency, image-to-image editing',
    provider: 'google',
    supportsImg2Img: true,
  },
  {
    id: 'google/gemini-3-pro-image',
    name: 'Nano Banana Pro (Gemini 3 Pro)',
    description: 'Sharp, legible text, real-world knowledge, deep reasoning, 4K output',
    provider: 'google',
  },
  // OpenAI
  {
    id: 'gpt-image-1',
    name: 'GPT Image 1',
    description: 'OpenAI\'s latest image gen, quality settings available',
    provider: 'openai',
    qualityOptions: ['high', 'medium', 'low'],
    defaultQuality: 'medium',
  },
  {
    id: 'gpt-image-1-mini',
    name: 'GPT Image 1 Mini',
    description: 'Faster, more affordable OpenAI image gen',
    provider: 'openai',
    qualityOptions: ['high', 'medium', 'low'],
    defaultQuality: 'low',
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    description: 'HD option, great for artistic prompts',
    provider: 'openai',
    qualityOptions: ['hd', 'standard'],
    defaultQuality: 'standard',
  },
  {
    id: 'dall-e-2',
    name: 'DALL-E 2',
    description: 'The classic - fast and reliable',
    provider: 'openai',
  },
  // Flux (Black Forest Labs)
  {
    id: 'flux-schnell',
    name: 'Flux.1 Schnell',
    description: 'Fast generation, great consistency',
    provider: 'black-forest-labs',
  },
  {
    id: 'flux-kontext',
    name: 'Flux Kontext',
    description: 'Scene blending and context-aware generation',
    provider: 'black-forest-labs',
    supportsImg2Img: true,
  },
  {
    id: 'flux-1.1-pro',
    name: 'Flux 1.1 Pro',
    description: 'Highest quality Flux model',
    provider: 'black-forest-labs',
  },
  // Stable Diffusion
  {
    id: 'stable-diffusion-3',
    name: 'Stable Diffusion 3',
    description: 'Open-source powerhouse - latest SD',
    provider: 'stability-ai',
  },
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    description: 'High resolution, great details',
    provider: 'stability-ai',
  },
];

/**
 * Upload a base64 image to Puter's file system and get a public URL
 * This is needed because Puter's vision API only accepts HTTP URLs, not base64
 */
async function uploadImageToPuter(base64Data: string, index: number): Promise<string | null> {
  try {
    // Extract the actual base64 content and mime type
    const match = base64Data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) {
      console.log('[Puter Image] Not a valid base64 data URL');
      return null;
    }

    const mimeType = match[1];
    const base64Content = match[2];

    // Convert base64 to Blob
    const byteCharacters = atob(base64Content);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });

    // Generate a unique filename
    const ext = mimeType.split('/')[1] || 'png';
    const filename = `zurvanex_image_${Date.now()}_${index}.${ext}`;

    // Upload to Puter
    console.log(`[Puter Image] Uploading ${filename} (${(blob.size / 1024).toFixed(1)}KB)...`);
    const file = await window.puter.fs.write(filename, blob);

    // Get the public URL - Puter files are accessible via their URL
    const publicUrl = `https://puter.site/${file.path || filename}`;
    console.log(`[Puter Image] Uploaded successfully: ${publicUrl}`);

    return publicUrl;
  } catch (error) {
    console.error('[Puter Image] Upload failed:', error);
    return null;
  }
}

/**
 * Convert base64 image to text description using Puter's img2txt
 * Fallback when image upload isn't available
 */
async function describeImageWithPuter(base64Data: string): Promise<string | null> {
  try {
    // Puter's img2txt might accept data URLs or might need a real URL
    // Try with data URL first
    console.log('[Puter Vision] Attempting to describe image...');
    const description = await window.puter.ai.img2txt(base64Data);
    console.log('[Puter Vision] Image description:', description);
    return description;
  } catch (error) {
    console.error('[Puter Vision] img2txt failed:', error);
    return null;
  }
}

/**
 * Generate an image using Puter's txt2img API
 * @param prompt - Text description of the image to generate
 * @param modelId - Image generation model ID
 * @param quality - Quality setting (if supported by the model)
 * @param inputImage - Optional base64 image for img2img editing
 * @returns Promise resolving to base64 data URL of the generated image
 */
export async function generatePuterImage(
  prompt: string,
  modelId: string = 'gpt-image-1-mini',
  quality?: 'high' | 'medium' | 'low' | 'hd' | 'standard',
  inputImage?: string
): Promise<string> {
  // Check if puter is available
  if (typeof window === 'undefined') {
    throw new Error('Window is not defined - running on server side?');
  }

  if (!window.puter) {
    throw new Error('Puter.js is not loaded. Please refresh the page.');
  }

  if (!window.puter.ai?.txt2img) {
    throw new Error('Puter image generation is not available.');
  }

  // Check if user is signed in
  try {
    const isSignedIn = await window.puter.auth.isSignedIn();
    if (!isSignedIn) {
      throw new Error('Please sign in to Puter to generate images.');
    }
  } catch (authError) {
    console.error('[Puter ImageGen] Auth check error:', authError);
    throw new Error('Could not verify Puter authentication');
  }

  console.log('[Puter ImageGen] Generating image:', {
    prompt: prompt.substring(0, 100) + '...',
    model: modelId,
    quality,
    hasInputImage: !!inputImage,
  });

  try {
    // Build options
    const options: {
      model?: string;
      quality?: 'high' | 'medium' | 'low' | 'hd' | 'standard';
      input_image?: string;
      input_image_mime_type?: string;
    } = {
      model: modelId,
    };

    if (quality) {
      options.quality = quality;
    }

    if (inputImage) {
      // Extract mime type from data URL
      const mimeMatch = inputImage.match(/^data:([^;]+);base64,/);
      if (mimeMatch) {
        options.input_image = inputImage;
        options.input_image_mime_type = mimeMatch[1];
      }
    }

    console.log('[Puter ImageGen] Calling txt2img with options:', {
      ...options,
      input_image: options.input_image ? '[base64 data]' : undefined,
    });

    // Call Puter's txt2img
    const imageElement = await window.puter.ai.txt2img(prompt, options);

    // Extract the data URL from the image element
    // The returned HTMLImageElement has the image as its src (data URL)
    const dataUrl = imageElement.src;

    if (!dataUrl || !dataUrl.startsWith('data:')) {
      throw new Error('Invalid image data received from Puter');
    }

    console.log('[Puter ImageGen] Image generated successfully');
    return dataUrl;

  } catch (error) {
    console.error('[Puter ImageGen] Error:', error);

    // Try fallback models if the selected model fails
    const fallbackModels = ['gpt-image-1-mini', 'dall-e-2', 'flux-schnell'];
    const currentIndex = fallbackModels.indexOf(modelId);

    if (currentIndex === -1 || currentIndex < fallbackModels.length - 1) {
      const nextModel = fallbackModels[currentIndex + 1] || fallbackModels[0];
      if (nextModel !== modelId) {
        console.log(`[Puter ImageGen] Trying fallback model: ${nextModel}`);
        return generatePuterImage(prompt, nextModel, undefined, inputImage);
      }
    }

    throw error instanceof Error ? error : new Error(String(error));
  }
}

/**
 * Check if a prompt is requesting image generation
 * Returns the extracted prompt if it's an image generation request
 */
export function detectImageGenerationRequest(message: string): { isImageGen: boolean; prompt: string } {
  const lowerMessage = message.toLowerCase();

  // Common image generation trigger phrases
  const triggers = [
    /^(generate|create|make|draw|paint|design|render|produce)\s+(an?\s+)?(image|picture|photo|artwork|illustration|drawing|painting)\s+(of|showing|depicting|with)\s+/i,
    /^(generate|create|make|draw|paint|design|render)\s+/i,
    /^image:\s*/i,
    /^\/imagine\s+/i,
    /^\/gen\s+/i,
    /^\/image\s+/i,
  ];

  for (const trigger of triggers) {
    const match = message.match(trigger);
    if (match) {
      const prompt = message.slice(match[0].length).trim();
      if (prompt.length > 0) {
        return { isImageGen: true, prompt };
      }
    }
  }

  // Also detect explicit requests like "can you generate an image of..."
  if (
    (lowerMessage.includes('generate') || lowerMessage.includes('create') || lowerMessage.includes('make')) &&
    (lowerMessage.includes('image') || lowerMessage.includes('picture') || lowerMessage.includes('photo'))
  ) {
    // Extract the description part after "of" or "showing"
    const descMatch = message.match(/(?:image|picture|photo|artwork)\s+(?:of|showing|depicting|with)\s+(.+)/i);
    if (descMatch) {
      return { isImageGen: true, prompt: descMatch[1].trim() };
    }
  }

  return { isImageGen: false, prompt: message };
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

  // Collect all images from messages for vision processing
  const allImages: string[] = [];
  let imageDescriptions: string[] = [];

  // First pass: collect all images and try to describe them
  for (const msg of messages) {
    if (msg.images && msg.images.length > 0) {
      for (const imageData of msg.images) {
        if (imageData.startsWith('data:image/')) {
          allImages.push(imageData);
        }
      }
    }
  }

  // If we have images, try to describe them using Puter's img2txt
  // This is a workaround since Puter's chat API doesn't support base64 images directly
  if (allImages.length > 0) {
    console.log(`[Puter Vision] Processing ${allImages.length} images...`);

    for (let i = 0; i < allImages.length; i++) {
      try {
        const description = await describeImageWithPuter(allImages[i]);
        if (description) {
          imageDescriptions.push(`[Image ${i + 1} Description: ${description}]`);
        } else {
          imageDescriptions.push(`[Image ${i + 1}: Unable to process - image attached but could not be analyzed]`);
        }
      } catch (error) {
        console.error(`[Puter Vision] Failed to describe image ${i + 1}:`, error);
        imageDescriptions.push(`[Image ${i + 1}: Processing failed]`);
      }
    }

    console.log('[Puter Vision] Image descriptions:', imageDescriptions);
  }

  // Convert messages to Puter format
  // Puter expects array of {role, content} objects with string content
  const formattedMessages = messages
    .filter(msg => msg.content && msg.content.trim().length > 0) // Only include messages with content
    .map((msg, msgIndex) => {
      let content = msg.content.trim();

      // If this message has images, append the descriptions
      if (msg.images && msg.images.length > 0) {
        // Find which descriptions belong to this message
        let startIndex = 0;
        for (let i = 0; i < msgIndex; i++) {
          if (messages[i].images) {
            startIndex += messages[i].images!.length;
          }
        }

        const relevantDescriptions = imageDescriptions.slice(
          startIndex,
          startIndex + msg.images.length
        );

        if (relevantDescriptions.length > 0) {
          content = `${content}\n\n${relevantDescriptions.join('\n')}`;
        }

        console.log(`[Puter] Message has ${msg.images.length} images, added ${relevantDescriptions.length} descriptions`);
      }

      return {
        role: msg.role, // 'user' or 'assistant'
        content
      };
    });

  // Handle system prompt - prepend to first user message
  // (Puter doesn't support 'system' role, so we embed it in the user message)
  if (systemPrompt) {
    if (formattedMessages.length > 0) {
      // Find the first user message and prepend system prompt
      const firstUserIndex = formattedMessages.findIndex(msg => msg.role === 'user');

      if (firstUserIndex >= 0) {
        // Content is always string now - simple prepend
        formattedMessages[firstUserIndex].content = `${systemPrompt}\n\n${formattedMessages[firstUserIndex].content}`;
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
  console.log(`[Puter] Processed ${allImages.length} images with ${imageDescriptions.length} descriptions`);

  // Validate all messages have content (content is always string now)
  for (const msg of formattedMessages) {
    if (!msg.content || typeof msg.content !== 'string' || msg.content.trim().length === 0) {
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
            hasAsyncIterator: !!(stream as any)?.[Symbol.asyncIterator]
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

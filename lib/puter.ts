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
    description: 'Sharp legible text, real-world knowledge, deep reasoning, 4K output',
    provider: 'google',
    supportsImg2Img: true,
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
  // Flux (Black Forest Labs) - use full model IDs
  {
    id: 'black-forest-labs/FLUX.1-schnell',
    name: 'Flux.1 Schnell',
    description: 'Fast generation, great consistency',
    provider: 'black-forest-labs',
  },
  {
    id: 'black-forest-labs/FLUX.1-kontext-pro',
    name: 'Flux Kontext Pro',
    description: 'Scene blending and context-aware generation',
    provider: 'black-forest-labs',
    supportsImg2Img: true,
  },
  {
    id: 'black-forest-labs/FLUX.1.1-pro',
    name: 'Flux 1.1 Pro',
    description: 'Highest quality Flux model',
    provider: 'black-forest-labs',
  },
  {
    id: 'black-forest-labs/FLUX.1-dev',
    name: 'Flux.1 Dev',
    description: 'Development model - good balance',
    provider: 'black-forest-labs',
  },
  // Stable Diffusion - use full model IDs
  {
    id: 'stabilityai/stable-diffusion-3-medium',
    name: 'Stable Diffusion 3 Medium',
    description: 'Open-source powerhouse - latest SD',
    provider: 'stability-ai',
  },
  {
    id: 'stabilityai/stable-diffusion-xl-base-1.0',
    name: 'Stable Diffusion XL',
    description: 'High resolution, great details',
    provider: 'stability-ai',
  },
];

/**
 * Upload a base64 image to Puter's file system and get the puter_path
 * Puter's vision API uses puter_path references, not base64 or HTTP URLs
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

    // Generate a unique filename
    const ext = mimeType.split('/')[1] || 'png';
    const filename = `zurvanex_vision_${Date.now()}_${index}.${ext}`;

    console.log(`[Puter Image] Uploading ${filename} (${(byteArray.length / 1024).toFixed(1)}KB)...`);

    // Create a File object (more reliable than Blob for Puter)
    const file = new File([byteArray], filename, { type: mimeType });

    let uploadResult: any;
    let puterPath: string;

    try {
      // Try puter.fs.write with createMissingParents option
      uploadResult = await window.puter.fs.write(filename, file, {
        overwrite: true,
        createMissingParents: true,
      });
      puterPath = uploadResult?.path || filename;
      console.log(`[Puter Image] fs.write result:`, uploadResult);
    } catch (writeError: any) {
      console.log(`[Puter Image] fs.write failed:`, writeError?.message || writeError);

      // Try puter.fs.upload as fallback
      try {
        console.log(`[Puter Image] Trying fs.upload...`);
        // @ts-ignore - puter.fs.upload might not be in types
        const fsAny = window.puter.fs as any;
        if (fsAny.upload) {
          uploadResult = await fsAny.upload([file]);
          // upload returns an array
          const uploadedFile = Array.isArray(uploadResult) ? uploadResult[0] : uploadResult;
          puterPath = uploadedFile?.path || filename;
          console.log(`[Puter Image] fs.upload result:`, uploadResult);
        } else {
          throw new Error('puter.fs.upload not available');
        }
      } catch (uploadError: any) {
        console.log(`[Puter Image] fs.upload failed:`, uploadError?.message || uploadError);
        throw uploadError;
      }
    }

    console.log(`[Puter Image] Uploaded successfully, puter_path: ${puterPath}`);
    return puterPath;
  } catch (error) {
    console.error('[Puter Image] All upload methods failed:', error);

    // Final fallback: return the base64 data URL directly
    // Some Puter models may accept data URLs
    console.log('[Puter Image] Returning base64 data URL as fallback');
    return base64Data;
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
    const result: any = await window.puter.ai.txt2img(prompt, options);

    console.log('[Puter ImageGen] Raw result type:', typeof result);
    console.log('[Puter ImageGen] Raw result:', result);

    // Extract the data URL - handle different return formats
    let dataUrl: string;

    if (typeof result === 'string') {
      // Direct string (data URL or URL)
      dataUrl = result;
    } else if (result instanceof HTMLImageElement) {
      // HTMLImageElement - get src
      dataUrl = result.src;
    } else if (result?.src) {
      // Object with src property
      dataUrl = result.src;
    } else if (result?.url) {
      // Object with url property
      dataUrl = result.url;
    } else if (result?.data) {
      // Object with data property
      dataUrl = result.data;
    } else {
      console.error('[Puter ImageGen] Unknown result format:', result);
      throw new Error('Unknown image format received from Puter');
    }

    console.log('[Puter ImageGen] Extracted dataUrl prefix:', dataUrl?.substring(0, 50));

    // If it's not a data URL, it might be a regular URL - fetch and convert
    if (dataUrl && !dataUrl.startsWith('data:')) {
      if (dataUrl.startsWith('http')) {
        console.log('[Puter ImageGen] Got HTTP URL, using directly');
        // For HTTP URLs, we could fetch and convert to base64, but for now just use it
        // The browser should be able to display it
      } else {
        console.warn('[Puter ImageGen] Unknown URL format:', dataUrl.substring(0, 100));
      }
    }

    if (!dataUrl) {
      throw new Error('No image data received from Puter');
    }

    console.log('[Puter ImageGen] Image generated successfully, length:', dataUrl.length);
    return dataUrl;

  } catch (error: any) {
    // Extract and log detailed error message
    const errorMessage = error?.error || error?.message || String(error);
    console.error('[Puter ImageGen] Error:', errorMessage);
    console.error('[Puter ImageGen] Full error object:', JSON.stringify(error, null, 2));

    // Try fallback models if the selected model fails
    // Use correct Puter model IDs
    const fallbackModels = [
      'gpt-image-1-mini',
      'gemini-2.5-flash-image-preview',
      'black-forest-labs/FLUX.1-schnell',
      'stabilityai/stable-diffusion-xl-base-1.0',
    ];
    const currentIndex = fallbackModels.indexOf(modelId);

    if (currentIndex === -1 || currentIndex < fallbackModels.length - 1) {
      const nextModel = fallbackModels[currentIndex + 1] || fallbackModels[0];
      if (nextModel !== modelId) {
        console.log(`[Puter ImageGen] Trying fallback model: ${nextModel}`);
        return generatePuterImage(prompt, nextModel, undefined, inputImage);
      }
    }

    // Create a descriptive error message
    const errorMsg = error?.error || error?.message || String(error);
    throw new Error(`Image generation failed: ${errorMsg}`);
  }
}

/**
 * Check if a prompt is requesting image generation
 * Returns the extracted prompt if it's an image generation request
 *
 * Slash commands that trigger image generation:
 * - /image <prompt> - Generate an image
 * - /imagine <prompt> - Generate an image (alias)
 * - /gen <prompt> - Generate an image (alias)
 * - /draw <prompt> - Generate an image (alias)
 * - /paint <prompt> - Generate an image (alias)
 *
 * Optional model selection:
 * - /image --model=dall-e-3 <prompt>
 * - /image --quality=hd <prompt>
 */
export function detectImageGenerationRequest(message: string): {
  isImageGen: boolean;
  prompt: string;
  model?: string;
  quality?: 'high' | 'medium' | 'low' | 'hd' | 'standard';
} {
  const trimmedMessage = message.trim();

  // Slash command triggers (these ALWAYS trigger image gen)
  const slashCommands = [
    /^\/image\s+/i,
    /^\/imagine\s+/i,
    /^\/gen\s+/i,
    /^\/draw\s+/i,
    /^\/paint\s+/i,
    /^\/create\s+/i,
  ];

  for (const trigger of slashCommands) {
    if (trigger.test(trimmedMessage)) {
      let remainder = trimmedMessage.replace(trigger, '').trim();
      let model: string | undefined;
      let quality: 'high' | 'medium' | 'low' | 'hd' | 'standard' | undefined;

      // Parse optional flags
      // --model=modelname or -m modelname
      const modelMatch = remainder.match(/(?:--model=|--m=|-m\s+)(\S+)/i);
      if (modelMatch) {
        model = modelMatch[1];
        remainder = remainder.replace(modelMatch[0], '').trim();
      }

      // --quality=value or -q value
      const qualityMatch = remainder.match(/(?:--quality=|--q=|-q\s+)(high|medium|low|hd|standard)/i);
      if (qualityMatch) {
        quality = qualityMatch[1].toLowerCase() as typeof quality;
        remainder = remainder.replace(qualityMatch[0], '').trim();
      }

      if (remainder.length > 0) {
        return { isImageGen: true, prompt: remainder, model, quality };
      }
    }
  }

  return { isImageGen: false, prompt: message };
}

/**
 * Send message to Puter AI with streaming support
 * Uses puter_path for vision (images uploaded to Puter filesystem)
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

  // Track if we have vision content (for streaming bug workaround)
  let hasVisionContent = false;

  // Check if model is Claude (streaming bug with vision - Issue #1345)
  const isClaudeModel = modelId.toLowerCase().includes('claude');

  // Upload images and build puter_path references
  // Map: original base64 -> puter_path
  const uploadedImagePaths: Map<string, string> = new Map();

  // First pass: upload all images to Puter filesystem
  for (const msg of messages) {
    console.log(`[Puter Vision] Checking message:`, {
      role: msg.role,
      hasImages: !!(msg.images && msg.images.length > 0),
      imageCount: msg.images?.length || 0,
      contentPreview: msg.content?.substring(0, 50),
    });

    if (msg.images && msg.images.length > 0) {
      hasVisionContent = true;
      for (let i = 0; i < msg.images.length; i++) {
        const imageData = msg.images[i];
        const isImage = imageData.startsWith('data:image/');
        const isVideo = imageData.startsWith('data:video/');
        const dataPrefix = imageData.substring(0, 30);

        console.log(`[Puter Vision] Image ${i + 1}:`, {
          isImage,
          isVideo,
          dataPrefix,
          alreadyUploaded: uploadedImagePaths.has(imageData),
        });

        if (isImage && !uploadedImagePaths.has(imageData)) {
          const puterPath = await uploadImageToPuter(imageData, uploadedImagePaths.size);
          if (puterPath) {
            uploadedImagePaths.set(imageData, puterPath);
            console.log(`[Puter Vision] Successfully mapped image to: ${puterPath}`);
          } else {
            console.error(`[Puter Vision] Failed to upload image ${i + 1}`);
          }
        } else if (isVideo) {
          console.log(`[Puter Vision] Skipping video file - vision API doesn't support video`);
        }
      }
    }
  }

  console.log(`[Puter Vision] Upload complete: ${uploadedImagePaths.size} images uploaded, hasVisionContent: ${hasVisionContent}`);

  // Convert messages to Puter format with multimodal content
  // Puter expects: { role, content: [{type: "file", puter_path: "..."}, {type: "text", text: "..."}] }
  const formattedMessages = messages
    .filter(msg => (msg.content && msg.content.trim().length > 0) || (msg.images && msg.images.length > 0))
    .map((msg) => {
      const hasImages = msg.images && msg.images.length > 0;

      if (hasImages) {
        // Multimodal message with images - use content array format
        const contentArray: Array<{ type: string; puter_path?: string; url?: string; text?: string }> = [];

        // Add file references for each image
        for (const imageData of msg.images!) {
          const uploadedPath = uploadedImagePaths.get(imageData);
          if (uploadedPath) {
            // Check if it's a puter_path or a base64 data URL (fallback)
            if (uploadedPath.startsWith('data:')) {
              // Base64 fallback - use url type
              contentArray.push({
                type: 'image_url',
                url: uploadedPath,
              });
              console.log(`[Puter] Using base64 data URL for image`);
            } else {
              // Puter filesystem path
              contentArray.push({
                type: 'file',
                puter_path: uploadedPath,
              });
              console.log(`[Puter] Using puter_path: ${uploadedPath}`);
            }
          }
        }

        // Add text content
        if (msg.content && msg.content.trim()) {
          contentArray.push({
            type: 'text',
            text: msg.content.trim(),
          });
        }

        console.log(`[Puter] Message with ${msg.images!.length} images formatted`);

        return {
          role: msg.role,
          content: contentArray,
        };
      } else {
        // Text-only message - use simple string content
        return {
          role: msg.role,
          content: msg.content.trim(),
        };
      }
    });

  // Handle system prompt - prepend to first user message
  // (Puter doesn't support 'system' role, so we embed it in the user message)
  if (systemPrompt) {
    if (formattedMessages.length > 0) {
      // Find the first user message and prepend system prompt
      const firstUserIndex = formattedMessages.findIndex(msg => msg.role === 'user');

      if (firstUserIndex >= 0) {
        const firstUserMsg = formattedMessages[firstUserIndex];
        // Check if content is array (multimodal) or string
        if (Array.isArray(firstUserMsg.content)) {
          // Find text element and prepend system prompt
          const textIndex = firstUserMsg.content.findIndex((c: any) => c.type === 'text');
          if (textIndex >= 0) {
            firstUserMsg.content[textIndex].text = `${systemPrompt}\n\n${firstUserMsg.content[textIndex].text}`;
          } else {
            // No text element, add one with system prompt
            firstUserMsg.content.push({ type: 'text', text: systemPrompt });
          }
        } else {
          // Simple string content
          firstUserMsg.content = `${systemPrompt}\n\n${firstUserMsg.content}`;
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

  console.log('[Puter Vision] Final formatted messages:', JSON.stringify(formattedMessages, null, 2));
  console.log(`[Puter Vision] Summary: ${uploadedImagePaths.size} images uploaded, hasVisionContent: ${hasVisionContent}`);

  // Log each message's content structure for debugging
  formattedMessages.forEach((msg, idx) => {
    console.log(`[Puter Vision] Message ${idx + 1} (${msg.role}):`, {
      isArray: Array.isArray(msg.content),
      contentType: typeof msg.content,
      fileCount: Array.isArray(msg.content) ? msg.content.filter((c: any) => c.type === 'file').length : 0,
    });
  });

  // Validate all messages have content
  for (const msg of formattedMessages) {
    const content = msg.content;
    if (!content) {
      throw new Error(`Invalid message format: message missing content. Message: ${JSON.stringify(msg)}`);
    }
    // Content can be string or array for multimodal
    if (typeof content !== 'string' && !Array.isArray(content)) {
      throw new Error(`Invalid content type: ${typeof content}`);
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

        // Check if we need to disable streaming (Claude + vision = streaming bug, Issue #1345)
        const isCurrentModelClaude = tryModel.toLowerCase().includes('claude');
        const shouldDisableStreaming = hasVisionContent && isCurrentModelClaude;

        if (shouldDisableStreaming) {
          console.log('[Puter Vision] Disabling streaming for Claude model with vision (Issue #1345 workaround)');
        }

        if (onChunk && !shouldDisableStreaming) {
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
          // Non-streaming response (or streaming disabled for Claude+vision workaround)
          console.log('Requesting non-streaming response...');
          const response = await window.puter.ai.chat(formattedMessages as any, {
            model: tryModel,
            stream: false,
          });

          const responseText = typeof response === 'string' ? response : '';

          // If we had an onChunk callback but disabled streaming, send the full response as one chunk
          if (onChunk && shouldDisableStreaming && responseText) {
            console.log('[Puter Vision] Sending non-streamed response to onChunk callback');
            onChunk(responseText);
          }

          return responseText;
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

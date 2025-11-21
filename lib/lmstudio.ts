import type { Message, StreamChunk } from '@/types';
import { memoryDB } from './db/memoryDB';
import { formatMemoriesForSystemPrompt } from './memory/formatter';

const OLLAMA_API = process.env.NEXT_PUBLIC_OLLAMA_API || 'http://localhost:11434';

export interface LMStudioMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | Array<{
    type: 'text' | 'image_url';
    text?: string;
    image_url?: { url: string };
  }>;
}

export async function sendMessage(
  messages: Message[],
  modelId: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  // Load memories and create system message with context
  let memorySystemMessage: LMStudioMessage | null = null;
  try {
    const memories = await memoryDB.getAllMemories();
    const memoryContext = formatMemoriesForSystemPrompt(memories);

    if (memoryContext) {
      memorySystemMessage = {
        role: 'system',
        content: memoryContext
      };
      console.log('[LMStudio] Injected', memories.length, 'memories into system prompt');
    }
  } catch (error) {
    console.error('[LMStudio] Failed to load memories:', error);
    // Continue without memories - don't break chat functionality
  }

  const formattedMessages: LMStudioMessage[] = messages.map((msg) => {
    // If message has images/files, use multimodal format
    if (msg.images && msg.images.length > 0) {
      const contentArray: Array<{
        type: 'text' | 'image_url';
        text?: string;
        image_url?: { url: string };
      }> = [];

      // Filter to only include actual images (not documents)
      // Vision models only support image MIME types, not documents like PDF
      const actualImages = msg.images.filter((data) => {
        const mimeType = data.split(';')[0].split(':')[1] || '';
        return mimeType.startsWith('image/');
      });

      // Separate documents for text notification
      const documents = msg.images.filter((data) => {
        const mimeType = data.split(';')[0].split(':')[1] || '';
        return !mimeType.startsWith('image/');
      });

      // Add text content if present
      if (msg.content) {
        contentArray.push({
          type: 'text',
          text: msg.content,
        });
      }

      // Add only actual images
      actualImages.forEach((imageData) => {
        contentArray.push({
          type: 'image_url',
          image_url: {
            url: imageData, // Already in base64 format: data:image/...;base64,...
          },
        });
      });

      // If no images and no text, fallback to text-only
      if (contentArray.length === 0) {
        return {
          role: msg.role,
          content: msg.content || '',
        };
      }

      return {
        role: msg.role,
        content: contentArray,
      };
    }

    // Standard text-only message
    return {
      role: msg.role,
      content: msg.content,
    };
  });

  // Prepend memory system message if available
  const messagesToSend = memorySystemMessage
    ? [memorySystemMessage, ...formattedMessages]
    : formattedMessages;

  // Check total payload size
  const payloadSize = JSON.stringify({ messages: messagesToSend }).length;
  const payloadMB = (payloadSize / (1024 * 1024)).toFixed(2);

  console.log('Sending request to Ollama:', {
    url: `${OLLAMA_API}/v1/chat/completions`,
    model: modelId,
    messageCount: messagesToSend.length,
    payloadSize: `${payloadMB} MB`,
    messages: messagesToSend.map((m, i) => `${i}: ${m.role} - ${typeof m.content === 'string' ? m.content.substring(0, 50) : 'multimodal'}...`),
    hasMultimodalContent: messagesToSend.some(m => Array.isArray(m.content)),
    hasMemoryContext: !!memorySystemMessage,
  });

  if (payloadSize > 10 * 1024 * 1024) {
    console.warn(`⚠️ Large payload detected (${payloadMB} MB) - this might cause issues with Ollama!`);
  }

  const response = await fetch(`${OLLAMA_API}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: messagesToSend,
      temperature: 0.7,
      max_tokens: 262144, // 256K output tokens - hardcoded to prevent Ollama from resetting to low values
      stream: !!onChunk,
      // Try to set context window - Ollama may support these parameters
      n_ctx: 262144, // llama.cpp parameter for context window
      context_length: 262144, // Alternative parameter name
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Ollama API error:', {
      status: response.status,
      statusText: response.statusText,
      errorBody: errorText,
      requestBody: {
        model: modelId,
        messageCount: messagesToSend.length,
        hasImages: messagesToSend.some(m => Array.isArray(m.content)),
      }
    });

    // Try to parse error as JSON for more details
    let detailedError = errorText;
    try {
      const errorJson = JSON.parse(errorText);
      detailedError = errorJson.error?.message || errorJson.message || errorText;
      console.error('Parsed error details:', errorJson);
    } catch (e) {
      // Not JSON, use raw text
    }

    throw new Error(`Ollama API error (${response.status}): ${detailedError || response.statusText}`);
  }

  // Handle streaming response
  if (onChunk && response.body) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';
    let buffer = ''; // Buffer for incomplete lines

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode the chunk and add to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by newlines but keep the last incomplete line in buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          const trimmedLine = line.trim();
          if (!trimmedLine) continue;

          if (trimmedLine.startsWith('data: ')) {
            const data = trimmedLine.slice(6);
            if (data === '[DONE]') continue;

            try {
              const parsed = JSON.parse(data);

              // Check for error response
              if (parsed.error) {
                console.error('Ollama streaming error:', parsed.error);
                throw new Error(parsed.error.message || 'Ollama API error');
              }

              const content = parsed.choices?.[0]?.delta?.content || '';
              if (content) {
                fullResponse += content;
                onChunk(content);
              }
            } catch (e) {
              // Only log if it's not an empty data field
              if (data.trim()) {
                console.error('Error parsing chunk:', e, 'Data:', data);
                throw e; // Re-throw to stop streaming
              }
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  }

  // Handle non-streaming response
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export async function getAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_API}/v1/models`);
    if (!response.ok) return [];

    const data = await response.json();
    return data.data?.map((model: any) => model.id) || [];
  } catch (error) {
    console.error('Error fetching models:', error);
    return [];
  }
}

/**
 * Generate a short, context-based title for a conversation
 * @param userMessage First user message
 * @param assistantMessage First assistant response
 * @param modelId Model to use for generation
 * @returns Generated title (3-5 words)
 */
export async function generateTitle(
  userMessage: string,
  assistantMessage: string,
  modelId: string
): Promise<string> {
  try {
    console.log('[Title Generation] Starting...', { modelId, userMessageLength: userMessage.length });

    const prompt = `Generate a concise 3-5 word title that summarizes this conversation. Only respond with the title, nothing else.

User: ${userMessage}
Assistant: ${assistantMessage}

Title:`;

    console.log('[Title Generation] Sending request to Ollama...');
    const response = await fetch(`${OLLAMA_API}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 20, // Short response for title only
        stream: false,
      }),
    });

    if (!response.ok) {
      console.error('[Title Generation] Response not OK:', response.status, response.statusText);
      return userMessage.slice(0, 50);
    }

    const data = await response.json();
    console.log('[Title Generation] Raw response:', data);

    const title = data.choices[0]?.message?.content?.trim() || '';
    console.log('[Title Generation] Raw title:', title);

    // Clean up the title (remove quotes, extra punctuation)
    const cleanTitle = title
      .replace(/^["']|["']$/g, '') // Remove surrounding quotes
      .replace(/\.$/, '') // Remove trailing period
      .trim();

    console.log('[Title Generation] Cleaned title:', cleanTitle);

    // Fallback to first 50 chars if title is empty or too long
    if (!cleanTitle || cleanTitle.length > 60) {
      console.log('[Title Generation] Title invalid (empty or too long), using fallback');
      return userMessage.slice(0, 50);
    }

    console.log('[Title Generation] ✓ Success:', cleanTitle);
    return cleanTitle;
  } catch (error) {
    console.error('[Title Generation] Error:', error);
    // Fallback to first 50 chars on error
    return userMessage.slice(0, 50);
  }
}

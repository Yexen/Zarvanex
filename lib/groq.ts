import Groq from 'groq-sdk';
import type { Message } from '@/types';

// Initialize Groq client (will be used server-side with API key from env)
export function createGroqClient(apiKey: string) {
  return new Groq({ apiKey });
}

export interface GroqMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/**
 * Send message to Groq with streaming support
 * @param messages Conversation messages
 * @param modelId Groq model ID
 * @param apiKey Groq API key
 * @param onChunk Streaming callback
 * @returns Full response text
 */
export async function sendGroqMessage(
  messages: Message[],
  modelId: string,
  apiKey: string,
  onChunk?: (chunk: string) => void,
  systemPrompt?: string
): Promise<string> {
  const groq = createGroqClient(apiKey);

  // Convert our messages to Groq format
  // Note: Groq models don't support vision, so we only send text
  const formattedMessages: GroqMessage[] = messages.map((msg) => {
    let content = msg.content;

    // If images are present, add a note (since Groq doesn't support vision)
    if (msg.images && msg.images.length > 0) {
      content += `\n\n[Note: ${msg.images.length} image(s) were attached but cannot be processed by this model as it doesn't support vision]`;
    }

    return {
      role: msg.role,
      content,
    };
  });

  // Add system prompt as first message if provided
  if (systemPrompt) {
    formattedMessages.unshift({
      role: 'system',
      content: systemPrompt,
    });
  }

  try {
    // Use streaming if callback provided
    if (onChunk) {
      const stream = await groq.chat.completions.create({
        messages: formattedMessages,
        model: modelId,
        temperature: 0.7,
        max_tokens: 8192,
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
      const completion = await groq.chat.completions.create({
        messages: formattedMessages,
        model: modelId,
        temperature: 0.7,
        max_tokens: 8192,
        stream: false,
      });

      return completion.choices[0]?.message?.content || '';
    }
  } catch (error) {
    console.error('Groq API error:', error);
    throw error;
  }
}

/**
 * Available Groq models (verified active as of Nov 2025)
 */
export const GROQ_MODELS = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    description: 'Most capable production model, 280 tokens/sec',
    contextWindow: 131072,
    hasThinkingMode: false,
    isFree: true,
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    description: 'Fast and efficient, 560 tokens/sec',
    contextWindow: 131072,
    hasThinkingMode: false,
    isFree: true,
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT OSS 120B',
    description: 'OpenAI open-weight model, ~500 tokens/sec',
    contextWindow: 8192,
    hasThinkingMode: false,
    isFree: true,
  },
  {
    id: 'meta-llama/llama-4-scout-17b-16e-instruct',
    name: 'Llama 4 Scout',
    description: 'Latest Llama 4, 750 tokens/sec (Preview)',
    contextWindow: 131072,
    hasThinkingMode: false,
    isFree: true,
  },
  {
    id: 'qwen/qwen3-32b',
    name: 'Qwen3 32B',
    description: 'Alibaba model, strong reasoning (Preview)',
    contextWindow: 32768,
    hasThinkingMode: false,
    isFree: true,
  },
  {
    id: 'moonshotai/kimi-k2-instruct-0905',
    name: 'Kimi K2',
    description: 'Moonshot AI model (Preview)',
    contextWindow: 200000,
    hasThinkingMode: false,
    isFree: true,
  },
];

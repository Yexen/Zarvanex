import Anthropic from '@anthropic-ai/sdk';
import type { Message } from '@/types';

// Initialize Anthropic client
export function createAnthropicClient(apiKey: string) {
  return new Anthropic({ apiKey });
}

/**
 * Send message to Claude with streaming support
 */
export async function sendClaudeMessage(
  messages: Message[],
  modelId: string,
  apiKey: string,
  onChunk?: (chunk: string) => void
): Promise<string> {
  const anthropic = createAnthropicClient(apiKey);

  // Convert our messages to Claude format
  const formattedMessages = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'assistant' : 'user',
    content: msg.content,
  }));

  try {
    if (onChunk) {
      // Streaming response
      const stream = await anthropic.messages.create({
        model: modelId,
        max_tokens: 8192,
        temperature: 0.7,
        messages: formattedMessages,
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        if (
          chunk.type === 'content_block_delta' &&
          chunk.delta.type === 'text_delta'
        ) {
          const content = chunk.delta.text;
          if (content) {
            fullResponse += content;
            onChunk(content);
          }
        }
      }
      return fullResponse;
    } else {
      // Non-streaming response
      const message = await anthropic.messages.create({
        model: modelId,
        max_tokens: 8192,
        temperature: 0.7,
        messages: formattedMessages,
        stream: false,
      });

      const content = message.content[0];
      return content.type === 'text' ? content.text : '';
    }
  } catch (error) {
    console.error('Claude API error:', error);
    throw error;
  }
}

/**
 * Available Claude models
 */
export const CLAUDE_MODELS = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude 4 Sonnet',
    description: 'Most intelligent model, balanced performance',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: false,
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude 4 Opus',
    description: 'Most capable model for complex tasks',
    contextWindow: 200000,
    hasThinkingMode: true,
    supportsVision: true,
    isFree: false,
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    description: 'Previous flagship model',
    contextWindow: 200000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: false,
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast and affordable',
    contextWindow: 200000,
    hasThinkingMode: false,
    supportsVision: true,
    isFree: false,
  },
];

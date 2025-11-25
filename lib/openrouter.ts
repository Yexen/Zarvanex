import type { Message } from '@/types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

/**
 * Send message to OpenRouter with streaming support
 * @param messages Conversation messages
 * @param modelId OpenRouter model ID
 * @param apiKey OpenRouter API key
 * @param onChunk Streaming callback
 * @returns Full response text
 */
export async function sendOpenRouterMessage(
  messages: Message[],
  modelId: string,
  apiKey: string,
  onChunk?: (chunk: string) => void,
  systemPrompt?: string
): Promise<string> {
  // Convert our messages to OpenRouter format
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

  // Add system prompt if provided
  if (systemPrompt) {
    formattedMessages.unshift({
      role: 'system',
      content: systemPrompt,
    });
  }

  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://zurvanex.app', // Optional: for rankings
        'X-Title': 'Zurvanex', // Optional: shows in rankings
      },
      body: JSON.stringify({
        model: modelId,
        messages: formattedMessages,
        temperature: 0.7,
        stream: !!onChunk,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText,
      });

      let detailedError = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        detailedError = errorJson.error?.message || errorJson.message || errorText;
      } catch (e) {
        // Not JSON, use raw text
      }

      throw new Error(`OpenRouter API error (${response.status}): ${detailedError}`);
    }

    // Handle streaming response
    if (onChunk && response.body) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n').filter(line => line.trim());

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content || '';
                if (content) {
                  fullResponse += content;
                  onChunk(content);
                }
              } catch (e) {
                console.error('Error parsing chunk:', e);
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
  } catch (error) {
    console.error('OpenRouter API error:', error);
    throw error;
  }
}

/**
 * Available OpenRouter free models
 */
export const OPENROUTER_MODELS = [
  {
    id: 'x-ai/grok-4.1-fast:free',
    name: 'Grok 4.1 Fast (Free)',
    description: '2M context, tool calling, reasoning mode',
    contextWindow: 2097152, // 2M tokens
    hasThinkingMode: true,
    isFree: true,
  },
  {
    id: 'z-ai/glm-4.5-air:free',
    name: 'GLM 4.5 Air (Free)',
    description: 'MoE model with thinking mode toggle',
    contextWindow: 128000,
    hasThinkingMode: true,
    isFree: true,
  },
  {
    id: 'openai/gpt-oss-20b:free',
    name: 'GPT OSS 20B (Free)',
    description: 'OpenAI open-weight model',
    contextWindow: 8192,
    hasThinkingMode: false,
    isFree: true,
  },
  {
    id: 'google/gemini-2.0-flash-exp:free',
    name: 'Gemini 2.0 Flash (Free)',
    description: 'Google\'s latest fast multimodal model',
    contextWindow: 1000000,
    hasThinkingMode: false,
    isFree: true,
  },
];

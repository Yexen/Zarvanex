// Qwen API client for memory extraction
// Uses the same Ollama endpoint as the main chat

const OLLAMA_API = process.env.NEXT_PUBLIC_OLLAMA_API || 'http://localhost:11434';

export interface QwenMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export class QwenClient {
  private baseURL = 'http://localhost:11434'; // Ollama endpoint

  /**
   * Send a chat request to Qwen via Ollama
   * @param prompt The user prompt
   * @param systemPrompt Optional system prompt
   * @param modelId Optional model ID (defaults to current model)
   * @returns The model's response as a string
   */
  async chat(
    prompt: string,
    systemPrompt?: string,
    modelId?: string
  ): Promise<string> {
    try {
      const messages: QwenMessage[] = [];

      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt,
        });
      }

      messages.push({
        role: 'user',
        content: prompt,
      });

      console.log('[QwenClient] Sending request to Ollama:', {
        url: `${this.baseURL}/v1/chat/completions`,
        model: modelId || 'default',
        systemPromptLength: systemPrompt?.length || 0,
        promptLength: prompt.length,
      });

      const response = await fetch(`${this.baseURL}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelId || undefined, // Let Ollama use default if not specified
          messages,
          temperature: 0.3, // Lower temperature for more consistent extraction
          max_tokens: 2000,
          stream: false, // No streaming for extraction
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[QwenClient] API error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
        });
        throw new Error(`Qwen API error (${response.status}): ${errorText || response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || '';

      console.log('[QwenClient] Response received:', {
        contentLength: content.length,
        firstChars: content.slice(0, 100),
      });

      return content;
    } catch (error) {
      console.error('[QwenClient] Error:', error);
      throw error;
    }
  }

  /**
   * Extract JSON from Qwen's response
   * Handles cases where Qwen adds markdown formatting or extra text
   */
  extractJSON<T = any>(response: string): T | null {
    try {
      // First try: Direct JSON parse
      try {
        return JSON.parse(response);
      } catch {
        // Continue to extraction attempts
      }

      // Second try: Extract JSON from markdown code blocks
      const codeBlockMatch = response.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1]);
      }

      // Third try: Find first { to last } (might have text before/after)
      const firstBrace = response.indexOf('{');
      const lastBrace = response.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonStr = response.slice(firstBrace, lastBrace + 1);
        return JSON.parse(jsonStr);
      }

      console.error('[QwenClient] Failed to extract JSON from response:', response.slice(0, 200));
      return null;
    } catch (error) {
      console.error('[QwenClient] JSON extraction error:', error);
      return null;
    }
  }

  /**
   * Check if Ollama is running and accessible
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/v1/models`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('[QwenClient] Health check failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const qwenClient = new QwenClient();

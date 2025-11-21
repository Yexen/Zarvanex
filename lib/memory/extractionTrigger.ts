import { memoryExtractor, ConversationMessage } from './extractor';

/**
 * Manages when memory extraction is triggered
 * Extracts after every N messages or when conversation ends
 */
export class ExtractionTrigger {
  private messageCountByConversation: Map<string, number> = new Map();
  private readonly MESSAGES_THRESHOLD = 8; // Extract every 8 messages (4 exchanges)
  private extractionInProgress: Set<string> = new Set();

  /**
   * Call this after each message is sent
   * Will trigger extraction if threshold is reached
   */
  onMessageSent(conversationId: string, messages: ConversationMessage[]): void {
    // Increment message count for this conversation
    const currentCount = this.messageCountByConversation.get(conversationId) || 0;
    this.messageCountByConversation.set(conversationId, currentCount + 1);

    console.log('[ExtractionTrigger] Message count for', conversationId, ':', currentCount + 1);

    // Extract every N messages
    if ((currentCount + 1) >= this.MESSAGES_THRESHOLD) {
      console.log('[ExtractionTrigger] Threshold reached, triggering extraction');
      this.triggerExtraction(conversationId, messages);
      this.messageCountByConversation.set(conversationId, 0); // Reset counter
    }
  }

  /**
   * Call this when a conversation ends (user navigates away, closes tab, etc.)
   * Will extract any remaining information
   */
  onConversationEnd(conversationId: string, messages: ConversationMessage[]): void {
    const messageCount = this.messageCountByConversation.get(conversationId) || 0;

    // Only extract if there were at least 2 messages (1 exchange)
    if (messageCount >= 2 && messages.length >= 2) {
      console.log('[ExtractionTrigger] Conversation ended, triggering final extraction');
      this.triggerExtraction(conversationId, messages);
    }

    // Clean up
    this.messageCountByConversation.delete(conversationId);
  }

  /**
   * Manually trigger extraction for a conversation
   * Useful for testing or on-demand extraction
   */
  async manualExtraction(
    conversationId: string,
    messages: ConversationMessage[]
  ): Promise<{ added: number; corrected: number; error?: string }> {
    console.log('[ExtractionTrigger] Manual extraction triggered');
    return this.triggerExtraction(conversationId, messages, true);
  }

  /**
   * Trigger extraction in background (or synchronously if wait=true)
   */
  private async triggerExtraction(
    conversationId: string,
    messages: ConversationMessage[],
    wait: boolean = false
  ): Promise<{ added: number; corrected: number; error?: string }> {
    // Prevent duplicate extractions for the same conversation
    if (this.extractionInProgress.has(conversationId)) {
      console.log('[ExtractionTrigger] Extraction already in progress for:', conversationId);
      return { added: 0, corrected: 0, error: 'Extraction already in progress' };
    }

    const doExtraction = async () => {
      this.extractionInProgress.add(conversationId);

      try {
        console.log('[ExtractionTrigger] Starting extraction for:', conversationId);
        const result = await memoryExtractor.extractFromConversation(
          conversationId,
          messages
        );

        console.log('[ExtractionTrigger] ✓ Extraction complete:', result);

        // Show a subtle notification if memories were extracted
        if (result.added > 0 || result.corrected > 0) {
          this.notifyUser(result);
        }

        return result;
      } catch (error) {
        console.error('[ExtractionTrigger] Extraction error:', error);
        return { added: 0, corrected: 0, error: String(error) };
      } finally {
        this.extractionInProgress.delete(conversationId);
      }
    };

    if (wait) {
      // Synchronous extraction (for manual triggers)
      return doExtraction();
    } else {
      // Asynchronous extraction (don't block UI)
      setTimeout(() => {
        doExtraction();
      }, 0);
      return { added: 0, corrected: 0 };
    }
  }

  /**
   * Show a subtle notification to user about memory extraction
   * This is optional - can be customized based on UX preferences
   */
  private notifyUser(result: { added: number; corrected: number }): void {
    const message = `Memory updated: ${result.added} new, ${result.corrected} corrected`;
    console.log('[ExtractionTrigger] 💾', message);

    // Optional: Show a toast notification
    // You can implement this with your preferred notification library
    // For now, just console log
  }

  /**
   * Reset message count for a conversation
   * Useful when conversation is deleted or reset
   */
  resetConversation(conversationId: string): void {
    this.messageCountByConversation.delete(conversationId);
    console.log('[ExtractionTrigger] Reset conversation:', conversationId);
  }

  /**
   * Get current message count for a conversation
   */
  getMessageCount(conversationId: string): number {
    return this.messageCountByConversation.get(conversationId) || 0;
  }
}

// Export singleton instance
export const extractionTrigger = new ExtractionTrigger();

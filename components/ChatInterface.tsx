'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import ModelSelector from './ModelSelector';
import Login from './Login';
import SaveMomentModal from './SaveMomentModal';
import FloatingMemoryPopup from './FloatingMemoryPopup';
import GuidelinesModal from './GuidelinesModal';
import { sendMessage, getAvailableModels, generateTitle } from '@/lib/lmstudio';
import { GROQ_MODELS } from '@/lib/groq';
import { OPENROUTER_MODELS } from '@/lib/openrouter';
import { OPENAI_MODELS } from '@/lib/openai';
import { CLAUDE_MODELS } from '@/lib/claude';
import { COHERE_MODELS } from '@/lib/cohere';
import { PUTER_MODELS, PUTER_IMAGE_MODELS, sendPuterMessage, generatePuterImage, detectImageGenerationRequest, buildImagePromptSystemMessage } from '@/lib/puter';
import type { Conversation, Message, Model } from '@/types';
import { useAuth } from '@/hooks/useAuth';
import { compressImages, needsCompression, formatSize } from '@/utils/imageCompression';
import { processMediaFiles, needsMediaCompression, getMediaCollectionSize } from '@/utils/mediaCompression';
import { useConversations } from '@/hooks/useConversations';
import { UserPreferencesProvider, useUserPreferencesContext } from '@/contexts/UserPreferencesContext';
import { extractionTrigger } from '@/lib/memory/extractionTrigger';
import { generateSystemPrompt, formatUserContext, shouldIncludePersonalization } from '@/lib/personalization';
import { getConversationMemory, formatMemoryForPrompt } from '@/lib/memory';
import { getHardMemoryContext, formatHardMemoryForPrompt } from '@/lib/hardMemoryAI';
import { generateSmartTitle, shouldUseSmartTitles } from '@/lib/smartTitles';
import { smartHardMemorySearch } from '@/lib/smartHardMemorySearch';

function ChatInterfaceInner() {
  const router = useRouter();

  // Hooks
  const { user, loading: authLoading } = useAuth();
  const {
    conversations,
    loading: conversationsLoading,
    createConversation,
    addMessage,
    updateConversation,
    deleteConversation,
    setMessages,
  } = useConversations(user?.id || null);
  const { preferences } = useUserPreferencesContext();

  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [models, setModels] = useState<Model[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('');
  // Per-conversation loading states
  const [loadingConversations, setLoadingConversations] = useState<Record<string, boolean>>({});
  const [streamingContents, setStreamingContents] = useState<Record<string, string>>({});
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [saveMoment, setSaveMoment] = useState<{ user: Message; ai: Message } | null>(null);
  const [showScrollButtons, setShowScrollButtons] = useState(false);
  const [isMemoryPopupOpen, setIsMemoryPopupOpen] = useState(false);
  const [draftMessages, setDraftMessages] = useState<Record<string, string>>({});
  // Image generation state
  const [selectedImageModel, setSelectedImageModel] = useState<string>('gpt-image-1-mini');
  const [imageGenQuality, setImageGenQuality] = useState<'high' | 'medium' | 'low' | 'hd' | 'standard'>('medium');
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  // Guidelines modal state
  const [isGuidelinesOpen, setIsGuidelinesOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const hasInitialized = useRef(false);

  // Get loading state and streaming content for current conversation
  const isLoading = activeConversationId ? loadingConversations[activeConversationId] || false : false;
  const streamingContent = activeConversationId ? streamingContents[activeConversationId] || '' : '';

  // Helper to set loading state for a specific conversation
  const setConversationLoading = (convId: string, loading: boolean) => {
    setLoadingConversations(prev => ({ ...prev, [convId]: loading }));
  };

  // Helper to update streaming content for a specific conversation
  const appendStreamingContent = (convId: string, chunk: string) => {
    setStreamingContents(prev => ({ ...prev, [convId]: (prev[convId] || '') + chunk }));
  };

  // Helper to clear streaming content for a specific conversation
  const clearStreamingContent = (convId: string) => {
    setStreamingContents(prev => {
      const updated = { ...prev };
      delete updated[convId];
      return updated;
    });
  };

  // Get or set draft message for current conversation
  const currentDraft = activeConversationId ? draftMessages[activeConversationId] || '' : draftMessages['__new__'] || '';

  const handleDraftChange = (message: string) => {
    const key = activeConversationId || '__new__';
    setDraftMessages(prev => ({
      ...prev,
      [key]: message
    }));
  };

  // Clear draft when message is sent successfully
  const clearCurrentDraft = () => {
    const key = activeConversationId || '__new__';
    setDraftMessages(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  // Get active conversation
  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  
  // Debug logging for active conversation
  useEffect(() => {
    console.log('Active conversation changed:', {
      activeConversationId,
      found: !!activeConversation,
      messageCount: activeConversation?.messages.length || 0,
      conversationCount: conversations.length
    });
  }, [activeConversationId, activeConversation, conversations]);

  // Load available models on mount
  useEffect(() => {
    loadModels();

    // Initialize memory database
    import('@/lib/db/memoryDB').then(({ memoryDB }) => {
      memoryDB.init().catch(error => {
        console.error('Failed to initialize memory database:', error);
      });
    });
  }, []);

  const loadModels = async () => {
    try {
      // Load Ollama models
      const modelIds = await getAvailableModels();
      const ollamaModels: Model[] = modelIds.map((id) => ({
        id,
        name: id,
        type: 'base' as const,
        supportsVision: id.toLowerCase().includes('vision') ||
                        id.toLowerCase().includes('llava') ||
                        id.toLowerCase().includes('qwen3-vl'),
        provider: 'ollama' as const,
      }));

      // Add OpenRouter free models
      const openrouterModels: Model[] = OPENROUTER_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'openrouter' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        isFree: model.isFree,
      }));

      // Add Groq models
      const groqModels: Model[] = GROQ_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'groq' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        isFree: model.isFree,
      }));

      // Add OpenAI models
      const openaiModels: Model[] = OPENAI_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'openai' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        supportsVision: model.supportsVision,
        isFree: model.isFree,
      }));

      // Add Claude models
      const claudeModels: Model[] = CLAUDE_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'claude' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        supportsVision: model.supportsVision,
        isFree: model.isFree,
      }));

      // Add Cohere models
      const cohereModels: Model[] = COHERE_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'cohere' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        supportsVision: model.supportsVision,
        isFree: model.isFree,
      }));

      // Add Puter models (free, user-pays)
      const puterModels: Model[] = PUTER_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'puter' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        supportsVision: model.supportsVision,
        isFree: model.isFree,
      }));

      // Combine all models (Puter first for free user-pays, OpenRouter, Groq, then paid models, and Ollama)
      const allModels = [...puterModels, ...openrouterModels, ...groqModels, ...openaiModels, ...claudeModels, ...cohereModels, ...ollamaModels];
      setModels(allModels);

      // Don't auto-select any model - user should choose
    } catch (error) {
      console.error('Error loading models:', error);
      // Set cloud models as fallback (always available)
      const openrouterModels: Model[] = OPENROUTER_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'openrouter' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        isFree: model.isFree,
      }));
      const groqModels: Model[] = GROQ_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'groq' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        isFree: model.isFree,
      }));
      const openaiModels: Model[] = OPENAI_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'openai' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        supportsVision: model.supportsVision,
        isFree: model.isFree,
      }));
      const claudeModels: Model[] = CLAUDE_MODELS.map((model) => ({
        id: model.id,
        name: model.name,
        type: 'base' as const,
        description: model.description,
        provider: 'claude' as const,
        contextWindow: model.contextWindow,
        hasThinkingMode: model.hasThinkingMode,
        supportsVision: model.supportsVision,
        isFree: model.isFree,
      }));
      setModels([...openrouterModels, ...groqModels, ...openaiModels, ...claudeModels]);
      // Don't auto-select any model - user should choose
    }
  };

  const handleNewChat = async () => {
    try {
      const newConversationId = await createConversation(selectedModel);
      if (newConversationId) {
        setActiveConversationId(newConversationId);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  // Helper function to send message to Groq API with streaming
  const sendGroqMessage = async (messages: Message[], modelId: string, onChunk?: (chunk: string) => void): Promise<string> => {
    // Generate system prompt from user preferences
    console.log('[DEBUG] sendGroqMessage: Generating system prompt', {
      hasPreferences: !!preferences,
      shouldInclude: shouldIncludePersonalization(preferences),
      preferencesNickname: preferences?.nickname
    });

    let systemPrompt = shouldIncludePersonalization(preferences)
      ? generateSystemPrompt(preferences)
      : "You are Zurvânex, a helpful AI assistant.";

    // Add conversation memory context if user is available
    if (user?.id && messages.length > 0) {
      const currentQuery = messages[messages.length - 1]?.content || '';
      try {
        // Add smart hard memory search (intelligent retrieval from Supabase)
        try {
          const smartMemoryResult = await smartHardMemorySearch(
            currentQuery,
            user.id,
            {
              openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            }
          );

          if (smartMemoryResult.memories.length > 0) {
            console.log('[SmartHardMemory] Found memories:', {
              intent: smartMemoryResult.intent,
              count: smartMemoryResult.memories.length,
              totalMatches: smartMemoryResult.totalMatches,
            });

            // Format memories for prompt
            const memoryPrompt = formatHardMemoryForPrompt({
              foundMemories: smartMemoryResult.memories,
              relevantCount: smartMemoryResult.totalMatches,
              searchQuery: currentQuery,
              tags: [],
            });

            if (memoryPrompt) {
              systemPrompt += memoryPrompt;
            }
          }
        } catch (smartMemoryError) {
          console.error('[SmartHardMemory] Error (non-critical, using fallback):', smartMemoryError);

          // Fallback to original hard memory search
          const hardMemoryContext = await getHardMemoryContext(user.id, currentQuery);
          const hardMemoryPrompt = formatHardMemoryForPrompt(hardMemoryContext);
          if (hardMemoryPrompt) {
            systemPrompt += hardMemoryPrompt;
          }
        }

        // Add conversational memory
        const memoryContext = await getConversationMemory(user.id, currentQuery);
        const memoryPrompt = formatMemoryForPrompt(memoryContext, preferences);
        if (memoryPrompt) {
          systemPrompt += memoryPrompt;
        }
      } catch (error) {
        console.error('🚨 Error fetching memory context:', error);
      }
    }

    console.log('Sending to Groq with personalization:', {
      hasPreferences: !!preferences,
      systemPromptLength: systemPrompt?.length || 0,
      userContext: formatUserContext(preferences)
    });

    const response = await fetch('/api/chat/groq', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) {
      throw new Error('No response body');
    }

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
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                fullResponse += parsed.content;
                onChunk?.(parsed.content);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  };

  // Helper function to send message to OpenRouter API with streaming
  const sendOpenRouterMessage = async (messages: Message[], modelId: string, onChunk?: (chunk: string) => void): Promise<string> => {
    // Generate system prompt from user preferences
    console.log('[DEBUG] sendOpenRouterMessage: Generating system prompt', {
      hasPreferences: !!preferences,
      shouldInclude: shouldIncludePersonalization(preferences),
      preferencesNickname: preferences?.nickname
    });

    let systemPrompt = shouldIncludePersonalization(preferences)
      ? generateSystemPrompt(preferences)
      : "You are Zurvânex, a helpful AI assistant.";

    // Add conversation memory context if user is available
    if (user?.id && messages.length > 0) {
      const currentQuery = messages[messages.length - 1]?.content || '';
      try {
        // Add smart hard memory search (intelligent retrieval from Supabase)
        try {
          const smartMemoryResult = await smartHardMemorySearch(
            currentQuery,
            user.id,
            {
              openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            }
          );

          if (smartMemoryResult.memories.length > 0) {
            console.log('[SmartHardMemory] Found memories:', {
              intent: smartMemoryResult.intent,
              count: smartMemoryResult.memories.length,
              totalMatches: smartMemoryResult.totalMatches,
            });

            // Format memories for prompt
            const memoryPrompt = formatHardMemoryForPrompt({
              foundMemories: smartMemoryResult.memories,
              relevantCount: smartMemoryResult.totalMatches,
              searchQuery: currentQuery,
              tags: [],
            });

            if (memoryPrompt) {
              systemPrompt += memoryPrompt;
            }
          }
        } catch (smartMemoryError) {
          console.error('[SmartHardMemory] Error (non-critical, using fallback):', smartMemoryError);

          // Fallback to original hard memory search
          const hardMemoryContext = await getHardMemoryContext(user.id, currentQuery);
          const hardMemoryPrompt = formatHardMemoryForPrompt(hardMemoryContext);
          if (hardMemoryPrompt) {
            systemPrompt += hardMemoryPrompt;
          }
        }

        // Add conversational memory
        const memoryContext = await getConversationMemory(user.id, currentQuery);
        const memoryPrompt = formatMemoryForPrompt(memoryContext, preferences);
        if (memoryPrompt) {
          systemPrompt += memoryPrompt;
        }
      } catch (error) {
        console.error('🚨 Error fetching memory context:', error);
      }
    }

    console.log('Sending to OpenRouter with personalization:', {
      hasPreferences: !!preferences,
      systemPromptLength: systemPrompt?.length || 0,
      userContext: formatUserContext(preferences)
    });

    const response = await fetch('/api/chat/openrouter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) {
      throw new Error('No response body');
    }

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
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                fullResponse += parsed.content;
                onChunk?.(parsed.content);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  };

  // Helper function to send message to OpenAI API with streaming
  const sendOpenAIMessage = async (messages: Message[], modelId: string, onChunk?: (chunk: string) => void): Promise<string> => {
    // Generate system prompt from user preferences
    let systemPrompt = shouldIncludePersonalization(preferences)
      ? generateSystemPrompt(preferences)
      : "You are Zurvânex, a helpful AI assistant.";

    // Add conversation memory context if user is available
    if (user?.id && messages.length > 0) {
      const currentQuery = messages[messages.length - 1]?.content || '';
      try {
        // Add smart hard memory search (intelligent retrieval from Supabase)
        try {
          const smartMemoryResult = await smartHardMemorySearch(
            currentQuery,
            user.id,
            {
              openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            }
          );

          if (smartMemoryResult.memories.length > 0) {
            console.log('[SmartHardMemory] Found memories:', {
              intent: smartMemoryResult.intent,
              count: smartMemoryResult.memories.length,
              totalMatches: smartMemoryResult.totalMatches,
            });

            // Format memories for prompt
            const memoryPrompt = formatHardMemoryForPrompt({
              foundMemories: smartMemoryResult.memories,
              relevantCount: smartMemoryResult.totalMatches,
              searchQuery: currentQuery,
              tags: [],
            });

            if (memoryPrompt) {
              systemPrompt += memoryPrompt;
            }
          }
        } catch (smartMemoryError) {
          console.error('[SmartHardMemory] Error (non-critical, using fallback):', smartMemoryError);

          // Fallback to original hard memory search
          const hardMemoryContext = await getHardMemoryContext(user.id, currentQuery);
          const hardMemoryPrompt = formatHardMemoryForPrompt(hardMemoryContext);
          if (hardMemoryPrompt) {
            systemPrompt += hardMemoryPrompt;
          }
        }

        // Add conversational memory
        const memoryContext = await getConversationMemory(user.id, currentQuery);
        const memoryPrompt = formatMemoryForPrompt(memoryContext, preferences);
        if (memoryPrompt) {
          systemPrompt += memoryPrompt;
        }
      } catch (error) {
        console.error('🚨 Error fetching memory context:', error);
      }
    }

    console.log('Sending to OpenAI with personalization:', {
      hasPreferences: !!preferences,
      systemPromptLength: systemPrompt?.length || 0,
      userContext: formatUserContext(preferences)
    });

    const response = await fetch('/api/chat/openai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) {
      throw new Error('No response body');
    }

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
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                fullResponse += parsed.content;
                onChunk?.(parsed.content);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  };

  // Helper function to send message to Claude API with streaming
  const sendClaudeMessage = async (messages: Message[], modelId: string, onChunk?: (chunk: string) => void): Promise<string> => {
    // Generate system prompt from user preferences
    let systemPrompt = shouldIncludePersonalization(preferences) 
      ? generateSystemPrompt(preferences)
      : "You are Zurvânex, a helpful AI assistant.";

    // Add conversation memory context if user is available
    if (user?.id && messages.length > 0) {
      const currentQuery = messages[messages.length - 1]?.content || '';
      try {
        // Add conversational memory
        const memoryContext = await getConversationMemory(user.id, currentQuery);
        const memoryPrompt = formatMemoryForPrompt(memoryContext, preferences);
        if (memoryPrompt) {
          systemPrompt += memoryPrompt;
        }
        
        // Add hard memory context
        const hardMemoryContext = await getHardMemoryContext(user.id, currentQuery);
        const hardMemoryPrompt = formatHardMemoryForPrompt(hardMemoryContext);
        if (hardMemoryPrompt) {
          systemPrompt += hardMemoryPrompt;
        }
      } catch (error) {
        console.error('🚨 Error fetching memory context:', error);
      }
    }

    console.log('Sending to Claude with personalization:', {
      hasPreferences: !!preferences,
      systemPromptLength: systemPrompt?.length || 0,
      userContext: formatUserContext(preferences)
    });

    const response = await fetch('/api/chat/claude', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) {
      throw new Error('No response body');
    }

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
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                fullResponse += parsed.content;
                onChunk?.(parsed.content);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  };

  // Helper function to send message to Cohere API with streaming
  const sendCohereMessage = async (messages: Message[], modelId: string, onChunk?: (chunk: string) => void): Promise<string> => {
    // Generate system prompt from user preferences
    let systemPrompt = shouldIncludePersonalization(preferences) 
      ? generateSystemPrompt(preferences)
      : "You are Zurvânex, a helpful AI assistant.";

    // Add conversation memory context if user is available
    if (user?.id && messages.length > 0) {
      const currentQuery = messages[messages.length - 1]?.content || '';
      try {
        // Add conversational memory
        const memoryContext = await getConversationMemory(user.id, currentQuery);
        const memoryPrompt = formatMemoryForPrompt(memoryContext, preferences);
        if (memoryPrompt) {
          systemPrompt += memoryPrompt;
        }
        
        // Add hard memory context
        const hardMemoryContext = await getHardMemoryContext(user.id, currentQuery);
        const hardMemoryPrompt = formatHardMemoryForPrompt(hardMemoryContext);
        if (hardMemoryPrompt) {
          systemPrompt += hardMemoryPrompt;
        }
      } catch (error) {
        console.error('🚨 Error fetching memory context:', error);
      }
    }

    console.log('Sending to Cohere with personalization:', {
      hasPreferences: !!preferences,
      systemPromptLength: systemPrompt?.length || 0,
      userContext: formatUserContext(preferences)
    });

    const response = await fetch('/api/chat/cohere', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        modelId,
        systemPrompt,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error ${response.status}`);
    }

    // Handle streaming response
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let fullResponse = '';

    if (!reader) {
      throw new Error('No response body');
    }

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
              if (parsed.error) {
                throw new Error(parsed.error);
              }
              if (parsed.content) {
                fullResponse += parsed.content;
                onChunk?.(parsed.content);
              }
            } catch (e) {
              console.error('Error parsing SSE data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullResponse;
  };

  // Helper function to send message to Puter AI with memory and personalization
  const sendPuterMessageWithMemory = async (messages: Message[], modelId: string, onChunk?: (chunk: string) => void): Promise<string> => {
    // Generate system prompt from user preferences
    let systemPrompt = shouldIncludePersonalization(preferences)
      ? generateSystemPrompt(preferences)
      : "You are Zurvânex, a helpful AI assistant.";

    // Add conversation memory context if user is available
    if (user?.id && messages.length > 0) {
      const currentQuery = messages[messages.length - 1]?.content || '';
      try {
        // Add smart hard memory search (intelligent retrieval from Supabase)
        try {
          const smartMemoryResult = await smartHardMemorySearch(
            currentQuery,
            user.id,
            {
              openai: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
            }
          );

          if (smartMemoryResult.memories.length > 0) {
            console.log('[SmartHardMemory] Found memories for Puter:', {
              intent: smartMemoryResult.intent,
              count: smartMemoryResult.memories.length,
              totalMatches: smartMemoryResult.totalMatches,
            });

            // Format memories for prompt
            const memoryPrompt = formatHardMemoryForPrompt({
              foundMemories: smartMemoryResult.memories,
              relevantCount: smartMemoryResult.totalMatches,
              searchQuery: currentQuery,
              tags: [],
            });

            if (memoryPrompt) {
              systemPrompt += memoryPrompt;
            }
          }
        } catch (smartMemoryError) {
          console.error('[SmartHardMemory] Error (non-critical, using fallback):', smartMemoryError);

          // Fallback to original hard memory search
          const hardMemoryContext = await getHardMemoryContext(user.id, currentQuery);
          const hardMemoryPrompt = formatHardMemoryForPrompt(hardMemoryContext);
          if (hardMemoryPrompt) {
            systemPrompt += hardMemoryPrompt;
          }
        }

        // Add conversational memory
        const memoryContext = await getConversationMemory(user.id, currentQuery);
        const memoryPrompt = formatMemoryForPrompt(memoryContext, preferences);
        if (memoryPrompt) {
          systemPrompt += memoryPrompt;
        }
      } catch (error) {
        console.error('🚨 Error fetching memory context for Puter:', error);
      }
    }

    console.log('Sending to Puter with personalization:', {
      hasPreferences: !!preferences,
      systemPromptLength: systemPrompt?.length || 0,
      userContext: formatUserContext(preferences)
    });

    // Use the sendPuterMessage function with systemPrompt
    return await sendPuterMessage(messages, modelId, onChunk, systemPrompt);
  };

  // Handle image generation requests
  const handleImageGeneration = async (
    originalContent: string,
    prompt: string,
    inputImages?: string[],
    commandModel?: string,
    commandQuality?: 'high' | 'medium' | 'low' | 'hd' | 'standard'
  ) => {
    let conversationId = activeConversationId;

    // Use model from command if provided, otherwise use selected image model
    const modelToUse = commandModel || selectedImageModel;
    const qualityToUse = commandQuality || imageGenQuality;

    // Create a new conversation if needed
    if (!conversationId) {
      try {
        conversationId = await createConversation(selectedModel || 'image-generation');
        if (!conversationId) {
          console.error('Failed to create conversation for image generation');
          return;
        }
        setActiveConversationId(conversationId);
      } catch (error) {
        console.error('Error creating conversation:', error);
        return;
      }
    }

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: originalContent,
      timestamp: new Date(),
      images: inputImages,
    };

    try {
      await addMessage(conversationId, userMessage);
      clearCurrentDraft();
    } catch (error) {
      console.error('Error adding user message:', error);
      return;
    }

    setIsGeneratingImage(true);
    setConversationLoading(conversationId, true);

    try {
      console.log('[ImageGen] Original prompt:', prompt);
      console.log('[ImageGen] Image Model:', modelToUse);
      console.log('[ImageGen] Quality:', qualityToUse);
      console.log('[ImageGen] Chat Model for context:', selectedModel);

      // Get current conversation messages for context
      const currentConversation = conversations.find(c => c.id === conversationId);
      const conversationMessages = currentConversation?.messages || [];

      // Use the current chat model to generate a context-aware prompt
      let enhancedPrompt = prompt;
      if (conversationMessages.length >= 2 && selectedModel) {
        console.log('[ImageGen] Using chat model to enhance prompt with conversation context...');

        try {
          // Build messages for the chat model - include conversation history + prompt request
          const promptRequestMessage: Message = {
            id: 'prompt-gen',
            role: 'user',
            content: buildImagePromptSystemMessage(prompt),
            timestamp: new Date(),
          };

          // Include recent conversation messages (last 10) + the prompt request
          const messagesForPrompt = [...conversationMessages.slice(-10), promptRequestMessage];

          // Call the chat model to generate the enhanced prompt
          const chatModel = models.find(m => m.id === selectedModel);

          if (chatModel?.provider === 'puter') {
            // Use Puter for the chat model
            const response = await sendPuterMessage(messagesForPrompt, selectedModel);
            if (response && response.trim().length > 10) {
              enhancedPrompt = response.trim();
              console.log('[ImageGen] Chat model enhanced prompt:', enhancedPrompt);
            }
          } else {
            // For other providers, use a quick Puter call as fallback
            const response = await sendPuterMessage(messagesForPrompt, 'gpt-4o');
            if (response && response.trim().length > 10) {
              enhancedPrompt = response.trim();
              console.log('[ImageGen] Fallback model enhanced prompt:', enhancedPrompt);
            }
          }
        } catch (enhanceError) {
          console.error('[ImageGen] Prompt enhancement failed, using original:', enhanceError);
          // Keep using the original prompt
        }
      }

      // Use first input image if provided (for img2img)
      const inputImage = inputImages && inputImages.length > 0 ? inputImages[0] : undefined;

      // Generate the image with enhanced prompt
      const generatedImageUrl = await generatePuterImage(
        enhancedPrompt,
        modelToUse,
        qualityToUse,
        inputImage
      );

      // Create AI response with the generated image
      const modelName = PUTER_IMAGE_MODELS.find(m => m.id === modelToUse)?.name || modelToUse;
      const wasEnhanced = enhancedPrompt !== prompt;
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: wasEnhanced
          ? `Here's your generated image:\n\n*Original prompt: "${prompt}"*\n*Enhanced with context: "${enhancedPrompt.substring(0, 150)}${enhancedPrompt.length > 150 ? '...' : ''}"*\n*Model: ${modelName}*`
          : `Here's your generated image:\n\n*Prompt: "${prompt}"*\n*Model: ${modelName}*`,
        timestamp: new Date(),
        modelId: modelToUse,
        modelName: modelName,
        images: [generatedImageUrl],
      };

      await addMessage(conversationId, aiMessage);

      console.log('[ImageGen] Image generated successfully');

    } catch (error) {
      console.error('[ImageGen] Error:', error);

      // Add error message with help text
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I couldn't generate the image. ${error instanceof Error ? error.message : 'Unknown error occurred.'}\n\n**Tips:**\n- Make sure you're signed in to Puter\n- Try a different model: \`/image --model=dall-e-3 ${prompt}\`\n- Simplify your prompt\n\n**Available models:** gpt-image-1, gpt-image-1-mini, dall-e-3, dall-e-2, flux-schnell, stable-diffusion-3`,
        timestamp: new Date(),
        modelId: modelToUse,
        modelName: 'Image Generation',
      };

      await addMessage(conversationId, errorMessage);
    } finally {
      setIsGeneratingImage(false);
      setConversationLoading(conversationId, false);
    }
  };

  const handleSendMessage = async (content: string, images?: string[]) => {
    // Check if this is an image generation request (slash commands like /image, /imagine, /gen, /draw)
    const imageGenRequest = detectImageGenerationRequest(content);

    if (imageGenRequest.isImageGen) {
      // Handle image generation with optional model/quality from command
      await handleImageGeneration(
        content,
        imageGenRequest.prompt,
        images,
        imageGenRequest.model,
        imageGenRequest.quality
      );
      return;
    }

    // If no model is selected, keep the message but show alert
    if (!selectedModel) {
      // Don't clear the draft - just show the error
      alert('Please select a model first');
      return;
    }

    let conversationId = activeConversationId;

    // Create a new conversation if needed
    if (!conversationId) {
      try {
        console.log('No active conversation, creating new one...');
        conversationId = await createConversation(selectedModel);
        if (!conversationId) {
          console.error('Failed to create conversation - createConversation returned null');
          console.error('User:', user);
          console.error('Selected model:', selectedModel);
          return;
        }
        console.log('New conversation created:', conversationId);
        setActiveConversationId(conversationId);
      } catch (error) {
        console.error('Error creating conversation:', error);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        return;
      }
    }

    // Check if this specific conversation is already loading
    if (loadingConversations[conversationId]) {
      console.log('This conversation is already loading, ignoring duplicate send request');
      return;
    }

    // Get conversation and determine if this is the first message
    // IMPORTANT: Save this flag NOW before we add any messages
    const conversation = conversations.find((c) => c.id === conversationId);
    const isFirstMessage = !conversation || conversation.messages.length === 0;
    const firstUserMessage = content; // Save for title generation later

    // Handle comprehensive media compression for Supabase storage
    let mediaToSave = images;
    let processedMediaForAI = images; // Keep original for AI models
    
    if (images && images.length > 0) {
      const messageNeedsCompression = needsMediaCompression(images, content);
      const mediaSize = getMediaCollectionSize(images);
      
      console.log(`Message size check: ${messageNeedsCompression ? 'needs compression' : 'within limits'} ` +
        `(${mediaSize.formattedSize} total)`);
      
      if (messageNeedsCompression) {
        try {
          console.log('[INFO] Processing media files for Supabase storage...');
          
          // For now, we'll treat all as generic files since we don't have filename/mimetype context
          // In a real scenario, this info would come from ChatInput
          const filenames = images.map((_, index) => `attachment_${index + 1}`);
          const mimeTypes = images.map(img => {
            if (img.startsWith('data:image/')) return img.split(';')[0].split(':')[1];
            if (img.startsWith('data:video/')) return img.split(';')[0].split(':')[1];
            return 'application/octet-stream';
          });
          
          const mediaResults = await processMediaFiles(images, filenames, mimeTypes);
          
          const totalOriginalSize = mediaResults.compressionResults.reduce(
            (acc, result) => acc + result.metadata.originalSize, 0);
          const totalCompressedSize = mediaResults.compressionResults.reduce(
            (acc, result) => acc + (result.metadata.compressedSize || result.metadata.thumbnailSize || 0), 0);
          const totalSavings = totalOriginalSize - totalCompressedSize;
          
          console.log(`[INFO] Media processed: ${formatSize(totalSavings)} saved, ` +
            `${mediaResults.compressionResults.length} files processed`);
          
          // Log compression details
          mediaResults.compressionResults.forEach((result, index) => {
            if (result.error) {
              console.warn(`[WARN] File ${index + 1} (${result.metadata.filename}): ${result.error}`);
            } else {
              console.log(`[INFO] File ${index + 1}: ${result.metadata.summary}`);
            }
          });
          
          // Use compressed/processed media for database storage
          mediaToSave = mediaResults.forDatabase.filter(Boolean) as string[];
          
          // Keep original high-quality media for AI models
          processedMediaForAI = mediaResults.forAI;
          
        } catch (compressionError) {
          console.error('[ERROR] Media compression failed:', compressionError);
          console.log('[WARNING] Media too large for Supabase, saving text only');
          mediaToSave = undefined; // Fallback: don't save media to database
          processedMediaForAI = images; // Still send to AI models
        }
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
      images: mediaToSave, // Only save compressed/processed media to database
    };

    // Add user message to database (with temporary title if first message)
    try {
      console.log('Adding user message to database...', { conversationId, hasMedia: !!mediaToSave?.length });
      console.log('Current conversations in state:', conversations.length);
      console.log('Active conversation found:', !!conversations.find(c => c.id === conversationId));
      await addMessage(conversationId, userMessage, isFirstMessage ? 'New Conversation' : undefined);
      console.log('User message added successfully');
      // Clear the draft since message was successfully sent
      clearCurrentDraft();
    } catch (error) {
      console.error('Error adding user message:', error);
      alert(`Failed to save message: ${error instanceof Error ? error.message : 'Unknown error'}.`);
      return;
    }

    setConversationLoading(conversationId, true);
    clearStreamingContent(conversationId);

    // Track performance metrics
    const startTime = Date.now();

    // Store conversationId for use in callbacks (closures)
    const currentConvId = conversationId;

    try {
      // Get updated conversation with the user message
      const updatedConversation = conversations.find((c) => c.id === conversationId);
      
      // Create a message with original media for AI models (better quality)
      const userMessageForAI: Message = {
        ...userMessage,
        images: processedMediaForAI, // Use original high-quality media
      };
      
      const allMessages = updatedConversation
        ? [...updatedConversation.messages, userMessageForAI]
        : [userMessageForAI];

      // Determine provider based on selected model
      const currentModel = models.find(m => m.id === selectedModel);
      const provider = currentModel?.provider || 'ollama';

      console.log('Sending message...', {
        provider,
        model: selectedModel,
        messageCount: allMessages.length,
        hasFiles: !!images?.length,
        fileCount: images?.length || 0
      });

      let response: string;

      // Create streaming callback for this specific conversation
      const onChunk = (chunk: string) => appendStreamingContent(currentConvId, chunk);

      // Route to appropriate provider
      if (provider === 'openrouter') {
        // Use OpenRouter API via our route
        response = await sendOpenRouterMessage(allMessages, selectedModel, onChunk);
      } else if (provider === 'groq') {
        // Use Groq API via our route
        response = await sendGroqMessage(allMessages, selectedModel, onChunk);
      } else if (provider === 'openai') {
        // Use OpenAI API via our route
        response = await sendOpenAIMessage(allMessages, selectedModel, onChunk);
      } else if (provider === 'claude') {
        // Use Claude API via our route
        response = await sendClaudeMessage(allMessages, selectedModel, onChunk);
      } else if (provider === 'cohere') {
        // Use Cohere API via our route
        response = await sendCohereMessage(allMessages, selectedModel, onChunk);
      } else if (provider === 'puter') {
        // Use Puter AI (free, user-pays) with memory and personalization
        response = await sendPuterMessageWithMemory(allMessages, selectedModel, onChunk);
      } else {
        // Use Ollama (default)
        response = await sendMessage(allMessages, selectedModel, onChunk);
      }

      console.log('Response received');
      console.log('Response type:', typeof response);
      console.log('Response length:', response?.length);
      console.log('Response content:', response);
      console.log('Streaming content:', streamingContent);

      // Calculate performance metrics
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      // Rough token estimate: ~4 characters per token for English text
      const estimatedTokens = Math.ceil(response.length / 4);

      // Add assistant message to database
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        modelId: selectedModel,
        modelName: currentModel?.name,
        performance: {
          responseTime,
          tokenCount: estimatedTokens,
          startTime,
          endTime,
        },
      };

      console.log('Assistant message to be saved:', assistantMessage);
      console.log('Assistant message content length:', assistantMessage.content?.length);

      await addMessage(conversationId, assistantMessage);
      console.log('Assistant message saved to database');

      // Trigger memory extraction after message exchange
      const fullConversation = [...allMessages, assistantMessage];
      extractionTrigger.onMessageSent(conversationId, fullConversation.map(m => ({
        role: m.role,
        content: m.content
      })));

      // Generate title after first exchange
      if (isFirstMessage) {
        try {
          console.log('Generating smart title...');
          let aiTitle: string;
          
          if (shouldUseSmartTitles(provider)) {
            // Use smart AI title generation for cloud models
            aiTitle = await generateSmartTitle({
              provider: provider as any,
              modelId: selectedModel,
              userMessage: firstUserMessage,
              assistantMessage: response,
              conversationContext: []
            });
          } else if (provider === 'ollama') {
            // Use existing Ollama title generation
            aiTitle = await generateTitle(firstUserMessage, response, selectedModel);
          } else {
            // Simple fallback for other cases
            aiTitle = firstUserMessage.slice(0, 50).trim();
            if (firstUserMessage.length > 50) aiTitle += '...';
          }
          
          console.log('Generated title:', aiTitle);
          await updateConversation(conversationId, { title: aiTitle });
        } catch (titleError) {
          console.error('Error generating title:', titleError);
          // Fallback: use first 50 chars if title generation fails
          const fallbackTitle = firstUserMessage.slice(0, 50).trim() + (firstUserMessage.length > 50 ? '...' : '');
          await updateConversation(conversationId, { title: fallbackTitle });
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error message
      const currentModel = models.find(m => m.id === selectedModel);
      const provider = currentModel?.provider || 'ollama';

      let errorContent = 'Sorry, I encountered an error. ';
      if (provider === 'ollama') {
        errorContent += 'Please make sure Ollama is running on http://localhost:11434';
      } else if (provider === 'groq') {
        errorContent += 'Please check your Groq API key configuration.';
      } else if (provider === 'openrouter') {
        errorContent += 'Please check your OpenRouter API key configuration.';
      } else if (provider === 'openai') {
        errorContent += 'Please check your OpenAI API key configuration.';
      } else if (provider === 'claude') {
        errorContent += 'Please check your Claude API key configuration.';
      } else if (provider === 'cohere') {
        errorContent += 'Please check your Cohere API key configuration.';
      } else if (provider === 'puter') {
        errorContent += 'Please make sure you are signed in to Puter. Users pay for their own API usage.\n\nError details: ' + ((error as Error).message || 'Unknown error');
      } else {
        errorContent += 'Please check your API configuration.';
      }

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: errorContent,
        timestamp: new Date(),
        modelId: selectedModel,
        modelName: currentModel?.name,
      };

      try {
        await addMessage(conversationId, errorMessage);
      } catch (addError) {
        console.error('Error adding error message:', addError);
      }
    } finally {
      setConversationLoading(currentConvId, false);
      clearStreamingContent(currentConvId);
    }
  };

  const handleRegenerate = async (messageIndex: number) => {
    if (!activeConversation || !activeConversationId) return;

    // Find the message to regenerate (should be an assistant message)
    const messageToRegenerate = activeConversation.messages[messageIndex];
    if (messageToRegenerate.role !== 'assistant') return;

    // Get all messages up to (but not including) the message we're regenerating
    const messagesBeforeRegenerate = activeConversation.messages.slice(0, messageIndex);

    // Update conversation with messages up to this point
    await setMessages(activeConversationId, messagesBeforeRegenerate);

    // Find the last user message to re-send
    const lastUserMessage = [...messagesBeforeRegenerate].reverse().find(m => m.role === 'user');
    if (!lastUserMessage) return;

    // Store conversation ID for closure
    const regenConvId = activeConversationId;

    // Re-send the last user message to get a new response
    setConversationLoading(regenConvId, true);
    clearStreamingContent(regenConvId);

    // Track performance metrics
    const startTime = Date.now();

    try {
      const response = await sendMessage(messagesBeforeRegenerate, selectedModel, (chunk) => {
        appendStreamingContent(regenConvId, chunk);
      });

      // Calculate performance metrics
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      const estimatedTokens = Math.ceil(response.length / 4);

      const currentModel = models.find(m => m.id === selectedModel);
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        modelId: selectedModel,
        modelName: currentModel?.name,
        performance: {
          responseTime,
          tokenCount: estimatedTokens,
          startTime,
          endTime,
        },
      };

      await addMessage(regenConvId, assistantMessage);
    } catch (error) {
      console.error('Error regenerating message:', error);
    } finally {
      setConversationLoading(regenConvId, false);
      clearStreamingContent(regenConvId);
    }
  };

  const handleBranch = async (messageIndex: number) => {
    if (!activeConversation) return;

    // Get all messages up to and including the selected message
    const messagesUpToPoint = activeConversation.messages.slice(0, messageIndex + 1);

    // Create a new conversation with these messages
    const newConversationId = await createConversation(activeConversation.modelId);
    if (!newConversationId) return;

    // Add all messages to the new conversation
    await setMessages(newConversationId, messagesUpToPoint);

    // Update the title to indicate it's a branch
    const branchTitle = `${activeConversation.title} (Branch)`;
    await updateConversation(newConversationId, { title: branchTitle });

    // Switch to the new conversation
    setActiveConversationId(newConversationId);
  };

  const handleResend = async (messageIndex: number) => {
    if (!activeConversation) return;

    const messageToResend = activeConversation.messages[messageIndex];
    if (messageToResend.role !== 'user') return;

    // Resend the message with its content and images
    await handleSendMessage(messageToResend.content, messageToResend.images);
  };

  const scrollToTop = () => {
    messagesContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleScroll = () => {
    if (!messagesContainerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
    const isScrollable = scrollHeight > clientHeight;
    const isNearTop = scrollTop < 100;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 100;

    // Show buttons when scrollable and not at both edges
    setShowScrollButtons(isScrollable && !(isNearTop && isNearBottom));
  };

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, streamingContent]);

  // Add scroll listener
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    handleScroll(); // Check initial state
    container.addEventListener('scroll', handleScroll);

    return () => container.removeEventListener('scroll', handleScroll);
  }, [activeConversation?.messages]);

  // Don't auto-create conversations - let user start first message
  // Removed auto-initialization to prevent empty chats

  const currentModel = models.find((m) => m.id === selectedModel);

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[var(--bg-dark)]">
        <div className="flex flex-col items-center gap-4">
          <img src="/Logo.png" alt="Zurvânex Logo" style={{ width: '120px', height: '120px' }} />
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-[var(--teal-bright)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-[var(--teal-bright)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-[var(--teal-bright)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!user) {
    return <Login />;
  }

  return (
    <div className="container">

      {/* Mobile Overlay */}
      <div
        className={`mobile-overlay ${isMobileMenuOpen ? 'active' : ''}`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={() => {
          handleNewChat();
          setIsMobileMenuOpen(false);
        }}
        onSelectConversation={(id) => {
          setActiveConversationId(id);
          setIsMobileMenuOpen(false);
        }}
        onDeleteConversation={async (id) => {
          if (activeConversationId === id) {
            setActiveConversationId(null);
          }
          await deleteConversation(id);
          setIsMobileMenuOpen(false);
        }}
        onRenameConversation={async (id, newTitle) => {
          await updateConversation(id, { title: newTitle });
        }}
        onOpenHardMemory={() => setIsMemoryPopupOpen(true)}
        className={isMobileMenuOpen ? 'mobile-open' : ''}
      />

      {/* Main Content */}
      <div className="main-content">
        {/* Header */}
        <div className="chat-header">
          {/* Hamburger Menu Button */}
          <button
            className="hamburger-btn"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>

          <div className="chat-title">
            {activeConversation?.title || 'New Conversation'}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Help Button */}
            <button
              onClick={() => setIsGuidelinesOpen(true)}
              style={{
                background: 'rgba(114, 212, 204, 0.1)',
                border: '1px solid rgba(114, 212, 204, 0.3)',
                borderRadius: '8px',
                padding: '8px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--teal-bright)',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(114, 212, 204, 0.2)';
                e.currentTarget.style.borderColor = 'var(--teal-bright)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(114, 212, 204, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(114, 212, 204, 0.3)';
              }}
              title="Help & Commands"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <ModelSelector
              models={models}
              selectedModel={selectedModel}
              onSelectModel={setSelectedModel}
            />
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages" ref={messagesContainerRef}>
          {/* Scroll buttons */}
          {showScrollButtons && (
            <div style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
              zIndex: 10,
            }}>
              <button
                onClick={scrollToTop}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--darker-bg)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--teal-bright)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--teal-med)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--darker-bg)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Scroll to top"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
              <button
                onClick={scrollToBottom}
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  background: 'var(--darker-bg)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  color: 'var(--teal-bright)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--teal-med)';
                  e.currentTarget.style.transform = 'scale(1.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'var(--darker-bg)';
                  e.currentTarget.style.transform = 'scale(1)';
                }}
                title="Scroll to bottom"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            </div>
          )}

          {activeConversation && activeConversation.messages.length > 0 ? (
            <>
              {activeConversation.messages.map((message, index) => {
                // Check if we need a date separator
                const currentDate = new Date(message.timestamp);
                const previousMessage = index > 0 ? activeConversation.messages[index - 1] : null;
                const previousDate = previousMessage ? new Date(previousMessage.timestamp) : null;

                const needsDateSeparator = !previousDate || (
                  currentDate.getDate() !== previousDate.getDate() ||
                  currentDate.getMonth() !== previousDate.getMonth() ||
                  currentDate.getFullYear() !== previousDate.getFullYear()
                );

                const formatDateSeparator = (date: Date) => {
                  const today = new Date();
                  const yesterday = new Date(today);
                  yesterday.setDate(yesterday.getDate() - 1);

                  if (date.toDateString() === today.toDateString()) {
                    return 'Today';
                  } else if (date.toDateString() === yesterday.toDateString()) {
                    return 'Yesterday';
                  } else {
                    return date.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
                    });
                  }
                };

                return (
                  <div key={message.id}>
                    {needsDateSeparator && (
                      <div className="date-separator">
                        <span>{formatDateSeparator(currentDate)}</span>
                      </div>
                    )}
                    <MessageBubble
                      message={message}
                      onRegenerate={
                        message.role === 'assistant'
                          ? () => handleRegenerate(index)
                          : undefined
                      }
                      onResend={
                        message.role === 'user'
                          ? () => handleResend(index)
                          : undefined
                      }
                      onBranch={() => handleBranch(index)}
                      onSaveMoment={
                        message.role === 'assistant'
                          ? () => {
                              // Find the previous user message
                              const userMessage = previousMessage?.role === 'user'
                                ? previousMessage
                                : activeConversation.messages
                                    .slice(0, index)
                                    .reverse()
                                    .find(m => m.role === 'user');

                              if (userMessage) {
                                setSaveMoment({ user: userMessage, ai: message });
                              }
                            }
                          : undefined
                      }
                      allMessages={activeConversation.messages}
                    />
                  </div>
                );
              })}
              {/* Streaming message */}
              {isLoading && streamingContent && (
                <MessageBubble
                  message={{
                    id: 'streaming',
                    role: 'assistant',
                    content: streamingContent,
                    timestamp: new Date(),
                    modelId: selectedModel,
                    modelName: models.find(m => m.id === selectedModel)?.name,
                  }}
                />
              )}
              {/* Loading indicator */}
              {isLoading && !streamingContent && (
                <div className="message ai-message">
                  <div className="message-avatar ai-avatar">Z</div>
                  <div className="message-content">
                    <div className="message-text">
                      <div className="flex gap-1.5">
                        <div className="w-2 h-2 bg-[var(--teal-bright)] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-[var(--teal-bright)] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-[var(--teal-bright)] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Empty State - Centered Logo with Welcome Message */
            <div className="flex flex-col items-center justify-center h-full text-center animate-fade-in">
              <img
                src="/Logo.png"
                alt="Zurvânex Logo"
                style={{
                  width: '140px',
                  height: '140px',
                  marginBottom: '20px',
                }}
              />
              <h1 className="text-3xl font-bold text-[var(--gray-med)] tracking-tight mb-4">
                Zurvânex
              </h1>
              <p style={{
                color: 'var(--gray-light)',
                fontSize: '15px',
                maxWidth: '480px',
                lineHeight: '1.6',
                marginBottom: '32px',
                padding: '0 20px',
              }}>
                Hey there! I&apos;m your AI companion, ready to help with anything you need.
                Ask me questions, brainstorm ideas, or just chat.
              </p>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <ChatInput
          onSend={handleSendMessage}
          disabled={isLoading}
          supportsVision={currentModel?.supportsVision}
          conversationId={activeConversationId}
          persistedMessage={currentDraft}
          onMessageChange={handleDraftChange}
        />
      </div>

      {/* Save Moment Modal */}
      {saveMoment && (
        <SaveMomentModal
          userMessage={saveMoment.user}
          aiMessage={saveMoment.ai}
          onClose={() => setSaveMoment(null)}
        />
      )}

      {/* Floating Hard Memory Popup */}
      <FloatingMemoryPopup
        isOpen={isMemoryPopupOpen}
        onClose={() => setIsMemoryPopupOpen(false)}
      />

      {/* Guidelines & Help Modal */}
      <GuidelinesModal
        isOpen={isGuidelinesOpen}
        onClose={() => setIsGuidelinesOpen(false)}
      />
    </div>
  );
}

export default function ChatInterface() {
  const { user } = useAuth();
  
  return (
    <UserPreferencesProvider userId={user?.id || null}>
      <ChatInterfaceInner />
    </UserPreferencesProvider>
  );
}

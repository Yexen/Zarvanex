export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  images?: string[]; // Base64 or URLs for vision models
  modelId?: string; // Model ID used for this message
  modelName?: string; // Model display name
  performance?: {
    responseTime?: number; // Response time in milliseconds
    tokenCount?: number; // Approximate token count
    startTime?: number; // Start timestamp
    endTime?: number; // End timestamp
  };
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  modelId: string;
}

export interface Model {
  id: string;
  name: string;
  type: 'base' | 'fine-tuned';
  description?: string;
  supportsVision?: boolean;
  provider: 'ollama' | 'groq' | 'together' | 'claude' | 'openrouter' | 'openai' | 'cohere';
  contextWindow?: number; // Context window size in tokens
  hasThinkingMode?: boolean; // Supports reasoning/thinking mode
  isFree?: boolean; // Whether the model is free to use
}

export interface LMStudioConfig {
  apiUrl: string;
  defaultModel: string;
  temperature?: number;
  maxTokens?: number;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
}

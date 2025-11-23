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

export interface UserPreferences {
  id: string;
  user_id: string;
  
  // Basic Profile Info
  nickname?: string;
  display_name?: string;
  bio?: string;
  avatar_url?: string;
  location?: string;
  website?: string;
  pronouns?: string;
  
  // Extended Personal Info
  occupation?: string;
  interests?: string[];
  skills?: string[];
  goals?: string;
  background?: string;
  
  // AI Interaction Preferences
  conversation_style: {
    tone: 'professional' | 'casual' | 'friendly' | 'balanced';
    formality: 'formal' | 'casual' | 'adaptive';
    verbosity: 'concise' | 'detailed' | 'comprehensive';
    humor: boolean;
    empathy_level: 'low' | 'medium' | 'high';
    technical_depth: 'basic' | 'medium' | 'advanced';
  };
  
  // Communication Preferences
  communication_prefs: {
    preferred_greeting: string;
    response_length: 'brief' | 'detailed' | 'comprehensive';
    explanation_style: 'examples' | 'step_by_step' | 'conceptual';
    feedback_preference: 'direct' | 'constructive' | 'encouraging';
    learning_style: 'visual_and_text' | 'text_only' | 'interactive';
  };
  
  // Context & Memory Preferences
  context_preferences: {
    remember_conversations: boolean;
    use_context_from_previous: boolean;
    personalization_level: 'low' | 'medium' | 'high';
    adapt_to_patterns: boolean;
  };
  
  // Content Preferences
  content_preferences: {
    topics_of_interest: string[];
    expertise_areas: string[];
    content_filters: string[];
    preferred_examples: 'theoretical' | 'real_world' | 'mixed';
  };
  
  // System Preferences
  theme: string;
  language: string;
  timezone?: string;
  notifications: {
    email: boolean;
    push: boolean;
    mentions: boolean;
  };
  privacy_settings: {
    profile_visible: boolean;
    activity_visible: boolean;
  };
  
  // Accessibility
  accessibility_prefs: {
    font_size: 'small' | 'medium' | 'large';
    high_contrast: boolean;
    screen_reader_friendly: boolean;
    reduced_motion: boolean;
  };
  
  created_at: Date;
  updated_at: Date;
}

-- User Preferences Table Schema for Supabase
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Basic Profile Info
  nickname VARCHAR(100),
  display_name VARCHAR(100),
  bio TEXT, -- Extended bio (no limit for cloud models)
  avatar_url TEXT,
  location VARCHAR(100),
  website VARCHAR(200),
  pronouns VARCHAR(30),
  
  -- Extended Personal Info
  occupation TEXT,
  interests TEXT[], -- Array of interests/hobbies
  skills TEXT[], -- Array of skills
  goals TEXT, -- Personal/professional goals
  background TEXT, -- Educational/professional background
  
  -- AI Interaction Preferences
  conversation_style JSONB DEFAULT '{
    "tone": "balanced", 
    "formality": "casual", 
    "verbosity": "detailed", 
    "humor": true, 
    "empathy_level": "high",
    "technical_depth": "medium"
  }',
  
  -- Communication Preferences
  communication_prefs JSONB DEFAULT '{
    "preferred_greeting": "Hello",
    "response_length": "detailed",
    "explanation_style": "examples",
    "feedback_preference": "constructive",
    "learning_style": "visual_and_text"
  }',
  
  -- Context & Memory Preferences
  context_preferences JSONB DEFAULT '{
    "remember_conversations": true,
    "use_context_from_previous": true,
    "personalization_level": "high",
    "adapt_to_patterns": true
  }',
  
  -- Content Preferences
  content_preferences JSONB DEFAULT '{
    "topics_of_interest": [],
    "expertise_areas": [],
    "content_filters": [],
    "preferred_examples": "real_world"
  }',
  
  -- System Preferences
  theme VARCHAR(20) DEFAULT 'dark',
  language VARCHAR(10) DEFAULT 'en',
  timezone VARCHAR(50),
  notifications JSONB DEFAULT '{"email": true, "push": true, "mentions": true}',
  privacy_settings JSONB DEFAULT '{"profile_visible": true, "activity_visible": false}',
  
  -- Accessibility
  accessibility_prefs JSONB DEFAULT '{
    "font_size": "medium",
    "high_contrast": false,
    "screen_reader_friendly": false,
    "reduced_motion": false
  }',
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT unique_user_preferences UNIQUE(user_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS (Row Level Security)
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences"
  ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own preferences"
  ON user_preferences FOR DELETE
  USING (auth.uid() = user_id);
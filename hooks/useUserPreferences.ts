'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { UserPreferences } from '@/types';

const defaultPreferences: Partial<UserPreferences> = {
  theme: 'dark',
  language: 'en',
  interests: [],
  skills: [],
  notifications: {
    email: true,
    push: true,
    mentions: true,
  },
  privacy_settings: {
    profile_visible: true,
    activity_visible: false,
  },
  conversation_style: {
    tone: 'balanced',
    formality: 'casual',
    verbosity: 'detailed',
    humor: true,
    empathy_level: 'high',
    technical_depth: 'medium',
  },
  communication_prefs: {
    preferred_greeting: 'Hello',
    response_length: 'detailed',
    explanation_style: 'examples',
    feedback_preference: 'constructive',
    learning_style: 'visual_and_text',
  },
  context_preferences: {
    remember_conversations: true,
    use_context_from_previous: true,
    personalization_level: 'high',
    adapt_to_patterns: true,
  },
  content_preferences: {
    topics_of_interest: [],
    expertise_areas: [],
    content_filters: [],
    preferred_examples: 'real_world',
  },
  accessibility_prefs: {
    font_size: 'medium',
    high_contrast: false,
    screen_reader_friendly: false,
    reduced_motion: false,
  },
};

export function useUserPreferences(userId: string | null) {
  const [preferences, setPreferences] = useState<UserPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    loadPreferences();
  }, [userId]);

  const loadPreferences = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setPreferences({
          ...data,
          created_at: new Date(data.created_at),
          updated_at: new Date(data.updated_at),
        });
      } else {
        // Create default preferences if none exist
        await createDefaultPreferences();
      }
    } catch (err) {
      console.error('Error loading user preferences:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const createDefaultPreferences = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .insert({
          user_id: userId,
          ...defaultPreferences,
        })
        .select()
        .single();

      if (error) throw error;

      setPreferences({
        ...data,
        created_at: new Date(data.created_at),
        updated_at: new Date(data.updated_at),
      });
    } catch (err) {
      console.error('Error creating default preferences:', err);
      setError(err as Error);
    }
  };

  const updatePreferences = async (updates: Partial<UserPreferences>): Promise<void> => {
    if (!userId || !preferences) return;

    try {
      // Optimistic update
      setPreferences(prev => prev ? { ...prev, ...updates } : null);

      const { error } = await supabase
        .from('user_preferences')
        .update(updates)
        .eq('user_id', userId);

      if (error) throw error;

      // Reload to get the updated timestamp
      await loadPreferences();
    } catch (err) {
      console.error('Error updating preferences:', err);
      // Revert optimistic update
      await loadPreferences();
      throw err;
    }
  };

  const updateNickname = async (nickname: string): Promise<void> => {
    await updatePreferences({ nickname: nickname.trim() || undefined });
  };

  const updateBio = async (bio: string): Promise<void> => {
    await updatePreferences({ bio: bio.trim() || undefined });
  };

  const updateNotificationSettings = async (notifications: UserPreferences['notifications']): Promise<void> => {
    await updatePreferences({ notifications });
  };

  const updatePrivacySettings = async (privacy_settings: UserPreferences['privacy_settings']): Promise<void> => {
    await updatePreferences({ privacy_settings });
  };

  return {
    preferences,
    loading,
    error,
    updatePreferences,
    updateNickname,
    updateBio,
    updateNotificationSettings,
    updatePrivacySettings,
    reload: loadPreferences,
  };
}
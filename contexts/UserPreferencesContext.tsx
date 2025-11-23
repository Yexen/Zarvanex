'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { UserPreferences } from '@/types';

interface UserPreferencesContextType {
  preferences: UserPreferences | null;
  loading: boolean;
  error: Error | null;
  updatePreferences: (updates: Partial<UserPreferences>) => Promise<void>;
  updateNickname: (nickname: string) => Promise<void>;
  updateBio: (bio: string) => Promise<void>;
  updateNotificationSettings: (notifications: UserPreferences['notifications']) => Promise<void>;
  updatePrivacySettings: (privacy_settings: UserPreferences['privacy_settings']) => Promise<void>;
  reload: () => Promise<void>;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | null>(null);

interface UserPreferencesProviderProps {
  children: ReactNode;
  userId: string | null;
}

export function UserPreferencesProvider({ children, userId }: UserPreferencesProviderProps) {
  const preferencesHook = useUserPreferences(userId);

  return (
    <UserPreferencesContext.Provider value={preferencesHook}>
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferencesContext() {
  const context = useContext(UserPreferencesContext);
  if (!context) {
    throw new Error('useUserPreferencesContext must be used within a UserPreferencesProvider');
  }
  return context;
}
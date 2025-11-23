'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import type { UserPreferences } from '@/types';

interface SettingsExtendedProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsExtended({ isOpen, onClose }: SettingsExtendedProps) {
  const { user } = useAuth();
  const { preferences, loading, updatePreferences } = useUserPreferences(user?.id || null);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    // Basic Profile
    nickname: '',
    display_name: '',
    bio: '',
    location: '',
    website: '',
    pronouns: '',
    
    // Extended Personal Info
    occupation: '',
    interests: [] as string[],
    skills: [] as string[],
    goals: '',
    background: '',
    
    // AI Interaction
    conversation_style: {
      tone: 'balanced',
      formality: 'casual',
      verbosity: 'detailed',
      humor: true,
      empathy_level: 'high',
      technical_depth: 'medium',
    },
    
    // Communication
    communication_prefs: {
      preferred_greeting: 'Hello',
      response_length: 'detailed',
      explanation_style: 'examples',
      feedback_preference: 'constructive',
      learning_style: 'visual_and_text',
    },
    
    // Context & Memory
    context_preferences: {
      remember_conversations: true,
      use_context_from_previous: true,
      personalization_level: 'high',
      adapt_to_patterns: true,
    },
    
    // Content
    content_preferences: {
      topics_of_interest: [] as string[],
      expertise_areas: [] as string[],
      content_filters: [] as string[],
      preferred_examples: 'real_world',
    },
    
    // System
    notifications: {
      email: true,
      push: true,
      mentions: true,
    },
    privacy_settings: {
      profile_visible: true,
      activity_visible: false,
    },
    
    // Accessibility
    accessibility_prefs: {
      font_size: 'medium',
      high_contrast: false,
      screen_reader_friendly: false,
      reduced_motion: false,
    },
  });
  
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [newInterest, setNewInterest] = useState('');
  const [newSkill, setNewSkill] = useState('');
  const [newTopic, setNewTopic] = useState('');
  const [newExpertise, setNewExpertise] = useState('');

  // Update form data when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData({
        nickname: preferences.nickname || '',
        display_name: preferences.display_name || '',
        bio: preferences.bio || '',
        location: preferences.location || '',
        website: preferences.website || '',
        pronouns: preferences.pronouns || '',
        occupation: preferences.occupation || '',
        interests: preferences.interests || [],
        skills: preferences.skills || [],
        goals: preferences.goals || '',
        background: preferences.background || '',
        conversation_style: preferences.conversation_style,
        communication_prefs: preferences.communication_prefs,
        context_preferences: preferences.context_preferences,
        content_preferences: preferences.content_preferences,
        notifications: preferences.notifications,
        privacy_settings: preferences.privacy_settings,
        accessibility_prefs: preferences.accessibility_prefs,
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      await updatePreferences(formData as Partial<UserPreferences>);
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const addArrayItem = (field: 'interests' | 'skills' | 'topics_of_interest' | 'expertise_areas', value: string) => {
    if (!value.trim()) return;
    
    if (field === 'interests' || field === 'skills') {
      setFormData(prev => ({
        ...prev,
        [field]: [...prev[field], value.trim()]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        content_preferences: {
          ...prev.content_preferences,
          [field]: [...prev.content_preferences[field], value.trim()]
        }
      }));
    }
    
    // Clear the input
    if (field === 'interests') setNewInterest('');
    if (field === 'skills') setNewSkill('');
    if (field === 'topics_of_interest') setNewTopic('');
    if (field === 'expertise_areas') setNewExpertise('');
  };

  const removeArrayItem = (field: 'interests' | 'skills' | 'topics_of_interest' | 'expertise_areas', index: number) => {
    if (field === 'interests' || field === 'skills') {
      setFormData(prev => ({
        ...prev,
        [field]: prev[field].filter((_, i) => i !== index)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        content_preferences: {
          ...prev.content_preferences,
          [field]: prev.content_preferences[field].filter((_, i) => i !== index)
        }
      }));
    }
  };

  if (!isOpen) return null;

  const tabs = [
    { 
      id: 'profile', 
      label: 'Profile', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    { 
      id: 'personal', 
      label: 'Personal Info', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    { 
      id: 'ai_style', 
      label: 'AI Style', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    { 
      id: 'communication', 
      label: 'Communication', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    { 
      id: 'content', 
      label: 'Content', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    { 
      id: 'system', 
      label: 'System', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      )
    },
    { 
      id: 'accessibility', 
      label: 'Accessibility', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
        </svg>
      )
    },
  ];

  return (
    <div
      className="search-modal-overlay"
      onClick={onClose}
      style={{ zIndex: 1001 }}
    >
      <div
        className="search-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '900px', maxHeight: '90vh' }}
      >
        <div className="search-modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--gray-med)',
                cursor: 'pointer',
                padding: '8px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '14px',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.color = 'var(--gray-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'none';
                e.currentTarget.style.color = 'var(--gray-med)';
              }}
              aria-label="Back to basic settings"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h3 className="search-modal-title">Extended Personalization</h3>
          </div>
          <button
            className="search-modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ display: 'flex', height: '600px' }}>
          {/* Sidebar */}
          <div style={{ 
            width: '220px', 
            background: 'var(--darker-bg)', 
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px 0',
            overflowY: 'auto'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  width: '100%',
                  padding: '12px 20px',
                  background: activeTab === tab.id ? 'var(--teal-med)' : 'transparent',
                  color: activeTab === tab.id ? 'white' : 'var(--gray-med)',
                  border: 'none',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  fontSize: '13px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (activeTab !== tab.id) {
                    e.currentTarget.style.background = 'transparent';
                  }
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '24px', overflow: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ color: 'var(--gray-med)' }}>Loading preferences...</div>
              </div>
            ) : (
              <>
                {/* Profile Tab */}
                {activeTab === 'profile' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      Basic Profile Information
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                          Nickname
                        </label>
                        <input
                          type="text"
                          value={formData.nickname}
                          onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                          placeholder="How would you like to be called?"
                          maxLength={100}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                          Display Name
                        </label>
                        <input
                          type="text"
                          value={formData.display_name}
                          onChange={(e) => setFormData(prev => ({ ...prev, display_name: e.target.value }))}
                          placeholder="Your full name or display name"
                          maxLength={100}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Bio / About You
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell the AI about yourself, your personality, interests, work, or anything else you'd like it to know. This helps create more personalized conversations. Feel free to write as much as you want!"
                        rows={6}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'var(--bg-dark)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--gray-light)',
                          fontSize: '14px',
                          resize: 'vertical',
                          minHeight: '120px',
                        }}
                      />
                      <div style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '4px' }}>
                        {formData.bio.length} characters (no limit for cloud models)
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                          Location
                        </label>
                        <input
                          type="text"
                          value={formData.location}
                          onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="City, Country"
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                          Website
                        </label>
                        <input
                          type="url"
                          value={formData.website}
                          onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                          placeholder="https://yoursite.com"
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                          Pronouns
                        </label>
                        <input
                          type="text"
                          value={formData.pronouns}
                          onChange={(e) => setFormData(prev => ({ ...prev, pronouns: e.target.value }))}
                          placeholder="they/them, she/her, he/him, etc."
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Personal Info Tab */}
                {activeTab === 'personal' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      Extended Personal Information
                    </h4>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Occupation / Role
                      </label>
                      <textarea
                        value={formData.occupation}
                        onChange={(e) => setFormData(prev => ({ ...prev, occupation: e.target.value }))}
                        placeholder="What do you do for work? This helps the AI provide more relevant examples and advice."
                        rows={2}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'var(--bg-dark)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--gray-light)',
                          fontSize: '14px',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Background & Experience
                      </label>
                      <textarea
                        value={formData.background}
                        onChange={(e) => setFormData(prev => ({ ...prev, background: e.target.value }))}
                        placeholder="Your educational background, professional experience, or any relevant context that would help the AI understand your perspective."
                        rows={4}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'var(--bg-dark)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--gray-light)',
                          fontSize: '14px',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Goals & Aspirations
                      </label>
                      <textarea
                        value={formData.goals}
                        onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                        placeholder="What are you working towards? Personal goals, professional aspirations, learning objectives, or projects you're passionate about."
                        rows={3}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'var(--bg-dark)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--gray-light)',
                          fontSize: '14px',
                          resize: 'vertical',
                        }}
                      />
                    </div>

                    {/* Interests */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Interests & Hobbies
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={newInterest}
                          onChange={(e) => setNewInterest(e.target.value)}
                          placeholder="Add an interest..."
                          onKeyPress={(e) => e.key === 'Enter' && addArrayItem('interests', newInterest)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: 'var(--gray-light)',
                            fontSize: '13px',
                          }}
                        />
                        <button
                          onClick={() => addArrayItem('interests', newInterest)}
                          style={{
                            padding: '8px 16px',
                            background: 'var(--teal-bright)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {formData.interests.map((interest, index) => (
                          <span
                            key={index}
                            style={{
                              background: 'var(--teal-dark)',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {interest}
                            <button
                              onClick={() => removeArrayItem('interests', index)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: 0,
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Skills */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Skills & Expertise
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={newSkill}
                          onChange={(e) => setNewSkill(e.target.value)}
                          placeholder="Add a skill..."
                          onKeyPress={(e) => e.key === 'Enter' && addArrayItem('skills', newSkill)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: 'var(--gray-light)',
                            fontSize: '13px',
                          }}
                        />
                        <button
                          onClick={() => addArrayItem('skills', newSkill)}
                          style={{
                            padding: '8px 16px',
                            background: 'var(--teal-bright)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {formData.skills.map((skill, index) => (
                          <span
                            key={index}
                            style={{
                              background: 'var(--purple-dark)',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {skill}
                            <button
                              onClick={() => removeArrayItem('skills', index)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: 0,
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Style Tab */}
                {activeTab === 'ai_style' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      AI Interaction Style
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Conversation Tone
                        </label>
                        <select
                          value={formData.conversation_style.tone}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              tone: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="professional">Professional</option>
                          <option value="casual">Casual</option>
                          <option value="friendly">Friendly</option>
                          <option value="balanced">Balanced</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Formality Level
                        </label>
                        <select
                          value={formData.conversation_style.formality}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              formality: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="formal">Formal</option>
                          <option value="casual">Casual</option>
                          <option value="adaptive">Adaptive</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Response Length
                        </label>
                        <select
                          value={formData.conversation_style.verbosity}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              verbosity: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="concise">Concise</option>
                          <option value="detailed">Detailed</option>
                          <option value="comprehensive">Comprehensive</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Technical Depth
                        </label>
                        <select
                          value={formData.conversation_style.technical_depth}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              technical_depth: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="basic">Basic</option>
                          <option value="medium">Medium</option>
                          <option value="advanced">Advanced</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Empathy Level
                        </label>
                        <select
                          value={formData.conversation_style.empathy_level}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            conversation_style: {
                              ...prev.conversation_style,
                              empathy_level: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.conversation_style.humor}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              conversation_style: {
                                ...prev.conversation_style,
                                humor: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Use Humor & Wit
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Allow the AI to use appropriate humor and casual expressions
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Communication Tab */}
                {activeTab === 'communication' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      Communication Preferences
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Preferred Greeting
                        </label>
                        <input
                          type="text"
                          value={formData.communication_prefs.preferred_greeting}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            communication_prefs: {
                              ...prev.communication_prefs,
                              preferred_greeting: e.target.value
                            }
                          }))}
                          placeholder="Hello, Hi, Hey there, etc."
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        />
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Response Length
                        </label>
                        <select
                          value={formData.communication_prefs.response_length}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            communication_prefs: {
                              ...prev.communication_prefs,
                              response_length: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="brief">Brief</option>
                          <option value="detailed">Detailed</option>
                          <option value="comprehensive">Comprehensive</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Explanation Style
                        </label>
                        <select
                          value={formData.communication_prefs.explanation_style}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            communication_prefs: {
                              ...prev.communication_prefs,
                              explanation_style: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="examples">With Examples</option>
                          <option value="step_by_step">Step by Step</option>
                          <option value="conceptual">Conceptual</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Feedback Style
                        </label>
                        <select
                          value={formData.communication_prefs.feedback_preference}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            communication_prefs: {
                              ...prev.communication_prefs,
                              feedback_preference: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="direct">Direct</option>
                          <option value="constructive">Constructive</option>
                          <option value="encouraging">Encouraging</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Learning Style
                      </label>
                      <select
                        value={formData.communication_prefs.learning_style}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          communication_prefs: {
                            ...prev.communication_prefs,
                            learning_style: e.target.value as any
                          }
                        }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'var(--bg-dark)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--gray-light)',
                          fontSize: '14px',
                        }}
                      >
                        <option value="visual_and_text">Visual & Text</option>
                        <option value="text_only">Text Only</option>
                        <option value="interactive">Interactive</option>
                      </select>
                    </div>

                    {/* Context Preferences */}
                    <h5 style={{ color: 'var(--gray-light)', fontSize: '16px', marginBottom: '16px', fontWeight: '600' }}>
                      Context & Memory
                    </h5>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.context_preferences.remember_conversations}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              context_preferences: {
                                ...prev.context_preferences,
                                remember_conversations: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Remember Conversations
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Allow AI to reference past conversations
                        </p>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.context_preferences.use_context_from_previous}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              context_preferences: {
                                ...prev.context_preferences,
                                use_context_from_previous: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Use Previous Context
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Build on previous conversation topics
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Personalization Level
                        </label>
                        <select
                          value={formData.context_preferences.personalization_level}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            context_preferences: {
                              ...prev.context_preferences,
                              personalization_level: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="low">Low</option>
                          <option value="medium">Medium</option>
                          <option value="high">High</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.context_preferences.adapt_to_patterns}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              context_preferences: {
                                ...prev.context_preferences,
                                adapt_to_patterns: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Adapt to Communication Patterns
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Learn from how you communicate
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Content Tab */}
                {activeTab === 'content' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      Content Preferences
                    </h4>
                    
                    {/* Topics of Interest */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Topics of Interest
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={newTopic}
                          onChange={(e) => setNewTopic(e.target.value)}
                          placeholder="Add a topic..."
                          onKeyPress={(e) => e.key === 'Enter' && addArrayItem('topics_of_interest', newTopic)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: 'var(--gray-light)',
                            fontSize: '13px',
                          }}
                        />
                        <button
                          onClick={() => addArrayItem('topics_of_interest', newTopic)}
                          style={{
                            padding: '8px 16px',
                            background: 'var(--teal-bright)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {formData.content_preferences.topics_of_interest.map((topic, index) => (
                          <span
                            key={index}
                            style={{
                              background: 'var(--blue-dark)',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {topic}
                            <button
                              onClick={() => removeArrayItem('topics_of_interest', index)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: 0,
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Expertise Areas */}
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Expertise Areas
                      </label>
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                        <input
                          type="text"
                          value={newExpertise}
                          onChange={(e) => setNewExpertise(e.target.value)}
                          placeholder="Add an expertise area..."
                          onKeyPress={(e) => e.key === 'Enter' && addArrayItem('expertise_areas', newExpertise)}
                          style={{
                            flex: 1,
                            padding: '8px 12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '6px',
                            color: 'var(--gray-light)',
                            fontSize: '13px',
                          }}
                        />
                        <button
                          onClick={() => addArrayItem('expertise_areas', newExpertise)}
                          style={{
                            padding: '8px 16px',
                            background: 'var(--teal-bright)',
                            color: '#000',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '13px',
                            cursor: 'pointer',
                          }}
                        >
                          Add
                        </button>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {formData.content_preferences.expertise_areas.map((area, index) => (
                          <span
                            key={index}
                            style={{
                              background: 'var(--green-dark)',
                              color: 'white',
                              padding: '4px 12px',
                              borderRadius: '16px',
                              fontSize: '12px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                            }}
                          >
                            {area}
                            <button
                              onClick={() => removeArrayItem('expertise_areas', index)}
                              style={{
                                background: 'none',
                                border: 'none',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '14px',
                                padding: 0,
                                width: '16px',
                                height: '16px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Preferred Example Types
                      </label>
                      <select
                        value={formData.content_preferences.preferred_examples}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          content_preferences: {
                            ...prev.content_preferences,
                            preferred_examples: e.target.value as any
                          }
                        }))}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'var(--bg-dark)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--gray-light)',
                          fontSize: '14px',
                        }}
                      >
                        <option value="theoretical">Theoretical</option>
                        <option value="real_world">Real World</option>
                        <option value="mixed">Mixed</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* System Tab */}
                {activeTab === 'system' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      System Preferences
                    </h4>
                    
                    {/* Notifications */}
                    <h5 style={{ color: 'var(--gray-light)', fontSize: '16px', marginBottom: '16px', fontWeight: '600' }}>
                      Notifications
                    </h5>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '32px' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.notifications.email}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                email: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Email Notifications
                        </label>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.notifications.push}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                push: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Push Notifications
                        </label>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.notifications.mentions}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                mentions: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Mention Notifications
                        </label>
                      </div>
                    </div>

                    {/* Privacy Settings */}
                    <h5 style={{ color: 'var(--gray-light)', fontSize: '16px', marginBottom: '16px', fontWeight: '600' }}>
                      Privacy Settings
                    </h5>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.privacy_settings.profile_visible}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              privacy_settings: {
                                ...prev.privacy_settings,
                                profile_visible: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Profile Visible
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Allow others to see your profile information
                        </p>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.privacy_settings.activity_visible}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              privacy_settings: {
                                ...prev.privacy_settings,
                                activity_visible: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Activity Visible
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Allow others to see your activity status
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Accessibility Tab */}
                {activeTab === 'accessibility' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      Accessibility Preferences
                    </h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                          Font Size
                        </label>
                        <select
                          value={formData.accessibility_prefs.font_size}
                          onChange={(e) => setFormData(prev => ({
                            ...prev,
                            accessibility_prefs: {
                              ...prev.accessibility_prefs,
                              font_size: e.target.value as any
                            }
                          }))}
                          style={{
                            width: '100%',
                            padding: '12px',
                            background: 'var(--bg-dark)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: 'var(--gray-light)',
                            fontSize: '14px',
                          }}
                        >
                          <option value="small">Small</option>
                          <option value="medium">Medium</option>
                          <option value="large">Large</option>
                        </select>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.accessibility_prefs.high_contrast}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              accessibility_prefs: {
                                ...prev.accessibility_prefs,
                                high_contrast: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          High Contrast Mode
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Increase contrast for better visibility
                        </p>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.accessibility_prefs.screen_reader_friendly}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              accessibility_prefs: {
                                ...prev.accessibility_prefs,
                                screen_reader_friendly: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Screen Reader Friendly
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Optimize interface for screen readers
                        </p>
                      </div>

                      <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500' }}>
                          <input
                            type="checkbox"
                            checked={formData.accessibility_prefs.reduced_motion}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              accessibility_prefs: {
                                ...prev.accessibility_prefs,
                                reduced_motion: e.target.checked
                              }
                            }))}
                            style={{ transform: 'scale(1.2)' }}
                          />
                          Reduced Motion
                        </label>
                        <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                          Minimize animations and transitions
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div style={{ 
                  marginTop: '40px', 
                  paddingTop: '24px', 
                  borderTop: '2px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {saveStatus && (
                    <div style={{ 
                      fontSize: '14px',
                      color: saveStatus.includes('Failed') ? '#ef4444' : 'var(--teal-bright)',
                      fontWeight: '500',
                    }}>
                      {saveStatus}
                    </div>
                  )}
                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: '14px 28px',
                        background: saving ? 'var(--gray-dark)' : 'var(--teal-bright)',
                        color: saving ? 'var(--gray-med)' : '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '15px',
                        fontWeight: '600',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save All Changes'}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
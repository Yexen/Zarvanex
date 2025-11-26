'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useI18n } from '@/lib/i18n';
import type { UserPreferences } from '@/types';

interface SettingsExtendedProps {
  isOpen: boolean;
  onClose: () => void;
}

// Chip selector component for better aesthetics
function ChipSelector({
  options,
  value,
  onChange,
  columns = 4
}: {
  options: { value: string; label: string; description?: string }[];
  value: string;
  onChange: (value: string) => void;
  columns?: number;
}) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: '8px'
    }}>
      {options.map((option) => (
        <button
          key={option.value}
          onClick={() => onChange(option.value)}
          title={option.description}
          style={{
            padding: '10px 16px',
            background: value === option.value ? 'var(--teal-med)' : 'var(--bg-dark)',
            border: value === option.value ? '2px solid var(--teal-bright)' : '2px solid rgba(255, 255, 255, 0.15)',
            borderRadius: '20px',
            color: value === option.value ? 'white' : 'var(--gray-med)',
            fontSize: '13px',
            fontWeight: value === option.value ? '600' : '500',
            cursor: 'pointer',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          onMouseEnter={(e) => {
            if (value !== option.value) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              e.currentTarget.style.color = 'var(--gray-light)';
            }
          }}
          onMouseLeave={(e) => {
            if (value !== option.value) {
              e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = 'var(--gray-med)';
            }
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export default function SettingsExtended({ isOpen, onClose }: SettingsExtendedProps) {
  const { user } = useAuth();
  const { preferences, loading, updatePreferences } = useUserPreferences(user?.id || null);
  const { t, language, setLanguage } = useI18n();

  const [activeTab, setActiveTab] = useState('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Basic Profile
    nickname: '',
    display_name: '',
    bio: '',
    avatar_url: '',
    location: '',
    website: '',
    pronouns: '',

    // Extended Personal Info
    occupation: '',
    interests: [] as string[],
    skills: [] as string[],
    goals: '',
    background: '',

    // Custom Instructions
    custom_instructions: '',

    // AI Interaction
    conversation_style: {
      tone: 'balanced' as 'professional' | 'casual' | 'friendly' | 'balanced' | 'encouraging' | 'direct' | 'thoughtful' | 'playful',
      formality: 'casual' as 'formal' | 'casual' | 'adaptive',
      verbosity: 'detailed' as 'concise' | 'detailed' | 'comprehensive',
      humor: true,
      empathy_level: 'high' as 'low' | 'medium' | 'high',
      technical_depth: 'medium' as 'basic' | 'medium' | 'advanced',
    },

    // Communication
    communication_prefs: {
      greeting_style: 'friendly' as 'friendly' | 'professional' | 'witty' | 'zen' | 'enthusiastic',
      response_length: 'detailed' as 'brief' | 'detailed' | 'comprehensive',
      explanation_style: 'examples' as 'examples' | 'step_by_step' | 'conceptual',
      feedback_preference: 'constructive' as 'direct' | 'constructive' | 'encouraging',
      learning_style: 'visual_and_text' as 'visual_and_text' | 'text_only' | 'interactive',
    },

    // Content
    content_preferences: {
      topics_of_interest: [] as string[],
      expertise_areas: [] as string[],
      content_filters: [] as string[],
      preferred_examples: 'real_world' as 'theoretical' | 'real_world' | 'mixed',
    },

    // System - just language now
    language: 'en',

    // Accessibility
    accessibility_prefs: {
      font_size: 'medium' as 'small' | 'medium' | 'large',
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
        avatar_url: preferences.avatar_url || '',
        location: preferences.location || '',
        website: preferences.website || '',
        pronouns: preferences.pronouns || '',
        occupation: preferences.occupation || '',
        interests: preferences.interests || [],
        skills: preferences.skills || [],
        goals: preferences.goals || '',
        background: preferences.background || '',
        custom_instructions: preferences.custom_instructions || '',
        conversation_style: preferences.conversation_style || formData.conversation_style,
        communication_prefs: preferences.communication_prefs || formData.communication_prefs,
        content_preferences: preferences.content_preferences || formData.content_preferences,
        language: preferences.language || 'en',
        accessibility_prefs: preferences.accessibility_prefs || formData.accessibility_prefs,
      });
      if (preferences.avatar_url) {
        setAvatarPreview(preferences.avatar_url);
      }
    }
  }, [preferences]);

  // Apply accessibility settings
  useEffect(() => {
    // Font size
    const fontSizes = { small: '14px', medium: '16px', large: '18px' };
    document.documentElement.style.setProperty('--base-font-size', fontSizes[formData.accessibility_prefs.font_size]);

    // High contrast
    if (formData.accessibility_prefs.high_contrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }

    // Reduced motion
    if (formData.accessibility_prefs.reduced_motion) {
      document.body.classList.add('reduced-motion');
    } else {
      document.body.classList.remove('reduced-motion');
    }
  }, [formData.accessibility_prefs]);

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

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Image size must be less than 2MB');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        setAvatarPreview(dataUrl);
        setFormData(prev => ({ ...prev, avatar_url: dataUrl }));
      };
      reader.readAsDataURL(file);
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
      label: t('settings.tabs.profile'),
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    },
    {
      id: 'personal',
      label: t('settings.tabs.personalInfo'),
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    },
    {
      id: 'ai_style',
      label: t('settings.tabs.aiStyle'),
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      )
    },
    {
      id: 'communication',
      label: t('settings.tabs.communication'),
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    },
    {
      id: 'content',
      label: t('settings.tabs.content'),
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    },
    {
      id: 'accessibility',
      label: t('settings.tabs.accessibility'),
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      )
    },
  ];

  // Tone options
  const toneOptions = [
    { value: 'professional', label: t('settings.aiStyle.tones.professional') },
    { value: 'casual', label: t('settings.aiStyle.tones.casual') },
    { value: 'friendly', label: t('settings.aiStyle.tones.friendly') },
    { value: 'balanced', label: t('settings.aiStyle.tones.balanced') },
    { value: 'encouraging', label: t('settings.aiStyle.tones.encouraging') },
    { value: 'direct', label: t('settings.aiStyle.tones.direct') },
    { value: 'thoughtful', label: t('settings.aiStyle.tones.thoughtful') },
    { value: 'playful', label: t('settings.aiStyle.tones.playful') },
  ];

  const formalityOptions = [
    { value: 'formal', label: t('settings.aiStyle.formalityOptions.formal') },
    { value: 'casual', label: t('settings.aiStyle.formalityOptions.casual') },
    { value: 'adaptive', label: t('settings.aiStyle.formalityOptions.adaptive') },
  ];

  const verbosityOptions = [
    { value: 'concise', label: t('settings.aiStyle.responseLengthOptions.concise') },
    { value: 'detailed', label: t('settings.aiStyle.responseLengthOptions.detailed') },
    { value: 'comprehensive', label: t('settings.aiStyle.responseLengthOptions.comprehensive') },
  ];

  const technicalOptions = [
    { value: 'basic', label: t('settings.aiStyle.technicalOptions.basic') },
    { value: 'medium', label: t('settings.aiStyle.technicalOptions.medium') },
    { value: 'advanced', label: t('settings.aiStyle.technicalOptions.advanced') },
  ];

  const empathyOptions = [
    { value: 'low', label: t('settings.aiStyle.empathyOptions.low') },
    { value: 'medium', label: t('settings.aiStyle.empathyOptions.medium') },
    { value: 'high', label: t('settings.aiStyle.empathyOptions.high') },
  ];

  const greetingOptions = [
    { value: 'friendly', label: t('settings.communication.greetingOptions.friendly') },
    { value: 'professional', label: t('settings.communication.greetingOptions.professional') },
    { value: 'witty', label: t('settings.communication.greetingOptions.witty') },
    { value: 'zen', label: t('settings.communication.greetingOptions.zen') },
    { value: 'enthusiastic', label: t('settings.communication.greetingOptions.enthusiastic') },
  ];

  const responseLengthOptions = [
    { value: 'brief', label: t('settings.aiStyle.responseLengthOptions.concise') },
    { value: 'detailed', label: t('settings.aiStyle.responseLengthOptions.detailed') },
    { value: 'comprehensive', label: t('settings.aiStyle.responseLengthOptions.comprehensive') },
  ];

  const explanationOptions = [
    { value: 'examples', label: t('settings.communication.explanationOptions.examples') },
    { value: 'step_by_step', label: t('settings.communication.explanationOptions.stepByStep') },
    { value: 'conceptual', label: t('settings.communication.explanationOptions.conceptual') },
  ];

  const feedbackOptions = [
    { value: 'direct', label: t('settings.communication.feedbackOptions.direct') },
    { value: 'constructive', label: t('settings.communication.feedbackOptions.constructive') },
    { value: 'encouraging', label: t('settings.communication.feedbackOptions.encouraging') },
  ];

  const languageOptions = [
    { value: 'en', label: t('settings.languages.en') },
    { value: 'fa', label: t('settings.languages.fa') },
    { value: 'fr', label: t('settings.languages.fr') },
  ];

  const fontSizeOptions = [
    { value: 'small', label: t('settings.accessibility.fontSizes.small') },
    { value: 'medium', label: t('settings.accessibility.fontSizes.medium') },
    { value: 'large', label: t('settings.accessibility.fontSizes.large') },
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
              {t('settings.back')}
            </button>
            <h3 className="search-modal-title">{t('settings.extendedPersonalization')}</h3>
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
                      Profile
                    </h4>

                    {/* Avatar Section */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '32px' }}>
                      <div
                        onClick={handleAvatarClick}
                        style={{
                          width: '100px',
                          height: '100px',
                          borderRadius: '50%',
                          background: avatarPreview ? `url(${avatarPreview}) center/cover` : 'var(--bg-dark)',
                          border: '3px solid var(--teal-med)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s',
                          position: 'relative',
                          overflow: 'hidden',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = 'var(--teal-bright)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = 'var(--teal-med)';
                        }}
                      >
                        {!avatarPreview && (
                          <svg width="32" height="32" fill="none" stroke="var(--gray-dark)" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                        <div style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          background: 'rgba(0,0,0,0.7)',
                          padding: '4px',
                          textAlign: 'center',
                        }}>
                          <svg width="14" height="14" fill="none" stroke="white" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </div>
                      </div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        style={{ display: 'none' }}
                      />
                      <div>
                        <p style={{ color: 'var(--gray-light)', fontSize: '14px', marginBottom: '4px' }}>Profile Picture</p>
                        <p style={{ color: 'var(--gray-dark)', fontSize: '12px' }}>Click to upload (max 2MB)</p>
                      </div>
                    </div>

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
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell the AI about yourself - your personality, interests, work, or anything you'd like it to know for more personalized conversations."
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
                          minHeight: '100px',
                        }}
                      />
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
                          placeholder="they/them, she/her, etc."
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

                    {/* Language Selection */}
                    <div style={{ marginTop: '32px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        {t('settings.profile.language')}
                      </label>
                      <ChipSelector
                        options={languageOptions}
                        value={language}
                        onChange={(value) => {
                          setLanguage(value as 'en' | 'fa' | 'fr');
                          setFormData(prev => ({ ...prev, language: value }));
                        }}
                        columns={3}
                      />
                    </div>
                  </div>
                )}

                {/* Personal Info Tab */}
                {activeTab === 'personal' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      Personal Information
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
                        placeholder="Your educational background, professional experience, or any relevant context."
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

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Goals & Aspirations
                      </label>
                      <textarea
                        value={formData.goals}
                        onChange={(e) => setFormData(prev => ({ ...prev, goals: e.target.value }))}
                        placeholder="What are you working towards? Personal goals, professional aspirations, or projects."
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
                      AI Style
                    </h4>

                    {/* Custom Instructions Box */}
                    <div style={{ marginBottom: '32px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '8px', fontSize: '14px', fontWeight: '500' }}>
                        Custom Instructions
                      </label>
                      <textarea
                        value={formData.custom_instructions}
                        onChange={(e) => setFormData(prev => ({ ...prev, custom_instructions: e.target.value }))}
                        placeholder="Add any specific instructions for how the AI should behave, respond, or what it should know about you. These will be included in every conversation."
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
                          minHeight: '100px',
                        }}
                      />
                      <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                        Example: &quot;Always explain code with comments&quot; or &quot;Respond in a conversational tone&quot;
                      </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Conversation Tone
                      </label>
                      <ChipSelector
                        options={toneOptions}
                        value={formData.conversation_style.tone}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          conversation_style: { ...prev.conversation_style, tone: value as any }
                        }))}
                        columns={4}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Formality Level
                      </label>
                      <ChipSelector
                        options={formalityOptions}
                        value={formData.conversation_style.formality}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          conversation_style: { ...prev.conversation_style, formality: value as any }
                        }))}
                        columns={3}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Response Length
                      </label>
                      <ChipSelector
                        options={verbosityOptions}
                        value={formData.conversation_style.verbosity}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          conversation_style: { ...prev.conversation_style, verbosity: value as any }
                        }))}
                        columns={3}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Technical Depth
                      </label>
                      <ChipSelector
                        options={technicalOptions}
                        value={formData.conversation_style.technical_depth}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          conversation_style: { ...prev.conversation_style, technical_depth: value as any }
                        }))}
                        columns={3}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Empathy Level
                      </label>
                      <ChipSelector
                        options={empathyOptions}
                        value={formData.conversation_style.empathy_level}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          conversation_style: { ...prev.conversation_style, empathy_level: value as any }
                        }))}
                        columns={3}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                        <div style={{
                          width: '44px',
                          height: '24px',
                          background: formData.conversation_style.humor ? 'var(--teal-bright)' : 'var(--bg-dark)',
                          borderRadius: '12px',
                          position: 'relative',
                          transition: 'all 0.2s',
                          border: '2px solid ' + (formData.conversation_style.humor ? 'var(--teal-bright)' : 'rgba(255, 255, 255, 0.2)'),
                        }}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          conversation_style: { ...prev.conversation_style, humor: !prev.conversation_style.humor }
                        }))}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '1px',
                            left: formData.conversation_style.humor ? '22px' : '1px',
                            transition: 'all 0.2s',
                          }} />
                        </div>
                        Use Humor & Wit
                      </label>
                      <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px', marginLeft: '56px' }}>
                        Allow the AI to use appropriate humor and casual expressions
                      </p>
                    </div>
                  </div>
                )}

                {/* Communication Tab */}
                {activeTab === 'communication' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      Communication
                    </h4>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Greeting Style
                      </label>
                      <ChipSelector
                        options={greetingOptions}
                        value={formData.communication_prefs.greeting_style}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          communication_prefs: { ...prev.communication_prefs, greeting_style: value as any }
                        }))}
                        columns={5}
                      />
                      <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                        How I greet you on the home screen
                      </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Response Length
                      </label>
                      <ChipSelector
                        options={responseLengthOptions}
                        value={formData.communication_prefs.response_length}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          communication_prefs: { ...prev.communication_prefs, response_length: value as any }
                        }))}
                        columns={3}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Explanation Style
                      </label>
                      <ChipSelector
                        options={explanationOptions}
                        value={formData.communication_prefs.explanation_style}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          communication_prefs: { ...prev.communication_prefs, explanation_style: value as any }
                        }))}
                        columns={3}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Feedback Style
                      </label>
                      <ChipSelector
                        options={feedbackOptions}
                        value={formData.communication_prefs.feedback_preference}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          communication_prefs: { ...prev.communication_prefs, feedback_preference: value as any }
                        }))}
                        columns={3}
                      />
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
                      <ChipSelector
                        options={[
                          { value: 'theoretical', label: 'Theoretical', description: 'Abstract concepts' },
                          { value: 'real_world', label: 'Real World', description: 'Practical examples' },
                          { value: 'mixed', label: 'Mixed', description: 'Both types' },
                        ]}
                        value={formData.content_preferences.preferred_examples}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          content_preferences: { ...prev.content_preferences, preferred_examples: value as any }
                        }))}
                        columns={3}
                      />
                    </div>
                  </div>
                )}

                {/* Accessibility Tab */}
                {activeTab === 'accessibility' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '20px', marginBottom: '24px', fontWeight: '600' }}>
                      Accessibility
                    </h4>

                    <div style={{ marginBottom: '32px' }}>
                      <label style={{ display: 'block', color: 'var(--gray-med)', marginBottom: '12px', fontSize: '14px', fontWeight: '500' }}>
                        Font Size
                      </label>
                      <ChipSelector
                        options={fontSizeOptions}
                        value={formData.accessibility_prefs.font_size}
                        onChange={(value) => setFormData(prev => ({
                          ...prev,
                          accessibility_prefs: { ...prev.accessibility_prefs, font_size: value as any }
                        }))}
                        columns={3}
                      />
                      <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px' }}>
                        Changes apply immediately
                      </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                        <div style={{
                          width: '44px',
                          height: '24px',
                          background: formData.accessibility_prefs.high_contrast ? 'var(--teal-bright)' : 'var(--bg-dark)',
                          borderRadius: '12px',
                          position: 'relative',
                          transition: 'all 0.2s',
                          border: '2px solid ' + (formData.accessibility_prefs.high_contrast ? 'var(--teal-bright)' : 'rgba(255, 255, 255, 0.2)'),
                        }}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          accessibility_prefs: { ...prev.accessibility_prefs, high_contrast: !prev.accessibility_prefs.high_contrast }
                        }))}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '1px',
                            left: formData.accessibility_prefs.high_contrast ? '22px' : '1px',
                            transition: 'all 0.2s',
                          }} />
                        </div>
                        High Contrast Mode
                      </label>
                      <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px', marginLeft: '56px' }}>
                        Increase contrast for better visibility
                      </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                        <div style={{
                          width: '44px',
                          height: '24px',
                          background: formData.accessibility_prefs.screen_reader_friendly ? 'var(--teal-bright)' : 'var(--bg-dark)',
                          borderRadius: '12px',
                          position: 'relative',
                          transition: 'all 0.2s',
                          border: '2px solid ' + (formData.accessibility_prefs.screen_reader_friendly ? 'var(--teal-bright)' : 'rgba(255, 255, 255, 0.2)'),
                        }}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          accessibility_prefs: { ...prev.accessibility_prefs, screen_reader_friendly: !prev.accessibility_prefs.screen_reader_friendly }
                        }))}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '1px',
                            left: formData.accessibility_prefs.screen_reader_friendly ? '22px' : '1px',
                            transition: 'all 0.2s',
                          }} />
                        </div>
                        Screen Reader Friendly
                      </label>
                      <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px', marginLeft: '56px' }}>
                        Optimize interface for screen readers
                      </p>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', color: 'var(--gray-med)', fontSize: '14px', fontWeight: '500', cursor: 'pointer' }}>
                        <div style={{
                          width: '44px',
                          height: '24px',
                          background: formData.accessibility_prefs.reduced_motion ? 'var(--teal-bright)' : 'var(--bg-dark)',
                          borderRadius: '12px',
                          position: 'relative',
                          transition: 'all 0.2s',
                          border: '2px solid ' + (formData.accessibility_prefs.reduced_motion ? 'var(--teal-bright)' : 'rgba(255, 255, 255, 0.2)'),
                        }}
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          accessibility_prefs: { ...prev.accessibility_prefs, reduced_motion: !prev.accessibility_prefs.reduced_motion }
                        }))}
                        >
                          <div style={{
                            width: '18px',
                            height: '18px',
                            background: 'white',
                            borderRadius: '50%',
                            position: 'absolute',
                            top: '1px',
                            left: formData.accessibility_prefs.reduced_motion ? '22px' : '1px',
                            transition: 'all 0.2s',
                          }} />
                        </div>
                        Reduced Motion
                      </label>
                      <p style={{ fontSize: '12px', color: 'var(--gray-dark)', marginTop: '8px', marginLeft: '56px' }}>
                        Minimize animations and transitions
                      </p>
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
                      {saving ? t('settings.saving') : t('settings.save')}
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

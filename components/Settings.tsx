'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferences } from '@/hooks/useUserPreferences';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Settings({ isOpen, onClose }: SettingsProps) {
  const { user } = useAuth();
  const { preferences, loading, updatePreferences, updateNickname, updateBio, updateNotificationSettings, updatePrivacySettings } = useUserPreferences(user?.id || null);
  
  const [activeTab, setActiveTab] = useState('profile');
  const [formData, setFormData] = useState({
    nickname: '',
    bio: '',
    conversationStyle: 'friendly',
    interests: '',
    extendedBio: '',
    notifications: {
      email: true,
      push: true,
      mentions: true,
    },
    privacy: {
      profile_visible: true,
      activity_visible: false,
    },
  });
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Update form data when preferences load
  useEffect(() => {
    if (preferences) {
      setFormData({
        nickname: preferences.nickname || '',
        bio: preferences.bio || '',
        conversationStyle: preferences.conversation_style?.tone || 'friendly',
        interests: preferences.interests?.join(', ') || '',
        extendedBio: preferences.extended_bio || '',
        notifications: preferences.notifications,
        privacy: preferences.privacy_settings,
      });
    }
  }, [preferences]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setSaveStatus(null);

    try {
      await Promise.all([
        updateNickname(formData.nickname),
        updateBio(formData.bio),
        updateNotificationSettings(formData.notifications),
        updatePrivacySettings(formData.privacy),
        updatePreferences({
          conversation_style: { tone: formData.conversationStyle },
          interests: formData.interests.split(',').map(i => i.trim()).filter(Boolean),
          extended_bio: formData.extendedBio || undefined,
        }),
      ]);
      
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (error) {
      console.error('Error saving settings:', error);
      setSaveStatus('Failed to save settings. Please try again.');
    } finally {
      setSaving(false);
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
      id: 'notifications', 
      label: 'Notifications', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      )
    },
    { 
      id: 'privacy', 
      label: 'Privacy', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
      )
    },
    { 
      id: 'personalization', 
      label: 'Personalization', 
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
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
        style={{ maxWidth: '700px', maxHeight: '80vh' }}
      >
        <div className="search-modal-header">
          <h3 className="search-modal-title">Settings</h3>
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

        <div style={{ display: 'flex', height: '500px' }}>
          {/* Sidebar */}
          <div style={{ 
            width: '240px', 
            background: 'var(--darker-bg)', 
            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
            padding: '20px 0'
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
                  fontSize: '14px',
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
          <div style={{ flex: 1, padding: '20px', overflow: 'auto' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px' }}>
                <div style={{ color: 'var(--gray-med)' }}>Loading preferences...</div>
              </div>
            ) : (
              <>
                {activeTab === 'profile' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '18px', marginBottom: '20px', fontWeight: '600' }}>
                      Profile Information
                    </h4>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ 
                        display: 'block', 
                        color: 'var(--gray-med)', 
                        marginBottom: '8px', 
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Email
                      </label>
                      <input
                        type="email"
                        value={user?.email || ''}
                        disabled
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'var(--darker-bg)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          color: 'var(--gray-light)',
                          fontSize: '14px',
                          opacity: 0.6,
                        }}
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ 
                        display: 'block', 
                        color: 'var(--gray-med)', 
                        marginBottom: '8px', 
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Nickname
                      </label>
                      <input
                        type="text"
                        value={formData.nickname}
                        onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                        placeholder="How would you like to be called?"
                        maxLength={50}
                        style={{
                          width: '100%',
                          padding: '12px',
                          background: 'var(--bg-dark)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '8px',
                          color: 'var(--gray-light)',
                          fontSize: '14px',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--teal-bright)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                      />
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--gray-dark)', 
                        marginTop: '4px' 
                      }}>
                        {formData.nickname.length}/50 characters
                      </div>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ 
                        display: 'block', 
                        color: 'var(--gray-med)', 
                        marginBottom: '8px', 
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Bio
                      </label>
                      <textarea
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell us about yourself..."
                        maxLength={500}
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
                          minHeight: '80px',
                          transition: 'border-color 0.2s',
                        }}
                        onFocus={(e) => e.currentTarget.style.borderColor = 'var(--teal-bright)'}
                        onBlur={(e) => e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'}
                      />
                      <div style={{ 
                        fontSize: '12px', 
                        color: 'var(--gray-dark)', 
                        marginTop: '4px' 
                      }}>
                        {formData.bio.length}/500 characters
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '18px', marginBottom: '20px', fontWeight: '600' }}>
                      Notification Preferences
                    </h4>
                    
                    {[
                      { key: 'email', label: 'Email Notifications', description: 'Receive updates via email' },
                      { key: 'push', label: 'Push Notifications', description: 'Browser push notifications' },
                      { key: 'mentions', label: 'Mention Notifications', description: 'When someone mentions you' },
                    ].map((item) => (
                      <div key={item.key} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '16px 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div>
                          <div style={{ color: 'var(--gray-light)', fontSize: '14px', fontWeight: '500' }}>
                            {item.label}
                          </div>
                          <div style={{ color: 'var(--gray-dark)', fontSize: '12px' }}>
                            {item.description}
                          </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                          <input
                            type="checkbox"
                            checked={formData.notifications[item.key as keyof typeof formData.notifications]}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              notifications: {
                                ...prev.notifications,
                                [item.key]: e.target.checked
                              }
                            }))}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: formData.notifications[item.key as keyof typeof formData.notifications] 
                              ? 'var(--teal-bright)' 
                              : 'var(--gray-dark)',
                            transition: 'all 0.2s',
                            borderRadius: '24px',
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '',
                              height: '18px',
                              width: '18px',
                              left: formData.notifications[item.key as keyof typeof formData.notifications] ? '23px' : '3px',
                              bottom: '3px',
                              backgroundColor: 'white',
                              transition: 'all 0.2s',
                              borderRadius: '50%',
                            }} />
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '18px', marginBottom: '20px', fontWeight: '600' }}>
                      Privacy Settings
                    </h4>
                    
                    {[
                      { key: 'profile_visible', label: 'Public Profile', description: 'Make your profile visible to others' },
                      { key: 'activity_visible', label: 'Activity Status', description: 'Show when you\'re active' },
                    ].map((item) => (
                      <div key={item.key} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center',
                        padding: '16px 0',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
                      }}>
                        <div>
                          <div style={{ color: 'var(--gray-light)', fontSize: '14px', fontWeight: '500' }}>
                            {item.label}
                          </div>
                          <div style={{ color: 'var(--gray-dark)', fontSize: '12px' }}>
                            {item.description}
                          </div>
                        </div>
                        <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px' }}>
                          <input
                            type="checkbox"
                            checked={formData.privacy[item.key as keyof typeof formData.privacy]}
                            onChange={(e) => setFormData(prev => ({
                              ...prev,
                              privacy: {
                                ...prev.privacy,
                                [item.key]: e.target.checked
                              }
                            }))}
                            style={{ opacity: 0, width: 0, height: 0 }}
                          />
                          <span style={{
                            position: 'absolute',
                            cursor: 'pointer',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: formData.privacy[item.key as keyof typeof formData.privacy] 
                              ? 'var(--teal-bright)' 
                              : 'var(--gray-dark)',
                            transition: 'all 0.2s',
                            borderRadius: '24px',
                          }}>
                            <span style={{
                              position: 'absolute',
                              content: '',
                              height: '18px',
                              width: '18px',
                              left: formData.privacy[item.key as keyof typeof formData.privacy] ? '23px' : '3px',
                              bottom: '3px',
                              backgroundColor: 'white',
                              transition: 'all 0.2s',
                              borderRadius: '50%',
                            }} />
                          </span>
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {activeTab === 'personalization' && (
                  <div>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '18px', marginBottom: '20px', fontWeight: '600' }}>
                      AI Personalization
                    </h4>
                    
                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ 
                        display: 'block', 
                        color: 'var(--gray-med)', 
                        marginBottom: '8px', 
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Conversation Style
                      </label>
                      <select
                        value={formData.conversationStyle || 'friendly'}
                        onChange={(e) => setFormData(prev => ({ ...prev, conversationStyle: e.target.value }))}
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
                        <option value="friendly">Friendly & Conversational</option>
                        <option value="professional">Professional</option>
                        <option value="casual">Casual</option>
                        <option value="direct">Direct & Concise</option>
                        <option value="detailed">Detailed & Thorough</option>
                      </select>
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ 
                        display: 'block', 
                        color: 'var(--gray-med)', 
                        marginBottom: '8px', 
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Main Interests (comma-separated)
                      </label>
                      <input
                        type="text"
                        value={formData.interests || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, interests: e.target.value }))}
                        placeholder="technology, coding, AI, productivity"
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

                    <div style={{ marginBottom: '24px' }}>
                      <label style={{ 
                        display: 'block', 
                        color: 'var(--gray-med)', 
                        marginBottom: '8px', 
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        Extended Bio
                      </label>
                      <textarea
                        value={formData.extendedBio || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, extendedBio: e.target.value }))}
                        placeholder="Tell the AI more about yourself - your background, preferences, goals, communication style, etc."
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
                    </div>

                    <div style={{ 
                      padding: '16px',
                      background: 'rgba(64, 224, 208, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(64, 224, 208, 0.2)',
                      marginBottom: '24px'
                    }}>
                      <div style={{ color: 'var(--teal-bright)', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                        💡 How Personalization Works
                      </div>
                      <div style={{ color: 'var(--gray-med)', fontSize: '12px', lineHeight: '1.5' }}>
                        Your personalization settings create a custom system prompt that tells the AI how to interact with you. 
                        This includes your preferred communication style, interests, and context about yourself.
                      </div>
                    </div>
                  </div>
                )}

                {/* Download App Section */}
                {activeTab === 'system' && (
                  <div style={{ marginBottom: '32px', paddingTop: '24px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                    <h4 style={{ color: 'var(--gray-light)', fontSize: '16px', marginBottom: '16px', fontWeight: '600' }}>
                      Mobile App
                    </h4>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', background: 'var(--darker-bg)', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                      <div>
                        <div style={{ color: 'var(--gray-light)', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                          Install Zarvânex App
                        </div>
                        <div style={{ color: 'var(--gray-dark)', fontSize: '12px' }}>
                          Add to your home screen for a native app experience
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          if ('serviceWorker' in navigator && 'BeforeInstallPromptEvent' in window) {
                            // PWA install logic
                            window.dispatchEvent(new Event('beforeinstallprompt'));
                          } else {
                            // Fallback: show install instructions
                            alert('To install: \n\n1. Tap the share button in your browser\n2. Select "Add to Home Screen"\n3. Tap "Add"');
                          }
                        }}
                        style={{
                          padding: '8px 16px',
                          background: 'var(--teal-bright)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#36c9ba'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'var(--teal-bright)'}
                      >
                        <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Install
                      </button>
                    </div>
                  </div>
                )}

                {/* Save Button */}
                <div style={{ 
                  marginTop: '32px', 
                  paddingTop: '20px', 
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {saveStatus && (
                    <div style={{ 
                      fontSize: '14px',
                      color: saveStatus.includes('Failed') ? '#ef4444' : 'var(--teal-bright)',
                    }}>
                      {saveStatus}
                    </div>
                  )}
                  <div style={{ marginLeft: 'auto' }}>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      style={{
                        padding: '12px 24px',
                        background: saving ? 'var(--gray-dark)' : 'var(--teal-bright)',
                        color: saving ? 'var(--gray-med)' : '#000',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: saving ? 'not-allowed' : 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {saving ? 'Saving...' : 'Save Changes'}
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

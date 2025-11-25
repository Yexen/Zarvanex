'use client';

import { useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useUserPreferencesContext } from '@/contexts/UserPreferencesContext';
import { supabase } from '@/lib/supabase';

interface UserProfileProps {
  showEmail?: boolean;
  size?: 'small' | 'medium' | 'large';
  showUpload?: boolean;
  showLogout?: boolean;
  showMenu?: boolean;
  onOpenSettings?: () => void;
  onOpenHardMemory?: () => void;
  onClick?: () => void;
}

export default function UserProfile({
  showEmail = false,
  size = 'small',
  showUpload = false,
  showLogout = false,
  showMenu = false,
  onOpenSettings,
  onOpenHardMemory,
  onClick
}: UserProfileProps) {
  const { user, signOut } = useAuth();
  const { preferences, updatePreferences } = useUserPreferencesContext();
  const [isUploading, setIsUploading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const displayName = preferences?.nickname || preferences?.display_name || user?.email?.split('@')[0] || 'User';
  const avatarUrl = preferences?.avatar_url;

  const sizeMap = {
    small: { width: 32, height: 32, fontSize: '14px' },
    medium: { width: 40, height: 40, fontSize: '16px' },
    large: { width: 64, height: 64, fontSize: '20px' }
  };

  const { width, height, fontSize } = sizeMap[size];

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    // Check file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('File size must be less than 2MB');
      return;
    }

    // Check file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setIsUploading(true);

    try {
      // Create unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update user preferences
      await updatePreferences({ avatar_url: publicUrl });

      console.log('[DEBUG] Avatar uploaded successfully:', publicUrl);
    } catch (error) {
      console.error('[ERROR] Error uploading avatar:', error);
      alert('Failed to upload photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const ProfileContent = () => (
    <div 
      style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        cursor: onClick ? 'pointer' : 'default',
        padding: showLogout ? '8px' : '0',
        borderRadius: showLogout ? '8px' : '0',
        transition: 'background-color 0.2s',
        position: 'relative'
      }}
      onClick={onClick}
      onMouseEnter={() => setShowDropdown(true)}
      onMouseLeave={() => setShowDropdown(false)}
    >
      {/* Avatar */}
      <div 
        style={{
          width: `${width}px`,
          height: `${height}px`,
          borderRadius: '50%',
          overflow: 'hidden',
          background: avatarUrl ? 'transparent' : 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(255, 255, 255, 0.1)',
          position: 'relative'
        }}
      >
        {avatarUrl ? (
          <img 
            src={avatarUrl} 
            alt={displayName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover'
            }}
          />
        ) : (
          <span style={{ 
            color: 'white', 
            fontSize: fontSize,
            fontWeight: '600'
          }}>
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}
        
        {showUpload && (
          <div
            style={{
              position: 'absolute',
              bottom: '-4px',
              right: '-4px',
              width: '20px',
              height: '20px',
              background: 'var(--primary)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              border: '2px solid var(--bg)',
              fontSize: '10px'
            }}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            {isUploading ? (
              <div style={{ 
                width: '8px', 
                height: '8px', 
                border: '1px solid white', 
                borderTop: '1px solid transparent',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            ) : (
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 5v14M5 12h14" />
              </svg>
            )}
          </div>
        )}
      </div>

      {/* Name and Email */}
      {!showMenu && (
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{
            color: 'var(--text)',
            fontSize: fontSize,
            fontWeight: '500',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {displayName}
          </div>
          {showEmail && user?.email && (
            <div style={{
              color: 'var(--gray-med)',
              fontSize: '12px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {user.email}
            </div>
          )}
        </div>
      )}

      {/* Upward Menu Dropdown */}
      {showMenu && showDropdown && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '0',
            background: 'var(--darker-bg)',
            border: '2px solid #40E0D0',
            borderRadius: '8px',
            padding: '8px',
            minWidth: '200px',
            marginBottom: '8px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(64, 224, 208, 0.3)'
          }}
          onMouseEnter={() => setShowDropdown(true)}
          onMouseLeave={() => setShowDropdown(false)}
        >
          {/* User Name Header */}
          <div style={{
            padding: '8px 12px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            marginBottom: '4px'
          }}>
            <div style={{
              color: '#40E0D0',
              fontSize: '14px',
              fontWeight: '600',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            }}>
              {displayName}
            </div>
            {user?.email && (
              <div style={{
                color: 'var(--gray-med)',
                fontSize: '11px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}>
                {user.email}
              </div>
            )}
          </div>

          {/* Menu Items */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenSettings?.();
              setShowDropdown(false);
            }}
            className="menu-item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Settings
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenHardMemory?.();
              setShowDropdown(false);
            }}
            className="menu-item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Hard Memory
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = '/past-memory';
              setShowDropdown(false);
            }}
            className="menu-item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Past Memory
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = '/guide';
              setShowDropdown(false);
            }}
            className="menu-item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            Zurvânex Guide
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              window.location.href = '/about';
              setShowDropdown(false);
            }}
            className="menu-item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-4m0-4h.01" />
            </svg>
            About
          </button>

          <div style={{
            height: '1px',
            background: 'rgba(255, 255, 255, 0.1)',
            margin: '4px 0'
          }} />

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            className="menu-item"
            style={{ color: '#ef4444' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sign Out
          </button>
        </div>
      )}

      {/* Logout Dropdown (legacy) */}
      {showLogout && !showMenu && showDropdown && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '0',
            background: 'var(--darker-bg)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '8px',
            minWidth: '120px',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
          }}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleLogout();
            }}
            style={{
              width: '100%',
              padding: '8px 12px',
              background: 'none',
              border: 'none',
              color: 'var(--text)',
              fontSize: '14px',
              textAlign: 'left',
              borderRadius: '4px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'none';
            }}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ marginRight: '8px', verticalAlign: 'middle' }}
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Logout
          </button>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoUpload}
        style={{ display: 'none' }}
      />
    </div>
  );

  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <ProfileContent />
    </>
  );
}
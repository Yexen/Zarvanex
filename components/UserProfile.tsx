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
  onClick?: () => void;
}

export default function UserProfile({ 
  showEmail = false, 
  size = 'small', 
  showUpload = false, 
  showLogout = false,
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

      {/* Logout Dropdown */}
      {showLogout && showDropdown && (
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
'use client';

import { useState, useEffect } from 'react';
import { installPWA, onInstallPromptChange } from '@/app/register-sw';

export default function PWAInstallButton() {
  const [canInstall, setCanInstall] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Subscribe to install prompt changes
    const cleanup = onInstallPromptChange((available) => {
      setCanInstall(available);
    });

    return cleanup;
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const accepted = await installPWA();
      if (accepted) {
        console.log('PWA installation accepted');
      } else {
        console.log('PWA installation declined');
      }
    } catch (error) {
      console.error('Error installing PWA:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  // Don't show the button if installation is not available
  if (!canInstall) {
    return null;
  }

  return (
    <button
      onClick={handleInstall}
      disabled={isInstalling}
      style={{
        width: '100%',
        padding: '12px 20px',
        background: 'linear-gradient(135deg, var(--teal-med), var(--teal-bright))',
        border: 'none',
        borderRadius: '12px',
        color: 'white',
        fontSize: '14px',
        fontWeight: 600,
        cursor: isInstalling ? 'not-allowed' : 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        transition: 'all 0.2s ease',
        opacity: isInstalling ? 0.6 : 1,
        boxShadow: '0 4px 12px rgba(61, 155, 147, 0.3)',
      }}
      onMouseEnter={(e) => {
        if (!isInstalling) {
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(61, 155, 147, 0.4)';
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 4px 12px rgba(61, 155, 147, 0.3)';
      }}
    >
      {/* Download Icon */}
      <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      {isInstalling ? 'Installing...' : 'Install App'}
    </button>
  );
}

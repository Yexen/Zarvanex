'use client';

import { useState } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export default function NotificationSetup() {
  const { permission, requestPermission, error } = useNotifications();
  const [isRequesting, setIsRequesting] = useState(false);

  const handleEnableNotifications = async () => {
    setIsRequesting(true);
    try {
      await requestPermission();
    } catch (err) {
      console.error('Failed to enable notifications:', err);
    } finally {
      setIsRequesting(false);
    }
  };

  if (permission === 'granted') return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        backgroundColor: 'var(--purple)',
        color: 'white',
        padding: '16px 20px',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        maxWidth: '320px',
        zIndex: 1000,
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: '8px' }}>
        Enable Notifications
      </div>
      <div style={{ fontSize: '14px', marginBottom: '12px', opacity: 0.9 }}>
        Get time-aware reminders and proactive AI messages
      </div>
      {error && (
        <div
          style={{
            fontSize: '12px',
            color: '#ff6b6b',
            marginBottom: '8px',
            backgroundColor: 'rgba(255, 107, 107, 0.1)',
            padding: '6px 8px',
            borderRadius: '6px',
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleEnableNotifications}
          disabled={isRequesting}
          style={{
            flex: 1,
            backgroundColor: 'white',
            color: '#8b5cf6',
            padding: '10px 20px',
            borderRadius: '8px',
            border: 'none',
            fontWeight: 600,
            fontSize: '14px',
            cursor: isRequesting ? 'not-allowed' : 'pointer',
            opacity: isRequesting ? 0.6 : 1,
          }}
        >
          {isRequesting ? 'Enabling...' : 'Enable'}
        </button>
        <button
          onClick={() => {
            // Hide the prompt (could store in localStorage)
            const element = document.querySelector('[data-notification-setup]');
            if (element) {
              (element as HTMLElement).style.display = 'none';
            }
          }}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.5)',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            color: 'white',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
          }}
        >
          Later
        </button>
      </div>
    </div>
  );
}

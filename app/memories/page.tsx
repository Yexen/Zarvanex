'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import MemoryPanel from '@/components/MemoryPanel';

export default function MemoriesPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--gray-light)'
      }}>
        Loading memories...
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-primary)',
        color: 'var(--gray-light)',
        gap: '16px'
      }}>
        <h2 style={{ fontSize: '24px', fontWeight: '600' }}>Access Denied</h2>
        <p style={{ color: 'var(--gray-med)' }}>Please log in to access your memories.</p>
        <button
          onClick={() => window.location.href = '/'}
          style={{
            padding: '12px 24px',
            background: 'var(--teal-bright)',
            color: '#000',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Go to Login
        </button>
      </div>
    );
  }

  return (
    <div style={{
      height: '100vh',
      background: 'var(--bg-primary)',
      overflow: 'hidden'
    }}>
      <MemoryPanel />
    </div>
  );
}
'use client';

import { useState, useEffect } from 'react';
import type { MemoryView, MemoryPanelState } from '@/types/memory';

export default function MemoryPanel() {
  const [state, setState] = useState<MemoryPanelState>({
    currentView: 'browse',
    selectedMemoryId: null,
    selectedFolderId: null,
    searchQuery: '',
    searchTags: [],
    isEditing: false
  });

  const tabs = [
    {
      id: 'browse' as MemoryView,
      name: 'Browse',
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v6" />
        </svg>
      )
    },
    {
      id: 'search' as MemoryView,
      name: 'Search',
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      )
    },
    {
      id: 'timeline' as MemoryView,
      name: 'Timeline',
      icon: (
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
  ];

  return (
    <div style={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: 'var(--bg-primary)'
    }}>
      {/* Header */}
      <div style={{
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'var(--darker-bg)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: 'var(--gray-light)',
              margin: 0
            }}>
              Hard Memory
            </h1>
          </div>
          <div style={{ color: 'var(--gray-dark)', fontSize: '14px' }}>
            Your persistent knowledge base
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => window.location.href = '/'}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--gray-med)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = 'var(--gray-light)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.color = 'var(--gray-med)';
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Chat
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        background: 'var(--darker-bg)'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setState(prev => ({ ...prev, currentView: tab.id }))}
            style={{
              padding: '16px 24px',
              background: state.currentView === tab.id ? 'var(--bg-primary)' : 'transparent',
              color: state.currentView === tab.id ? 'var(--teal-bright)' : 'var(--gray-med)',
              border: 'none',
              borderBottom: state.currentView === tab.id ? '2px solid var(--teal-bright)' : '2px solid transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (state.currentView !== tab.id) {
                e.currentTarget.style.color = 'var(--gray-light)';
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
              }
            }}
            onMouseLeave={(e) => {
              if (state.currentView !== tab.id) {
                e.currentTarget.style.color = 'var(--gray-med)';
                e.currentTarget.style.background = 'transparent';
              }
            }}
          >
            {tab.icon}
            {tab.name}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Browse View */}
        {state.currentView === 'browse' && (
          <div style={{ 
            width: '100%', 
            display: 'flex',
            background: 'var(--bg-primary)'
          }}>
            {/* Sidebar - Folder Tree */}
            <div style={{
              width: '320px',
              borderRight: '1px solid rgba(255, 255, 255, 0.1)',
              background: 'var(--darker-bg)',
              display: 'flex',
              flexDirection: 'column'
            }}>
              {/* Sidebar Header */}
              <div style={{
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h3 style={{ 
                  fontSize: '16px', 
                  fontWeight: '600', 
                  color: 'var(--gray-light)',
                  margin: 0
                }}>
                  Folders
                </h3>
                <button
                  style={{
                    padding: '6px 12px',
                    background: 'var(--teal-bright)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New
                </button>
              </div>

              {/* Folder Tree Content */}
              <div style={{ 
                flex: 1, 
                padding: '16px', 
                overflow: 'auto' 
              }}>
                <div style={{ 
                  color: 'var(--gray-med)', 
                  fontSize: '14px', 
                  fontStyle: 'italic' 
                }}>
                  No memories yet. Create your first memory to get started.
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div style={{ 
              flex: 1, 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '40px'
            }}>
              <div style={{ 
                textAlign: 'center', 
                maxWidth: '400px',
                color: 'var(--gray-med)'
              }}>
                <svg width="64" height="64" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ marginBottom: '24px', opacity: 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <h3 style={{ 
                  fontSize: '20px', 
                  fontWeight: '600', 
                  color: 'var(--gray-light)',
                  marginBottom: '12px' 
                }}>
                  Welcome to Hard Memory
                </h3>
                <p style={{ 
                  fontSize: '16px', 
                  lineHeight: '1.5', 
                  marginBottom: '24px' 
                }}>
                  Create and organize persistent memories that will enhance all your conversations with Zarvânex.
                </p>
                <button
                  style={{
                    padding: '12px 24px',
                    background: 'var(--teal-bright)',
                    color: '#000',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    margin: '0 auto'
                  }}
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Create First Memory
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search View */}
        {state.currentView === 'search' && (
          <div style={{ 
            width: '100%', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ 
              maxWidth: '600px', 
              width: '100%',
              textAlign: 'center'
            }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: 'var(--gray-light)',
                marginBottom: '16px' 
              }}>
                Search Memories
              </h3>
              <div style={{
                position: 'relative',
                marginBottom: '24px'
              }}>
                <input
                  type="text"
                  placeholder="Search titles, content, and tags..."
                  value={state.searchQuery}
                  onChange={(e) => setState(prev => ({ ...prev, searchQuery: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '16px 48px 16px 16px',
                    background: 'var(--darker-bg)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: 'var(--gray-light)',
                    fontSize: '16px',
                  }}
                />
                <div style={{
                  position: 'absolute',
                  right: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--gray-dark)'
                }}>
                  <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              <div style={{ 
                color: 'var(--gray-med)', 
                fontSize: '14px' 
              }}>
                Start typing to search through your memories...
              </div>
            </div>
          </div>
        )}

        {/* Timeline View */}
        {state.currentView === 'timeline' && (
          <div style={{ 
            width: '100%', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <div style={{ 
              maxWidth: '800px', 
              width: '100%'
            }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: 'var(--gray-light)',
                marginBottom: '24px',
                textAlign: 'center' 
              }}>
                Memory Timeline
              </h3>
              <div style={{ 
                color: 'var(--gray-med)', 
                fontSize: '14px',
                textAlign: 'center'
              }}>
                Your memories will appear here in chronological order...
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
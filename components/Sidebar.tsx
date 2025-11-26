'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n';
import UserProfile from './UserProfile';
import Settings from './Settings';
import ConversationAnalysisModal from './ConversationAnalysisModal';
import type { Conversation } from '@/types';

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onRenameConversation?: (id: string, newTitle: string) => void;
  onOpenHardMemory?: () => void;
  className?: string;
}

const MAX_VISIBLE_CHATS = 20;

export default function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  onDeleteConversation,
  onRenameConversation,
  onOpenHardMemory,
  className = '',
}: SidebarProps) {
  const { user, signOut } = useAuth();
  const { t } = useI18n();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChatListOpen, setIsChatListOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [selectedChats, setSelectedChats] = useState<Set<string>>(new Set());
  const [hoveredChatId, setHoveredChatId] = useState<string | null>(null);
  const [infoConversationId, setInfoConversationId] = useState<string | null>(null);
  const [analysisConversationId, setAnalysisConversationId] = useState<string | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const groups = {
      today: [] as Conversation[],
      yesterday: [] as Conversation[],
      lastWeek: [] as Conversation[],
      older: [] as Conversation[],
    };

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const lastWeek = new Date(today);
    lastWeek.setDate(lastWeek.getDate() - 7);

    conversations.forEach((conv) => {
      const convDate = new Date(conv.updatedAt);
      if (convDate >= today) {
        groups.today.push(conv);
      } else if (convDate >= yesterday) {
        groups.yesterday.push(conv);
      } else if (convDate >= lastWeek) {
        groups.lastWeek.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [conversations]);

  const titles = {
    today: t('common.today'),
    yesterday: t('common.yesterday'),
    lastWeek: t('common.thisWeek'),
    older: t('common.older'),
  };

  // Filter conversations based on search query
  const filteredConversations = searchQuery.trim()
    ? conversations.filter((conv) =>
        conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some((msg) =>
          msg.content.toLowerCase().includes(searchQuery.toLowerCase())
        )
      )
    : null;

  // Get limited conversations for sidebar (last 20)
  const visibleConversations = useMemo(() => {
    let count = 0;
    const result: { key: string; convs: Conversation[] }[] = [];

    for (const [key, convs] of Object.entries(groupedConversations)) {
      if (count >= MAX_VISIBLE_CHATS) break;
      const remaining = MAX_VISIBLE_CHATS - count;
      const visible = convs.slice(0, remaining);
      if (visible.length > 0) {
        result.push({ key, convs: visible });
        count += visible.length;
      }
    }

    return result;
  }, [groupedConversations]);

  const totalChats = conversations.length;
  const hasMoreChats = totalChats > MAX_VISIBLE_CHATS;

  // Toggle selection for a conversation
  const toggleSelection = (convId: string) => {
    const newSelected = new Set(selectedChats);
    if (newSelected.has(convId)) {
      newSelected.delete(convId);
    } else {
      newSelected.add(convId);
    }
    setSelectedChats(newSelected);
  };

  // Chat item action buttons component - now shows on any hovered conversation
  const ChatItemActions = ({ conv, isHovered }: { conv: Conversation; isHovered: boolean }) => {
    const isSelected = selectedChats.has(conv.id);
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '4px',
          right: '8px',
          display: 'flex',
          gap: '4px',
          opacity: isHovered || isSelected ? 1 : 0,
          transition: 'opacity 0.2s ease',
          background: 'linear-gradient(to right, transparent, var(--darker-bg) 20%)',
          paddingLeft: '16px',
        }}
      >
        {/* Select checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleSelection(conv.id);
          }}
          style={{
            padding: '4px',
            borderRadius: '4px',
            border: 'none',
            background: isSelected ? 'var(--teal-med)' : 'rgba(255, 255, 255, 0.1)',
            color: isSelected ? 'white' : 'var(--gray-light)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title={isSelected ? 'Deselect' : 'Select'}
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isSelected ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            )}
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setEditingId(conv.id);
            setEditingTitle(conv.title);
          }}
          style={{
            padding: '4px',
            borderRadius: '4px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--gray-light)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Rename"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setDeleteConfirmId(conv.id);
          }}
          style={{
            padding: '4px',
            borderRadius: '4px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--gray-light)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Delete"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setInfoConversationId(conv.id);
          }}
          style={{
            padding: '4px',
            borderRadius: '4px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--gray-light)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Info"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setAnalysisConversationId(conv.id);
          }}
          style={{
            padding: '4px',
            borderRadius: '4px',
            border: 'none',
            background: 'rgba(255, 255, 255, 0.1)',
            color: 'var(--gray-light)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
          }}
          title="Analyze"
        >
          <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    );
  };

  // Chat List Popup Component
  const ChatListPopup = () => (
    <div
      className="search-modal-overlay"
      onClick={() => setIsChatListOpen(false)}
      style={{ zIndex: 1002 }}
    >
      <div
        className="search-modal"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px', maxHeight: '70vh' }}
      >
        <div className="search-modal-header">
          <h3 className="search-modal-title">All Conversations ({totalChats})</h3>
          <button
            className="search-modal-close"
            onClick={() => setIsChatListOpen(false)}
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="search-modal-results" style={{ maxHeight: '50vh' }}>
          {conversations.length === 0 ? (
            <div className="search-modal-empty">
              <p>No conversations yet</p>
            </div>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className="search-result-item"
                style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
              >
                <div
                  style={{ flex: 1, cursor: 'pointer' }}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    setIsChatListOpen(false);
                  }}
                >
                  <div className="search-result-title">{conv.title}</div>
                  <div className="search-result-meta">
                    {conv.messages.length} messages · {new Date(conv.updatedAt).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setDeleteConfirmId(conv.id);
                  }}
                  style={{
                    padding: '6px',
                    borderRadius: '4px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--gray-light)',
                    cursor: 'pointer',
                  }}
                  title="Delete"
                >
                  <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`sidebar ${className}`} style={{ width: isCollapsed ? '80px' : '260px', transition: 'width 0.3s ease' }}>
      <div className="logo-container">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="logo"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <img src="/Logo.png" alt="Zurvânex Logo" className="logo-icon" style={{ width: '48px', height: '48px' }} />
          {!isCollapsed && <div className="logo-text">Zurvânex</div>}
        </button>
      </div>

      {!isCollapsed ? (
        <>
          <button className="new-chat-btn" onClick={onNewChat}>
            New chat
          </button>

          {/* Search button */}
          <button
            className="search-chat-btn"
            onClick={() => setIsSearchOpen(true)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            Search chats
          </button>

          {/* Chat list button under search */}
          <button
            onClick={() => setIsChatListOpen(true)}
            style={{
              margin: '0 16px 8px 16px',
              padding: '8px 12px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '6px',
              color: 'var(--gray-light)',
              fontSize: '13px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontFamily: "'Courier New', Courier, monospace",
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            All chats ({totalChats})
          </button>

          {/* Selected chats indicator and bulk delete */}
          {selectedChats.size > 0 && (
            <div style={{
              margin: '0 16px 8px 16px',
              padding: '6px 10px',
              background: 'rgba(114, 212, 204, 0.1)',
              border: '1px solid rgba(114, 212, 204, 0.3)',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '8px',
            }}>
              <span style={{ fontSize: '12px', color: 'var(--teal-bright)' }}>
                {selectedChats.size} selected
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  onClick={() => setSelectedChats(new Set())}
                  style={{
                    padding: '4px 8px',
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '4px',
                    color: 'var(--gray-light)',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Clear
                </button>
                <button
                  onClick={() => setDeleteConfirmId('multiple')}
                  style={{
                    padding: '4px 8px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: '4px',
                    color: '#ef4444',
                    fontSize: '11px',
                    cursor: 'pointer',
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )}

          <div className="chat-history">
            {visibleConversations.map(({ key, convs }) => (
              <div key={key} className="history-section">
                <div className="history-title">
                  {titles[key as keyof typeof titles]}
                </div>
                {convs.map((conv) => {
                  const isHovered = hoveredChatId === conv.id;
                  const isSelected = selectedChats.has(conv.id);
                  return (
                    <div
                      key={conv.id}
                      className={`chat-item ${activeConversationId === conv.id ? 'active' : ''}`}
                      onClick={() => {
                        if (editingId !== conv.id) {
                          onSelectConversation(conv.id);
                        }
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        position: 'relative',
                        paddingBottom: (isHovered || isSelected) ? '28px' : '10px',
                        transition: 'padding-bottom 0.2s ease',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={() => setHoveredChatId(conv.id)}
                      onMouseLeave={() => setHoveredChatId(null)}
                    >
                      {editingId === conv.id ? (
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => {
                            if (editingTitle.trim() && onRenameConversation) {
                              onRenameConversation(conv.id, editingTitle.trim());
                            }
                            setEditingId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              if (editingTitle.trim() && onRenameConversation) {
                                onRenameConversation(conv.id, editingTitle.trim());
                              }
                              setEditingId(null);
                            } else if (e.key === 'Escape') {
                              setEditingId(null);
                            }
                          }}
                          autoFocus
                          style={{
                            flex: 1,
                            background: 'var(--darker-bg)',
                            border: '1px solid var(--teal-med)',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            color: 'var(--gray-med)',
                            fontSize: '13px',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {conv.title}
                        </div>
                      )}

                      {/* Show action buttons on hover for any conversation */}
                      {editingId !== conv.id && (
                        <ChatItemActions conv={conv} isHovered={isHovered} />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {/* See more button */}
            {hasMoreChats && (
              <button
                onClick={() => setIsChatListOpen(true)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  margin: '8px 0',
                  background: 'transparent',
                  border: '1px dashed rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'var(--teal-bright)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  fontFamily: "'Courier New', Courier, monospace",
                  transition: 'all 0.15s ease',
                }}
              >
                <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                See {totalChats - MAX_VISIBLE_CHATS} more
              </button>
            )}
          </div>

          <div className="sidebar-footer">
            {user && (
              <div style={{
                padding: '12px 16px',
                borderTop: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <UserProfile
                  size="medium"
                  showMenu={true}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                  onOpenHardMemory={onOpenHardMemory}
                />
              </div>
            )}
          </div>
        </>
      ) : (
        /* Collapsed state */
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 16px', alignItems: 'center' }}>
            <button
              onClick={onNewChat}
              style={{
                padding: '8px',
                background: 'var(--teal-bright)',
                border: 'none',
                borderRadius: '6px',
                color: 'var(--bg-dark)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
              }}
              title={t('chat.newChat')}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </button>

            <button
              onClick={() => setIsSearchOpen(true)}
              style={{
                padding: '8px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'var(--gray-med)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
              }}
              title={t('chat.searchChats')}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>

            <button
              onClick={() => setIsChatListOpen(true)}
              style={{
                padding: '8px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'var(--gray-med)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
              }}
              title={t('chat.allChats')}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>

          <div style={{ flex: 1 }} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '8px 16px', alignItems: 'center', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <button
              onClick={() => setIsSettingsOpen(true)}
              style={{
                padding: '8px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'var(--gray-med)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
              }}
              title={t('sidebar.settings')}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            <button
              onClick={handleSignOut}
              style={{
                padding: '8px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
                color: 'var(--gray-med)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
              }}
              title="Sign out"
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
        <div
          className="search-modal-overlay"
          onClick={() => setDeleteConfirmId(null)}
          style={{ zIndex: 1002 }}
        >
          <div
            className="search-modal"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: '400px' }}
          >
            <div className="search-modal-header">
              <h3 className="search-modal-title">Delete Conversation</h3>
            </div>
            <div style={{ padding: '20px' }}>
              <p style={{ color: 'var(--gray-med)', marginBottom: '20px' }}>
                {deleteConfirmId === 'multiple'
                  ? `Are you sure you want to delete ${selectedChats.size} conversations? This action cannot be undone.`
                  : 'Are you sure you want to delete this conversation? This action cannot be undone.'}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    background: 'transparent',
                    color: 'var(--gray-med)',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    if (onDeleteConversation) {
                      if (deleteConfirmId === 'multiple') {
                        selectedChats.forEach(id => onDeleteConversation(id));
                        setSelectedChats(new Set());
                      } else {
                        onDeleteConversation(deleteConfirmId);
                      }
                    }
                    setDeleteConfirmId(null);
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: 'none',
                    background: '#ef4444',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 500,
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversation Info Modal */}
      {infoConversationId && (() => {
        const conv = conversations.find(c => c.id === infoConversationId);
        if (!conv) return null;

        const startDate = new Date(conv.createdAt || conv.messages[0]?.timestamp || conv.updatedAt);
        const endDate = new Date(conv.messages[conv.messages.length - 1]?.timestamp || conv.updatedAt);
        const messageCount = conv.messages.length;
        const userMessages = conv.messages.filter(m => m.role === 'user').length;
        const aiMessages = conv.messages.filter(m => m.role === 'assistant').length;

        return (
          <div
            className="search-modal-overlay"
            onClick={() => setInfoConversationId(null)}
            style={{ zIndex: 1002 }}
          >
            <div
              className="search-modal"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: '450px' }}
            >
              <div className="search-modal-header">
                <h3 className="search-modal-title">Conversation Info</h3>
                <button
                  className="search-modal-close"
                  onClick={() => setInfoConversationId(null)}
                  aria-label="Close info"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--gray-light)', marginBottom: '4px' }}>
                    Title
                  </div>
                  <div style={{ fontSize: '16px', color: 'var(--gray-med)', fontWeight: 500 }}>
                    {conv.title}
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-light)', marginBottom: '4px' }}>
                      Total Messages
                    </div>
                    <div style={{ fontSize: '20px', color: 'var(--teal-bright)', fontWeight: 600 }}>
                      {messageCount}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-light)', marginBottom: '4px' }}>
                      Model
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-med)', fontWeight: 500 }}>
                      {conv.modelId || 'Unknown'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-light)', marginBottom: '4px' }}>
                      Your Messages
                    </div>
                    <div style={{ fontSize: '18px', color: 'var(--gray-med)', fontWeight: 500 }}>
                      {userMessages}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-light)', marginBottom: '4px' }}>
                      AI Messages
                    </div>
                    <div style={{ fontSize: '18px', color: 'var(--gray-med)', fontWeight: 500 }}>
                      {aiMessages}
                    </div>
                  </div>
                </div>

                <div style={{
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                  paddingTop: '16px'
                }}>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: 'var(--gray-light)', marginBottom: '4px' }}>
                      Started
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-med)' }}>
                      {startDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--gray-light)', marginBottom: '4px' }}>
                      Last Message
                    </div>
                    <div style={{ fontSize: '14px', color: 'var(--gray-med)' }}>
                      {endDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Settings Modal */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

      {/* Search Modal */}
      {isSearchOpen && (
        <div className="search-modal-overlay" onClick={() => setIsSearchOpen(false)}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            <div className="search-modal-header">
              <h3 className="search-modal-title">Search Conversations</h3>
              <button
                className="search-modal-close"
                onClick={() => setIsSearchOpen(false)}
                aria-label="Close search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="search-modal-input-wrapper">
              <svg className="search-modal-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                className="search-modal-input"
                placeholder={t('sidebar.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              {searchQuery && (
                <button
                  className="search-modal-clear"
                  onClick={() => setSearchQuery('')}
                  aria-label="Clear search"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            <div className="search-modal-results">
              {!searchQuery.trim() ? (
                <div className="search-modal-empty">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gray-light)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <p>Start typing to search conversations</p>
                </div>
              ) : filteredConversations && filteredConversations.length > 0 ? (
                filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    className="search-result-item"
                    onClick={() => {
                      onSelectConversation(conv.id);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                  >
                    <div className="search-result-title">{conv.title}</div>
                    <div className="search-result-meta">
                      {conv.messages.length} messages · {new Date(conv.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="search-modal-empty">
                  <svg className="w-12 h-12 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--gray-light)' }}>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p>No conversations found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Chat List Popup */}
      {isChatListOpen && <ChatListPopup />}

      {/* Analysis Modal */}
      {analysisConversationId && (() => {
        const conv = conversations.find(c => c.id === analysisConversationId);
        return conv ? (
          <ConversationAnalysisModal
            conversation={conv}
            onClose={() => setAnalysisConversationId(null)}
          />
        ) : null;
      })()}
    </div>
  );
}

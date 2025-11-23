'use client';

import { useState, useEffect, useRef } from 'react';
import type { Memory, Folder } from '@/types/memory';

interface MemoryEditorProps {
  memory: Memory | null;
  folders: Folder[];
  onSave: (memoryData: Partial<Memory>) => Promise<void>;
  onDelete?: () => Promise<void>;
  onClose: () => void;
  isCreating?: boolean;
}

export default function MemoryEditor({
  memory,
  folders,
  onSave,
  onDelete,
  onClose,
  isCreating = false
}: MemoryEditorProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (memory) {
      setTitle(memory.title);
      setContent(memory.content);
      setTags([...memory.tags]);
      setFolderId(memory.folderId);
    } else if (isCreating) {
      setTitle('');
      setContent('');
      setTags([]);
      setFolderId(null);
      // Focus title input for new memories
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [memory, isCreating]);

  const handleSave = async () => {
    if (!title.trim()) {
      titleRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      await onSave({
        title: title.trim(),
        content: content.trim(),
        tags,
        folderId
      });
      
      if (isCreating) {
        // Reset form for new memory
        setTitle('');
        setContent('');
        setTags([]);
        setNewTag('');
        titleRef.current?.focus();
      }
    } catch (error) {
      console.error('Error saving memory:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTag = () => {
    const tag = newTag.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSave();
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  if (!memory && !isCreating) {
    return (
      <div style={{ 
        flex: 1, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        color: 'var(--gray-med)',
        fontSize: '16px'
      }}>
        Select a memory to view or edit
      </div>
    );
  }

  return (
    <div style={{ 
      flex: 1, 
      display: 'flex', 
      flexDirection: 'column',
      height: '100%'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px 24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h3 style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: 'var(--gray-light)',
            margin: 0 
          }}>
            {isCreating ? 'Create New Memory' : 'Edit Memory'}
          </h3>
          {memory && (
            <div style={{ fontSize: '12px', color: 'var(--gray-dark)' }}>
              Created {formatDate(memory.createdAt)}
              {memory.lastModified.getTime() !== memory.createdAt.getTime() && (
                <> • Modified {formatDate(memory.lastModified)}</>
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          {!isCreating && onDelete && (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              style={{
                padding: '8px 12px',
                background: 'rgba(239, 68, 68, 0.1)',
                color: '#ef4444',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '6px',
                fontSize: '13px',
                fontWeight: '500',
                cursor: 'pointer'
              }}
            >
              Delete
            </button>
          )}
          
          <button
            onClick={onClose}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--gray-med)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Close
          </button>

          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            style={{
              padding: '8px 16px',
              background: saving ? 'var(--gray-dark)' : 'var(--teal-bright)',
              color: saving ? 'var(--gray-med)' : '#000',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: saving ? 'not-allowed' : 'pointer'
            }}
          >
            {saving ? 'Saving...' : (isCreating ? 'Create' : 'Save')}
          </button>
        </div>
      </div>

      {/* Editor Content */}
      <div style={{ 
        flex: 1, 
        padding: '24px', 
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px'
      }}>
        {/* Title */}
        <div>
          <label style={{ 
            display: 'block', 
            color: 'var(--gray-med)', 
            fontSize: '14px', 
            fontWeight: '500',
            marginBottom: '8px' 
          }}>
            Title *
          </label>
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter memory title..."
            style={{
              width: '100%',
              padding: '12px 16px',
              background: 'var(--darker-bg)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'var(--gray-light)',
              fontSize: '16px',
              fontWeight: '500'
            }}
          />
        </div>

        {/* Folder and Tags Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          {/* Folder */}
          <div>
            <label style={{ 
              display: 'block', 
              color: 'var(--gray-med)', 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '8px' 
            }}>
              Folder
            </label>
            <select
              value={folderId || ''}
              onChange={(e) => setFolderId(e.target.value || null)}
              style={{
                width: '100%',
                padding: '12px 16px',
                background: 'var(--darker-bg)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: 'var(--gray-light)',
                fontSize: '14px'
              }}
            >
              <option value="">Root (No folder)</option>
              {folders.map(folder => (
                <option key={folder.id} value={folder.id}>
                  {folder.name}
                </option>
              ))}
            </select>
          </div>

          {/* Add Tag */}
          <div>
            <label style={{ 
              display: 'block', 
              color: 'var(--gray-med)', 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '8px' 
            }}>
              Add Tag
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                placeholder="Enter tag..."
                style={{
                  flex: 1,
                  padding: '12px 16px',
                  background: 'var(--darker-bg)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: 'var(--gray-light)',
                  fontSize: '14px'
                }}
              />
              <button
                onClick={handleAddTag}
                disabled={!newTag.trim()}
                style={{
                  padding: '12px 16px',
                  background: 'var(--teal-bright)',
                  color: '#000',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  opacity: newTag.trim() ? 1 : 0.5
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Tags Display */}
        {tags.length > 0 && (
          <div>
            <label style={{ 
              display: 'block', 
              color: 'var(--gray-med)', 
              fontSize: '14px', 
              fontWeight: '500',
              marginBottom: '8px' 
            }}>
              Tags
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.map((tag, index) => (
                <span
                  key={index}
                  style={{
                    background: 'var(--teal-dark)',
                    color: 'white',
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  #{tag}
                  <button
                    onClick={() => handleRemoveTag(tag)}
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
                      justifyContent: 'center'
                    }}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <label style={{ 
            display: 'block', 
            color: 'var(--gray-med)', 
            fontSize: '14px', 
            fontWeight: '500',
            marginBottom: '8px' 
          }}>
            Content
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Write your memory content here... (Cmd/Ctrl + Enter to save)"
            style={{
              flex: 1,
              minHeight: '200px',
              padding: '16px',
              background: 'var(--darker-bg)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              color: 'var(--gray-light)',
              fontSize: '14px',
              lineHeight: '1.5',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'var(--darker-bg)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '400px',
            width: '90%'
          }}>
            <h4 style={{ 
              color: 'var(--gray-light)', 
              fontSize: '18px', 
              fontWeight: '600',
              marginBottom: '12px' 
            }}>
              Delete Memory
            </h4>
            <p style={{ 
              color: 'var(--gray-med)', 
              fontSize: '14px',
              marginBottom: '20px',
              lineHeight: '1.5' 
            }}>
              Are you sure you want to delete &quot;{title}&quot;? This action cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                style={{
                  padding: '8px 16px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--gray-med)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (onDelete) {
                    await onDelete();
                    setShowDeleteConfirm(false);
                  }
                }}
                style={{
                  padding: '8px 16px',
                  background: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
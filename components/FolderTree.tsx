'use client';

import { useState } from 'react';
import type { TreeNode } from '@/types/memory';

interface FolderTreeProps {
  nodes: TreeNode[];
  onSelectNode: (nodeId: string, type: 'folder' | 'memory') => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onCreateMemory: (folderId?: string) => void;
  onDeleteNode: (nodeId: string, type: 'folder' | 'memory') => void;
  selectedNodeId?: string;
}

export default function FolderTree({
  nodes,
  onSelectNode,
  onToggleFolder,
  onCreateFolder,
  onCreateMemory,
  onDeleteNode,
  selectedNodeId
}: FolderTreeProps) {
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  return (
    <div style={{ width: '100%' }}>
      {nodes.length === 0 ? (
        <div style={{ 
          padding: '20px', 
          textAlign: 'center',
          color: 'var(--gray-med)',
          fontSize: '14px'
        }}>
          <div style={{ marginBottom: '16px' }}>
            No memories yet
          </div>
          <button
            onClick={() => onCreateFolder()}
            style={{
              padding: '8px 16px',
              background: 'var(--teal-bright)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              marginRight: '8px'
            }}
          >
            Create Folder
          </button>
          <button
            onClick={() => onCreateMemory()}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--gray-light)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Create Memory
          </button>
        </div>
      ) : (
        <div style={{ padding: '8px' }}>
          {nodes.map(node => (
            <TreeItem
              key={node.id}
              node={node}
              onSelectNode={onSelectNode}
              onToggleFolder={onToggleFolder}
              onCreateFolder={onCreateFolder}
              onCreateMemory={onCreateMemory}
              onDeleteNode={onDeleteNode}
              selectedNodeId={selectedNodeId}
              hoveredNodeId={hoveredNodeId}
              setHoveredNodeId={setHoveredNodeId}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface TreeItemProps {
  node: TreeNode;
  onSelectNode: (nodeId: string, type: 'folder' | 'memory') => void;
  onToggleFolder: (folderId: string) => void;
  onCreateFolder: (parentId?: string) => void;
  onCreateMemory: (folderId?: string) => void;
  onDeleteNode: (nodeId: string, type: 'folder' | 'memory') => void;
  selectedNodeId?: string;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
}

function TreeItem({
  node,
  onSelectNode,
  onToggleFolder,
  onCreateFolder,
  onCreateMemory,
  onDeleteNode,
  selectedNodeId,
  hoveredNodeId,
  setHoveredNodeId
}: TreeItemProps) {
  const [showActions, setShowActions] = useState(false);

  const isSelected = selectedNodeId === node.id;
  const isHovered = hoveredNodeId === node.id;
  const indentLevel = node.level * 20;

  if (node.type === 'folder') {
    return (
      <>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            marginLeft: `${indentLevel}px`,
            borderRadius: '6px',
            background: isSelected ? 'var(--teal-dark)' : 
                       isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
            color: isSelected ? 'white' : 'var(--gray-light)',
            cursor: 'pointer',
            transition: 'all 0.2s',
            position: 'relative',
            fontSize: '14px'
          }}
          onMouseEnter={() => {
            setHoveredNodeId(node.id);
            setShowActions(true);
          }}
          onMouseLeave={() => {
            setHoveredNodeId(null);
            setShowActions(false);
          }}
          onClick={() => onSelectNode(node.id, 'folder')}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleFolder(node.id);
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'inherit',
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              marginRight: '8px',
              fontSize: '12px'
            }}
          >
            {node.isExpanded ? '▼' : '▶'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 1v6" />
            </svg>
            <span style={{ fontWeight: '500' }}>{node.name}</span>
          </div>

          {(isHovered || showActions) && (
            <div style={{ 
              display: 'flex', 
              gap: '4px',
              opacity: showActions ? 1 : 0,
              transition: 'opacity 0.2s'
            }}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateMemory(node.id);
                }}
                style={{
                  padding: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Add memory"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateFolder(node.id);
                }}
                style={{
                  padding: '4px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  borderRadius: '4px',
                  color: 'inherit',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Add folder"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteNode(node.id, 'folder');
                }}
                style={{
                  padding: '4px',
                  background: 'rgba(239, 68, 68, 0.2)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Delete folder"
              >
                <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          )}
        </div>

        {/* Render children if expanded */}
        {node.isExpanded && node.children.map(child => (
          <TreeItem
            key={child.id}
            node={child}
            onSelectNode={onSelectNode}
            onToggleFolder={onToggleFolder}
            onCreateFolder={onCreateFolder}
            onCreateMemory={onCreateMemory}
            onDeleteNode={onDeleteNode}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={hoveredNodeId}
            setHoveredNodeId={setHoveredNodeId}
          />
        ))}
      </>
    );
  } else {
    // Memory item
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          marginLeft: `${indentLevel}px`,
          borderRadius: '6px',
          background: isSelected ? 'var(--teal-dark)' : 
                     isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
          color: isSelected ? 'white' : 'var(--gray-light)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          fontSize: '14px'
        }}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        onClick={() => onSelectNode(node.id, 'memory')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{node.name}</span>
        </div>

        {isHovered && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteNode(node.id, 'memory');
            }}
            style={{
              padding: '4px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: 'none',
              borderRadius: '4px',
              color: '#ef4444',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Delete memory"
          >
            <svg width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>
    );
  }
}
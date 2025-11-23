'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { memoryStorage } from '@/lib/memoryStorage';
import { hardMemorySupabase } from '@/lib/hardMemorySupabase';
import FolderTree from './FolderTree';
import MemoryEditor from './MemoryEditor';
import type { MemoryView, MemoryPanelState, Memory, Folder, TreeNode } from '@/types/memory';

export default function MemoryPanel() {
  const { user } = useAuth();
  
  // Check if Supabase is available and configured
  const isSupabaseAvailable = () => {
    try {
      // For now, always try Supabase first and let it fail gracefully
      return typeof window !== 'undefined';
    } catch (error) {
      console.log('Supabase check failed, using IndexedDB fallback');
      return false;
    }
  };
  
  const [state, setState] = useState<MemoryPanelState>({
    currentView: 'browse',
    selectedMemoryId: null,
    selectedFolderId: null,
    searchQuery: '',
    searchTags: [],
    isEditing: false
  });

  const [memories, setMemories] = useState<Memory[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [isCreatingMemory, setIsCreatingMemory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Initialize storage and load data
  useEffect(() => {
    const initStorage = async () => {
      try {
        await memoryStorage.init();
        await loadData();
        
        // Create default folders if none exist
        const existingFolders = await memoryStorage.getAllFolders(user?.id);
        if (existingFolders.length === 0 && user?.id) {
          await memoryStorage.createDefaultFolders(user.id);
          await loadData();
        }
      } catch (error) {
        console.error('Error initializing storage:', error);
      } finally {
        setLoading(false);
      }
    };

    if (user?.id) {
      initStorage();
    }
  }, [user?.id]);

  const loadData = async () => {
    if (!user?.id) return;

    try {
      let memoriesData: Memory[];
      let foldersData: Folder[];

      if (isSupabaseAvailable()) {
        // Use Supabase when available
        [memoriesData, foldersData] = await Promise.all([
          hardMemorySupabase.getAllMemories(user.id),
          hardMemorySupabase.getAllFolders(user.id)
        ]);
      } else {
        // Fallback to IndexedDB
        [memoriesData, foldersData] = await Promise.all([
          memoryStorage.getAllMemories(user.id),
          memoryStorage.getAllFolders(user.id)
        ]);
      }

      setMemories(memoriesData);
      setFolders(foldersData);
      buildTreeNodes(memoriesData, foldersData);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const buildTreeNodes = (memoriesData: Memory[], foldersData: Folder[]) => {
    const folderMap = new Map<string, TreeNode>();
    const rootNodes: TreeNode[] = [];

    // Create folder nodes
    foldersData.forEach(folder => {
      const node: TreeNode = {
        id: folder.id,
        type: 'folder',
        name: folder.name,
        children: [],
        isExpanded: expandedFolders.has(folder.id),
        level: 0,
        data: folder
      };
      folderMap.set(folder.id, node);
    });

    // Build folder hierarchy
    foldersData.forEach(folder => {
      const node = folderMap.get(folder.id);
      if (!node) return;

      if (folder.parentId) {
        const parent = folderMap.get(folder.parentId);
        if (parent) {
          node.level = parent.level + 1;
          parent.children.push(node);
        } else {
          rootNodes.push(node);
        }
      } else {
        rootNodes.push(node);
      }
    });

    // Add memories to folders
    memoriesData.forEach(memory => {
      const memoryNode: TreeNode = {
        id: memory.id,
        type: 'memory',
        name: memory.title,
        children: [],
        isExpanded: false,
        level: 0,
        data: memory
      };

      if (memory.folderId) {
        const parentFolder = folderMap.get(memory.folderId);
        if (parentFolder) {
          memoryNode.level = parentFolder.level + 1;
          parentFolder.children.push(memoryNode);
        } else {
          rootNodes.push(memoryNode);
        }
      } else {
        rootNodes.push(memoryNode);
      }
    });

    setTreeNodes(rootNodes);
  };

  const handleSelectNode = useCallback((nodeId: string, type: 'folder' | 'memory') => {
    if (type === 'memory') {
      const memory = memories.find(m => m.id === nodeId);
      setSelectedMemory(memory || null);
      setState(prev => ({ ...prev, selectedMemoryId: nodeId, selectedFolderId: null }));
      setIsCreatingMemory(false);
    } else {
      setState(prev => ({ ...prev, selectedFolderId: nodeId, selectedMemoryId: null }));
      setSelectedMemory(null);
      setIsCreatingMemory(false);
    }
  }, [memories]);

  const handleToggleFolder = useCallback((folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
    
    // Rebuild tree with new expansion state
    buildTreeNodes(memories, folders);
  }, [expandedFolders, memories, folders]);

  const handleCreateFolder = useCallback(async (parentId?: string) => {
    if (!user?.id) return;

    const name = prompt('Enter folder name:');
    if (!name?.trim()) return;

    try {
      await memoryStorage.saveFolder({
        name: name.trim(),
        parentId: parentId || null,
        userId: user.id
      });
      await loadData();
    } catch (error) {
      console.error('Error creating folder:', error);
    }
  }, [user?.id]);

  const handleCreateMemory = useCallback((folderId?: string) => {
    setSelectedMemory(null);
    setState(prev => ({ 
      ...prev, 
      selectedMemoryId: null, 
      selectedFolderId: folderId || null 
    }));
    setIsCreatingMemory(true);
  }, []);

  const handleSaveMemory = useCallback(async (memoryData: Partial<Memory>) => {
    if (!user?.id) return;

    console.log('🧠 [MemoryPanel] Saving memory:', { 
      memoryData, 
      userId: user.id, 
      selectedFolderId: state.selectedFolderId,
      usingSupabase: isSupabaseAvailable()
    });

    try {
      if (selectedMemory) {
        // Update existing memory
        if (isSupabaseAvailable()) {
          console.log('🧠 [MemoryPanel] Updating memory via Supabase');
          await hardMemorySupabase.updateMemory(selectedMemory.id, memoryData);
        } else {
          console.log('🧠 [MemoryPanel] Updating memory via IndexedDB');
          await memoryStorage.updateMemory(selectedMemory.id, memoryData);
        }
      } else {
        // Create new memory
        const newMemoryData = {
          ...memoryData,
          userId: user.id,
          folderId: memoryData.folderId || state.selectedFolderId
        } as Omit<Memory, 'id' | 'createdAt' | 'lastAccessed' | 'lastModified'>;
        
        console.log('🧠 [MemoryPanel] Creating memory with data:', newMemoryData);
        
        if (isSupabaseAvailable()) {
          console.log('🧠 [MemoryPanel] Creating memory via Supabase');
          const result = await hardMemorySupabase.saveMemory(newMemoryData);
          console.log('🧠 [MemoryPanel] Supabase save result:', result);
        } else {
          console.log('🧠 [MemoryPanel] Creating memory via IndexedDB');
          await memoryStorage.saveMemory(newMemoryData);
        }
      }
      await loadData();
    } catch (error) {
      console.error('🚨 [MemoryPanel] Error saving memory:', error);
    }
  }, [selectedMemory, user?.id, state.selectedFolderId]);

  const handleDeleteMemory = useCallback(async () => {
    if (!selectedMemory) return;

    try {
      if (isSupabaseAvailable()) {
        await hardMemorySupabase.deleteMemory(selectedMemory.id);
      } else {
        await memoryStorage.deleteMemory(selectedMemory.id);
      }
      setSelectedMemory(null);
      setState(prev => ({ ...prev, selectedMemoryId: null }));
      setIsCreatingMemory(false);
      await loadData();
    } catch (error) {
      console.error('Error deleting memory:', error);
    }
  }, [selectedMemory]);

  const handleDeleteNode = useCallback(async (nodeId: string, type: 'folder' | 'memory') => {
    const confirmMessage = type === 'folder' 
      ? 'Delete this folder? Memories inside will be moved to root.'
      : 'Delete this memory? This action cannot be undone.';
      
    if (!confirm(confirmMessage)) return;

    try {
      if (type === 'folder') {
        if (isSupabaseAvailable() && user?.id) {
          await hardMemorySupabase.deleteFolder(nodeId, user.id);
        } else {
          await memoryStorage.deleteFolder(nodeId);
        }
      } else {
        if (isSupabaseAvailable()) {
          await hardMemorySupabase.deleteMemory(nodeId);
        } else {
          await memoryStorage.deleteMemory(nodeId);
        }
      }
      
      // Clear selection if we deleted the selected item
      if (state.selectedFolderId === nodeId || state.selectedMemoryId === nodeId) {
        setState(prev => ({ 
          ...prev, 
          selectedFolderId: null, 
          selectedMemoryId: null 
        }));
        setSelectedMemory(null);
      }
      
      await loadData();
    } catch (error) {
      console.error('Error deleting node:', error);
    }
  }, [state.selectedFolderId, state.selectedMemoryId]);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      let results: Memory[];
      if (isSupabaseAvailable() && user?.id) {
        results = await hardMemorySupabase.searchMemories(query, state.searchTags, user.id);
      } else {
        results = await memoryStorage.searchMemories(query, state.searchTags);
      }
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching memories:', error);
    }
  }, [state.searchTags]);

  // Search when query changes
  useEffect(() => {
    if (state.currentView === 'search') {
      handleSearch(state.searchQuery);
    }
  }, [state.searchQuery, state.currentView, handleSearch]);

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
        Initializing Hard Memory...
      </div>
    );
  }

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
            {memories.length} memories • {folders.length} folders
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => handleCreateMemory()}
            style={{
              padding: '8px 16px',
              background: 'var(--teal-bright)',
              color: '#000',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Memory
          </button>

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
              width: '350px',
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
                  Memory Tree
                </h3>
                <button
                  onClick={() => handleCreateFolder()}
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
                  Folder
                </button>
              </div>

              {/* Folder Tree */}
              <div style={{ flex: 1, overflow: 'auto' }}>
                <FolderTree
                  nodes={treeNodes}
                  onSelectNode={handleSelectNode}
                  onToggleFolder={handleToggleFolder}
                  onCreateFolder={handleCreateFolder}
                  onCreateMemory={handleCreateMemory}
                  onDeleteNode={handleDeleteNode}
                  selectedNodeId={state.selectedMemoryId || state.selectedFolderId || undefined}
                />
              </div>
            </div>

            {/* Main Content */}
            <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
              <MemoryEditor
                memory={selectedMemory}
                folders={folders}
                onSave={handleSaveMemory}
                onDelete={selectedMemory ? handleDeleteMemory : undefined}
                onClose={() => {
                  setSelectedMemory(null);
                  setIsCreatingMemory(false);
                  setState(prev => ({ ...prev, selectedMemoryId: null }));
                }}
                isCreating={isCreatingMemory}
                defaultFolderId={state.selectedFolderId}
              />
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
            gap: '24px'
          }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: 'var(--gray-light)',
                marginBottom: '16px',
                textAlign: 'center' 
              }}>
                Search Memories
              </h3>
              
              <div style={{ position: 'relative', marginBottom: '24px' }}>
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

              {/* Search Results */}
              {state.searchQuery.trim() && (
                <div>
                  <p style={{ color: 'var(--gray-med)', marginBottom: '16px' }}>
                    Found {searchResults.length} results for &quot;{state.searchQuery}&quot;
                  </p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {searchResults.map(memory => (
                      <div
                        key={memory.id}
                        onClick={() => handleSelectNode(memory.id, 'memory')}
                        style={{
                          padding: '16px',
                          background: 'var(--darker-bg)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                      >
                        <h4 style={{ 
                          color: 'var(--gray-light)', 
                          fontSize: '16px', 
                          fontWeight: '600',
                          marginBottom: '8px' 
                        }}>
                          {memory.title}
                        </h4>
                        <p style={{ 
                          color: 'var(--gray-med)', 
                          fontSize: '14px',
                          lineHeight: '1.4',
                          marginBottom: '8px' 
                        }}>
                          {memory.content.slice(0, 150)}{memory.content.length > 150 ? '...' : ''}
                        </p>
                        {memory.tags.length > 0 && (
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {memory.tags.map(tag => (
                              <span
                                key={tag}
                                style={{
                                  background: 'var(--teal-dark)',
                                  color: 'white',
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  fontSize: '11px'
                                }}
                              >
                                #{tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {!state.searchQuery.trim() && (
                <div style={{ 
                  textAlign: 'center',
                  color: 'var(--gray-med)', 
                  fontSize: '14px' 
                }}>
                  Start typing to search through your memories...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timeline View */}
        {state.currentView === 'timeline' && (
          <div style={{ 
            width: '100%', 
            padding: '24px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: 'var(--gray-light)',
                marginBottom: '24px',
                textAlign: 'center' 
              }}>
                Memory Timeline
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {memories
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(memory => (
                    <div
                      key={memory.id}
                      onClick={() => handleSelectNode(memory.id, 'memory')}
                      style={{
                        padding: '16px',
                        background: 'var(--darker-bg)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                        <h4 style={{ 
                          color: 'var(--gray-light)', 
                          fontSize: '16px', 
                          fontWeight: '600',
                          margin: 0
                        }}>
                          {memory.title}
                        </h4>
                        <span style={{ 
                          color: 'var(--gray-dark)', 
                          fontSize: '12px',
                          whiteSpace: 'nowrap',
                          marginLeft: '16px'
                        }}>
                          {new Date(memory.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      
                      <p style={{ 
                        color: 'var(--gray-med)', 
                        fontSize: '14px',
                        lineHeight: '1.4',
                        marginBottom: memory.tags.length > 0 ? '8px' : 0,
                        margin: 0
                      }}>
                        {memory.content.slice(0, 120)}{memory.content.length > 120 ? '...' : ''}
                      </p>
                      
                      {memory.tags.length > 0 && (
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '8px' }}>
                          {memory.tags.slice(0, 3).map(tag => (
                            <span
                              key={tag}
                              style={{
                                background: 'var(--teal-dark)',
                                color: 'white',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px'
                              }}
                            >
                              #{tag}
                            </span>
                          ))}
                          {memory.tags.length > 3 && (
                            <span style={{ color: 'var(--gray-dark)', fontSize: '11px' }}>
                              +{memory.tags.length - 3} more
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>

              {memories.length === 0 && (
                <div style={{ 
                  textAlign: 'center',
                  color: 'var(--gray-med)', 
                  fontSize: '14px' 
                }}>
                  No memories yet. Create your first one!
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
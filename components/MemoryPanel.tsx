'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { memoryStorage } from '@/lib/memoryStorage';
import { hardMemorySupabase } from '@/lib/hardMemorySupabase';
import { invalidateCacheForChunk, invalidateAllCache } from '@/lib/smartSearch';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const folderData = {
        name: name.trim(),
        parentId: parentId || null,
        userId: user.id
      };

      if (isSupabaseAvailable()) {
        await hardMemorySupabase.saveFolder(folderData);
      } else {
        await memoryStorage.saveFolder(folderData);
      }
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
      let memoryId: string | undefined;

      if (selectedMemory) {
        // Update existing memory
        memoryId = selectedMemory.id;
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
          memoryId = result.id;
          console.log('🧠 [MemoryPanel] Supabase save result:', result);
        } else {
          console.log('🧠 [MemoryPanel] Creating memory via IndexedDB');
          const result = await memoryStorage.saveMemory(newMemoryData);
          memoryId = result.id;
        }
      }

      // Invalidate cache for this memory
      if (memoryId) {
        await invalidateCacheForChunk(memoryId);
      }

      await loadData();
    } catch (error) {
      console.error('🚨 [MemoryPanel] Error saving memory:', error);
    }
  }, [selectedMemory, user?.id, state.selectedFolderId]);

  const handleDeleteMemory = useCallback(async () => {
    if (!selectedMemory) return;

    try {
      const memoryId = selectedMemory.id;

      if (isSupabaseAvailable()) {
        await hardMemorySupabase.deleteMemory(selectedMemory.id);
      } else {
        await memoryStorage.deleteMemory(selectedMemory.id);
      }

      // Invalidate cache for this memory
      await invalidateCacheForChunk(memoryId);

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
        // Folder deletion may affect multiple memories, invalidate all
        await invalidateAllCache();
      } else {
        if (isSupabaseAvailable()) {
          await hardMemorySupabase.deleteMemory(nodeId);
        } else {
          await memoryStorage.deleteMemory(nodeId);
        }
        // Invalidate cache for this specific memory
        await invalidateCacheForChunk(nodeId);
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
      alert(`Error deleting ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, [state.selectedFolderId, state.selectedMemoryId, user?.id]);

  const handleRenameNode = useCallback(async (nodeId: string, type: 'folder' | 'memory', newName: string) => {
    try {
      if (type === 'folder') {
        if (isSupabaseAvailable()) {
          await hardMemorySupabase.updateFolder(nodeId, { name: newName });
        } else {
          await memoryStorage.updateFolder(nodeId, { name: newName });
        }
        // Folder rename doesn't affect content, no cache invalidation needed
      } else {
        if (isSupabaseAvailable()) {
          await hardMemorySupabase.updateMemory(nodeId, { title: newName });
        } else {
          await memoryStorage.updateMemory(nodeId, { title: newName });
        }
        // Title change may affect search, invalidate cache for this memory
        await invalidateCacheForChunk(nodeId);
      }

      await loadData();
    } catch (error) {
      console.error('Error renaming node:', error);
      alert(`Error renaming ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const handleMoveNode = useCallback(async (nodeId: string, type: 'folder' | 'memory', targetFolderId: string | null) => {
    try {
      if (type === 'folder') {
        if (isSupabaseAvailable()) {
          await hardMemorySupabase.updateFolder(nodeId, { parentId: targetFolderId });
        } else {
          await memoryStorage.updateFolder(nodeId, { parentId: targetFolderId });
        }
        // Folder move doesn't affect content, no cache invalidation needed
      } else {
        if (isSupabaseAvailable()) {
          await hardMemorySupabase.updateMemory(nodeId, { folderId: targetFolderId });
        } else {
          await memoryStorage.updateMemory(nodeId, { folderId: targetFolderId });
        }
        // Moving memory doesn't affect its content, no cache invalidation needed
      }

      await loadData();
    } catch (error) {
      console.error('Error moving node:', error);
      alert(`Error moving ${type}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }, []);

  const handleSplitMemory = useCallback(async (memory: Memory) => {
    if (!user?.id) return;

    const confirmed = confirm(
      `Split "${memory.title}" into smaller sections?\n\n` +
      `Current size: ${(memory.content.length / 1024).toFixed(1)} KB\n` +
      `This will create multiple new memories and keep the original.`
    );
    if (!confirmed) return;

    try {
      const sections = smartSplit(memory.content);

      console.log(`Splitting memory into ${sections.length} sections...`);

      for (let i = 0; i < sections.length; i++) {
        const section = sections[i];

        if (isSupabaseAvailable()) {
          await hardMemorySupabase.saveMemory({
            title: `${memory.title} - Part ${i + 1}: ${section.title}`,
            content: section.content,
            tags: [...memory.tags, 'split-from-large-file'],
            folderId: memory.folderId,
            userId: user.id,
          });
        } else {
          await memoryStorage.saveMemory({
            title: `${memory.title} - Part ${i + 1}: ${section.title}`,
            content: section.content,
            tags: [...memory.tags, 'split-from-large-file'],
            folderId: memory.folderId,
            userId: user.id,
          });
        }
      }

      alert(`✅ Successfully created ${sections.length} new memories!\n\nOriginal memory "${memory.title}" is still there.`);
      await loadData();
    } catch (error) {
      console.error('Error splitting memory:', error);
      alert('Error splitting memory. Check console for details.');
    }
  }, [user?.id]);

  const smartSplit = (content: string): Array<{ title: string; content: string }> => {
    const sections: Array<{ title: string; content: string }> = [];
    const headerPattern = /===\s*([^=]+?)\s*===/g;
    const matches = [...content.matchAll(headerPattern)];

    if (matches.length > 0) {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        const title = match[1].trim();
        const startIdx = match.index! + match[0].length;
        const endIdx = matches[i + 1]?.index || content.length;
        const sectionContent = content.slice(startIdx, endIdx).trim();

        if (sectionContent.length > 100) {
          if (sectionContent.length > 15000) {
            const subSections = splitByParagraphs(sectionContent, 10000);
            subSections.forEach((subContent, idx) => {
              sections.push({
                title: `${title} (${idx + 1})`,
                content: subContent,
              });
            });
          } else {
            sections.push({ title, content: sectionContent });
          }
        }
      }
    } else {
      const chunks = splitByParagraphs(content, 10000);
      chunks.forEach((chunk, idx) => {
        sections.push({
          title: `Section ${idx + 1}`,
          content: chunk,
        });
      });
    }

    return sections;
  };

  const splitByParagraphs = (text: string, maxSize: number): string[] => {
    const paragraphs = text.split('\n\n');
    const chunks: string[] = [];
    let currentChunk = '';

    for (const para of paragraphs) {
      if (currentChunk.length + para.length > maxSize) {
        if (currentChunk) {
          chunks.push(currentChunk.trim());
          currentChunk = '';
        }

        if (para.length > maxSize) {
          const sentences = para.split('. ');
          for (const sentence of sentences) {
            if (currentChunk.length + sentence.length > maxSize) {
              if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
              }
            }
            currentChunk += sentence + '. ';
          }
        } else {
          currentChunk = para;
        }
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + para;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  };

  const handleImportFiles = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !user?.id) return;

    const filesArray = Array.from(files);
    let imported = 0;

    for (const file of filesArray) {
      try {
        const content = await extractFileContent(file);
        if (!content) continue;

        const memoryData = {
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          content,
          tags: ['imported', `from-${file.type || 'file'}`],
          folderId: state.selectedFolderId,
          userId: user.id,
        };

        if (isSupabaseAvailable()) {
          await hardMemorySupabase.saveMemory(memoryData);
        } else {
          await memoryStorage.saveMemory(memoryData);
        }

        imported++;
      } catch (error) {
        console.error(`Error importing ${file.name}:`, error);
      }
    }

    alert(`✅ Successfully imported ${imported}/${filesArray.length} files!`);
    await loadData();

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [user?.id, state.selectedFolderId]);

  const extractFileContent = async (file: File): Promise<string | null> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    // Text files
    if (fileType.includes('text') || fileName.endsWith('.txt') || fileName.endsWith('.md')) {
      return await file.text();
    }

    // HTML files
    if (fileType.includes('html') || fileName.endsWith('.html')) {
      const html = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      return doc.body.textContent || doc.body.innerText || '';
    }

    // PDF files (using PDF.js if available)
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      try {
        // Check if PDF.js is loaded
        if (typeof window !== 'undefined' && (window as any).pdfjsLib) {
          const pdfjsLib = (window as any).pdfjsLib;
          const arrayBuffer = await file.arrayBuffer();
          const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

          let fullText = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
          }

          return fullText.trim();
        } else {
          alert('PDF.js not loaded. Please refresh the page and try again.');
          return null;
        }
      } catch (error) {
        console.error('Error extracting PDF:', error);
        return null;
      }
    }

    alert(`Unsupported file type: ${file.type || fileName}`);
    return null;
  };

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    console.log('🔍 [Search] Starting search for:', query);

    try {
      let results: Memory[];
      if (isSupabaseAvailable() && user?.id) {
        console.log('🔍 [Search] Using Supabase search');
        try {
          results = await hardMemorySupabase.searchMemories(query, state.searchTags, user.id);
          console.log('🔍 [Search] Supabase results:', results.length);
        } catch (supabaseError) {
          console.warn('🔍 [Search] Supabase search failed, falling back to client-side search:', supabaseError);
          // Fallback to client-side search if Supabase fails
          results = memories.filter(memory => {
            const lowerQuery = query.toLowerCase();
            return memory.title.toLowerCase().includes(lowerQuery) ||
                   memory.content.toLowerCase().includes(lowerQuery) ||
                   memory.tags.some(tag => tag.toLowerCase().includes(lowerQuery));
          });
          console.log('🔍 [Search] Client-side fallback results:', results.length);
        }
      } else {
        console.log('🔍 [Search] Using IndexedDB search');
        results = await memoryStorage.searchMemories(query, state.searchTags);
        console.log('🔍 [Search] IndexedDB results:', results.length);
      }
      setSearchResults(results);
    } catch (error) {
      console.error('🔍 [Search] Error searching memories:', error);
      // Fallback to simple client-side search
      const lowerQuery = query.toLowerCase();
      const fallbackResults = memories.filter(memory =>
        memory.title.toLowerCase().includes(lowerQuery) ||
        memory.content.toLowerCase().includes(lowerQuery) ||
        memory.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
      );
      console.log('🔍 [Search] Final fallback results:', fallbackResults.length);
      setSearchResults(fallbackResults);
    }
  }, [state.searchTags, user?.id, memories]);

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

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.html,.pdf,text/*,application/pdf,text/html"
            multiple
            onChange={handleImportFiles}
            style={{ display: 'none' }}
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: '8px 16px',
              background: 'rgba(34, 197, 94, 0.1)',
              color: '#22c55e',
              border: '1px solid rgba(34, 197, 94, 0.3)',
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            Import
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
                  onRenameNode={handleRenameNode}
                  onMoveNode={handleMoveNode}
                  selectedNodeId={state.selectedMemoryId || state.selectedFolderId || undefined}
                  allFolders={treeNodes.filter(node => node.type === 'folder')}
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
                onSplit={handleSplitMemory}
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
                        onClick={() => {
                          // Switch to browse view and select the memory
                          setState(prev => ({ ...prev, currentView: 'browse' }));
                          handleSelectNode(memory.id, 'memory');
                        }}
                        style={{
                          padding: '16px',
                          background: 'var(--darker-bg)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(64, 224, 208, 0.05)';
                          e.currentTarget.style.borderColor = 'rgba(64, 224, 208, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--darker-bg)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
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
            padding: '48px 24px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto'
          }}>
            <div style={{ margin: '0 auto', width: '100%', maxWidth: '1400px' }}>
              <h3 style={{
                fontSize: '24px',
                fontWeight: '600',
                color: 'var(--gray-light)',
                marginBottom: '48px',
                textAlign: 'center'
              }}>
                Memory Timeline
              </h3>

              {memories.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  color: 'var(--gray-med)',
                  fontSize: '14px'
                }}>
                  No memories yet. Create your first one!
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '40px' }}>
                  {/* Timeline line */}
                  <div style={{
                    position: 'absolute',
                    left: '16px',
                    top: '24px',
                    bottom: '24px',
                    width: '2px',
                    background: 'linear-gradient(180deg, var(--teal-bright) 0%, rgba(64, 224, 208, 0.2) 100%)'
                  }} />

                  {/* Timeline nodes */}
                  {memories
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((memory, index) => {
                      const date = new Date(memory.createdAt);
                      const isSelected = state.selectedMemoryId === memory.id;

                      return (
                        <div
                          key={memory.id}
                          style={{
                            position: 'relative',
                            marginBottom: '32px',
                            transition: 'all 0.3s ease'
                          }}
                        >
                          {/* Timeline dot */}
                          <div style={{
                            position: 'absolute',
                            left: '-32px',
                            top: '20px',
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: isSelected ? 'var(--teal-bright)' : 'rgba(64, 224, 208, 0.5)',
                            border: `2px solid ${isSelected ? '#fff' : 'var(--bg-primary)'}`,
                            boxShadow: isSelected ? '0 0 12px var(--teal-bright)' : 'none',
                            transition: 'all 0.3s ease',
                            zIndex: 2
                          }} />

                          {/* Date label */}
                          <div style={{
                            position: 'absolute',
                            left: '-28px',
                            top: '36px',
                            transform: 'rotate(-90deg) translateX(-50%)',
                            transformOrigin: 'left center',
                            fontSize: '11px',
                            color: 'var(--gray-dark)',
                            whiteSpace: 'nowrap',
                            fontWeight: '500'
                          }}>
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>

                          {/* Memory card */}
                          <div
                            onClick={() => {
                              setState(prev => ({ ...prev, currentView: 'browse' }));
                              handleSelectNode(memory.id, 'memory');
                            }}
                            style={{
                              padding: '20px',
                              background: isSelected ? 'rgba(64, 224, 208, 0.1)' : 'var(--darker-bg)',
                              border: isSelected ? '2px solid var(--teal-bright)' : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '12px',
                              cursor: 'pointer',
                              transition: 'all 0.3s ease',
                              marginLeft: '32px',
                              boxShadow: isSelected ? '0 4px 24px rgba(64, 224, 208, 0.2)' : 'none'
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'rgba(64, 224, 208, 0.05)';
                                e.currentTarget.style.borderColor = 'rgba(64, 224, 208, 0.3)';
                                e.currentTarget.style.transform = 'translateX(8px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'var(--darker-bg)';
                                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                                e.currentTarget.style.transform = 'translateX(0)';
                              }
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                              <h4 style={{
                                color: isSelected ? 'var(--teal-bright)' : 'var(--gray-light)',
                                fontSize: '18px',
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
                                {date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>

                            <p style={{
                              color: 'var(--gray-med)',
                              fontSize: '14px',
                              lineHeight: '1.6',
                              marginBottom: memory.tags.length > 0 ? '12px' : 0,
                              margin: 0
                            }}>
                              {memory.content.slice(0, 200)}{memory.content.length > 200 ? '...' : ''}
                            </p>

                            {memory.tags.length > 0 && (
                              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '12px' }}>
                                {memory.tags.slice(0, 5).map(tag => (
                                  <span
                                    key={tag}
                                    style={{
                                      background: 'var(--teal-dark)',
                                      color: 'white',
                                      padding: '4px 10px',
                                      borderRadius: '12px',
                                      fontSize: '11px',
                                      fontWeight: '500'
                                    }}
                                  >
                                    #{tag}
                                  </span>
                                ))}
                                {memory.tags.length > 5 && (
                                  <span style={{ color: 'var(--gray-dark)', fontSize: '11px', padding: '4px' }}>
                                    +{memory.tags.length - 5} more
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
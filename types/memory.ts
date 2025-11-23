export interface Memory {
  id: string;
  title: string;
  content: string;
  tags: string[];
  folderId: string | null; // null = root level
  conversationSource?: string; // ID of conversation it came from
  createdAt: Date;
  lastAccessed: Date;
  lastModified: Date;
  userId: string; // For future multi-user support
}

export interface Folder {
  id: string;
  name: string;
  parentId: string | null; // null = root level
  createdAt: Date;
  userId: string; // For future multi-user support
}

export interface TreeNode {
  id: string;
  type: 'folder' | 'memory';
  name: string; // folder name or memory title
  children: TreeNode[];
  isExpanded: boolean; // for folders only
  level: number; // 0 = root, 1 = first level, etc.
  data?: Memory | Folder; // original data object
}

export interface MemorySearchResult {
  memory: Memory;
  matchType: 'title' | 'content' | 'tag';
  snippet?: string; // highlighted content snippet
}

export type MemoryView = 'browse' | 'search' | 'timeline';

export interface MemoryPanelState {
  currentView: MemoryView;
  selectedMemoryId: string | null;
  selectedFolderId: string | null;
  searchQuery: string;
  searchTags: string[];
  isEditing: boolean;
}
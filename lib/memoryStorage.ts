import type { Memory, Folder } from '@/types/memory';

// IndexedDB database setup
const DB_NAME = 'zarvanex-memories';
const DB_VERSION = 1;
const MEMORY_STORE = 'memories';
const FOLDER_STORE = 'folders';

interface DBStores {
  [MEMORY_STORE]: Memory;
  [FOLDER_STORE]: Folder;
}

class MemoryStorage {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create memories store
        if (!db.objectStoreNames.contains(MEMORY_STORE)) {
          const memoryStore = db.createObjectStore(MEMORY_STORE, { keyPath: 'id' });
          memoryStore.createIndex('folderId', 'folderId', { unique: false });
          memoryStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
          memoryStore.createIndex('createdAt', 'createdAt', { unique: false });
          memoryStore.createIndex('userId', 'userId', { unique: false });
        }

        // Create folders store
        if (!db.objectStoreNames.contains(FOLDER_STORE)) {
          const folderStore = db.createObjectStore(FOLDER_STORE, { keyPath: 'id' });
          folderStore.createIndex('parentId', 'parentId', { unique: false });
          folderStore.createIndex('userId', 'userId', { unique: false });
        }
      };
    });
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // MEMORY OPERATIONS
  async saveMemory(memoryData: Omit<Memory, 'id' | 'createdAt' | 'lastAccessed' | 'lastModified'>): Promise<Memory> {
    if (!this.db) throw new Error('Database not initialized');

    const now = new Date();
    const memory: Memory = {
      ...memoryData,
      id: this.generateId(),
      createdAt: now,
      lastAccessed: now,
      lastModified: now,
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEMORY_STORE], 'readwrite');
      const store = transaction.objectStore(MEMORY_STORE);
      const request = store.add(memory);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(memory);
    });
  }

  async updateMemory(memoryId: string, updates: Partial<Memory>): Promise<Memory> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getMemory(memoryId);
    if (!existing) throw new Error('Memory not found');

    const updated: Memory = {
      ...existing,
      ...updates,
      id: memoryId, // Ensure ID doesn't change
      lastModified: new Date(),
      lastAccessed: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEMORY_STORE], 'readwrite');
      const store = transaction.objectStore(MEMORY_STORE);
      const request = store.put(updated);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(updated);
    });
  }

  async getMemory(memoryId: string): Promise<Memory | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEMORY_STORE], 'readonly');
      const store = transaction.objectStore(MEMORY_STORE);
      const request = store.get(memoryId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const memory = request.result as Memory | undefined;
        if (memory) {
          // Update last accessed
          this.updateMemory(memoryId, { lastAccessed: new Date() }).catch(console.error);
        }
        resolve(memory || null);
      };
    });
  }

  async getAllMemories(userId?: string): Promise<Memory[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEMORY_STORE], 'readonly');
      const store = transaction.objectStore(MEMORY_STORE);
      
      const request = userId 
        ? store.index('userId').getAll(userId)
        : store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteMemory(memoryId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEMORY_STORE], 'readwrite');
      const store = transaction.objectStore(MEMORY_STORE);
      const request = store.delete(memoryId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  // FOLDER OPERATIONS
  async saveFolder(folderData: Omit<Folder, 'id' | 'createdAt'>): Promise<Folder> {
    if (!this.db) throw new Error('Database not initialized');

    const folder: Folder = {
      ...folderData,
      id: this.generateId(),
      createdAt: new Date(),
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDER_STORE], 'readwrite');
      const store = transaction.objectStore(FOLDER_STORE);
      const request = store.add(folder);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(folder);
    });
  }

  async updateFolder(folderId: string, updates: Partial<Folder>): Promise<Folder> {
    if (!this.db) throw new Error('Database not initialized');

    const existing = await this.getFolder(folderId);
    if (!existing) throw new Error('Folder not found');

    const updated: Folder = {
      ...existing,
      ...updates,
      id: folderId, // Ensure ID doesn't change
    };

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDER_STORE], 'readwrite');
      const store = transaction.objectStore(FOLDER_STORE);
      const request = store.put(updated);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(updated);
    });
  }

  async getFolder(folderId: string): Promise<Folder | null> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDER_STORE], 'readonly');
      const store = transaction.objectStore(FOLDER_STORE);
      const request = store.get(folderId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || null);
    });
  }

  async getAllFolders(userId?: string): Promise<Folder[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDER_STORE], 'readonly');
      const store = transaction.objectStore(FOLDER_STORE);
      
      const request = userId 
        ? store.index('userId').getAll(userId)
        : store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async deleteFolder(folderId: string): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // First move all memories in this folder to root
    const memories = await this.getMemoriesInFolder(folderId);
    for (const memory of memories) {
      await this.updateMemory(memory.id, { folderId: null });
    }

    // Move child folders to parent
    const folder = await this.getFolder(folderId);
    if (folder) {
      const childFolders = await this.getChildFolders(folderId);
      for (const childFolder of childFolders) {
        await this.updateFolder(childFolder.id, { parentId: folder.parentId });
      }
    }

    // Delete the folder
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDER_STORE], 'readwrite');
      const store = transaction.objectStore(FOLDER_STORE);
      const request = store.delete(folderId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  async getMemoriesInFolder(folderId: string | null): Promise<Memory[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([MEMORY_STORE], 'readonly');
      const store = transaction.objectStore(MEMORY_STORE);
      const index = store.index('folderId');
      const request = index.getAll(folderId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  async getChildFolders(parentId: string | null): Promise<Folder[]> {
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([FOLDER_STORE], 'readonly');
      const store = transaction.objectStore(FOLDER_STORE);
      const index = store.index('parentId');
      const request = index.getAll(parentId);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result || []);
    });
  }

  // SEARCH OPERATIONS
  async searchMemories(query: string, tags: string[] = []): Promise<Memory[]> {
    const allMemories = await this.getAllMemories();
    const lowerQuery = query.toLowerCase();

    return allMemories.filter(memory => {
      const matchesText = !query || 
        memory.title.toLowerCase().includes(lowerQuery) ||
        memory.content.toLowerCase().includes(lowerQuery);

      const matchesTags = tags.length === 0 ||
        tags.some(tag => memory.tags.some(memoryTag => 
          memoryTag.toLowerCase() === tag.toLowerCase()
        ));

      return matchesText && matchesTags;
    });
  }

  // UTILITY METHODS
  async createDefaultFolders(userId: string): Promise<Folder[]> {
    const defaultFolders = [
      { name: 'Projects', parentId: null, userId },
      { name: 'People', parentId: null, userId },
      { name: 'Facts', parentId: null, userId },
      { name: 'References', parentId: null, userId }
    ];

    const createdFolders: Folder[] = [];
    for (const folderData of defaultFolders) {
      try {
        const folder = await this.saveFolder(folderData);
        createdFolders.push(folder);
      } catch (error) {
        console.error('Error creating default folder:', error);
      }
    }

    return createdFolders;
  }

  async getAllTags(): Promise<string[]> {
    const memories = await this.getAllMemories();
    const tagSet = new Set<string>();
    
    memories.forEach(memory => {
      memory.tags.forEach(tag => tagSet.add(tag));
    });

    return Array.from(tagSet).sort();
  }
}

// Export singleton instance
export const memoryStorage = new MemoryStorage();
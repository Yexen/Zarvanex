// IndexedDB wrapper for memory storage

export interface Memory {
  id: string;
  category: 'personal' | 'work' | 'health' | 'preferences' | 'relationships';
  fact: string;
  confidence: 'high' | 'medium' | 'low';
  created_at: string;
  updated_at: string;
  correction_history?: Array<{
    old_value: string;
    corrected_at: string;
    reason: string;
  }>;
}

export class MemoryDB {
  private dbName = 'zarvanex-memory';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        console.error('[MemoryDB] Failed to open database:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[MemoryDB] Database opened successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create memories object store if it doesn't exist
        if (!db.objectStoreNames.contains('memories')) {
          const objectStore = db.createObjectStore('memories', { keyPath: 'id' });

          // Create indexes for efficient querying
          objectStore.createIndex('category', 'category', { unique: false });
          objectStore.createIndex('created_at', 'created_at', { unique: false });
          objectStore.createIndex('confidence', 'confidence', { unique: false });

          console.log('[MemoryDB] Created memories object store with indexes');
        }
      };
    });
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.init();
    }
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  async saveMemory(memory: Memory): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['memories'], 'readwrite');
        const objectStore = transaction.objectStore('memories');
        const request = objectStore.put(memory);

        request.onsuccess = () => {
          console.log('[MemoryDB] Memory saved:', memory.id);
          resolve();
        };

        request.onerror = () => {
          console.error('[MemoryDB] Failed to save memory:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[MemoryDB] saveMemory error:', error);
      throw error;
    }
  }

  async getAllMemories(): Promise<Memory[]> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['memories'], 'readonly');
        const objectStore = transaction.objectStore('memories');
        const request = objectStore.getAll();

        request.onsuccess = () => {
          const memories = request.result as Memory[];
          // Sort by created_at descending (newest first)
          memories.sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
          console.log('[MemoryDB] Retrieved', memories.length, 'memories');
          resolve(memories);
        };

        request.onerror = () => {
          console.error('[MemoryDB] Failed to get all memories:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[MemoryDB] getAllMemories error:', error);
      return [];
    }
  }

  async getMemoriesByCategory(category: string): Promise<Memory[]> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['memories'], 'readonly');
        const objectStore = transaction.objectStore('memories');
        const index = objectStore.index('category');
        const request = index.getAll(category);

        request.onsuccess = () => {
          const memories = request.result as Memory[];
          console.log('[MemoryDB] Retrieved', memories.length, 'memories for category:', category);
          resolve(memories);
        };

        request.onerror = () => {
          console.error('[MemoryDB] Failed to get memories by category:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[MemoryDB] getMemoriesByCategory error:', error);
      return [];
    }
  }

  async updateMemory(id: string, updates: Partial<Memory>): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['memories'], 'readwrite');
        const objectStore = transaction.objectStore('memories');
        const getRequest = objectStore.get(id);

        getRequest.onsuccess = () => {
          const memory = getRequest.result as Memory;
          if (!memory) {
            reject(new Error(`Memory with id ${id} not found`));
            return;
          }

          // Merge updates
          const updatedMemory: Memory = {
            ...memory,
            ...updates,
            id, // Ensure id doesn't change
            updated_at: new Date().toISOString(),
          };

          const putRequest = objectStore.put(updatedMemory);

          putRequest.onsuccess = () => {
            console.log('[MemoryDB] Memory updated:', id);
            resolve();
          };

          putRequest.onerror = () => {
            console.error('[MemoryDB] Failed to update memory:', putRequest.error);
            reject(putRequest.error);
          };
        };

        getRequest.onerror = () => {
          console.error('[MemoryDB] Failed to get memory for update:', getRequest.error);
          reject(getRequest.error);
        };
      });
    } catch (error) {
      console.error('[MemoryDB] updateMemory error:', error);
      throw error;
    }
  }

  async deleteMemory(id: string): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['memories'], 'readwrite');
        const objectStore = transaction.objectStore('memories');
        const request = objectStore.delete(id);

        request.onsuccess = () => {
          console.log('[MemoryDB] Memory deleted:', id);
          resolve();
        };

        request.onerror = () => {
          console.error('[MemoryDB] Failed to delete memory:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[MemoryDB] deleteMemory error:', error);
      throw error;
    }
  }

  async clearAllMemories(): Promise<void> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['memories'], 'readwrite');
        const objectStore = transaction.objectStore('memories');
        const request = objectStore.clear();

        request.onsuccess = () => {
          console.log('[MemoryDB] All memories cleared');
          resolve();
        };

        request.onerror = () => {
          console.error('[MemoryDB] Failed to clear memories:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[MemoryDB] clearAllMemories error:', error);
      throw error;
    }
  }

  async getMemoryById(id: string): Promise<Memory | null> {
    try {
      const db = await this.ensureDB();

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(['memories'], 'readonly');
        const objectStore = transaction.objectStore('memories');
        const request = objectStore.get(id);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          console.error('[MemoryDB] Failed to get memory by id:', request.error);
          reject(request.error);
        };
      });
    } catch (error) {
      console.error('[MemoryDB] getMemoryById error:', error);
      return null;
    }
  }
}

// Export singleton instance
export const memoryDB = new MemoryDB();

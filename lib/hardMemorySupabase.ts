import { supabase } from '@/lib/supabase';
import type { Memory, Folder } from '@/types/memory';

// Check if Supabase is available
const isSupabaseAvailable = () => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Supabase table types
interface SupabaseMemory {
  id: string;
  user_id: string;
  title: string;
  content: string;
  tags: string[];
  folder_id: string | null;
  conversation_source?: string;
  created_at: string;
  last_accessed: string;
  last_modified: string;
}

interface SupabaseFolder {
  id: string;
  user_id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}

// Convert between our types and Supabase types
function supabaseToMemory(supabaseMemory: SupabaseMemory): Memory {
  return {
    id: supabaseMemory.id,
    title: supabaseMemory.title,
    content: supabaseMemory.content,
    tags: supabaseMemory.tags || [],
    folderId: supabaseMemory.folder_id,
    conversationSource: supabaseMemory.conversation_source,
    createdAt: new Date(supabaseMemory.created_at),
    lastAccessed: new Date(supabaseMemory.last_accessed),
    lastModified: new Date(supabaseMemory.last_modified),
    userId: supabaseMemory.user_id
  };
}

function memoryToSupabase(memory: Omit<Memory, 'id' | 'createdAt' | 'lastAccessed' | 'lastModified'>): Omit<SupabaseMemory, 'id' | 'created_at' | 'last_accessed' | 'last_modified'> {
  return {
    user_id: memory.userId,
    title: memory.title,
    content: memory.content,
    tags: memory.tags,
    folder_id: memory.folderId,
    conversation_source: memory.conversationSource
  };
}

function supabaseToFolder(supabaseFolder: SupabaseFolder): Folder {
  return {
    id: supabaseFolder.id,
    name: supabaseFolder.name,
    parentId: supabaseFolder.parent_id,
    createdAt: new Date(supabaseFolder.created_at),
    userId: supabaseFolder.user_id
  };
}

function folderToSupabase(folder: Omit<Folder, 'id' | 'createdAt'>): Omit<SupabaseFolder, 'id' | 'created_at' | 'updated_at'> {
  return {
    user_id: folder.userId,
    name: folder.name,
    parent_id: folder.parentId
  };
}

export class HardMemorySupabase {
  // MEMORY OPERATIONS
  async saveMemory(memoryData: Omit<Memory, 'id' | 'createdAt' | 'lastAccessed' | 'lastModified'>): Promise<Memory> {
    console.log('🧠 [Supabase] saveMemory called with:', memoryData);
    console.log('🧠 [Supabase] isSupabaseAvailable:', isSupabaseAvailable());
    
    if (!isSupabaseAvailable()) {
      console.warn('🚨 [Supabase] Supabase not configured, throwing error');
      throw new Error('Supabase not configured');
    }
    
    const insertData = memoryToSupabase(memoryData);
    console.log('🧠 [Supabase] Inserting data:', insertData);
    
    const { data, error } = await supabase
      .from('memories')
      .insert(insertData)
      .select()
      .single();

    console.log('🧠 [Supabase] Insert response:', { data, error });

    if (error) {
      console.error('🚨 [Supabase] Error saving memory:', error);
      throw error;
    }

    const result = supabaseToMemory(data);
    console.log('🧠 [Supabase] Converted result:', result);
    return result;
  }

  async updateMemory(memoryId: string, updates: Partial<Memory>): Promise<Memory> {
    const updateData: any = {};
    
    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.content !== undefined) updateData.content = updates.content;
    if (updates.tags !== undefined) updateData.tags = updates.tags;
    if (updates.folderId !== undefined) updateData.folder_id = updates.folderId;
    if (updates.conversationSource !== undefined) updateData.conversation_source = updates.conversationSource;
    
    // Always update last_modified and last_accessed
    updateData.last_modified = new Date().toISOString();
    updateData.last_accessed = new Date().toISOString();

    const { data, error } = await supabase
      .from('memories')
      .update(updateData)
      .eq('id', memoryId)
      .select()
      .single();

    if (error) {
      console.error('Error updating memory in Supabase:', error);
      throw error;
    }

    return supabaseToMemory(data);
  }

  async getMemory(memoryId: string): Promise<Memory | null> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('id', memoryId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error('Error fetching memory from Supabase:', error);
      throw error;
    }

    // Update last_accessed
    await supabase
      .from('memories')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', memoryId);

    return supabaseToMemory(data);
  }

  async getAllMemories(userId: string): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all memories from Supabase:', error);
      throw error;
    }

    return (data || []).map(supabaseToMemory);
  }

  async deleteMemory(memoryId: string): Promise<void> {
    const { error } = await supabase
      .from('memories')
      .delete()
      .eq('id', memoryId);

    if (error) {
      console.error('Error deleting memory from Supabase:', error);
      throw error;
    }
  }

  async getMemoriesInFolder(folderId: string | null, userId: string): Promise<Memory[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId)
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching memories in folder from Supabase:', error);
      throw error;
    }

    return (data || []).map(supabaseToMemory);
  }

  // FOLDER OPERATIONS
  async saveFolder(folderData: Omit<Folder, 'id' | 'createdAt'>): Promise<Folder> {
    const { data, error } = await supabase
      .from('memory_folders')
      .insert(folderToSupabase(folderData))
      .select()
      .single();

    if (error) {
      console.error('Error saving folder to Supabase:', error);
      throw error;
    }

    return supabaseToFolder(data);
  }

  async updateFolder(folderId: string, updates: Partial<Folder>): Promise<Folder> {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.parentId !== undefined) updateData.parent_id = updates.parentId;

    const { data, error } = await supabase
      .from('memory_folders')
      .update(updateData)
      .eq('id', folderId)
      .select()
      .single();

    if (error) {
      console.error('Error updating folder in Supabase:', error);
      throw error;
    }

    return supabaseToFolder(data);
  }

  async getFolder(folderId: string): Promise<Folder | null> {
    const { data, error } = await supabase
      .from('memory_folders')
      .select('*')
      .eq('id', folderId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null;
      }
      console.error('Error fetching folder from Supabase:', error);
      throw error;
    }

    return supabaseToFolder(data);
  }

  async getAllFolders(userId: string): Promise<Folder[]> {
    const { data, error } = await supabase
      .from('memory_folders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching all folders from Supabase:', error);
      throw error;
    }

    return (data || []).map(supabaseToFolder);
  }

  async deleteFolder(folderId: string, userId: string): Promise<void> {
    // First move all memories in this folder to root
    const { error: moveError } = await supabase
      .from('memories')
      .update({ folder_id: null })
      .eq('folder_id', folderId)
      .eq('user_id', userId);

    if (moveError) {
      console.error('Error moving memories to root:', moveError);
      throw moveError;
    }

    // Move child folders to parent
    const folder = await this.getFolder(folderId);
    if (folder) {
      const { error: moveChildrenError } = await supabase
        .from('memory_folders')
        .update({ parent_id: folder.parentId })
        .eq('parent_id', folderId)
        .eq('user_id', userId);

      if (moveChildrenError) {
        console.error('Error moving child folders:', moveChildrenError);
        throw moveChildrenError;
      }
    }

    // Delete the folder
    const { error } = await supabase
      .from('memory_folders')
      .delete()
      .eq('id', folderId);

    if (error) {
      console.error('Error deleting folder from Supabase:', error);
      throw error;
    }
  }

  async getChildFolders(parentId: string | null, userId: string): Promise<Folder[]> {
    const { data, error } = await supabase
      .from('memory_folders')
      .select('*')
      .eq('user_id', userId)
      .eq('parent_id', parentId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching child folders from Supabase:', error);
      throw error;
    }

    return (data || []).map(supabaseToFolder);
  }

  // SEARCH OPERATIONS
  async searchMemories(query: string, tags: string[] = [], userId: string): Promise<Memory[]> {
    let supabaseQuery = supabase
      .from('memories')
      .select('*')
      .eq('user_id', userId);

    // Full-text search on title and content
    if (query.trim()) {
      supabaseQuery = supabaseQuery.textSearch('title,content', query, {
        type: 'websearch',
        config: 'english'
      });
    }

    // Filter by tags if provided
    if (tags.length > 0) {
      supabaseQuery = supabaseQuery.overlaps('tags', tags);
    }

    const { data, error } = await supabaseQuery.order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching memories in Supabase:', error);
      throw error;
    }

    return (data || []).map(supabaseToMemory);
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

  async getAllTags(userId: string): Promise<string[]> {
    const { data, error } = await supabase
      .from('memories')
      .select('tags')
      .eq('user_id', userId);

    if (error) {
      console.error('Error fetching tags from Supabase:', error);
      return [];
    }

    const tagSet = new Set<string>();
    (data || []).forEach((memory: any) => {
      if (memory.tags && Array.isArray(memory.tags)) {
        memory.tags.forEach((tag: string) => tagSet.add(tag));
      }
    });

    return Array.from(tagSet).sort();
  }

  // SYNC OPERATIONS (for syncing with IndexedDB)
  async syncToSupabase(memories: Memory[], folders: Folder[]): Promise<void> {
    try {
      // Sync folders first (due to foreign key constraints)
      for (const folder of folders) {
        const existing = await this.getFolder(folder.id);
        if (!existing) {
          await this.saveFolder({
            name: folder.name,
            parentId: folder.parentId,
            userId: folder.userId
          });
        }
      }

      // Sync memories
      for (const memory of memories) {
        const existing = await this.getMemory(memory.id);
        if (!existing) {
          await this.saveMemory({
            title: memory.title,
            content: memory.content,
            tags: memory.tags,
            folderId: memory.folderId,
            conversationSource: memory.conversationSource,
            userId: memory.userId
          });
        }
      }
    } catch (error) {
      console.error('Error syncing to Supabase:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const hardMemorySupabase = new HardMemorySupabase();
// FULL IMPLEMENTATION - Rename this to route.ts once Supabase is configured
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hardMemorySupabase } from '@/lib/hardMemorySupabase';

// Initialize Supabase client only if environment variables are available
const getSupabaseClient = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !serviceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(url, serviceKey);
};

// Helper to get user ID from request
async function getUserId(request: NextRequest): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);
    
    if (error || !user) {
      return null;
    }

    return user.id;
  } catch (error) {
    console.error('Error getting user ID:', error);
    return null;
  }
}

// GET /api/memories - Search and retrieve memories
export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';
    const tags = searchParams.get('tags')?.split(',').filter(Boolean) || [];
    const limit = parseInt(searchParams.get('limit') || '10');

    let memories;
    if (query || tags.length > 0) {
      // Search memories
      memories = await hardMemorySupabase.searchMemories(query, tags, userId);
    } else {
      // Get all memories
      memories = await hardMemorySupabase.getAllMemories(userId);
    }

    // Limit results
    const limitedMemories = memories.slice(0, limit);

    return NextResponse.json({
      memories: limitedMemories,
      count: limitedMemories.length,
      total: memories.length,
      query,
      tags
    });
  } catch (error) {
    console.error('Error in GET /api/memories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/memories - Create new memory
export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { title, content, tags = [], folderId = null, conversationSource } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const memory = await hardMemorySupabase.saveMemory({
      title: title.trim(),
      content: content || '',
      tags: Array.isArray(tags) ? tags : [],
      folderId,
      conversationSource,
      userId
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/memories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT /api/memories - Update memory
export async function PUT(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, ...updates } = body;

    if (!id) {
      return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existingMemory = await hardMemorySupabase.getMemory(id);
    if (!existingMemory || existingMemory.userId !== userId) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    const memory = await hardMemorySupabase.updateMemory(id, updates);

    return NextResponse.json({ memory });
  } catch (error) {
    console.error('Error in PUT /api/memories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/memories - Delete memory
export async function DELETE(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const memoryId = searchParams.get('id');

    if (!memoryId) {
      return NextResponse.json({ error: 'Memory ID is required' }, { status: 400 });
    }

    // Verify ownership
    const existingMemory = await hardMemorySupabase.getMemory(memoryId);
    if (!existingMemory || existingMemory.userId !== userId) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    await hardMemorySupabase.deleteMemory(memoryId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in DELETE /api/memories:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
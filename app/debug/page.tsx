'use client';

import { useState, useEffect } from 'react';
import { memoryDB, Memory } from '@/lib/db/memoryDB';
import { getMemoryStats } from '@/lib/memory/formatter';
import { extractionTrigger } from '@/lib/memory/extractionTrigger';

export default function MemoryDebugPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [testResult, setTestResult] = useState<string>('');

  useEffect(() => {
    loadMemories();
  }, []);

  async function loadMemories() {
    setLoading(true);
    try {
      await memoryDB.init(); // Ensure DB is initialized
      const allMemories = await memoryDB.getAllMemories();
      setMemories(allMemories);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function clearAll() {
    if (confirm('Delete all memories? This cannot be undone.')) {
      try {
        await memoryDB.clearAllMemories();
        await loadMemories();
        alert('All memories cleared');
      } catch (error) {
        alert('Failed to clear memories: ' + error);
      }
    }
  }

  async function deleteMemory(id: string) {
    if (confirm('Delete this memory?')) {
      try {
        await memoryDB.deleteMemory(id);
        await loadMemories();
      } catch (error) {
        alert('Failed to delete memory: ' + error);
      }
    }
  }

  async function testExtraction() {
    setTestResult('Running test extraction...');

    const testMessages = [
      { role: 'user', content: 'My name is Alex and I live in San Francisco' },
      { role: 'assistant', content: 'Nice to meet you, Alex! How is life in San Francisco?' },
      { role: 'user', content: 'I work as a software engineer at Google' },
      { role: 'assistant', content: 'That sounds great! What kind of projects do you work on?' },
    ];

    try {
      const result = await extractionTrigger.manualExtraction('test-conversation', testMessages);
      setTestResult(`Test complete! Added: ${result.added}, Corrected: ${result.corrected}`);
      await loadMemories();
    } catch (error) {
      setTestResult('Test failed: ' + error);
    }
  }

  const filteredMemories =
    selectedCategory === 'all'
      ? memories
      : memories.filter((m) => m.category === selectedCategory);

  const stats = getMemoryStats(memories);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
        <div className="text-xl">Loading memories...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2" style={{ color: '#14b8a6' }}>
            Memory System Debug
          </h1>
          <p className="text-gray-400">
            View and manage memories extracted from conversations
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#14b8a6]/20">
            <div className="text-gray-400 text-sm">Total</div>
            <div className="text-2xl font-bold" style={{ color: '#14b8a6' }}>
              {stats.total}
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#14b8a6]/20">
            <div className="text-gray-400 text-sm">Recent (7 days)</div>
            <div className="text-2xl font-bold text-white">
              {stats.recentCount}
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#14b8a6]/20">
            <div className="text-gray-400 text-sm">High Confidence</div>
            <div className="text-2xl font-bold text-green-400">
              {stats.byConfidence.high}
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#14b8a6]/20">
            <div className="text-gray-400 text-sm">Medium</div>
            <div className="text-2xl font-bold text-yellow-400">
              {stats.byConfidence.medium}
            </div>
          </div>
          <div className="bg-[#1a1a1a] p-4 rounded-lg border border-[#14b8a6]/20">
            <div className="text-gray-400 text-sm">Low</div>
            <div className="text-2xl font-bold text-orange-400">
              {stats.byConfidence.low}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={loadMemories}
            className="px-4 py-2 rounded-lg border border-[#14b8a6] text-[#14b8a6] hover:bg-[#14b8a6]/10 transition"
          >
            Refresh
          </button>
          <button
            onClick={testExtraction}
            className="px-4 py-2 rounded-lg bg-[#14b8a6] text-black font-medium hover:bg-[#14b8a6]/90 transition"
          >
            Test Extraction
          </button>
          <button
            onClick={clearAll}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 transition"
          >
            Clear All Memories
          </button>
        </div>

        {testResult && (
          <div className="mb-6 p-4 bg-[#14b8a6]/10 border border-[#14b8a6] rounded-lg">
            <div className="text-sm font-mono">{testResult}</div>
          </div>
        )}

        {/* Category Filter */}
        <div className="flex gap-2 mb-6">
          {['all', 'personal', 'work', 'health', 'preferences', 'relationships'].map(
            (cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-lg border transition ${
                  selectedCategory === cat
                    ? 'bg-[#14b8a6] text-black border-[#14b8a6]'
                    : 'border-[#14b8a6]/30 text-gray-400 hover:border-[#14b8a6]'
                }`}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                {cat !== 'all' && stats.byCategory[cat] > 0 && (
                  <span className="ml-2 text-xs">({stats.byCategory[cat]})</span>
                )}
              </button>
            )
          )}
        </div>

        {/* Memories List */}
        <div className="space-y-4">
          {filteredMemories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">🧠</div>
              <div className="text-xl">No memories yet</div>
              <div className="text-sm mt-2">
                Have a conversation and memories will be automatically extracted
              </div>
            </div>
          ) : (
            filteredMemories.map((mem) => (
              <div
                key={mem.id}
                className="bg-[#1a1a1a] border border-[#14b8a6]/20 p-4 rounded-lg hover:border-[#14b8a6]/50 transition"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className="px-2 py-1 rounded text-xs font-medium"
                        style={{
                          background: '#14b8a6',
                          color: '#000',
                        }}
                      >
                        {mem.category}
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          mem.confidence === 'high'
                            ? 'bg-green-900 text-green-300'
                            : mem.confidence === 'medium'
                            ? 'bg-yellow-900 text-yellow-300'
                            : 'bg-orange-900 text-orange-300'
                        }`}
                      >
                        {mem.confidence}
                      </span>
                    </div>
                    <div className="text-white mb-2">{mem.fact}</div>
                    <div className="text-xs text-gray-500">
                      Created: {new Date(mem.created_at).toLocaleString()} |
                      Updated: {new Date(mem.updated_at).toLocaleString()}
                    </div>
                    {mem.correction_history && mem.correction_history.length > 0 && (
                      <div className="mt-2 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded">
                        <div className="text-xs text-yellow-400 font-medium mb-1">
                          Corrected {mem.correction_history.length} time(s):
                        </div>
                        {mem.correction_history.map((correction, idx) => (
                          <div key={idx} className="text-xs text-gray-400 ml-2">
                            • {correction.old_value} → {mem.fact} (
                            {new Date(correction.corrected_at).toLocaleDateString()})
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => deleteMemory(mem.id)}
                    className="ml-4 p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition"
                    title="Delete memory"
                  >
                    <svg
                      width="16"
                      height="16"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

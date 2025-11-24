/**
 * Semantic Cache Implementation for Zurvanex
 * 3-tier caching: In-Memory LRU → IndexedDB → LSH Similarity
 * Expected: 70-80% cache hit rate, <200ms response time
 */

import type { IntentType } from '../intentClassifier';

// Configuration
const CONFIG = {
  memorySize: 100,           // Tier 1: in-memory entries
  indexedDBSize: 10000,      // Tier 2: persistent entries
  similarityThreshold: 0.88, // How similar = cache hit
  defaultTTL: 3600000,       // 1 hour
  factualTTL: 86400000,      // 24 hours (factual queries stable)
  narrativeTTL: 1800000,     // 30 min (narrative may need freshness)
};

// Cache Entry Structure
export interface CacheEntry {
  id: string;
  originalQuery: string;
  normalizedQuery: string;
  queryEmbedding: number[];
  intent: IntentType;

  results: {
    systemPrompt: string;
    chunks: any[];
    entities: any[];
  };

  createdAt: number;
  hitCount: number;
  confidence: number;
  ttl: number;
}

interface LSHBucket {
  hash: string;
  entries: string[];
}

// Tier 1: In-Memory LRU Cache
class LRUCache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    const item = this.cache.get(key);
    if (item) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: string, value: T): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Main Semantic Cache Class
export class SemanticCache {
  private memoryCache: LRUCache<CacheEntry>;
  private db: IDBDatabase | null = null;
  private lshIndex: Map<string, string[]> = new Map();
  private lshPlanes: number[][] | null = null;
  private readonly LSH_PLANES = 12;
  public initialized = false;

  constructor() {
    this.memoryCache = new LRUCache(CONFIG.memorySize);
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('zurvanex-cache', 1);

      request.onerror = () => reject(request.error);

      request.onsuccess = async () => {
        this.db = request.result;
        await this.loadLSHIndex();
        this.initialized = true;
        console.log('[SemanticCache] Initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Cache entries store
        if (!db.objectStoreNames.contains('cacheEntries')) {
          const cacheStore = db.createObjectStore('cacheEntries', { keyPath: 'id' });
          cacheStore.createIndex('byCreatedAt', 'createdAt');
          cacheStore.createIndex('byNormalizedQuery', 'normalizedQuery');
        }

        // LSH buckets store
        if (!db.objectStoreNames.contains('lshBuckets')) {
          db.createObjectStore('lshBuckets', { keyPath: 'hash' });
        }
      };
    });
  }

  // ============================================
  // MAIN LOOKUP METHOD
  // ============================================

  async lookup(
    query: string,
    queryEmbedding?: number[]
  ): Promise<{ hit: boolean; entry?: CacheEntry; tier?: number }> {
    if (!this.initialized) {
      await this.initialize();
    }

    const normalizedQuery = this.normalizeQuery(query);
    const queryHash = await this.hashQuery(normalizedQuery);

    // Tier 1: Exact match in memory
    const memoryHit = this.memoryCache.get(queryHash);
    if (memoryHit && !this.isExpired(memoryHit)) {
      memoryHit.hitCount++;
      console.log('[SemanticCache] Tier 1 hit (memory)');
      return { hit: true, entry: memoryHit, tier: 1 };
    }

    // Tier 2: Exact match in IndexedDB
    const dbHit = await this.getFromDB(queryHash);
    if (dbHit && !this.isExpired(dbHit)) {
      dbHit.hitCount++;
      this.memoryCache.set(queryHash, dbHit); // Promote to memory
      await this.putToDB(dbHit);
      console.log('[SemanticCache] Tier 2 hit (IndexedDB)');
      return { hit: true, entry: dbHit, tier: 2 };
    }

    // Tier 3: Semantic similarity via LSH
    if (queryEmbedding) {
      const similarEntry = await this.findSimilar(queryEmbedding);
      if (similarEntry && !this.isExpired(similarEntry)) {
        similarEntry.hitCount++;
        this.memoryCache.set(queryHash, similarEntry); // Cache under new key too
        console.log('[SemanticCache] Tier 3 hit (LSH similarity)');
        return { hit: true, entry: similarEntry, tier: 3 };
      }
    }

    console.log('[SemanticCache] Cache miss');
    return { hit: false };
  }

  // ============================================
  // CACHE STORAGE
  // ============================================

  async store(
    query: string,
    queryEmbedding: number[],
    intent: IntentType,
    results: CacheEntry['results'],
    confidence: number
  ): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }

    const normalizedQuery = this.normalizeQuery(query);
    const queryHash = await this.hashQuery(normalizedQuery);

    const entry: CacheEntry = {
      id: queryHash,
      originalQuery: query,
      normalizedQuery,
      queryEmbedding,
      intent,
      results,
      createdAt: Date.now(),
      hitCount: 0,
      confidence,
      ttl: this.getTTLForIntent(intent),
    };

    // Store in memory
    this.memoryCache.set(queryHash, entry);

    // Store in IndexedDB
    await this.putToDB(entry);

    // Update LSH index
    await this.addToLSHIndex(queryEmbedding, queryHash);

    // Prune if over size limit
    await this.pruneIfNeeded();

    console.log('[SemanticCache] Stored new entry:', { query: normalizedQuery, intent });
  }

  // ============================================
  // LSH (Locality-Sensitive Hashing)
  // ============================================

  private initializeLSHPlanes(dimensions: number): void {
    // Generate random hyperplanes once
    this.lshPlanes = Array(this.LSH_PLANES).fill(null).map(() =>
      Array(dimensions).fill(0).map(() => Math.random() - 0.5)
    );
  }

  private computeLSHHash(embedding: number[]): string {
    if (!this.lshPlanes) {
      this.initializeLSHPlanes(embedding.length);
    }

    // For each hyperplane, determine which side the vector is on
    const bits = this.lshPlanes!.map(plane => {
      const dot = embedding.reduce((sum, val, i) => sum + val * plane[i], 0);
      return dot >= 0 ? '1' : '0';
    });

    return bits.join('');
  }

  private async addToLSHIndex(embedding: number[], entryId: string): Promise<void> {
    const hash = this.computeLSHHash(embedding);

    // Update in-memory index
    const existing = this.lshIndex.get(hash) || [];
    if (!existing.includes(entryId)) {
      existing.push(entryId);
      this.lshIndex.set(hash, existing);
    }

    // Persist to IndexedDB
    await this.putLSHBucket({ hash, entries: existing });
  }

  private async findSimilar(queryEmbedding: number[]): Promise<CacheEntry | null> {
    const hash = this.computeLSHHash(queryEmbedding);

    // Get candidates from same bucket
    const candidateIds = this.lshIndex.get(hash) || [];

    // Also check neighboring buckets (1-bit difference)
    for (let i = 0; i < hash.length; i++) {
      const neighborHash = hash.slice(0, i) +
        (hash[i] === '0' ? '1' : '0') +
        hash.slice(i + 1);
      const neighborIds = this.lshIndex.get(neighborHash) || [];
      candidateIds.push(...neighborIds);
    }

    // Deduplicate
    const uniqueIds = [...new Set(candidateIds)];

    // Find best match above threshold
    let bestMatch: CacheEntry | null = null;
    let bestSimilarity = CONFIG.similarityThreshold;

    for (const id of uniqueIds) {
      const entry = await this.getFromDB(id);
      if (entry) {
        const similarity = this.cosineSimilarity(queryEmbedding, entry.queryEmbedding);
        if (similarity > bestSimilarity) {
          bestSimilarity = similarity;
          bestMatch = entry;
        }
      }
    }

    if (bestMatch) {
      console.log('[SemanticCache] Found similar query:', {
        similarity: bestSimilarity.toFixed(3),
        original: bestMatch.originalQuery
      });
    }

    return bestMatch;
  }

  // ============================================
  // INVALIDATION
  // ============================================

  async invalidateByEntity(entityName: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cacheEntries'], 'readwrite');
      const store = tx.objectStore('cacheEntries');
      const request = store.openCursor();

      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          const mentionsEntity = entry.results.entities?.some(
            (e: any) => e.entity?.toLowerCase() === entityName.toLowerCase()
          );
          if (mentionsEntity) {
            await cursor.delete();
            console.log('[SemanticCache] Invalidated entry mentioning:', entityName);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async invalidateByChunk(chunkId: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cacheEntries'], 'readwrite');
      const store = tx.objectStore('cacheEntries');
      const request = store.openCursor();

      request.onsuccess = async (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const entry = cursor.value as CacheEntry;
          const usesChunk = entry.results.chunks?.some((c: any) => c.id === chunkId);
          if (usesChunk) {
            await cursor.delete();
            console.log('[SemanticCache] Invalidated entry using chunk:', chunkId);
          }
          cursor.continue();
        } else {
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  async invalidateAll(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cacheEntries', 'lshBuckets'], 'readwrite');

      const clearEntries = tx.objectStore('cacheEntries').clear();
      const clearBuckets = tx.objectStore('lshBuckets').clear();

      tx.oncomplete = () => {
        this.lshIndex.clear();
        this.memoryCache.clear();
        console.log('[SemanticCache] All cache cleared');
        resolve();
      };

      tx.onerror = () => reject(tx.error);
    });
  }

  // ============================================
  // STATISTICS
  // ============================================

  async getStats(): Promise<{
    entries: number;
    memoryEntries: number;
    oldestEntry: number;
    newestEntry: number;
  }> {
    if (!this.db) {
      return { entries: 0, memoryEntries: 0, oldestEntry: 0, newestEntry: 0 };
    }

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cacheEntries'], 'readonly');
      const store = tx.objectStore('cacheEntries');
      const countRequest = store.count();

      countRequest.onsuccess = () => {
        const count = countRequest.result;

        // Get oldest and newest entries
        const index = store.index('byCreatedAt');
        const oldestRequest = index.openCursor(null, 'next');
        const newestRequest = index.openCursor(null, 'prev');

        let oldest = 0;
        let newest = 0;

        oldestRequest.onsuccess = (e) => {
          const cursor = (e.target as IDBRequest).result;
          if (cursor) {
            oldest = (cursor.value as CacheEntry).createdAt;
          }

          newestRequest.onsuccess = (e2) => {
            const cursor2 = (e2.target as IDBRequest).result;
            if (cursor2) {
              newest = (cursor2.value as CacheEntry).createdAt;
            }

            resolve({
              entries: count,
              memoryEntries: this.memoryCache.has.length || 0,
              oldestEntry: oldest,
              newestEntry: newest
            });
          };
        };
      };

      countRequest.onerror = () => reject(countRequest.error);
    });
  }

  // ============================================
  // HELPERS
  // ============================================

  private normalizeQuery(query: string): string {
    return query
      .toLowerCase()
      .replace(/[^\w\s]/g, '')    // Remove punctuation
      .replace(/\s+/g, ' ')       // Normalize whitespace
      .trim();
  }

  private async hashQuery(normalized: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() > entry.createdAt + entry.ttl;
  }

  private getTTLForIntent(intent: IntentType): number {
    switch (intent) {
      case 'FACTUAL':
        return CONFIG.factualTTL;      // 24 hours - facts don't change often
      case 'NARRATIVE':
        return CONFIG.narrativeTTL;    // 30 min - stories might get updates
      case 'EMOTIONAL':
        return CONFIG.narrativeTTL;    // 30 min - feelings change
      default:
        return CONFIG.defaultTTL;      // 1 hour
    }
  }

  private async pruneIfNeeded(): Promise<void> {
    if (!this.db) return;

    const count = await this.countEntries();
    if (count > CONFIG.indexedDBSize) {
      // Delete oldest 10%
      const deleteCount = Math.floor(CONFIG.indexedDBSize * 0.1);

      return new Promise((resolve, reject) => {
        const tx = this.db!.transaction(['cacheEntries'], 'readwrite');
        const store = tx.objectStore('cacheEntries');
        const index = store.index('byCreatedAt');
        const request = index.openCursor();
        let deleted = 0;

        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest).result;
          if (cursor && deleted < deleteCount) {
            cursor.delete();
            deleted++;
            cursor.continue();
          } else {
            console.log(`[SemanticCache] Pruned ${deleted} old entries`);
            resolve();
          }
        };

        request.onerror = () => reject(request.error);
      });
    }
  }

  private async loadLSHIndex(): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['lshBuckets'], 'readonly');
      const store = tx.objectStore('lshBuckets');
      const request = store.openCursor();

      request.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          const bucket = cursor.value as LSHBucket;
          this.lshIndex.set(bucket.hash, bucket.entries);
          cursor.continue();
        } else {
          console.log(`[SemanticCache] Loaded ${this.lshIndex.size} LSH buckets`);
          resolve();
        }
      };

      request.onerror = () => reject(request.error);
    });
  }

  // IndexedDB helpers
  private async getFromDB(id: string): Promise<CacheEntry | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cacheEntries'], 'readonly');
      const store = tx.objectStore('cacheEntries');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  private async putToDB(entry: CacheEntry): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cacheEntries'], 'readwrite');
      const store = tx.objectStore('cacheEntries');
      const request = store.put(entry);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async putLSHBucket(bucket: LSHBucket): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['lshBuckets'], 'readwrite');
      const store = tx.objectStore('lshBuckets');
      const request = store.put(bucket);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  private async countEntries(): Promise<number> {
    if (!this.db) return 0;

    return new Promise((resolve, reject) => {
      const tx = this.db!.transaction(['cacheEntries'], 'readonly');
      const store = tx.objectStore('cacheEntries');
      const request = store.count();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton export
export const semanticCache = new SemanticCache();

/**
 * In-memory cache adapter implementation
 */

import { Buffer } from "node:buffer";

import type { CacheAdapter, CacheConfig, CacheEntry, CacheKey, CacheOptions, CacheStats, CacheValue } from "../types";

import { compressData, decompressData, shouldCompress } from "../compression";

export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<CacheKey, CacheEntry>();
  private accessOrder = new Map<CacheKey, number>(); // For LRU tracking
  private cacheStats = {
    hits: 0,
    misses: 0,
    keys: 0,
    memory: 0,
    uptime: Date.now(),
    evictions: 0,
  };

  private accessCounter = 0;

  constructor(private config: CacheConfig) {
    // Start periodic cleanup
    this.startCleanup();
  }

  async get<T = CacheValue>(key: CacheKey): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.cacheStats.misses++;
      this.cacheStats.keys--;
      return null;
    }

    // Update access order for LRU
    this.updateAccessOrder(key);

    this.cacheStats.hits++;

    // Handle decompression if needed
    if (entry.compressed && Buffer.isBuffer(entry.value)) {
      try {
        const decompressed = await decompressData(entry.value, true);
        return JSON.parse(decompressed.data) as T;
      } catch (error) {
        console.error("Decompression failed:", error);
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.cacheStats.misses++;
        this.cacheStats.keys--;
        return null;
      }
    }

    return entry.value as T;
  }

  async set<T = CacheValue>(key: CacheKey, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl ?? this.config.defaultTtl;

    // Serialize value to string for compression
    const serializedValue = JSON.stringify(value);

    let entry: CacheEntry<T>;

    // Apply compression if enabled and data is large enough
    if (this.config.enableCompression && shouldCompress(serializedValue)) {
      try {
        const compressionResult = await compressData(serializedValue);

        entry = {
          value: compressionResult.data as any, // Store compressed buffer
          ttl,
          createdAt: Date.now(),
          tags: options.tags,
          compressed: true,
          originalSize: compressionResult.originalSize,
          compressedSize: compressionResult.compressedSize,
        };
      } catch (error) {
        console.warn("Compression failed, storing uncompressed:", error);
        entry = {
          value,
          ttl,
          createdAt: Date.now(),
          tags: options.tags,
          compressed: false,
        };
      }
    } else {
      entry = {
        value,
        ttl,
        createdAt: Date.now(),
        tags: options.tags,
        compressed: false,
      };
    }

    // Check if key already exists to maintain accurate key count
    const exists = this.cache.has(key);
    if (!exists) {
      this.cacheStats.keys++;
    }

    this.cache.set(key, entry as CacheEntry);
    this.updateAccessOrder(key);

    // Check if we need to evict entries
    await this.checkAndEvict();

    this.updateMemoryStats();
  }

  async del(key: CacheKey): Promise<boolean> {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.cacheStats.keys--;
      this.updateMemoryStats();
    }
    return deleted;
  }

  async delMany(keys: CacheKey[]): Promise<number> {
    let deletedCount = 0;
    for (const key of keys) {
      if (this.cache.delete(key)) {
        deletedCount++;
        this.cacheStats.keys--;
      }
    }
    this.updateMemoryStats();
    return deletedCount;
  }

  async exists(key: CacheKey): Promise<boolean> {
    const entry = this.cache.get(key);
    if (!entry)
      return false;

    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.cacheStats.keys--;
      return false;
    }

    return true;
  }

  async getMany<T = CacheValue>(keys: CacheKey[]): Promise<(T | null)[]> {
    const results: (T | null)[] = [];

    for (const key of keys) {
      const value = await this.get<T>(key);
      results.push(value);
    }

    return results;
  }

  async setMany<T = CacheValue>(entries: Array<{ key: CacheKey; value: T; options?: CacheOptions }>): Promise<void> {
    for (const { key, value, options } of entries) {
      await this.set(key, value, options);
    }
  }

  async clear(): Promise<void> {
    this.cache.clear();
    this.cacheStats.keys = 0;
    this.cacheStats.memory = 0;
  }

  async stats(): Promise<CacheStats> {
    // Clean up expired entries
    await this.cleanupExpired();

    return {
      ...this.cacheStats,
      uptime: Date.now() - this.cacheStats.uptime,
    };
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    let deletedCount = 0;
    const keysToDelete: CacheKey[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags && entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      if (this.cache.delete(key)) {
        deletedCount++;
        this.cacheStats.keys--;
      }
    }

    this.updateMemoryStats();
    return deletedCount;
  }

  async close(): Promise<void> {
    this.cache.clear();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      keys: 0,
      memory: 0,
      uptime: Date.now(),
      evictions: 0,
    };
  }

  private isExpired(entry: CacheEntry): boolean {
    const now = Date.now();
    const expirationTime = entry.createdAt + (entry.ttl * 1000);
    return now > expirationTime;
  }

  private async cleanupExpired(): Promise<void> {
    const keysToDelete: CacheKey[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
      this.cacheStats.keys--;
    }

    this.updateMemoryStats();
  }

  private updateMemoryStats(): void {
    // Estimate memory usage (rough calculation)
    let memory = 0;
    for (const [key, entry] of this.cache.entries()) {
      memory += key.length * 2; // String length * 2 bytes per char
      memory += JSON.stringify(entry).length * 2;
    }
    this.cacheStats.memory = memory;
  }

  /**
   * Update access order for LRU tracking
   */
  private updateAccessOrder(key: CacheKey): void {
    this.accessCounter++;
    this.accessOrder.set(key, this.accessCounter);
  }

  /**
   * Check if we need to evict entries based on size limits
   */
  private async checkAndEvict(): Promise<void> {
    const maxKeys = this.config.maxKeys || 10000;
    const maxMemory = this.config.maxMemory || 100 * 1024 * 1024; // 100MB

    // Evict by key count
    if (this.cache.size > maxKeys) {
      await this.evictByCount(maxKeys);
    }

    // Evict by memory usage
    if (this.cacheStats.memory > maxMemory) {
      await this.evictByMemory(maxMemory);
    }
  }

  /**
   * Evict entries by count using LRU policy
   */
  private async evictByCount(maxKeys: number): Promise<void> {
    const toEvict = this.cache.size - maxKeys;
    if (toEvict <= 0)
      return;

    // Sort by access order (LRU first)
    const sortedKeys = Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([key]) => key);

    for (let i = 0; i < toEvict; i++) {
      const key = sortedKeys[i];
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.cacheStats.keys--;
      this.cacheStats.evictions++;
    }

    console.warn(`Evicted ${toEvict} entries due to key count limit`);
  }

  /**
   * Evict entries by memory usage using LRU policy
   */
  private async evictByMemory(maxMemory: number): Promise<void> {
    const targetMemory = maxMemory * 0.8; // Evict to 80% of limit

    // Sort by access order (LRU first)
    const sortedKeys = Array.from(this.accessOrder.entries())
      .sort(([, a], [, b]) => a - b)
      .map(([key]) => key);

    let evictedCount = 0;
    for (const key of sortedKeys) {
      if (this.cacheStats.memory <= targetMemory)
        break;

      const entry = this.cache.get(key);
      if (entry) {
        const entrySize = key.length * 2 + JSON.stringify(entry).length * 2;
        this.cache.delete(key);
        this.accessOrder.delete(key);
        this.cacheStats.keys--;
        this.cacheStats.memory -= entrySize;
        this.cacheStats.evictions++;
        evictedCount++;
      }
    }

    if (evictedCount > 0) {
      console.warn(`Evicted ${evictedCount} entries due to memory limit`);
    }
  }

  /**
   * Start periodic cleanup
   */
  private startCleanup(): void {
    setInterval(() => {
      this.cleanupExpired();
    }, 60000); // Cleanup every minute
  }
}

/**
 * In-memory cache adapter implementation
 */

import type { CacheAdapter, CacheConfig, CacheEntry, CacheKey, CacheOptions, CacheStats, CacheValue } from "../types";

export class MemoryCacheAdapter implements CacheAdapter {
  private cache = new Map<CacheKey, CacheEntry>();
  private cacheStats = {
    hits: 0,
    misses: 0,
    keys: 0,
    memory: 0,
    uptime: Date.now(),
  };

  constructor(private config: CacheConfig) {}

  async get<T = CacheValue>(key: CacheKey): Promise<T | null> {
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheStats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.cacheStats.misses++;
      this.cacheStats.keys--;
      return null;
    }

    this.cacheStats.hits++;
    return entry.value as T;
  }

  async set<T = CacheValue>(key: CacheKey, value: T, options: CacheOptions = {}): Promise<void> {
    const ttl = options.ttl ?? this.config.defaultTtl;
    const entry: CacheEntry<T> = {
      value,
      ttl,
      createdAt: Date.now(),
      tags: options.tags,
    };

    // Check if key already exists to maintain accurate key count
    const exists = this.cache.has(key);
    if (!exists) {
      this.cacheStats.keys++;
    }

    this.cache.set(key, entry as CacheEntry);
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
}

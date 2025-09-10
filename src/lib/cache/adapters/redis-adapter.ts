/**
 * Redis cache adapter implementation
 */

import env from "@/env";

import type { CacheAdapter, CacheConfig, CacheKey, CacheOptions, CacheStats, CacheValue } from "../types";

export class RedisCacheAdapter implements CacheAdapter {
  private client: any; // Redis client
  private cacheStats = {
    hits: 0,
    misses: 0,
    keys: 0,
    memory: 0,
    uptime: Date.now(),
  };

  constructor(
    private config: CacheConfig,
    private redisUrl?: string,
  ) {
    this.initializeRedis();
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Dynamic import to avoid requiring Redis in environments where it's not available
      const { createClient } = await import("redis");

      this.client = createClient({
        url: this.redisUrl || env.REDIS_URL || "redis://localhost:6379",
      });

      this.client.on("error", (err: Error) => {
        console.error("Redis Client Error:", err);
      });

      await this.client.connect();
    }
    catch (error) {
      console.warn("Redis not available, falling back to memory cache:", error);
      throw new Error("Redis connection failed");
    }
  }

  async get<T = CacheValue>(key: CacheKey): Promise<T | null> {
    try {
      const fullKey = this.getFullKey(key);
      const value = await this.client.get(fullKey);

      if (value === null) {
        this.cacheStats.misses++;
        return null;
      }

      this.cacheStats.hits++;
      return JSON.parse(value) as T;
    }
    catch (error) {
      console.error("Redis get error:", error);
      this.cacheStats.misses++;
      return null;
    }
  }

  async set<T = CacheValue>(key: CacheKey, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const fullKey = this.getFullKey(key);
      const ttl = options.ttl ?? this.config.defaultTtl;
      const serializedValue = JSON.stringify(value);

      await this.client.setEx(fullKey, ttl, serializedValue);

      // Add tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.addTagsToKey(fullKey, options.tags);
      }

      this.cacheStats.keys++;
    }
    catch (error) {
      console.error("Redis set error:", error);
      throw error;
    }
  }

  async del(key: CacheKey): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.del(fullKey);

      if (result > 0) {
        this.cacheStats.keys--;
        // Clean up tags
        await this.removeTagsFromKey(fullKey);
      }

      return result > 0;
    }
    catch (error) {
      console.error("Redis del error:", error);
      return false;
    }
  }

  async delMany(keys: CacheKey[]): Promise<number> {
    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const result = await this.client.del(fullKeys);

      this.cacheStats.keys -= result;

      // Clean up tags for deleted keys
      for (const key of fullKeys) {
        await this.removeTagsFromKey(key);
      }

      return result;
    }
    catch (error) {
      console.error("Redis delMany error:", error);
      return 0;
    }
  }

  async exists(key: CacheKey): Promise<boolean> {
    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.exists(fullKey);
      return result === 1;
    }
    catch (error) {
      console.error("Redis exists error:", error);
      return false;
    }
  }

  async getMany<T = CacheValue>(keys: CacheKey[]): Promise<(T | null)[]> {
    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const values = await this.client.mGet(fullKeys);

      return values.map((value: string | null) => {
        if (value === null) {
          this.cacheStats.misses++;
          return null;
        }

        this.cacheStats.hits++;
        return JSON.parse(value) as T;
      });
    }
    catch (error) {
      console.error("Redis getMany error:", error);
      return keys.map(() => null);
    }
  }

  async setMany<T = CacheValue>(entries: Array<{ key: CacheKey; value: T; options?: CacheOptions }>): Promise<void> {
    try {
      const pipeline = this.client.multi();

      for (const { key, value, options } of entries) {
        const fullKey = this.getFullKey(key);
        const ttl = options?.ttl ?? this.config.defaultTtl;
        const serializedValue = JSON.stringify(value);

        pipeline.setEx(fullKey, ttl, serializedValue);

        if (options?.tags && options.tags.length > 0) {
          pipeline.sAdd(`tags:${fullKey}`, options.tags);
        }
      }

      await pipeline.exec();
      this.cacheStats.keys += entries.length;
    }
    catch (error) {
      console.error("Redis setMany error:", error);
      throw error;
    }
  }

  async clear(): Promise<void> {
    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      this.cacheStats.keys = 0;
    }
    catch (error) {
      console.error("Redis clear error:", error);
      throw error;
    }
  }

  async stats(): Promise<CacheStats> {
    try {
      const info = await this.client.info("memory");
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memory = memoryMatch ? Number.parseInt(memoryMatch[1], 10) : 0;

      return {
        ...this.cacheStats,
        memory,
        uptime: Date.now() - this.cacheStats.uptime,
      };
    }
    catch (error) {
      console.error("Redis stats error:", error);
      return {
        ...this.cacheStats,
        uptime: Date.now() - this.cacheStats.uptime,
      };
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let deletedCount = 0;

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const associatedKeys = await this.client.sMembers(tagKey);

        if (associatedKeys.length > 0) {
          // Delete all keys associated with this tag
          const result = await this.client.del(associatedKeys);
          deletedCount += result;
          this.cacheStats.keys -= result;

          // Clean up tag associations
          for (const key of associatedKeys) {
            await this.removeTagsFromKey(key);
          }
        }
      }

      return deletedCount;
    }
    catch (error) {
      console.error("Redis invalidateByTags error:", error);
      return 0;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
      }
    }
    catch (error) {
      console.error("Redis close error:", error);
    }
  }

  private getFullKey(key: CacheKey): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private async addTagsToKey(key: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        await this.client.sAdd(`tags:${key}`, tag);
        await this.client.sAdd(`tag:${tag}`, key);
      }
    }
    catch (error) {
      console.error("Redis addTagsToKey error:", error);
    }
  }

  private async removeTagsFromKey(key: string): Promise<void> {
    try {
      const tags = await this.client.sMembers(`tags:${key}`);

      for (const tag of tags) {
        await this.client.sRem(`tag:${tag}`, key);
      }

      await this.client.del(`tags:${key}`);
    }
    catch (error) {
      console.error("Redis removeTagsFromKey error:", error);
    }
  }
}

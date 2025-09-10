/**
 * Main cache service with CRUD operations and high-level caching logic
 */

import env from "@/env";

import type { CacheAdapter, CacheConfig, CacheKey, CacheOptions, CacheStats, CacheValue } from "./types";

import { MemoryCacheAdapter } from "./adapters/memory-adapter";
import { RedisCacheAdapter } from "./adapters/redis-adapter";
import { CACHE_TAGS, cacheInvalidationPatterns, cacheKeyGenerators } from "./key-generators";

export class CacheService {
  private adapter!: CacheAdapter;
  private isInitialized = false;

  constructor(
    private config: CacheConfig,
    private redisUrl?: string,
  ) {
    this.initializeAdapter();
  }

  private async initializeAdapter(): Promise<void> {
    try {
      // Try Redis first if URL is provided
      if (this.redisUrl || env.REDIS_URL) {
        this.adapter = new RedisCacheAdapter(this.config, this.redisUrl);
        console.warn("✅ Redis cache adapter initialized");
      }
      else {
        throw new Error("No Redis URL provided");
      }
    }
    catch (error) {
      // Fallback to memory cache
      console.warn("⚠️ Redis unavailable, falling back to memory cache:", error);
      this.adapter = new MemoryCacheAdapter(this.config);
      console.warn("✅ Memory cache adapter initialized");
    }

    this.isInitialized = true;
  }

  /**
   * Get a value from cache
   */
  async get<T = CacheValue>(key: CacheKey): Promise<T | null> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.get<T>(key);
  }

  /**
   * Set a value in cache
   */
  async set<T = CacheValue>(key: CacheKey, value: T, options?: CacheOptions): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.set(key, value, options);
  }

  /**
   * Delete a value from cache
   */
  async del(key: CacheKey): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.del(key);
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys: CacheKey[]): Promise<number> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.delMany(keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: CacheKey): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.exists(key);
  }

  /**
   * Get multiple values
   */
  async getMany<T = CacheValue>(keys: CacheKey[]): Promise<(T | null)[]> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.getMany<T>(keys);
  }

  /**
   * Set multiple values
   */
  async setMany<T = CacheValue>(entries: Array<{ key: CacheKey; value: T; options?: CacheOptions }>): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.setMany(entries);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.clear();
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<CacheStats> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.stats();
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isInitialized) {
      await this.initializeAdapter();
    }

    return this.adapter.invalidateByTags(tags);
  }

  /**
   * Close the cache connection
   */
  async close(): Promise<void> {
    if (this.isInitialized && this.adapter) {
      await this.adapter.close();
    }
  }

  // High-level caching methods for specific use cases

  /**
   * Cache with automatic key generation and invalidation
   */
  async cacheWithKey<T>(
    keyGenerator: () => CacheKey,
    dataFetcher: () => Promise<T>,
    options?: CacheOptions,
  ): Promise<T> {
    const key = keyGenerator();

    // Try to get from cache first
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Fetch fresh data
    const data = await dataFetcher();

    // Cache the result
    await this.set(key, data, options);

    return data;
  }

  /**
   * Cache contest participants with automatic invalidation
   */
  async cacheContestParticipants<T>(
    contestId: string,
    page: number,
    limit: number,
    search: string | undefined,
    status: string | undefined,
    dataFetcher: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    const key = cacheKeyGenerators.contest.participants(contestId, page, limit, search, status);

    return this.cacheWithKey(
      () => key,
      dataFetcher,
      {
        ttl,
        tags: [CACHE_TAGS.CONTEST, CACHE_TAGS.LEADERBOARD],
      },
    );
  }

  /**
   * Cache leaderboard data
   */
  async cacheLeaderboard<T>(
    page: number,
    limit: number,
    dataFetcher: () => Promise<T>,
    ttl = 600,
  ): Promise<T> {
    const key = cacheKeyGenerators.leaderboard.main(page, limit);

    return this.cacheWithKey(
      () => key,
      dataFetcher,
      {
        ttl,
        tags: [CACHE_TAGS.LEADERBOARD],
      },
    );
  }

  /**
   * Cache analytics data
   */
  async cacheAnalytics<T>(
    type: "dashboard" | "detailed" | "contest" | "votes",
    dataFetcher: () => Promise<T>,
    period?: string,
    ttl = 900,
  ): Promise<T> {
    const key = type === "detailed" && period
      ? cacheKeyGenerators.analytics.detailed(period)
      : type === "dashboard"
        ? cacheKeyGenerators.analytics.dashboard()
        : type === "contest"
          ? cacheKeyGenerators.analytics.contest()
          : cacheKeyGenerators.analytics.votes();

    return this.cacheWithKey(
      () => key,
      dataFetcher,
      {
        ttl,
        tags: [CACHE_TAGS.ANALYTICS],
      },
    );
  }

  /**
   * Cache profile rank data
   */
  async cacheProfileRank<T>(
    profileId: string,
    dataFetcher: () => Promise<T>,
    ttl = 1800,
  ): Promise<T> {
    const key = cacheKeyGenerators.profile.rank(profileId);

    return this.cacheWithKey(
      () => key,
      dataFetcher,
      {
        ttl,
        tags: [CACHE_TAGS.PROFILE, CACHE_TAGS.LEADERBOARD],
      },
    );
  }

  /**
   * Cache vote counts for contest participants
   */
  async cacheVoteCounts<T>(
    contestId: string,
    profileIds: string[],
    dataFetcher: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    const key = cacheKeyGenerators.vote.counts(contestId, profileIds);

    return this.cacheWithKey(
      () => key,
      dataFetcher,
      {
        ttl,
        tags: [CACHE_TAGS.VOTE, CACHE_TAGS.CONTEST],
      },
    );
  }

  // Invalidation methods

  /**
   * Invalidate contest-related cache
   */
  async invalidateContestCache(contestId: string, type: "participation" | "vote" | "update"): Promise<void> {
    const methodName = `on${type.charAt(0).toUpperCase() + type.slice(1)}Change` as keyof typeof cacheInvalidationPatterns.contest;
    const patterns = cacheInvalidationPatterns.contest[methodName](contestId);
    await this.delMany(patterns);
  }

  /**
   * Invalidate profile-related cache
   */
  async invalidateProfileCache(profileId: string, type: "rank" | "stats"): Promise<void> {
    const methodName = `on${type.charAt(0).toUpperCase() + type.slice(1)}Change` as keyof typeof cacheInvalidationPatterns.profile;
    const patterns = cacheInvalidationPatterns.profile[methodName](profileId);
    await this.delMany(patterns);
  }

  /**
   * Invalidate global cache
   */
  async invalidateGlobalCache(type: "vote" | "user" | "contest"): Promise<void> {
    const methodName = `on${type.charAt(0).toUpperCase() + type.slice(1)}Change` as keyof typeof cacheInvalidationPatterns.global;
    const patterns = cacheInvalidationPatterns.global[methodName]();
    await this.delMany(patterns);
  }

  /**
   * Invalidate all cache by tags
   */
  async invalidateByTag(tag: string): Promise<number> {
    return this.invalidateByTags([tag]);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmup(): Promise<void> {
    console.warn("🔥 Warming up cache...");

    // You can add specific warmup logic here
    // For example, pre-cache dashboard stats, leaderboard, etc.

    console.warn("✅ Cache warmup completed");
  }
}

// Default cache configuration
export const defaultCacheConfig: CacheConfig = {
  defaultTtl: 300, // 5 minutes
  maxSize: 100 * 1024 * 1024, // 100MB
  enableCompression: false,
  keyPrefix: "will-mag:",
  enableStats: true,
};

// Create singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(config?: Partial<CacheConfig>, redisUrl?: string): CacheService {
  if (!cacheServiceInstance) {
    const finalConfig = { ...defaultCacheConfig, ...config };
    cacheServiceInstance = new CacheService(finalConfig, redisUrl);
  }
  return cacheServiceInstance;
}

export function createCacheService(config?: Partial<CacheConfig>, redisUrl?: string): CacheService {
  const finalConfig = { ...defaultCacheConfig, ...config };
  return new CacheService(finalConfig, redisUrl);
}

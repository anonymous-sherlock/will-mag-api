/**
 * Cache utility functions and helpers
 */

import type { CacheKey } from "./types";

import { getCacheService } from "./cache-service";
import { cacheKeyGenerators } from "./key-generators";

/**
 * Cache utility class with common operations
 */
export class CacheUtils {
  private static cache = getCacheService();

  /**
   * Cache a function result with automatic key generation
   */
  static async cacheFunction<T>(
    fn: () => Promise<T>,
    key: CacheKey,
    ttl = 300,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.cache.set(key, result, { ttl });
    return result;
  }

  /**
   * Cache database query results
   */
  static async cacheQuery<T>(
    queryFn: () => Promise<T>,
    table: string,
    operation: string,
    params: Record<string, any> = {},
    ttl = 300,
  ): Promise<T> {
    const key = this.generateQueryKey(table, operation, params);
    return this.cacheFunction(queryFn, key, ttl);
  }

  /**
   * Generate cache key for database queries
   */
  static generateQueryKey(table: string, operation: string, params: Record<string, any>): CacheKey {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${JSON.stringify(params[key])}`)
      .join(":");

    return `query:${table}:${operation}:${sortedParams}`;
  }

  /**
   * Cache paginated results
   */
  static async cachePaginated<T>(
    queryFn: () => Promise<T>,
    resource: string,
    page: number,
    limit: number,
    filters: Record<string, any> = {},
    ttl = 300,
  ): Promise<T> {
    const key = this.generatePaginatedKey(resource, page, limit, filters);
    return this.cacheFunction(queryFn, key, ttl);
  }

  /**
   * Generate cache key for paginated results
   */
  static generatePaginatedKey(
    resource: string,
    page: number,
    limit: number,
    filters: Record<string, any> = {},
  ): CacheKey {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${JSON.stringify(filters[key])}`)
      .join(":");

    return `paginated:${resource}:page:${page}:limit:${limit}:${filterString}`;
  }

  /**
   * Cache aggregation results
   */
  static async cacheAggregation<T>(
    queryFn: () => Promise<T>,
    table: string,
    aggregation: string,
    filters: Record<string, any> = {},
    ttl = 600,
  ): Promise<T> {
    const key = this.generateAggregationKey(table, aggregation, filters);
    return this.cacheFunction(queryFn, key, ttl);
  }

  /**
   * Generate cache key for aggregation queries
   */
  static generateAggregationKey(
    table: string,
    aggregation: string,
    filters: Record<string, any> = {},
  ): CacheKey {
    const filterString = Object.keys(filters)
      .sort()
      .map(key => `${key}:${JSON.stringify(filters[key])}`)
      .join(":");

    return `aggregation:${table}:${aggregation}:${filterString}`;
  }

  /**
   * Cache with conditional logic
   */
  static async cacheConditionally<T>(
    fn: () => Promise<T>,
    key: CacheKey,
    condition: (result: T) => boolean,
    ttl = 300,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();

    if (condition(result)) {
      await this.cache.set(key, result, { ttl });
    }

    return result;
  }

  /**
   * Cache with fallback
   */
  static async cacheWithFallback<T>(
    primaryFn: () => Promise<T>,
    fallbackFn: () => Promise<T>,
    key: CacheKey,
    ttl = 300,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    try {
      const result = await primaryFn();
      await this.cache.set(key, result, { ttl });
      return result;
    }
    catch (error) {
      console.warn("Primary function failed, using fallback:", error);
      const fallbackResult = await fallbackFn();
      await this.cache.set(key, fallbackResult, { ttl: 60 }); // Shorter TTL for fallback
      return fallbackResult;
    }
  }

  /**
   * Batch cache operations
   */
  static async batchCache<T>(
    operations: Array<{
      key: CacheKey;
      fn: () => Promise<T>;
      ttl?: number;
    }>,
  ): Promise<T[]> {
    const keys = operations.map(op => op.key);
    const cached = await this.cache.getMany<T>(keys);

    const results: T[] = [];
    const toCache: Array<{ key: CacheKey; value: T; ttl?: number }> = [];

    for (let i = 0; i < operations.length; i++) {
      const operation = operations[i];
      const cachedValue = cached[i];

      if (cachedValue !== null) {
        results.push(cachedValue);
      }
      else {
        const result = await operation.fn();
        results.push(result);
        toCache.push({
          key: operation.key,
          value: result,
          ttl: operation.ttl,
        });
      }
    }

    if (toCache.length > 0) {
      await this.cache.setMany(toCache);
    }

    return results;
  }

  /**
   * Cache with tags for easy invalidation
   */
  static async cacheWithTags<T>(
    fn: () => Promise<T>,
    key: CacheKey,
    tags: string[],
    ttl = 300,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.cache.set(key, result, { ttl, tags });
    return result;
  }

  /**
   * Cache with compression for large data
   */
  static async cacheCompressed<T>(
    fn: () => Promise<T>,
    key: CacheKey,
    ttl = 300,
  ): Promise<T> {
    const cached = await this.cache.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();

    // For large objects, we could implement compression here
    // For now, just cache normally
    await this.cache.set(key, result, { ttl });
    return result;
  }

  /**
   * Get cache statistics
   */
  static async getStats() {
    return this.cache.stats();
  }

  /**
   * Clear cache by pattern
   */
  static async clearByPattern(pattern: string): Promise<number> {
    // This would need to be implemented in the adapter
    // For now, we'll use tag-based invalidation
    return this.cache.invalidateByTags([pattern]);
  }

  /**
   * Warm up cache with multiple operations
   */
  static async warmup(operations: Array<() => Promise<void>>): Promise<void> {
    console.warn("🔥 Warming up cache with multiple operations...");

    await Promise.allSettled(operations.map(op => op()));

    console.warn("✅ Cache warmup completed");
  }
}

/**
 * Specific cache utilities for common patterns
 */
export class ContestCacheUtils {
  private static cache = getCacheService();

  /**
   * Cache contest participants with vote counts
   */
  static async cacheContestParticipantsWithVotes<T>(
    contestId: string,
    page: number,
    limit: number,
    search: string | undefined,
    status: string | undefined,
    queryFn: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    const key = cacheKeyGenerators.contest.participants(contestId, page, limit, search, status);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["contest", "leaderboard"],
      ttl,
    );
  }

  /**
   * Cache contest winner data
   */
  static async cacheContestWinner<T>(
    contestId: string,
    queryFn: () => Promise<T>,
    ttl = 600,
  ): Promise<T> {
    const key = cacheKeyGenerators.contest.winner(contestId);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["contest"],
      ttl,
    );
  }

  /**
   * Cache contest stats
   */
  static async cacheContestStats<T>(
    contestId: string,
    queryFn: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    const key = cacheKeyGenerators.contest.stats(contestId);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["contest", "analytics"],
      ttl,
    );
  }

  /**
   * Cache contest list with filters
   */
  static async cacheContestList<T>(
    page: number,
    limit: number,
    status: string | undefined,
    search: string | undefined,
    queryFn: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    const key = cacheKeyGenerators.contest.list(page, limit, status, search);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["contest", "list"],
      ttl,
    );
  }

  /**
   * Cache contest by ID
   */
  static async cacheContestById<T>(
    contestId: string,
    queryFn: () => Promise<T>,
    ttl = 600,
  ): Promise<T> {
    const key = cacheKeyGenerators.contest.byId(contestId);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["contest"],
      ttl,
    );
  }

  /**
   * Cache contest by slug
   */
  static async cacheContestBySlug<T>(
    slug: string,
    queryFn: () => Promise<T>,
    ttl = 600,
  ): Promise<T> {
    const key = cacheKeyGenerators.contest.bySlug(slug);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["contest"],
      ttl,
    );
  }

  /**
   * Cache contest leaderboard
   */
  static async cacheContestLeaderboard<T>(
    contestId: string,
    page: number,
    limit: number,
    queryFn: () => Promise<T>,
    ttl = 300,
  ): Promise<T> {
    const key = cacheKeyGenerators.contest.leaderboard(contestId, page, limit);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["contest", "leaderboard"],
      ttl,
    );
  }
}

export class AnalyticsCacheUtils {
  private static cache = getCacheService();

  /**
   * Cache dashboard analytics
   */
  static async cacheDashboardAnalytics<T>(
    queryFn: () => Promise<T>,
    ttl = 900,
  ): Promise<T> {
    const key = cacheKeyGenerators.analytics.dashboard();

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["analytics", "dashboard"],
      ttl,
    );
  }

  /**
   * Cache detailed analytics by period
   */
  static async cacheDetailedAnalytics<T>(
    period: string,
    queryFn: () => Promise<T>,
    ttl = 900,
  ): Promise<T> {
    const key = cacheKeyGenerators.analytics.detailed(period);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["analytics", "detailed"],
      ttl,
    );
  }
}

export class LeaderboardCacheUtils {
  private static cache = getCacheService();

  /**
   * Cache leaderboard data
   */
  static async cacheLeaderboard<T>(
    page: number,
    limit: number,
    queryFn: () => Promise<T>,
    ttl = 600,
  ): Promise<T> {
    const key = cacheKeyGenerators.leaderboard.main(page, limit);

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["leaderboard"],
      ttl,
    );
  }

  /**
   * Cache leaderboard stats
   */
  static async cacheLeaderboardStats<T>(
    queryFn: () => Promise<T>,
    ttl = 600,
  ): Promise<T> {
    const key = cacheKeyGenerators.leaderboard.stats();

    return CacheUtils.cacheWithTags(
      queryFn,
      key,
      ["leaderboard", "stats"],
      ttl,
    );
  }
}

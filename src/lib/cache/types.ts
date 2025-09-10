/**
 * Core caching types and interfaces
 */

export type CacheKey = string;
export type CacheValue = string | number | boolean | object | null;

export interface CacheOptions {
  /** Time to live in seconds. Default: 300 (5 minutes) */
  ttl?: number;
  /** Whether to serialize/deserialize JSON automatically. Default: true */
  serialize?: boolean;
  /** Cache namespace for key organization */
  namespace?: string;
  /** Tags for cache invalidation */
  tags?: string[];
}

export interface CacheAdapter {
  /** Get a value from cache */
  get: <T = CacheValue>(key: CacheKey) => Promise<T | null>;

  /** Set a value in cache */
  set: <T = CacheValue>(key: CacheKey, value: T, options?: CacheOptions) => Promise<void>;

  /** Delete a value from cache */
  del: (key: CacheKey) => Promise<boolean>;

  /** Delete multiple keys */
  delMany: (keys: CacheKey[]) => Promise<number>;

  /** Check if key exists */
  exists: (key: CacheKey) => Promise<boolean>;

  /** Get multiple values */
  getMany: <T = CacheValue>(keys: CacheKey[]) => Promise<(T | null)[]>;

  /** Set multiple values */
  setMany: <T = CacheValue>(entries: Array<{ key: CacheKey; value: T; options?: CacheOptions }>) => Promise<void>;

  /** Clear all cache */
  clear: () => Promise<void>;

  /** Get cache statistics */
  stats: () => Promise<CacheStats>;

  /** Invalidate cache by tags */
  invalidateByTags: (tags: string[]) => Promise<number>;

  /** Close the cache connection */
  close: () => Promise<void>;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
  uptime: number;
}

export interface CacheConfig {
  /** Default TTL in seconds */
  defaultTtl: number;
  /** Maximum cache size in bytes */
  maxSize: number;
  /** Whether to enable compression */
  enableCompression: boolean;
  /** Cache key prefix */
  keyPrefix: string;
  /** Whether to enable statistics */
  enableStats: boolean;
}

export type CacheStrategy = "write-through" | "write-behind" | "write-around";

export interface CacheEntry<T = CacheValue> {
  value: T;
  ttl: number;
  createdAt: number;
  tags?: string[];
}

export interface CacheMetadata {
  key: CacheKey;
  ttl: number;
  createdAt: number;
  tags?: string[];
  size: number;
}

// Specific cache key generators for different data types
export interface CacheKeyGenerators {
  // Contest-related keys
  contest: {
    participants: (contestId: string, page?: number, limit?: number, search?: string, status?: string) => string;
    winner: (contestId: string) => string;
    stats: (contestId: string) => string;
    participation: (contestId: string, profileId: string) => string;
    list: (page?: number, limit?: number, status?: string, search?: string) => string;
    byId: (contestId: string) => string;
    bySlug: (slug: string) => string;
    leaderboard: (contestId: string, page?: number, limit?: number) => string;
  };

  // Leaderboard keys
  leaderboard: {
    main: (page?: number, limit?: number) => string;
    stats: () => string;
  };

  // Analytics keys
  analytics: {
    dashboard: () => string;
    detailed: (period: string) => string;
    contest: () => string;
    votes: () => string;
  };

  // Profile keys
  profile: {
    rank: (profileId: string) => string;
    stats: (profileId: string) => string;
    list: (page?: number, limit?: number, search?: string, profileId?: string) => string;
  };

  // Vote keys
  vote: {
    counts: (contestId: string, profileIds: string[]) => string;
    stats: (contestId: string) => string;
  };
}

// Cache invalidation patterns
export interface CacheInvalidationPatterns {
  contest: {
    onParticipationChange: (contestId: string) => string[];
    onVoteChange: (contestId: string) => string[];
    onContestUpdate: (contestId: string) => string[];
  };

  profile: {
    onRankChange: (profileId: string) => string[];
    onStatsChange: (profileId: string) => string[];
  };

  global: {
    onVoteChange: () => string[];
    onUserChange: () => string[];
    onContestChange: () => string[];
  };
}

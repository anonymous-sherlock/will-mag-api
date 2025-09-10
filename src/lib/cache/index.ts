/**
 * Cache service exports
 */

export * from "./adapters/memory-adapter";
export * from "./adapters/redis-adapter";
export * from "./cache-service";
// Re-export commonly used items for convenience
export {
  createCacheService,
  defaultCacheConfig,
  getCacheService,
} from "./cache-service";
export * from "./cache-utils";
export * from "./decorators";
export {
  Cache,
  CacheAnalytics,
  CacheContestParticipants,
  CacheLeaderboard,
  CacheProfileRank,
  InvalidateCache,
  InvalidateContestCache,
  InvalidateGlobalCache,
  InvalidateProfileCache,
} from "./decorators";

export * from "./key-generators";

export {
  CACHE_NAMESPACES,
  CACHE_TAGS,
  cacheInvalidationPatterns,
  cacheKeyGenerators,
} from "./key-generators";

export * from "./types";

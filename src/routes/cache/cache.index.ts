/**
 * Cache management routes index
 */

import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./cache.handlers";
import * as routes from "./cache.routes";

const cacheRouter = createRouteBuilder()
  .openapi(routes.clearAllCache, handlers.clearAllCache)
  .openapi(routes.getCacheStats, handlers.getCacheStats)
  .openapi(routes.invalidateCacheByTags, handlers.invalidateCacheByTags)
  .openapi(routes.invalidateCacheByTag, handlers.invalidateCacheByTag)
  .openapi(routes.invalidateContestCache, handlers.invalidateContestCache)
  .openapi(routes.invalidateProfileCache, handlers.invalidateProfileCache)
  .openapi(routes.invalidateGlobalCache, handlers.invalidateGlobalCache)
  .openapi(routes.purgeCacheByPattern, handlers.purgeCacheByPattern)
  .openapi(routes.deleteCacheKey, handlers.deleteCacheKey)
  .openapi(routes.deleteCacheKeys, handlers.deleteCacheKeys)
  .openapi(routes.warmupCache, handlers.warmupCache)
  .openapi(routes.getCacheTags, handlers.getCacheTags)
  .openapi(routes.cacheHealthCheck, handlers.cacheHealthCheck);

export default cacheRouter.getRouter();

// Export individual route definitions for external use
export {
  cacheHealthCheck,
  clearAllCache,
  deleteCacheKey,
  deleteCacheKeys,
  getCacheStats,
  getCacheTags,
  invalidateCacheByTag,
  invalidateCacheByTags,
  invalidateContestCache,
  invalidateGlobalCache,
  invalidateProfileCache,
  purgeCacheByPattern,
  warmupCache,
} from "./cache.routes";

// Export route types
export type {
  CacheHealthCheckRoute,
  ClearAllCacheRoute,
  DeleteCacheKeyRoute,
  DeleteCacheKeysRoute,
  GetCacheStatsRoute,
  GetCacheTagsRoute,
  InvalidateCacheByTagRoute,
  InvalidateCacheByTagsRoute,
  InvalidateContestCacheRoute,
  InvalidateGlobalCacheRoute,
  InvalidateProfileCacheRoute,
  PurgeCacheByPatternRoute,
  WarmupCacheRoute,
} from "./cache.routes";

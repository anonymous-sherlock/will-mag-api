/**
 * Cache management handlers for purging, invalidating, and clearing cache
 * Handlers use proper TypeScript types with AppRouteHandler
 */

import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { sendErrorResponse } from "@/helpers/send-error-response";
import { getAnalyticsService } from "@/lib/cache/analytics";
import { getCacheService } from "@/lib/cache/cache-service";
import { CacheUtils } from "@/lib/cache/cache-utils";
import { CACHE_TAGS } from "@/lib/cache/key-generators";

import type {
  CacheHealthCheckRoute,
  ClearAllCacheRoute,
  ClearCacheAnalyticsRoute,
  DeleteCacheKeyRoute,
  DeleteCacheKeysRoute,
  ExportCacheAnalyticsRoute,
  GetCacheAnalyticsRoute,
  GetCacheAnalyticsSummaryRoute,
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

/**
 * Clear all cache
 */
export const clearAllCache: AppRouteHandler<ClearAllCacheRoute> = async (c) => {
  try {
    const cacheService = getCacheService();
    await cacheService.clear();

    return c.json({
      success: true,
      message: "All cache cleared successfully",
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache clear error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to clear cache");
  }
};

/**
 * Get cache statistics
 */
export const getCacheStats: AppRouteHandler<GetCacheStatsRoute> = async (c) => {
  try {
    const cacheService = getCacheService();
    const stats = await cacheService.stats();

    return c.json({
      success: true,
      data: stats,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache stats error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to get cache statistics");
  }
};

/**
 * Invalidate cache by tags
 */
export const invalidateCacheByTags: AppRouteHandler<InvalidateCacheByTagsRoute> = async (c) => {
  try {
    const { tags } = c.req.valid("json");

    const cacheService = getCacheService();
    const deletedCount = await cacheService.invalidateByTags(tags);

    return c.json({
      success: true,
      message: `Cache invalidated for ${deletedCount} keys with tags: ${tags.join(", ")}`,
      deletedCount,
      tags,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache invalidate by tags error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to invalidate cache by tags");
  }
};

/**
 * Invalidate cache by single tag
 */
export const invalidateCacheByTag: AppRouteHandler<InvalidateCacheByTagRoute> = async (c) => {
  try {
    const { tag } = c.req.valid("param");

    const cacheService = getCacheService();
    const deletedCount = await cacheService.invalidateByTag(tag);

    return c.json({
      success: true,
      message: `Cache invalidated for ${deletedCount} keys with tag: ${tag}`,
      deletedCount,
      tag,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache invalidate by tag error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to invalidate cache by tag");
  }
};

/**
 * Invalidate contest-related cache
 */
export const invalidateContestCache: AppRouteHandler<InvalidateContestCacheRoute> = async (c) => {
  try {
    const { contestId } = c.req.valid("param");
    const { type } = c.req.valid("query");

    const cacheService = getCacheService();

    if (type) {
      await cacheService.invalidateContestCache(contestId, type);
    }
    else {
      // Invalidate all contest-related cache
      await cacheService.invalidateContestCache(contestId, "participation");
      await cacheService.invalidateContestCache(contestId, "vote");
      await cacheService.invalidateContestCache(contestId, "update");
    }

    return c.json({
      success: true,
      message: `Contest cache invalidated for contest: ${contestId}`,
      contestId,
      type: type || "all",
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache invalidate contest error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to invalidate contest cache");
  }
};

/**
 * Invalidate profile-related cache
 */
export const invalidateProfileCache: AppRouteHandler<InvalidateProfileCacheRoute> = async (c) => {
  try {
    const { profileId } = c.req.valid("param");
    const { type } = c.req.valid("query");

    const cacheService = getCacheService();

    if (type) {
      await cacheService.invalidateProfileCache(profileId, type);
    }
    else {
      // Invalidate all profile-related cache
      await cacheService.invalidateProfileCache(profileId, "rank");
      await cacheService.invalidateProfileCache(profileId, "stats");
    }

    return c.json({
      success: true,
      message: `Profile cache invalidated for profile: ${profileId}`,
      profileId,
      type: type || "all",
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache invalidate profile error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to invalidate profile cache");
  }
};

/**
 * Invalidate global cache by type
 */
export const invalidateGlobalCache: AppRouteHandler<InvalidateGlobalCacheRoute> = async (c) => {
  try {
    const { type } = c.req.valid("param");

    const cacheService = getCacheService();
    await cacheService.invalidateGlobalCache(type);

    return c.json({
      success: true,
      message: `Global ${type} cache invalidated successfully`,
      type,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache invalidate global error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to invalidate global cache");
  }
};

/**
 * Purge cache by pattern (using tags as pattern matching)
 */
export const purgeCacheByPattern: AppRouteHandler<PurgeCacheByPatternRoute> = async (c) => {
  try {
    const { pattern } = c.req.valid("json");

    const deletedCount = await CacheUtils.clearByPattern(pattern);

    return c.json({
      success: true,
      message: `Cache purged for pattern: ${pattern}`,
      deletedCount,
      pattern,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache purge pattern error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to purge cache by pattern");
  }
};

/**
 * Delete specific cache key
 */
export const deleteCacheKey: AppRouteHandler<DeleteCacheKeyRoute> = async (c) => {
  try {
    const { key } = c.req.valid("param");

    const cacheService = getCacheService();
    const deleted = await cacheService.del(key);

    return c.json({
      success: true,
      message: deleted ? `Cache key deleted: ${key}` : `Cache key not found: ${key}`,
      deleted,
      key,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache delete key error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to delete cache key");
  }
};

/**
 * Delete multiple cache keys
 */
export const deleteCacheKeys: AppRouteHandler<DeleteCacheKeysRoute> = async (c) => {
  try {
    const { keys } = c.req.valid("json");

    const cacheService = getCacheService();
    const deletedCount = await cacheService.delMany(keys);

    return c.json({
      success: true,
      message: `Deleted ${deletedCount} cache keys`,
      deletedCount,
      keys,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache delete keys error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to delete cache keys");
  }
};

/**
 * Warm up cache
 */
export const warmupCache: AppRouteHandler<WarmupCacheRoute> = async (c) => {
  try {
    const cacheService = getCacheService();
    await cacheService.warmup();

    return c.json({
      success: true,
      message: "Cache warmup completed successfully",
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache warmup error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to warm up cache");
  }
};

/**
 * Get available cache tags
 */
export const getCacheTags: AppRouteHandler<GetCacheTagsRoute> = async (c) => {
  try {
    return c.json({
      success: true,
      data: {
        availableTags: Object.values(CACHE_TAGS),
        description: "Available cache tags for invalidation",
      },
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache tags error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to get cache tags");
  }
};

/**
 * Health check for cache service
 */
export const cacheHealthCheck: AppRouteHandler<CacheHealthCheckRoute> = async (c) => {
  try {
    const cacheService = getCacheService();
    const stats = await cacheService.stats();

    return c.json({
      success: true,
      data: {
        status: "healthy",
        stats,
        timestamp: new Date().toISOString(),
      },
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache health check error:", error);
    return sendErrorResponse(c, "internalServerError", "Cache service is unhealthy");
  }
};

/**
 * Get cache analytics
 */
export const getCacheAnalytics: AppRouteHandler<GetCacheAnalyticsRoute> = async (c) => {
  try {
    const analyticsService = getAnalyticsService();
    const analytics = await analyticsService.getAnalytics();

    return c.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache analytics error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to get cache analytics");
  }
};

/**
 * Get cache analytics summary
 */
export const getCacheAnalyticsSummary: AppRouteHandler<GetCacheAnalyticsSummaryRoute> = async (c) => {
  try {
    const analyticsService = getAnalyticsService();
    const summary = await analyticsService.getSummary();

    return c.json({
      success: true,
      data: summary,
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Cache analytics summary error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to get cache analytics summary");
  }
};

/**
 * Export cache analytics
 */
export const exportCacheAnalytics: AppRouteHandler<ExportCacheAnalyticsRoute> = async (c) => {
  try {
    const analyticsService = getAnalyticsService();
    const exportData = await analyticsService.exportData();

    // Set headers for file download
    c.header("Content-Type", "application/json");
    c.header("Content-Disposition", `attachment; filename="cache-analytics-${Date.now()}.json"`);

    return c.json(exportData, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Export cache analytics error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to export cache analytics");
  }
};

/**
 * Clear cache analytics
 */
export const clearCacheAnalytics: AppRouteHandler<ClearCacheAnalyticsRoute> = async (c) => {
  try {
    const analyticsService = getAnalyticsService();
    analyticsService.clear();

    return c.json({
      success: true,
      message: "Cache analytics data cleared successfully",
      timestamp: new Date().toISOString(),
    }, HttpStatusCodes.OK);
  }
  catch (error) {
    console.error("Clear cache analytics error:", error);
    return sendErrorResponse(c, "internalServerError", "Failed to clear cache analytics");
  }
};

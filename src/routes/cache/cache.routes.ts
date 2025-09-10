import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { BadRequestResponse, InternalServerErrorResponse, UnauthorizedResponse } from "@/lib/openapi.responses";

const tags = ["Cache Management"];

/**
 * Clear all cache route
 */
export const clearAllCache = createRoute({
  path: "/cache/clear",
  method: "get",
  tags,
  summary: "Clear All Cache",
  description: "Completely clear all cached data from the cache store",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache cleared successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to clear cache"),
  },
});

/**
 * Get cache statistics route
 */
export const getCacheStats = createRoute({
  path: "/cache/stats",
  method: "get",
  tags,
  summary: "Get Cache Statistics",
  description: "Retrieve cache performance statistics including hits, misses, memory usage, and key count",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache statistics retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              hits: z.number(),
              misses: z.number(),
              keys: z.number(),
              memory: z.number(),
              uptime: z.number(),
            }),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to get cache statistics"),
  },
});

/**
 * Invalidate cache by tags route
 */
export const invalidateCacheByTags = createRoute({
  path: "/cache/invalidate/tags",
  method: "post",
  tags,
  summary: "Invalidate Cache by Tags",
  description: "Invalidate all cache entries associated with specific tags",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            tags: z.array(z.string()).min(1, "At least one tag is required"),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache invalidated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            deletedCount: z.number(),
            tags: z.array(z.string()),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Invalid tags provided"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to invalidate cache"),
  },
});

/**
 * Invalidate cache by single tag route
 */
export const invalidateCacheByTag = createRoute({
  path: "/cache/invalidate/tag/{tag}",
  method: "delete",
  tags,
  summary: "Invalidate Cache by Tag",
  description: "Invalidate all cache entries associated with a specific tag",
  request: {
    params: z.object({
      tag: z.string().min(1, "Tag is required"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache invalidated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            deletedCount: z.number(),
            tag: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Tag parameter is required"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to invalidate cache"),
  },
});

/**
 * Invalidate contest cache route
 */
export const invalidateContestCache = createRoute({
  path: "/cache/invalidate/contest/{contestId}",
  method: "delete",
  tags,
  summary: "Invalidate Contest Cache",
  description: "Invalidate all cache entries related to a specific contest",
  request: {
    params: z.object({
      contestId: z.string().min(1, "Contest ID is required"),
    }),
    query: z.object({
      type: z.enum(["participation", "vote", "update"]).optional().describe("Specific cache type to invalidate"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Contest cache invalidated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            contestId: z.string(),
            type: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Contest ID is required"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to invalidate contest cache"),
  },
});

/**
 * Invalidate profile cache route
 */
export const invalidateProfileCache = createRoute({
  path: "/cache/invalidate/profile/{profileId}",
  method: "delete",
  tags,
  summary: "Invalidate Profile Cache",
  description: "Invalidate all cache entries related to a specific profile",
  request: {
    params: z.object({
      profileId: z.string().min(1, "Profile ID is required"),
    }),
    query: z.object({
      type: z.enum(["rank", "stats"]).optional().describe("Specific cache type to invalidate"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Profile cache invalidated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            profileId: z.string(),
            type: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Profile ID is required"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to invalidate profile cache"),
  },
});

/**
 * Invalidate global cache route
 */
export const invalidateGlobalCache = createRoute({
  path: "/cache/invalidate/global/{type}",
  method: "delete",
  tags,
  summary: "Invalidate Global Cache",
  description: "Invalidate global cache entries by type (vote, user, contest)",
  request: {
    params: z.object({
      type: z.enum(["vote", "user", "contest"]).describe("Global cache type to invalidate"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Global cache invalidated successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            type: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Valid type (vote, user, contest) is required"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to invalidate global cache"),
  },
});

/**
 * Purge cache by pattern route
 */
export const purgeCacheByPattern = createRoute({
  path: "/cache/purge/pattern",
  method: "post",
  tags,
  summary: "Purge Cache by Pattern",
  description: "Purge cache entries matching a specific pattern using tag-based matching",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            pattern: z.string().min(1, "Pattern is required"),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache purged successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            deletedCount: z.number(),
            pattern: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Pattern is required"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to purge cache"),
  },
});

/**
 * Delete specific cache key route
 */
export const deleteCacheKey = createRoute({
  path: "/cache/key/{key}",
  method: "delete",
  tags,
  summary: "Delete Cache Key",
  description: "Delete a specific cache entry by its key",
  request: {
    params: z.object({
      key: z.string().min(1, "Key is required"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache key deleted successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            deleted: z.boolean(),
            key: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Key parameter is required"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to delete cache key"),
  },
});

/**
 * Delete multiple cache keys route
 */
export const deleteCacheKeys = createRoute({
  path: "/cache/keys/delete",
  method: "post",
  tags,
  summary: "Delete Multiple Cache Keys",
  description: "Delete multiple cache entries by their keys",
  request: {
    body: {
      content: {
        "application/json": {
          schema: z.object({
            keys: z.array(z.string()).min(1, "At least one key is required"),
          }),
        },
      },
    },
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache keys deleted successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            deletedCount: z.number(),
            keys: z.array(z.string()),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("At least one key is required"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to delete cache keys"),
  },
});

/**
 * Warm up cache route
 */
export const warmupCache = createRoute({
  path: "/cache/warmup",
  method: "post",
  tags,
  summary: "Warm Up Cache",
  description: "Pre-populate cache with frequently accessed data",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache warmup completed successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            message: z.string(),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to warm up cache"),
  },
});

/**
 * Get available cache tags route
 */
export const getCacheTags = createRoute({
  path: "/cache/tags",
  method: "get",
  tags,
  summary: "Get Available Cache Tags",
  description: "Retrieve list of available cache tags for invalidation",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache tags retrieved successfully",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              availableTags: z.array(z.string()),
              description: z.string(),
            }),
            timestamp: z.string(),
          }),
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to get cache tags"),
  },
});

/**
 * Cache health check route
 */
export const cacheHealthCheck = createRoute({
  path: "/cache/health",
  method: "get",
  tags,
  summary: "Cache Health Check",
  description: "Check the health status of the cache service",
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Cache service is healthy",
      content: {
        "application/json": {
          schema: z.object({
            success: z.boolean(),
            data: z.object({
              status: z.string(),
              stats: z.object({
                hits: z.number(),
                misses: z.number(),
                keys: z.number(),
                memory: z.number(),
                uptime: z.number(),
              }),
              timestamp: z.string(),
            }),
          }),
        },
      },
    },
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Cache service is unhealthy"),
  },
});

// Export route types
export type ClearAllCacheRoute = typeof clearAllCache;
export type GetCacheStatsRoute = typeof getCacheStats;
export type InvalidateCacheByTagsRoute = typeof invalidateCacheByTags;
export type InvalidateCacheByTagRoute = typeof invalidateCacheByTag;
export type InvalidateContestCacheRoute = typeof invalidateContestCache;
export type InvalidateProfileCacheRoute = typeof invalidateProfileCache;
export type InvalidateGlobalCacheRoute = typeof invalidateGlobalCache;
export type PurgeCacheByPatternRoute = typeof purgeCacheByPattern;
export type DeleteCacheKeyRoute = typeof deleteCacheKey;
export type DeleteCacheKeysRoute = typeof deleteCacheKeys;
export type WarmupCacheRoute = typeof warmupCache;
export type GetCacheTagsRoute = typeof getCacheTags;
export type CacheHealthCheckRoute = typeof cacheHealthCheck;

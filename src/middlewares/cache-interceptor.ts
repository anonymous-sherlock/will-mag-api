/**
 * Cache interceptor middleware to automatically add cache headers
 */

import type { Context, Next } from "hono";

// Global cache context to track cache hits across the request
const cacheContext = new Map<string, boolean>();

// Global function to track cache hits (set by middleware)
let globalTrackCacheHit: ((key: string, fromCache: boolean) => void) | null = null;

// Export the track function for direct use
export function trackCacheHitDirect(key: string, fromCache: boolean) {
  // console.warn("trackCacheHitDirect called:", { key, fromCache });
  cacheContext.set(key, fromCache);
}

// Make the track function available globally for cache utils
(globalThis as any).__trackCacheHit = trackCacheHitDirect;

/**
 * Cache interceptor middleware
 * Automatically adds X-Swing-Cache-Status header based on cache hits
 */
export function cacheInterceptor() {
  return async (c: Context, next: Next) => {
    // Clear any previous cache context for this request
    cacheContext.clear();

    // Set global function for this request
    globalTrackCacheHit = trackCacheHit;

    await next();

    // Add cache status header if any cache operations occurred
    if (cacheContext.size > 0) {
      const hasHits = Array.from(cacheContext.values()).some(hit => hit);
      c.header("X-Swing-Cache-Status", hasHits ? "HIT" : "MISS");
    }

    // Clear global function
    globalTrackCacheHit = null;
  };
}

/**
 * Track cache hit for a specific operation
 * Call this in your handlers when using cache
 */
export function trackCacheHit(key: string, fromCache: boolean) {
  cacheContext.set(key, fromCache);
}

/**
 * Get the global track function (for use by cache utils)
 */
export function getGlobalTrackFunction() {
  return globalTrackCacheHit;
}

/**
 * Get current cache context (for debugging)
 */
export function getCacheContext() {
  return Object.fromEntries(cacheContext);
}

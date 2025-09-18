/**
 * Main cache service with CRUD operations and high-level caching logic
 */

import env from "@/env";

import type { CacheAdapter, CacheConfig, CacheKey, CacheOptions, CacheStats, CacheValue } from "./types";

import { MemoryCacheAdapter } from "./adapters/memory-adapter";
import { RedisCacheAdapter } from "./adapters/redis-adapter";
import { getAnalyticsService } from "./analytics";
import { getErrorHandler } from "./error-handling";
import { cacheInvalidationPatterns } from "./key-generators";
import { CacheRateLimiter, validateCacheKey, validateCacheValue } from "./security";
import { CacheWarmer, defaultWarmingConfig } from "./warming";

export class CacheService {
  private adapter!: CacheAdapter;
  private isInitialized = false;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private rateLimiter = new CacheRateLimiter(1000, 60000); // 1000 requests per minute
  private warmer: CacheWarmer;
  private metrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    errors: 0,
    lastHealthCheck: 0,
    securityViolations: 0,
    rateLimitHits: 0,
  };

  constructor(private config: CacheConfig) {
    this.initializeAdapter();
    this.startHealthChecks();
    this.warmer = new CacheWarmer(defaultWarmingConfig);
  }

  private async initializeAdapter(): Promise<void> {
    // If no Redis URL, use memory cache
    if (!env.REDIS_URL) {
      console.warn("⚠️ No Redis URL provided, using memory cache");
      this.adapter = new MemoryCacheAdapter(this.config);
      this.isInitialized = true;
      return;
    }

    try {
      // Try to create Redis adapter
      this.adapter = new RedisCacheAdapter(this.config, env.REDIS_URL);
      console.warn("✅ Redis cache adapter created (connection will be established asynchronously)");
      this.isInitialized = true;
    } catch (error) {
      console.warn("⚠️ Redis adapter creation failed, falling back to memory cache:", error instanceof Error ? error.message : error);
      this.adapter = new MemoryCacheAdapter(this.config);
      this.isInitialized = true;
    }
  }

  /**
   * Get a value from cache
   */
  async get<T = CacheValue>(key: CacheKey, clientId?: string): Promise<T | null> {
    if (!this.isInitialized) {
      throw new Error("CacheService not initialized");
    }

    // Rate limiting
    if (clientId && !this.rateLimiter.isAllowed(clientId)) {
      this.metrics.rateLimitHits++;
      throw new Error("Rate limit exceeded");
    }

    // Security validation
    const keyValidation = validateCacheKey(key);
    if (!keyValidation.valid) {
      this.metrics.securityViolations++;
      throw new Error(`Invalid cache key: ${keyValidation.error}`);
    }

    this.metrics.totalRequests++;

    const errorHandler = getErrorHandler();
    const startTime = Date.now();

    try {
      const result = await errorHandler.handleWithRetry(
        () => this.adapter.get<T>(key),
        `get:${key}`,
        // Fallback to memory cache if Redis fails
        this.adapter instanceof RedisCacheAdapter
          ? () => new MemoryCacheAdapter(this.config).get<T>(key)
          : undefined,
      );

      const responseTime = Date.now() - startTime;
      getAnalyticsService().trackResponseTime(responseTime);

      if (result !== null) {
        this.metrics.cacheHits++;
        // Track analytics
        getAnalyticsService().trackKeyAccess(key, true);
      } else {
        this.metrics.cacheMisses++;
        // Track analytics
        getAnalyticsService().trackKeyAccess(key, false);
      }
      return result;
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Set a value in cache
   */
  async set<T = CacheValue>(key: CacheKey, value: T, options?: CacheOptions, clientId?: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error("CacheService not initialized");
    }

    // Rate limiting
    if (clientId && !this.rateLimiter.isAllowed(clientId)) {
      this.metrics.rateLimitHits++;
      throw new Error("Rate limit exceeded");
    }

    // Security validation
    const keyValidation = validateCacheKey(key);
    if (!keyValidation.valid) {
      this.metrics.securityViolations++;
      throw new Error(`Invalid cache key: ${keyValidation.error}`);
    }

    const valueValidation = validateCacheValue(value);
    if (!valueValidation.valid) {
      this.metrics.securityViolations++;
      throw new Error(`Invalid cache value: ${valueValidation.error}`);
    }

    const errorHandler = getErrorHandler();

    try {
      await errorHandler.handleWithRetry(
        () => this.adapter.set(key, value, options),
        `set:${key}`,
        // Fallback to memory cache if Redis fails
        this.adapter instanceof RedisCacheAdapter
          ? () => new MemoryCacheAdapter(this.config).set(key, value, options)
          : undefined,
      );
    } catch (error) {
      this.metrics.errors++;
      throw error;
    }
  }

  /**
   * Delete a value from cache
   */
  async del(key: CacheKey): Promise<boolean> {
    return this.adapter.del(key);
  }

  /**
   * Delete multiple keys
   */
  async delMany(keys: CacheKey[]): Promise<number> {
    return this.adapter.delMany(keys);
  }

  /**
   * Check if key exists
   */
  async exists(key: CacheKey): Promise<boolean> {
    return this.adapter.exists(key);
  }

  /**
   * Get multiple values
   */
  async getMany<T = CacheValue>(keys: CacheKey[]): Promise<(T | null)[]> {
    return this.adapter.getMany<T>(keys);
  }

  /**
   * Set multiple values
   */
  async setMany<T = CacheValue>(entries: Array<{ key: CacheKey; value: T; options?: CacheOptions }>): Promise<void> {
    return this.adapter.setMany(entries);
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    return this.adapter.clear();
  }

  /**
   * Get cache statistics
   */
  async stats(): Promise<CacheStats> {
    return this.adapter.stats();
  }

  /**
   * Invalidate cache by tags
   */
  async invalidateByTags(tags: string[]): Promise<number> {
    return this.adapter.invalidateByTags(tags);
  }

  /**
   * Close the cache connection
   */
  async close(): Promise<void> {
    if (this.adapter) {
      await this.adapter.close();
    }
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

    try {
      await this.warmer.start();
      console.warn("✅ Cache warmup completed");
    } catch (error) {
      console.error("❌ Cache warmup failed:", error);
    }
  }

  /**
   * Start periodic health checks
   */
  private startHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      this.metrics.lastHealthCheck = Date.now();

      if (this.adapter instanceof RedisCacheAdapter) {
        const health = await this.adapter.healthCheck();

        if (!health.healthy) {
          if (env.LOG_LEVEL !== "silent" && env.LOG_LEVEL !== "error") {
            console.warn("⚠️ Redis health check failed:", health.error);
          }

          // Only attempt reconnection if we haven't reached max attempts
          const status = this.adapter.getConnectionStatus();
          if (status.reconnectAttempts < 5) {
            const reconnected = await this.adapter.reconnect();
            if (!reconnected) {
              console.warn("Redis reconnection failed, continuing with memory cache fallback");
            }
          } else {
            console.warn("Redis max reconnection attempts reached, continuing with memory cache fallback");
          }
        }
      }
    } catch (error) {
      console.error("Health check error:", error);
      this.metrics.errors++;
    }
  }

  /**
   * Get cache metrics
   */
  getMetrics() {
    const hitRate = this.metrics.totalRequests > 0
      ? (this.metrics.cacheHits / this.metrics.totalRequests) * 100
      : 0;

    return {
      ...this.metrics,
      hitRate: Math.round(hitRate * 100) / 100,
      adapter: this.adapter instanceof RedisCacheAdapter ? "redis" : "memory",
      isHealthy: this.isHealthy(),
    };
  }

  /**
   * Check if cache is healthy
   */
  isHealthy(): boolean {
    if (!this.isInitialized)
      return false;

    if (this.adapter instanceof RedisCacheAdapter) {
      const status = this.adapter.getConnectionStatus();
      return status.connected;
    }

    return true; // Memory cache is always healthy
  }

  /**
   * Get detailed health status
   */
  async getHealthStatus(): Promise<{
    healthy: boolean;
    adapter: string;
    metrics: any;
    connectionStatus?: any;
  }> {
    const metrics = this.getMetrics();
    let connectionStatus = null;

    if (this.adapter instanceof RedisCacheAdapter) {
      connectionStatus = this.adapter.getConnectionStatus();
      const health = await this.adapter.healthCheck();
      return {
        healthy: health.healthy,
        adapter: "redis",
        metrics,
        connectionStatus: { ...connectionStatus, ...health },
      };
    }

    return {
      healthy: true,
      adapter: "memory",
      metrics,
      connectionStatus,
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    this.warmer.stop();
  }
}

// Default cache configuration
export const defaultCacheConfig: CacheConfig = {
  defaultTtl: 300, // 5 minutes
  maxSize: 100 * 1024 * 1024, // 100MB
  maxKeys: 10000, // Maximum number of keys
  maxMemory: 100 * 1024 * 1024, // 100MB memory limit
  enableCompression: true,
  keyPrefix: "will-mag:",
  enableStats: true,
  evictionPolicy: "lru", // LRU eviction policy
};

// Create singleton instance
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService(defaultCacheConfig);
  }
  return cacheServiceInstance;
}

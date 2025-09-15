/**
 * Cache analytics and monitoring
 */

import type { CacheKey } from "./types";

import { getCacheService } from "./cache-service";

export interface CacheAnalytics {
  /** Overall cache performance */
  performance: {
    hitRate: number;
    missRate: number;
    totalRequests: number;
    averageResponseTime: number;
  };

  /** Cache health status */
  health: {
    isHealthy: boolean;
    adapter: string;
    connectionStatus?: any;
    lastHealthCheck: number;
  };

  /** Memory usage */
  memory: {
    used: number;
    available: number;
    utilizationPercent: number;
  };

  /** Key statistics */
  keys: {
    total: number;
    expired: number;
    active: number;
    evicted: number;
  };

  /** Security metrics */
  security: {
    violations: number;
    rateLimitHits: number;
    blockedRequests: number;
  };

  /** Top accessed keys */
  topKeys: Array<{
    key: string;
    hits: number;
    lastAccessed: number;
  }>;

  /** Cache trends over time */
  trends: {
    hitRateTrend: number[];
    memoryTrend: number[];
    requestTrend: number[];
    timestamps: number[];
  };
}

export interface AnalyticsConfig {
  /** Enable analytics collection */
  enabled: boolean;
  /** Data retention period in hours */
  retentionHours: number;
  /** Collection interval in seconds */
  collectionInterval: number;
  /** Maximum number of top keys to track */
  maxTopKeys: number;
  /** Maximum number of trend data points */
  maxTrendPoints: number;
}

export class CacheAnalyticsService {
  private trends: {
    hitRate: number[];
    memory: number[];
    requests: number[];
    timestamps: number[];
  } = {
    hitRate: [],
    memory: [],
    requests: [],
    timestamps: [],
  };

  private keyAccessCounts = new Map<string, { hits: number; lastAccessed: number }>();
  private collectionInterval: NodeJS.Timeout | null = null;
  private startTime = Date.now();
  private responseTimes: number[] = [];
  private blockedRequests = 0;
  private lastMetrics = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    memory: 0,
  };

  constructor(private config: AnalyticsConfig) {
    if (config.enabled) {
      this.startCollection();
    }
  }

  /**
   * Start analytics collection
   */
  private startCollection(): void {
    this.collectionInterval = setInterval(() => {
      this.collectMetrics();
    }, this.config.collectionInterval * 1000);
  }

  /**
   * Stop analytics collection
   */
  stop(): void {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
      this.collectionInterval = null;
    }
  }

  /**
   * Clear all analytics data
   */
  clear(): void {
    this.trends = {
      hitRate: [],
      memory: [],
      requests: [],
      timestamps: [],
    };
    this.keyAccessCounts.clear();
    this.responseTimes = [];
    this.blockedRequests = 0;
    this.lastMetrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      memory: 0,
    };
    this.startTime = Date.now();
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      const cache = getCacheService();
      const metrics = cache.getMetrics();

      // Get stats safely - this will handle Redis connection failures gracefully
      let stats;
      try {
        stats = await cache.stats();
      } catch (statsError) {
        // If stats collection fails, use default values
        console.warn("Cache stats collection failed, using defaults:", statsError instanceof Error ? statsError.message : statsError);
        stats = {
          hits: 0,
          misses: 0,
          keys: 0,
          memory: 0,
          uptime: 0,
          connectionErrors: 0,
          reconnects: 0,
        };
      }

      const now = Date.now();

      // Calculate deltas (changes since last collection)
      const requestDelta = metrics.totalRequests - this.lastMetrics.totalRequests;
      const hitDelta = metrics.cacheHits - this.lastMetrics.cacheHits;

      // Calculate hit rate for this period
      const periodHitRate = requestDelta > 0 ? (hitDelta / requestDelta) * 100 : 0;

      // Add to trends
      this.trends.hitRate.push(Math.round(periodHitRate * 100) / 100);
      this.trends.memory.push(stats.memory || 0);
      this.trends.requests.push(requestDelta);
      this.trends.timestamps.push(now);

      // Update last metrics
      this.lastMetrics = {
        totalRequests: metrics.totalRequests,
        cacheHits: metrics.cacheHits,
        cacheMisses: metrics.cacheMisses,
        memory: stats.memory || 0,
      };

      // Trim trends to max points
      if (this.trends.hitRate.length > this.config.maxTrendPoints) {
        this.trends.hitRate = this.trends.hitRate.slice(-this.config.maxTrendPoints);
        this.trends.memory = this.trends.memory.slice(-this.config.maxTrendPoints);
        this.trends.requests = this.trends.requests.slice(-this.config.maxTrendPoints);
        this.trends.timestamps = this.trends.timestamps.slice(-this.config.maxTrendPoints);
      }
    } catch (error) {
      console.error("Analytics collection error:", error);
    }
  }

  /**
   * Track key access
   */
  trackKeyAccess(key: CacheKey, hit: boolean): void {
    if (!this.config.enabled)
      return;

    const existing = this.keyAccessCounts.get(key) || { hits: 0, lastAccessed: 0 };

    if (hit) {
      existing.hits++;
    }
    existing.lastAccessed = Date.now();

    this.keyAccessCounts.set(key, existing);

    // Trim to max top keys
    if (this.keyAccessCounts.size > this.config.maxTopKeys) {
      const entries = Array.from(this.keyAccessCounts.entries())
        .sort(([, a], [, b]) => b.hits - a.hits)
        .slice(0, this.config.maxTopKeys);

      this.keyAccessCounts.clear();
      entries.forEach(([key, data]) => this.keyAccessCounts.set(key, data));
    }
  }

  /**
   * Track response time
   */
  trackResponseTime(responseTime: number): void {
    if (!this.config.enabled)
      return;

    this.responseTimes.push(responseTime);

    // Keep only last 1000 response times
    if (this.responseTimes.length > 1000) {
      this.responseTimes = this.responseTimes.slice(-1000);
    }
  }

  /**
   * Track blocked request
   */
  trackBlockedRequest(): void {
    if (!this.config.enabled)
      return;
    this.blockedRequests++;
  }

  /**
   * Get comprehensive analytics
   */
  async getAnalytics(): Promise<CacheAnalytics> {
    const cache = getCacheService();
    const metrics = cache.getMetrics();
    const healthStatus = await cache.getHealthStatus();

    // Get stats safely - handle Redis connection failures
    let stats;
    try {
      stats = await cache.stats();
    } catch (statsError) {
      console.warn("Cache stats collection failed in getAnalytics, using defaults:", statsError instanceof Error ? statsError.message : statsError);
      stats = {
        hits: 0,
        misses: 0,
        keys: 0,
        memory: 0,
        uptime: 0,
        connectionErrors: 0,
        reconnects: 0,
      };
    }

    // Calculate performance metrics
    const hitRate = metrics.hitRate || 0;
    const missRate = 100 - hitRate;
    const totalRequests = metrics.totalRequests || 0;

    // Calculate memory metrics
    const memoryUsed = stats.memory || 0;
    const memoryAvailable = 100 * 1024 * 1024; // 100MB default
    const memoryUtilization = (memoryUsed / memoryAvailable) * 100;

    // Get top keys
    const topKeys = Array.from(this.keyAccessCounts.entries())
      .sort(([, a], [, b]) => b.hits - a.hits)
      .slice(0, 10)
      .map(([key, data]) => ({
        key,
        hits: data.hits,
        lastAccessed: data.lastAccessed,
      }));

    return {
      performance: {
        hitRate,
        missRate,
        totalRequests,
        averageResponseTime: this.responseTimes.length > 0
          ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
          : 0,
      },
      health: {
        isHealthy: healthStatus.healthy,
        adapter: healthStatus.adapter,
        connectionStatus: healthStatus.connectionStatus,
        lastHealthCheck: metrics.lastHealthCheck,
      },
      memory: {
        used: memoryUsed,
        available: memoryAvailable,
        utilizationPercent: Math.round(memoryUtilization * 100) / 100,
      },
      keys: {
        total: stats.keys || 0,
        expired: 0, // Would need to track expired keys
        active: stats.keys || 0,
        evicted: stats.evictions || 0,
      },
      security: {
        violations: metrics.securityViolations || 0,
        rateLimitHits: metrics.rateLimitHits || 0,
        blockedRequests: this.blockedRequests,
      },
      topKeys,
      trends: {
        hitRateTrend: this.trends.hitRate,
        memoryTrend: this.trends.memory,
        requestTrend: this.trends.requests,
        timestamps: this.trends.timestamps,
      },
    };
  }

  /**
   * Get analytics summary
   */
  async getSummary(): Promise<{
    status: "healthy" | "warning" | "critical";
    hitRate: number;
    memoryUsage: number;
    totalRequests: number;
    errors: number;
  }> {
    const analytics = await this.getAnalytics();

    let status: "healthy" | "warning" | "critical" = "healthy";

    if (analytics.performance.hitRate < 50) {
      status = "critical";
    } else if (analytics.performance.hitRate < 80) {
      status = "warning";
    }

    if (analytics.memory.utilizationPercent > 90) {
      status = "critical";
    } else if (analytics.memory.utilizationPercent > 70) {
      status = "warning";
    }

    return {
      status,
      hitRate: analytics.performance.hitRate,
      memoryUsage: analytics.memory.utilizationPercent,
      totalRequests: analytics.performance.totalRequests,
      errors: analytics.security.violations + analytics.security.rateLimitHits,
    };
  }

  /**
   * Export analytics data
   */
  async exportData(): Promise<{
    analytics: CacheAnalytics;
    exportTime: number;
    version: string;
  }> {
    return {
      analytics: await this.getAnalytics(),
      exportTime: Date.now(),
      version: "1.0.0",
    };
  }
}

/**
 * Default analytics configuration
 */
export const defaultAnalyticsConfig: AnalyticsConfig = {
  enabled: true,
  retentionHours: 24,
  collectionInterval: 60, // 1 minute
  maxTopKeys: 100,
  maxTrendPoints: 1440, // 24 hours of 1-minute intervals
};

/**
 * Create analytics service instance
 */
let analyticsServiceInstance: CacheAnalyticsService | null = null;

export function getAnalyticsService(): CacheAnalyticsService {
  if (!analyticsServiceInstance) {
    analyticsServiceInstance = new CacheAnalyticsService(defaultAnalyticsConfig);
  }
  return analyticsServiceInstance;
}

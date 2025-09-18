/**
 * Redis cache adapter implementation
 */

import env from "@/env";

import type { CacheAdapter, CacheConfig, CacheKey, CacheOptions, CacheStats, CacheValue } from "../types";

export class RedisCacheAdapter implements CacheAdapter {
  private client: any; // Redis client
  private isConnected = false;
  private connectionFailed = false;
  private lastHealthCheck = 0;
  private healthCheckInterval = 30000; // 30 seconds
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 3;
  private cacheStats = {
    hits: 0,
    misses: 0,
    keys: 0,
    memory: 0,
    uptime: Date.now(),
    connectionErrors: 0,
    reconnects: 0,
  };

  constructor(
    private config: CacheConfig,
    private redisUrl?: string,
  ) {
    // Initialize Redis asynchronously without blocking constructor
    this.initializeRedis().catch((error) => {
      this.connectionFailed = true;
      this.isConnected = false;
      console.warn("Redis initialization failed:", error instanceof Error ? error.message : error);
    });
  }

  private async initializeRedis(): Promise<void> {
    try {
      // Dynamic import to avoid requiring Redis in environments where it's not available
      const { createClient } = await import("redis");

      this.client = createClient({
        url: this.redisUrl || env.REDIS_URL || "redis://localhost:6379",
        socket: {
          reconnectStrategy: false, // Disable automatic reconnection
          connectTimeout: 5000, // 5 second timeout
        },
      });

      this.client.on("error", (err: Error) => {
        if (!this.connectionFailed) {
          if (env.LOG_LEVEL !== "silent") {
            console.error("Redis Client Error:", err);
          }
        }
        this.isConnected = false;
      });

      this.client.on("connect", () => {
        this.isConnected = true;
        this.connectionFailed = false;
        console.warn("✅ Redis connected successfully");
      });

      this.client.on("disconnect", () => {
        this.isConnected = false;
      });

      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      this.connectionFailed = true;
      this.isConnected = false;
      if (env.LOG_LEVEL !== "silent" && env.LOG_LEVEL !== "error") {
        console.warn("Redis not available, falling back to memory cache:", error instanceof Error ? error.message : error);
      }
      // Don't throw error - let the cache service handle fallback
    }
  }

  async get<T = CacheValue>(key: CacheKey): Promise<T | null> {
    if (!this.isConnected || this.connectionFailed || !this.client) {
      this.cacheStats.misses++;
      return null;
    }

    try {
      const fullKey = this.getFullKey(key);
      const value = await this.client.get(fullKey);

      if (value === null) {
        this.cacheStats.misses++;
        return null;
      }

      this.cacheStats.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error("Redis get error:", error);
      this.cacheStats.misses++;

      // Mark connection as failed if we get a client closed error
      if (error instanceof Error && error.message.includes("ClientClosedError")) {
        this.connectionFailed = true;
        this.isConnected = false;
      }

      return null;
    }
  }

  async set<T = CacheValue>(key: CacheKey, value: T, options: CacheOptions = {}): Promise<void> {
    if (!this.isConnected || this.connectionFailed || !this.client) {
      return; // Silently fail when Redis is not available
    }

    try {
      const fullKey = this.getFullKey(key);
      const ttl = options.ttl ?? this.config.defaultTtl;
      const serializedValue = JSON.stringify(value);

      await this.client.setEx(fullKey, ttl, serializedValue);

      // Add tags if provided
      if (options.tags && options.tags.length > 0) {
        await this.addTagsToKey(fullKey, options.tags);
      }

      this.cacheStats.keys++;
    } catch (error) {
      console.error("Redis set error:", error);

      // Mark connection as failed if we get a client closed error
      if (error instanceof Error && error.message.includes("ClientClosedError")) {
        this.connectionFailed = true;
        this.isConnected = false;
      }

      // Don't throw error, just fail silently
    }
  }

  async del(key: CacheKey): Promise<boolean> {
    if (!this.isConnected || this.connectionFailed) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.del(fullKey);

      if (result > 0) {
        this.cacheStats.keys--;
        // Clean up tags
        await this.removeTagsFromKey(fullKey);
      }

      return result > 0;
    } catch (error) {
      console.error("Redis del error:", error);
      return false;
    }
  }

  async delMany(keys: CacheKey[]): Promise<number> {
    if (!this.isConnected || this.connectionFailed) {
      return 0;
    }

    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const result = await this.client.del(fullKeys);

      this.cacheStats.keys -= result;

      // Clean up tags for deleted keys
      for (const key of fullKeys) {
        await this.removeTagsFromKey(key);
      }

      return result;
    } catch (error) {
      console.error("Redis delMany error:", error);
      return 0;
    }
  }

  async exists(key: CacheKey): Promise<boolean> {
    if (!this.isConnected || this.connectionFailed) {
      return false;
    }

    try {
      const fullKey = this.getFullKey(key);
      const result = await this.client.exists(fullKey);
      return result === 1;
    } catch (error) {
      console.error("Redis exists error:", error);
      return false;
    }
  }

  async getMany<T = CacheValue>(keys: CacheKey[]): Promise<(T | null)[]> {
    if (!this.isConnected || this.connectionFailed) {
      return keys.map(() => null);
    }

    try {
      const fullKeys = keys.map(key => this.getFullKey(key));
      const values = await this.client.mGet(fullKeys);

      return values.map((value: string | null) => {
        if (value === null) {
          this.cacheStats.misses++;
          return null;
        }

        this.cacheStats.hits++;
        return JSON.parse(value) as T;
      });
    } catch (error) {
      console.error("Redis getMany error:", error);
      return keys.map(() => null);
    }
  }

  async setMany<T = CacheValue>(entries: Array<{ key: CacheKey; value: T; options?: CacheOptions }>): Promise<void> {
    if (!this.isConnected || this.connectionFailed) {
      return; // Silently fail when Redis is not available
    }

    try {
      const pipeline = this.client.multi();

      for (const { key, value, options } of entries) {
        const fullKey = this.getFullKey(key);
        const ttl = options?.ttl ?? this.config.defaultTtl;
        const serializedValue = JSON.stringify(value);

        pipeline.setEx(fullKey, ttl, serializedValue);

        if (options?.tags && options.tags.length > 0) {
          pipeline.sAdd(`tags:${fullKey}`, options.tags);
        }
      }

      await pipeline.exec();
      this.cacheStats.keys += entries.length;
    } catch (error) {
      console.error("Redis setMany error:", error);
      // Don't throw error, just fail silently
    }
  }

  async clear(): Promise<void> {
    if (!this.isConnected || this.connectionFailed) {
      return; // Silently fail when Redis is not available
    }

    try {
      const pattern = `${this.config.keyPrefix}*`;
      const keys = await this.client.keys(pattern);

      if (keys.length > 0) {
        await this.client.del(keys);
      }

      this.cacheStats.keys = 0;
    } catch (error) {
      console.error("Redis clear error:", error);
      // Don't throw error, just fail silently
    }
  }

  async stats(): Promise<CacheStats> {
    // Check if Redis is available before attempting to get stats
    if (!this.isConnected || this.connectionFailed || !this.client) {
      return {
        ...this.cacheStats,
        memory: 0,
        uptime: Date.now() - this.cacheStats.uptime,
      };
    }

    try {
      const info = await this.client.info("memory");
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memory = memoryMatch ? Number.parseInt(memoryMatch[1], 10) : 0;

      return {
        ...this.cacheStats,
        memory,
        uptime: Date.now() - this.cacheStats.uptime,
      };
    } catch (error) {
      console.error("Redis stats error:", error);

      // Mark connection as failed if we get a client closed error
      if (error instanceof Error && error.message.includes("ClientClosedError")) {
        this.connectionFailed = true;
        this.isConnected = false;
      }

      return {
        ...this.cacheStats,
        memory: 0,
        uptime: Date.now() - this.cacheStats.uptime,
      };
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    if (!this.isConnected || this.connectionFailed) {
      return 0;
    }

    try {
      let deletedCount = 0;

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;
        const associatedKeys = await this.client.sMembers(tagKey);

        if (associatedKeys.length > 0) {
          // Delete all keys associated with this tag
          const result = await this.client.del(associatedKeys);
          deletedCount += result;
          this.cacheStats.keys -= result;

          // Clean up tag associations
          for (const key of associatedKeys) {
            await this.removeTagsFromKey(key);
          }
        }
      }

      return deletedCount;
    } catch (error) {
      console.error("Redis invalidateByTags error:", error);
      return 0;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.client) {
        try {
          // Only attempt to quit if client is still connected
          if (this.isConnected) {
            await this.client.quit();
          }
        } catch (quitError) {
          // Ignore quit errors - client might already be closed
          console.warn("Client quit error during close (ignoring):", quitError instanceof Error ? quitError.message : quitError);
        }

        // Clear references
        this.client = null;
        this.isConnected = false;
        this.connectionFailed = true;
      }
    } catch (error) {
      console.error("Redis close error:", error);
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ healthy: boolean; latency: number; error?: string }> {
    const startTime = Date.now();

    try {
      if (!this.client) {
        return { healthy: false, latency: 0, error: "No client instance" };
      }

      if (!this.isConnected || this.connectionFailed) {
        return { healthy: false, latency: 0, error: "Not connected" };
      }

      // Simple ping to check connection
      await this.client.ping();

      const latency = Date.now() - startTime;
      this.lastHealthCheck = Date.now();

      return { healthy: true, latency };
    } catch (error) {
      this.cacheStats.connectionErrors++;
      this.isConnected = false;

      // If ping fails, mark connection as failed
      if (error instanceof Error && (error.message.includes("ClientClosedError") || error.message.includes("ECONNREFUSED"))) {
        this.connectionFailed = true;
      }

      return {
        healthy: false,
        latency: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Attempt to reconnect to Redis
   */
  async reconnect(): Promise<boolean> {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn("Max reconnection attempts reached, Redis will remain unavailable");
      return false;
    }

    this.reconnectAttempts++;
    console.warn(`Attempting Redis reconnection (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);

    try {
      // Safely close existing client if it exists
      if (this.client) {
        try {
          // Check if client is still connected before attempting to quit
          if (this.isConnected) {
            await this.client.quit();
          }
        } catch (quitError) {
          // Ignore quit errors - client might already be closed
          console.warn("Client quit error during reconnect (ignoring):", quitError instanceof Error ? quitError.message : quitError);
        }

        // Clear the client reference
        this.client = null;
        this.isConnected = false;
      }

      // Reset connection state
      this.connectionFailed = false;

      // Initialize new connection
      await this.initializeRedis();

      // Verify the connection actually worked
      if (this.isConnected && !this.connectionFailed) {
        this.reconnectAttempts = 0;
        this.cacheStats.reconnects++;
        // quiet success
        return true;
      } else {
        // quiet failure
        this.connectionFailed = true;
        return false;
      }
    } catch {
      // quiet error to avoid noise when redis is down
      this.connectionFailed = true;
      this.isConnected = false;
      return false;
    }
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): { connected: boolean; lastHealthCheck: number; reconnectAttempts: number } {
    return {
      connected: this.isConnected,
      lastHealthCheck: this.lastHealthCheck,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  private getFullKey(key: CacheKey): string {
    return `${this.config.keyPrefix}${key}`;
  }

  private async addTagsToKey(key: string, tags: string[]): Promise<void> {
    try {
      for (const tag of tags) {
        await this.client.sAdd(`tags:${key}`, tag);
        await this.client.sAdd(`tag:${tag}`, key);
      }
    } catch (error) {
      console.error("Redis addTagsToKey error:", error);
    }
  }

  private async removeTagsFromKey(key: string): Promise<void> {
    try {
      const tags = await this.client.sMembers(`tags:${key}`);

      for (const tag of tags) {
        await this.client.sRem(`tag:${tag}`, key);
      }

      await this.client.del(`tags:${key}`);
    } catch (error) {
      console.error("Redis removeTagsFromKey error:", error);
    }
  }
}

/**
 * Examples of how to use the caching service
 */

import type { User } from "@/generated/prisma";

import { AnalyticsCacheUtils, ContestCacheUtils, LeaderboardCacheUtils } from "./cache-utils";
import { getCacheService } from "./index";

// Example 1: Basic cache usage
export async function basicCacheExample() {
  const cache = getCacheService();

  // Simple get/set
  await cache.set("user:123", { name: "John", email: "john@example.com" }, { ttl: 300 });
  const _user = await cache.get<User>("user:123");

  // With tags for invalidation
  await cache.set("contest:456", { title: "Contest 1" }, {
    ttl: 600,
    tags: ["contest", "active"],
  });

  // Invalidate by tags
  await cache.invalidateByTags(["contest"]);
}

// Example 2: Manual cache management in route handlers
export class ContestHandlers {
  async getParticipants(c: any) {
    const cache = getCacheService();
    const { contestId } = c.req.valid("param");
    const { page = 1, limit = 50, search, status } = c.req.valid("query");

    // Generate cache key
    const cacheKey = `contest:${contestId}:participants:${page}:${limit}:${search || ""}:${status || ""}`;

    // Try to get from cache
    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json(cached, 200);
    }

    // Your existing handler logic here
    const result = { data: [], pagination: {} };

    // Cache the result
    await cache.set(cacheKey, result, {
      ttl: 300, // 5 minutes
      tags: ["contest", "participants"],
    });

    return c.json(result, 200);
  }

  async getLeaderboard(c: any) {
    const cache = getCacheService();
    const { page = 1, limit = 50 } = c.req.valid("query");

    const cacheKey = `leaderboard:${page}:${limit}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json(cached, 200);
    }

    // Your existing handler logic here
    const result = { data: [], pagination: {} };

    await cache.set(cacheKey, result, {
      ttl: 600, // 10 minutes
      tags: ["leaderboard"],
    });

    return c.json(result, 200);
  }

  async getDashboardStats(c: any) {
    const cache = getCacheService();
    const cacheKey = "analytics:dashboard";

    const cached = await cache.get(cacheKey);
    if (cached) {
      return c.json(cached, 200);
    }

    // Your existing handler logic here
    const result = { stats: {} };

    await cache.set(cacheKey, result, {
      ttl: 900, // 15 minutes
      tags: ["analytics", "dashboard"],
    });

    return c.json(result, 200);
  }
}

// Example 3: Using cache utilities
export async function cacheUtilitiesExample() {
  // Cache a database query
  const _users = await ContestCacheUtils.cacheContestParticipantsWithVotes(
    "contest-123",
    1,
    50,
    undefined, // search
    undefined, // status
    async () => {
      // Your database query here
      return { data: [], pagination: {} };
    },
    300,
  );

  // Cache analytics data
  const _analytics = await AnalyticsCacheUtils.cacheDashboardAnalytics(
    async () => {
      // Your analytics query here
      return { totalUsers: 100, totalVotes: 500 };
    },
    900,
  );

  // Cache leaderboard data
  const _leaderboard = await LeaderboardCacheUtils.cacheLeaderboard(
    1,
    50,
    async () => {
      // Your leaderboard query here
      return { data: [], pagination: {} };
    },
    600,
  );
}

// Example 4: Manual cache management
export async function manualCacheExample() {
  const cache = getCacheService();

  // Cache with custom options
  await cache.set("expensive-calculation", { result: 42 }, {
    ttl: 1800, // 30 minutes
    tags: ["calculation", "expensive"],
    namespace: "math",
  });

  // Get with type safety
  const _result = await cache.get<{ result: number }>("expensive-calculation");

  // Batch operations
  await cache.setMany([
    { key: "key1", value: "value1", options: { ttl: 300 } },
    { key: "key2", value: "value2", options: { ttl: 600 } },
  ]);

  const _values = await cache.getMany(["key1", "key2"]);

  // Invalidate specific patterns
  await cache.invalidateContestCache("contest-123", "participation");
  await cache.invalidateProfileCache("profile-456", "rank");
  await cache.invalidateGlobalCache("vote");
}

// Example 5: Error handling and fallbacks
export async function errorHandlingExample() {
  const cache = getCacheService();

  try {
    // Try to get from cache
    const cached = await cache.get("important-data");
    if (cached) {
      return cached;
    }
  } catch (error) {
    console.warn("Cache error, proceeding without cache:", error);
  }

  // Fetch fresh data
  const freshData = await fetchImportantData();

  try {
    // Try to cache the result
    await cache.set("important-data", freshData, { ttl: 300 });
  } catch (error) {
    console.warn("Failed to cache data:", error);
  }

  return freshData;
}

// Example 6: Cache warming
export async function cacheWarmingExample() {
  const cache = getCacheService();

  // Warm up frequently accessed data
  await cache.warmup();

  // Or warm up specific data
  const warmingOperations = [
    async () => {
      await AnalyticsCacheUtils.cacheDashboardAnalytics(
        () => fetchDashboardStats(),
        900,
      );
    },
    async () => {
      await LeaderboardCacheUtils.cacheLeaderboard(
        1,
        50,
        () => fetchLeaderboard(1, 50),
        600,
      );
    },
  ];

  await Promise.allSettled(warmingOperations.map(op => op()));
}

// Helper functions for examples
async function fetchImportantData() {
  // Simulate database query
  return { data: "important" };
}

async function fetchDashboardStats() {
  // Simulate analytics query
  return { totalUsers: 100, totalVotes: 500 };
}

async function fetchLeaderboard(page: number, limit: number) {
  // Simulate leaderboard query
  return { data: [], pagination: { page, limit } };
}

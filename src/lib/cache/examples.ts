/**
 * Examples of how to use the caching service
 */

import type { User } from "@/generated/prisma";

import { AnalyticsCacheUtils, ContestCacheUtils, LeaderboardCacheUtils } from "./cache-utils";
import { CacheAnalytics, CacheContestParticipants, CacheLeaderboard, getCacheService } from "./index";

// Example 1: Basic cache usage
export async function basicCacheExample() {
  const cache = getCacheService({
    enableCompression: true,
  });

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

// Example 2: Using decorators in route handlers
export class ContestHandlers {
  // @CacheContestParticipants(300) // Cache for 5 minutes
  async getParticipants(c: any) {
    // Your existing handler logic
    // The decorator will automatically cache the result
    return c.json({ data: [], pagination: {} }, 200);
  }

  // @CacheLeaderboard(600) // Cache for 10 minutes
  async getLeaderboard(c: any) {
    // Your existing handler logic
    return c.json({ data: [], pagination: {} }, 200);
  }

  // @CacheAnalytics("dashboard", 900) // Cache for 15 minutes
  async getDashboardStats(c: any) {
    // Your existing handler logic
    return c.json({ stats: {} }, 200);
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
  }
  catch (error) {
    console.warn("Cache error, proceeding without cache:", error);
  }

  // Fetch fresh data
  const freshData = await fetchImportantData();

  try {
    // Try to cache the result
    await cache.set("important-data", freshData, { ttl: 300 });
  }
  catch (error) {
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

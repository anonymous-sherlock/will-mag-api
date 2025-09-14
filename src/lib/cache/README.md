# Cache Service Layer

A comprehensive, type-safe caching service layer for the Will Mag API with support for Redis and in-memory caching.

## Features

- **Type-safe**: Full TypeScript support with proper type inference
- **Multiple backends**: Redis and in-memory adapters with automatic fallback
- **Manual cache management**: Explicit cache control with utility functions
- **Tag-based invalidation**: Smart cache invalidation using tags
- **Batch operations**: Efficient batch get/set operations
- **Statistics**: Built-in cache statistics and monitoring
- **Key generators**: Consistent cache key generation patterns
- **Utility functions**: High-level utilities for common caching patterns

## Quick Start

### Basic Usage

```typescript
import { getCacheService } from "@/lib/cache";

const cache = getCacheService();

// Simple get/set
await cache.set("user:123", { name: "John" }, { ttl: 300 });
const user = await cache.get("user:123");

// With tags for invalidation
await cache.set("contest:456", { title: "Contest 1" }, {
  ttl: 600,
  tags: ["contest", "active"]
});

// Invalidate by tags
await cache.invalidateByTags(["contest"]);
```

### Manual Cache Management

```typescript
import { getCacheService } from "@/lib/cache";

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
      tags: ["contest", "participants"]
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
      tags: ["leaderboard"]
    });

    return c.json(result, 200);
  }
}
```

### Using Cache Utilities

```typescript
import { AnalyticsCacheUtils, ContestCacheUtils } from "@/lib/cache";

// Cache contest participants with vote counts
const participants = await ContestCacheUtils.cacheContestParticipantsWithVotes(
  "contest-123",
  1,
  50,
  undefined,
  async () => {
    // Your database query here
    return { data: [], pagination: {} };
  },
  300
);

// Cache analytics data
const analytics = await AnalyticsCacheUtils.cacheDashboardAnalytics(
  async () => {
    // Your analytics query here
    return { totalUsers: 100, totalVotes: 500 };
  },
  900
);
```

## Configuration

### Environment Variables

```bash
# Redis URL (optional - falls back to memory cache if not provided)
REDIS_URL=redis://localhost:6379
```

### Cache Configuration

```typescript
import { getCacheService } from "@/lib/cache";

const cache = getCacheService();
// Cache service uses default configuration
// Configuration can be modified via environment variables
```

## Cache Key Patterns

The service uses consistent key patterns for different data types:

- **Contest participants**: `contest:participants:{contestId}:page:{page}:limit:{limit}`
- **Leaderboard**: `leaderboard:main:page:{page}:limit:{limit}`
- **Analytics**: `analytics:dashboard`, `analytics:detailed:{period}`
- **Profile ranks**: `profile:rank:{profileId}`
- **Vote counts**: `vote:counts:{contestId}:{profileIds}`

## Cache Invalidation

### Automatic Invalidation

The service automatically invalidates related cache entries when data changes:

```typescript
// When contest participation changes
await cache.invalidateContestCache("contest-123", "participation");

// When profile rank changes
await cache.invalidateProfileCache("profile-456", "rank");

// When global vote changes
await cache.invalidateGlobalCache("vote");
```

### Manual Invalidation

```typescript
// Invalidate by tags
await cache.invalidateByTags(["contest", "leaderboard"]);

// Invalidate specific keys
await cache.del("contest:participants:123");
await cache.delMany(["key1", "key2", "key3"]);

// Clear all cache
await cache.clear();
```

## Performance Monitoring

```typescript
// Get cache statistics
const stats = await cache.stats();
console.warn({
  hits: stats.hits,
  misses: stats.misses,
  keys: stats.keys,
  memory: stats.memory,
  uptime: stats.uptime
});
```

## Best Practices

1. **Use appropriate TTLs**: Set TTLs based on data freshness requirements
2. **Use tags for invalidation**: Tag related cache entries for efficient invalidation
3. **Batch operations**: Use batch operations for multiple keys when possible
4. **Monitor performance**: Regularly check cache statistics
5. **Handle errors gracefully**: Cache failures shouldn't break your application

## Error Handling

The cache service is designed to fail gracefully:

- If Redis is unavailable, it automatically falls back to memory cache
- Cache errors are logged but don't throw exceptions
- Missing cache entries return `null` instead of throwing errors

## Examples

See `src/lib/cache/examples.ts` for comprehensive usage examples.

## API Reference

### Cache Service Methods

- `get<T>(key: CacheKey): Promise<T | null>`
- `set<T>(key: CacheKey, value: T, options?: CacheOptions): Promise<void>`
- `del(key: CacheKey): Promise<boolean>`
- `delMany(keys: CacheKey[]): Promise<number>`
- `exists(key: CacheKey): Promise<boolean>`
- `getMany<T>(keys: CacheKey[]): Promise<(T | null)[]>`
- `setMany<T>(entries: Array<{key: CacheKey; value: T; options?: CacheOptions}>): Promise<void>`
- `clear(): Promise<void>`
- `stats(): Promise<CacheStats>`
- `invalidateByTags(tags: string[]): Promise<number>`
- `invalidateContestCache(contestId: string, type: string): Promise<void>`
- `invalidateProfileCache(profileId: string, type: string): Promise<void>`
- `invalidateGlobalCache(type: string): Promise<void>`

### Utility Classes

- `CacheUtils`: General cache utilities
- `ContestCacheUtils`: Contest-specific cache utilities
- `AnalyticsCacheUtils`: Analytics-specific cache utilities
- `LeaderboardCacheUtils`: Leaderboard-specific cache utilities

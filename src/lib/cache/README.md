# Cache Service Layer

A comprehensive, type-safe caching service layer for the Will Mag API with support for Redis and in-memory caching.

## Features

- **Type-safe**: Full TypeScript support with proper type inference
- **Multiple backends**: Redis and in-memory adapters with automatic fallback
- **Decorators**: Easy-to-use decorators for route handlers
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

### Using Decorators

```typescript
import { CacheContestParticipants, CacheLeaderboard } from "@/lib/cache";

export class ContestHandlers {
  @CacheContestParticipants(300) // Cache for 5 minutes
  async getParticipants(c: any) {
    // Your existing handler logic
    return c.json({ data: [], pagination: {} }, 200);
  }

  @CacheLeaderboard(600) // Cache for 10 minutes
  async getLeaderboard(c: any) {
    // Your existing handler logic
    return c.json({ data: [], pagination: {} }, 200);
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
import { createCacheService } from "@/lib/cache";

const cache = createCacheService({
  defaultTtl: 300, // 5 minutes default TTL
  maxSize: 100 * 1024 * 1024, // 100MB max size
  enableCompression: false,
  keyPrefix: "will-mag:",
  enableStats: true,
});
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

### CacheService

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

### Decorators

- `@Cache(options?: CacheDecoratorOptions)`
- `@CacheContestParticipants(ttl?: number)`
- `@CacheLeaderboard(ttl?: number)`
- `@CacheAnalytics(type: string, ttl?: number)`
- `@CacheProfileRank(ttl?: number)`
- `@InvalidateCache(patterns: string[] | Function)`
- `@InvalidateContestCache(type: string)`
- `@InvalidateProfileCache(type: string)`
- `@InvalidateGlobalCache(type: string)`

### Utility Classes

- `CacheUtils`: General cache utilities
- `ContestCacheUtils`: Contest-specific cache utilities
- `AnalyticsCacheUtils`: Analytics-specific cache utilities
- `LeaderboardCacheUtils`: Leaderboard-specific cache utilities

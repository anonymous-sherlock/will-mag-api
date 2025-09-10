/**
 * Cache decorators for easy integration with route handlers
 */

import env from "@/env";

import type { CacheOptions } from "./types";

import { getCacheService } from "./cache-service";
import { CACHE_TAGS, cacheKeyGenerators } from "./key-generators";

/**
 * Cache decorator options
 */
export interface CacheDecoratorOptions extends CacheOptions {
  /** Custom key generator function */
  keyGenerator?: (...args: any[]) => string;
  /** Whether to skip cache in development */
  skipInDevelopment?: boolean;
  /** Custom condition to determine if result should be cached */
  shouldCache?: (result: any) => boolean;
}

/**
 * Generic cache decorator
 */
export function Cache(options: CacheDecoratorOptions = {}) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (...args: any[]) {
      // Skip cache in development if specified
      if (options.skipInDevelopment && env.NODE_ENV === "development") {
        return method.apply(this, args);
      }

      // Generate cache key
      const key = options.keyGenerator
        ? options.keyGenerator(...args)
        : `${target.constructor.name}:${propertyName}:${JSON.stringify(args)}`;

      // Try to get from cache
      try {
        const cached = await cache.get(key);
        if (cached !== null) {
          return cached;
        }
      }
      catch (error) {
        console.warn("Cache get error:", error);
      }

      // Execute original method
      const result = await method.apply(this, args);

      // Cache the result if condition is met
      if (!options.shouldCache || options.shouldCache(result)) {
        try {
          await cache.set(key, result, options);
        }
        catch (error) {
          console.warn("Cache set error:", error);
        }
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache decorator for contest participants
 */
export function CacheContestParticipants(ttl = 300) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (c: any) {
      const { contestId } = c.req.valid("param");
      const { page = 1, limit = 50, search, status } = c.req.valid("query");

      const key = cacheKeyGenerators.contest.participants(contestId, page, limit, search, status);

      try {
        const cached = await cache.get(key);
        if (cached !== null) {
          return c.json(cached, 200);
        }
      }
      catch (error) {
        console.warn("Cache get error:", error);
      }

      const result = await method.apply(this, [c]);

      try {
        await cache.set(key, result, {
          ttl,
          tags: [CACHE_TAGS.CONTEST, CACHE_TAGS.LEADERBOARD],
        });
      }
      catch (error) {
        console.warn("Cache set error:", error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache decorator for leaderboard data
 */
export function CacheLeaderboard(ttl = 600) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (c: any) {
      const { page = 1, limit = 50 } = c.req.valid("query");

      const key = cacheKeyGenerators.leaderboard.main(page, limit);

      try {
        const cached = await cache.get(key);
        if (cached !== null) {
          return c.json(cached, 200);
        }
      }
      catch (error) {
        console.warn("Cache get error:", error);
      }

      const result = await method.apply(this, [c]);

      try {
        await cache.set(key, result, {
          ttl,
          tags: [CACHE_TAGS.LEADERBOARD],
        });
      }
      catch (error) {
        console.warn("Cache set error:", error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache decorator for analytics data
 */
export function CacheAnalytics(type: "dashboard" | "detailed" | "contest" | "votes", ttl = 900) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (c: any) {
      let key: string;

      if (type === "detailed") {
        const { period = "7d" } = c.req.valid("query");
        key = cacheKeyGenerators.analytics.detailed(period);
      }
      else {
        key = cacheKeyGenerators.analytics[type]();
      }

      try {
        const cached = await cache.get(key);
        if (cached !== null) {
          return c.json(cached, 200);
        }
      }
      catch (error) {
        console.warn("Cache get error:", error);
      }

      const result = await method.apply(this, [c]);

      try {
        await cache.set(key, result, {
          ttl,
          tags: [CACHE_TAGS.ANALYTICS],
        });
      }
      catch (error) {
        console.warn("Cache set error:", error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache decorator for profile rank data
 */
export function CacheProfileRank(ttl = 1800) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (c: any) {
      const { profileId } = c.req.valid("param");

      const key = cacheKeyGenerators.profile.rank(profileId);

      try {
        const cached = await cache.get(key);
        if (cached !== null) {
          return c.json(cached, 200);
        }
      }
      catch (error) {
        console.warn("Cache get error:", error);
      }

      const result = await method.apply(this, [c]);

      try {
        await cache.set(key, result, {
          ttl,
          tags: [CACHE_TAGS.PROFILE, CACHE_TAGS.LEADERBOARD],
        });
      }
      catch (error) {
        console.warn("Cache set error:", error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator
 */
export function InvalidateCache(patterns: string[] | ((...args: any[]) => string[])) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);

      try {
        const keysToInvalidate = typeof patterns === "function"
          ? patterns(...args)
          : patterns;

        await cache.delMany(keysToInvalidate);
      }
      catch (error) {
        console.warn("Cache invalidation error:", error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator for contest changes
 */
export function InvalidateContestCache(type: "participation" | "vote" | "update") {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (c: any) {
      const result = await method.apply(this, [c]);

      try {
        const { contestId } = c.req.valid("param") || c.req.valid("json") || {};
        if (contestId) {
          await cache.invalidateContestCache(contestId, type);
        }
      }
      catch (error) {
        console.warn("Cache invalidation error:", error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator for profile changes
 */
export function InvalidateProfileCache(type: "rank" | "stats") {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (c: any) {
      const result = await method.apply(this, [c]);

      try {
        const { profileId } = c.req.valid("param") || c.req.valid("json") || {};
        if (profileId) {
          await cache.invalidateProfileCache(profileId, type);
        }
      }
      catch (error) {
        console.warn("Cache invalidation error:", error);
      }

      return result;
    };

    return descriptor;
  };
}

/**
 * Cache invalidation decorator for global changes
 */
export function InvalidateGlobalCache(type: "vote" | "user") {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;
    const cache = getCacheService();

    descriptor.value = async function (...args: any[]) {
      const result = await method.apply(this, args);

      try {
        await cache.invalidateGlobalCache(type);
      }
      catch (error) {
        console.warn("Cache invalidation error:", error);
      }

      return result;
    };

    return descriptor;
  };
}

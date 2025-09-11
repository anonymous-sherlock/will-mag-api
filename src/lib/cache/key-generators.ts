/**
 * Cache key generators for consistent key naming
 */

import type { CacheKeyGenerators } from "./types";

export const CACHE_NAMESPACES = {
  CONTEST: "contest",
  LEADERBOARD: "leaderboard",
  ANALYTICS: "analytics",
  PROFILE: "profile",
  VOTE: "vote",
  USER: "user",
} as const;

export const CACHE_TAGS = {
  CONTEST: "contest",
  LEADERBOARD: "leaderboard",
  ANALYTICS: "analytics",
  PROFILE: "profile",
  VOTE: "vote",
  USER: "user",
  GLOBAL: "global",
} as const;

/**
 * Generate cache keys for different data types
 */
export const cacheKeyGenerators: CacheKeyGenerators = {
  contest: {
    participants: (contestId: string, page = 1, limit = 50, search?: string, status?: string) => {
      const searchKey = search ? `:search:${search}` : "";
      const statusKey = status ? `:status:${status}` : "";
      return `${CACHE_NAMESPACES.CONTEST}:participants:${contestId}:page:${page}:limit:${limit}${searchKey}${statusKey}`;
    },

    winner: (contestId: string) =>
      `${CACHE_NAMESPACES.CONTEST}:winner:${contestId}`,

    stats: (contestId: string) =>
      `${CACHE_NAMESPACES.CONTEST}:stats:${contestId}`,

    participation: (contestId: string, profileId: string) =>
      `${CACHE_NAMESPACES.CONTEST}:participation:${contestId}:${profileId}`,

    list: (page = 1, limit = 50, status?: string, search?: string) => {
      const statusKey = status ? `:status:${status}` : "";
      const searchKey = search ? `:search:${search}` : "";
      return `${CACHE_NAMESPACES.CONTEST}:list:page:${page}:limit:${limit}${statusKey}${searchKey}`;
    },

    byId: (contestId: string) =>
      `${CACHE_NAMESPACES.CONTEST}:byId:${contestId}`,

    bySlug: (slug: string) =>
      `${CACHE_NAMESPACES.CONTEST}:bySlug:${slug}`,

    leaderboard: (contestId: string, page = 1, limit = 50) =>
      `${CACHE_NAMESPACES.CONTEST}:leaderboard:${contestId}:page:${page}:limit:${limit}`,
  },

  leaderboard: {
    main: (page = 1, limit = 50) =>
      `${CACHE_NAMESPACES.LEADERBOARD}:main:page:${page}:limit:${limit}`,

    stats: () =>
      `${CACHE_NAMESPACES.LEADERBOARD}:stats`,
  },

  analytics: {
    dashboard: () =>
      `${CACHE_NAMESPACES.ANALYTICS}:dashboard`,

    detailed: (period: string) =>
      `${CACHE_NAMESPACES.ANALYTICS}:detailed:${period}`,

    contest: () =>
      `${CACHE_NAMESPACES.ANALYTICS}:contest`,

    votes: () =>
      `${CACHE_NAMESPACES.ANALYTICS}:votes`,
  },

  profile: {
    rank: (profileId: string) =>
      `${CACHE_NAMESPACES.PROFILE}:rank:${profileId}`,

    stats: (profileId: string) =>
      `${CACHE_NAMESPACES.PROFILE}:stats:${profileId}`,

    list: (page = 1, limit = 50, search?: string, profileId?: string) => {
      const searchKey = search ? `:search:${search}` : "";
      const profileKey = profileId ? `:profile:${profileId}` : "";
      return `${CACHE_NAMESPACES.PROFILE}:list:page:${page}:limit:${limit}${searchKey}${profileKey}`;
    },

    activeParticipation: (profileId: string, page = 1, limit = 50) =>
      `${CACHE_NAMESPACES.PROFILE}:activeParticipation:${profileId}:page:${page}:limit:${limit}`,
  },

  vote: {
    counts: (contestId: string, profileIds: string[]) => {
      const sortedIds = [...profileIds].sort().join(",");
      return `${CACHE_NAMESPACES.VOTE}:counts:${contestId}:${sortedIds}`;
    },

    stats: (contestId: string) =>
      `${CACHE_NAMESPACES.VOTE}:stats:${contestId}`,
  },
};

/**
 * Generate cache invalidation patterns
 */
export const cacheInvalidationPatterns = {
  contest: {
    onParticipationChange: (contestId: string) => [
      cacheKeyGenerators.contest.participants(contestId),
      cacheKeyGenerators.contest.stats(contestId),
      cacheKeyGenerators.leaderboard.main(),
      cacheKeyGenerators.leaderboard.stats(),
      cacheKeyGenerators.analytics.dashboard(),
    ],

    onVoteChange: (contestId: string) => [
      cacheKeyGenerators.contest.participants(contestId),
      cacheKeyGenerators.contest.stats(contestId),
      cacheKeyGenerators.leaderboard.main(),
      cacheKeyGenerators.leaderboard.stats(),
      cacheKeyGenerators.analytics.dashboard(),
      cacheKeyGenerators.analytics.votes(),
    ],

    onContestUpdate: (contestId: string) => [
      cacheKeyGenerators.contest.winner(contestId),
      cacheKeyGenerators.contest.stats(contestId),
      cacheKeyGenerators.analytics.contest(),
    ],
  },

  profile: {
    onRankChange: (profileId: string) => [
      cacheKeyGenerators.profile.rank(profileId),
      cacheKeyGenerators.profile.list(),
      cacheKeyGenerators.leaderboard.main(),
    ],

    onStatsChange: (profileId: string) => [
      cacheKeyGenerators.profile.stats(profileId),
      cacheKeyGenerators.leaderboard.main(),
      cacheKeyGenerators.leaderboard.stats(),
    ],

    onParticipationChange: (profileId: string) => [
      // Invalidate all active participation cache for this profile
      // Note: We can't invalidate specific pages, so we invalidate by tags
      `profile:activeParticipation:${profileId}:*`,
      cacheKeyGenerators.profile.stats(profileId),
      cacheKeyGenerators.leaderboard.main(),
    ],
  },

  global: {
    onVoteChange: () => [
      cacheKeyGenerators.analytics.dashboard(),
      cacheKeyGenerators.analytics.votes(),
      cacheKeyGenerators.leaderboard.main(),
      cacheKeyGenerators.leaderboard.stats(),
    ],

    onUserChange: () => [
      cacheKeyGenerators.analytics.dashboard(),
      cacheKeyGenerators.leaderboard.main(),
    ],

    onContestChange: () => [
      cacheKeyGenerators.analytics.dashboard(),
      cacheKeyGenerators.analytics.contest(),
      cacheKeyGenerators.leaderboard.main(),
    ],
  },
};

/**
 * Utility function to create cache keys with consistent formatting
 */
export function createCacheKey(
  namespace: string,
  ...parts: (string | number | undefined)[]
): string {
  const validParts = parts.filter(part => part !== undefined && part !== null);
  return `${namespace}:${validParts.join(":")}`;
}

/**
 * Utility function to create cache keys with query parameters
 */
export function createCacheKeyWithQuery(
  baseKey: string,
  query: Record<string, any>,
): string {
  const sortedQuery = Object.keys(query)
    .sort()
    .map(key => `${key}:${query[key]}`)
    .join(":");

  return sortedQuery ? `${baseKey}:${sortedQuery}` : baseKey;
}

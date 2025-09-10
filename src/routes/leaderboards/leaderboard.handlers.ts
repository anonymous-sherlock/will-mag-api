import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { CacheLeaderboard } from "@/lib/cache";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type {
  getLeaderboard as GetLeaderboardRoute,
  GetLeaderboardStatsRoute,
} from "./leaderboard.routes";

export const getLeaderboard: AppRouteHandler<typeof GetLeaderboardRoute> = async (c) => {
  const { page = 1, limit = 50 } = c.req.valid("query");
  const offset = (page - 1) * limit;

  // Get total count of profiles with votes and valid usernames
  const totalProfilesWithVotes = await db.profile.count({
    where: {
      votesReceived: {
        some: {},
      },
      user: {
        username: {
          not: null,
        },
      },
    },
  });

  // Get profiles with vote counts, ordered by total votes descending
  const profilesWithVotes = await db.profile.findMany({
    where: {
      votesReceived: {
        some: {},
      },
      user: {
        username: {
          not: null,
        },
      },
    },
    select: {
      id: true,
      user: {
        select: {
          id: true,
          username: true,
          displayUsername: true,
        },
      },
      coverImage: {
        select: {
          url: true,
        },
      },
      bio: true,
      createdAt: true,
      votesReceived: {
        select: {
          type: true,
          count: true,
        },
      },
    },
    orderBy: {
      votesReceived: {
        _count: "desc",
      },
    },
    skip: offset,
    take: limit,
  });

  // Sort by paid votes first, then by total votes
  profilesWithVotes.sort((a, b) => {
    const aPaidVotes = a.votesReceived
      .filter(vote => vote.type === "PAID")
      .reduce((sum, vote) => sum + vote.count, 0);
    const bPaidVotes = b.votesReceived
      .filter(vote => vote.type === "PAID")
      .reduce((sum, vote) => sum + vote.count, 0);

    // First sort by paid votes (descending)
    if (aPaidVotes !== bPaidVotes) {
      return bPaidVotes - aPaidVotes;
    }

    // If paid votes are equal, sort by total votes (descending)
    const aTotalVotes = a.votesReceived.reduce((sum, vote) => sum + vote.count, 0);
    const bTotalVotes = b.votesReceived.reduce((sum, vote) => sum + vote.count, 0);
    return bTotalVotes - aTotalVotes;
  });

  // Process the data to calculate vote counts and ranks
  const leaderboardData = profilesWithVotes.map((profile, index) => {
    const totalVotes = profile.votesReceived.reduce((sum, vote) => sum + vote.count, 0);
    const freeVotes = profile.votesReceived
      .filter(vote => vote.type === "FREE")
      .reduce((sum, vote) => sum + vote.count, 0);
    const paidVotes = profile.votesReceived
      .filter(vote => vote.type === "PAID")
      .reduce((sum, vote) => sum + vote.count, 0);
    const rank = offset + index + 1;

    return {
      rank,
      profileId: profile.id,
      userId: profile.user.id,
      username: profile.user.username!,
      displayUsername: profile.user.displayUsername,
      coverImage: profile.coverImage?.url || null,
      bio: profile.bio,
      totalVotes,
      freeVotes,
      paidVotes,
      createdAt: profile.createdAt.toISOString(),
    };
  });

  const pagination = calculatePaginationMetadata(totalProfilesWithVotes, page, limit);

  return c.json({ data: leaderboardData, pagination }, HttpStatusCodes.OK);
};

export const getLeaderboardStats: AppRouteHandler<GetLeaderboardStatsRoute> = async (c) => {
  const [totalModels, voteAggregate, activeContests] = await Promise.all([
    db.profile.count(),
    db.vote.aggregate({
      _sum: { count: true },
    }),
    db.contest.count({
      where: { status: "ACTIVE" },
    }),
  ]);

  const totalVotes = voteAggregate._sum.count ?? 0;

  return c.json(
    {
      totalModels,
      totalVotes,
      activeContests,
    },
    HttpStatusCodes.OK,
  );
};

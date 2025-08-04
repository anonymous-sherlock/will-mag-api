import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { CreateRoute, GetAvailableContestsRoute, GetContestLeaderboardRoute, GetContestStatsRoute, GetJoinedContestsRoute, GetOneRoute, GetUpcomingContestsRoute, ListRoute, PatchRoute, RemoveRoute } from "./contest.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      skip: (page - 1) * limit,
      take: limit,
      include: {
        awards: true,
      },
    }),
    db.contest.count(),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: contests,
    pagination,
  }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const { awards, ...contest } = c.req.valid("json");

  const insertedContest = await db.contest.create({
    data: {
      ...contest,
      awards: {
        createMany: {
          data: awards,
          skipDuplicates: true,
        },
      },
    },
    include: {
      awards: true,
    },
  });

  return c.json(insertedContest, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      awards: true,
    },
  });

  if (!contest)
    return sendErrorResponse(c, "notFound", "Contest not found");

  return c.json(contest, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const contestData = c.req.valid("json");

  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const updatedContest = await db.contest.update({
    where: { id },
    data: contestData,
  });

  return c.json(updatedContest, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Delete all related records first, then delete the contest
  await db.$transaction([
    db.contestParticipation.deleteMany({
      where: { contestId: id },
    }),
    db.vote.deleteMany({
      where: { contestId: id },
    }),
    db.contest.delete({
      where: { id },
    }),
  ]);

  return c.json({ message: "Contest deleted successfully" }, HttpStatusCodes.OK);
};

export const getUpcomingContests: AppRouteHandler<GetUpcomingContestsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");

  // Get all upcoming contests
  const now = new Date();

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      where: {
        startDate: {
          gte: now,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        awards: true,
      },
    }),
    db.contest.count({
      where: {
        startDate: {
          gte: now,
        },
      },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: contests,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getAvailableContests: AppRouteHandler<GetAvailableContestsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const { userId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { userId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const now = new Date();

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      where: {
        endDate: {
          gte: now,
        },
        startDate: {
          gte: now,
        },
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: "asc" },
      include: {
        awards: true,
      },
    }),
    db.contest.count({
      where: {
        endDate: {
          gte: now,
        },
        startDate: {
          gte: now,
        },
      },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: contests,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getJoinedContests: AppRouteHandler<GetJoinedContestsRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");
  const { userId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { userId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Get contests that user has joined
  const [contests, total] = await Promise.all([
    db.contest.findMany({
      where: {
        contestParticipations: {
          some: {
            profileId: profile.id,
          },
        },
      },
      include: {
        awards: true,
      },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { startDate: "desc" },
    }),
    db.contest.count({
      where: {
        contestParticipations: {
          some: {
            profileId: profile.id,
          },
        },
      },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: contests,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getContestStats: AppRouteHandler<GetContestStatsRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      contestParticipations: {
        include: {
          profile: {
            include: {
              user: true,
            },
          },
        },
      },
      votes: true,
    },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const now = new Date();
  const isActive = contest.startDate <= now && contest.endDate >= now;
  const daysRemaining = isActive ? Math.ceil((contest.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

  // Calculate vote statistics
  const totalVotes = contest.votes.length;
  const freeVotes = contest.votes.filter(vote => vote.type === "FREE").length;
  const paidVotes = contest.votes.filter(vote => vote.type === "PAID").length;

  // Calculate participation statistics
  const totalParticipants = contest.contestParticipations.length;
  const activeParticipants = contest.contestParticipations.filter(p => p.isParticipating).length;
  const participationRate = totalParticipants > 0 ? (activeParticipants / totalParticipants) * 100 : 0;

  const stats = {
    contestId: contest.id,
    contestName: contest.name,
    totalParticipants,
    totalVotes,
    freeVotes,
    paidVotes,
    totalPrizePool: contest.prizePool,
    startDate: contest.startDate.toISOString(),
    endDate: contest.endDate.toISOString(),
    isActive,
    daysRemaining,
    participationRate: Math.round(participationRate * 100) / 100, // Round to 2 decimal places
  };

  return c.json(stats, HttpStatusCodes.OK);
};

export const getContestLeaderboard: AppRouteHandler<GetContestLeaderboardRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");

  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Get contest participants with their vote counts
  const participants = await db.contestParticipation.findMany({
    where: {
      contestId: id,
      isParticipating: true,
    },
    include: {
      profile: {
        include: {
          user: true,
          votesReceived: {
            where: {
              contestId: id,
            },
          },
        },
      },
    },
    skip: (page - 1) * limit,
    take: limit,
  });

  // Calculate total participants for pagination
  const totalParticipants = await db.contestParticipation.count({
    where: {
      contestId: id,
      isParticipating: true,
    },
  });

  // Process participants and calculate vote statistics
  const leaderboardData = participants.map((participation, index) => {
    const profile = participation.profile;
    const votesReceived = profile.votesReceived;

    const totalVotes = votesReceived.length;
    const freeVotes = votesReceived.filter(vote => vote.type === "FREE").length;
    const paidVotes = votesReceived.filter(vote => vote.type === "PAID").length;
    const rank = (page - 1) * limit + index + 1;

    return {
      rank,
      profileId: profile.id,
      userId: profile.user.id,
      username: profile.user.username!,
      displayUsername: profile.user.displayUsername,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      totalVotes,
      freeVotes,
      paidVotes,
      isParticipating: participation.isParticipating ?? true,
      coverImage: participation.coverImage,
      isApproved: participation.isApproved,
    };
  });

  // Sort by paid votes first, then by total votes
  leaderboardData.sort((a, b) => {
    if (a.paidVotes !== b.paidVotes) {
      return b.paidVotes - a.paidVotes;
    }
    return b.totalVotes - a.totalVotes;
  });

  const pagination = calculatePaginationMetadata(totalParticipants, page, limit);

  return c.json({
    data: leaderboardData,
    pagination,
  }, HttpStatusCodes.OK);
};

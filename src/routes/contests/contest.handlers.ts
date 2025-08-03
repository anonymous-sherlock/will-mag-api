import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { CreateRoute, GetContestWinnerRoute, GetJoinedContestsRoute, GetOneRoute, GetUpcomingContestsRoute, ListRoute, PatchRoute, RemoveRoute } from "./contest.routes";

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
  const { userId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { userId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  // Get contests that user hasn't joined and are upcoming
  const now = new Date();

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      where: {
        startDate: {
          gte: now,
        },
        contestParticipations: {
          none: {
            profileId: profile.id,
          },
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
        contestParticipations: {
          none: {
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

export const getContestWinner: AppRouteHandler<GetContestWinnerRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      awards: true,
      winner: true,
    },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Get total participants
  const totalParticipants = await db.contestParticipation.count({
    where: { contestId: id },
  });

  // Get total votes for this contest
  const totalVotes = await db.vote.count({
    where: { contestId: id },
  });

  return c.json({
    contest,
    winner: contest.winner,
    totalParticipants,
    totalVotes,
  }, HttpStatusCodes.OK);
};

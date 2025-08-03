import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { GetContestWinnerRoute, GetParticipantsRoute, JoinRoute, LeaveRoute, SetContestWinnerRoute } from "./contest-participation.routes";

export const join: AppRouteHandler<JoinRoute> = async (c) => {
  const { userId, contestId, coverImage } = c.req.valid("json");

  const profile = await db.profile.findFirst({
    where: { userId },
  });
  const contest = await db.contest.findFirst({
    where: {
      id: contestId,
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }
  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const existing = await db.contestParticipation.findFirst({
    where: {
      profileId: profile.id,
      contestId: contest.id,
    },
  });
  if (existing) {
    return sendErrorResponse(c, "alreadyExists", "Participant already joined the contest");
  }

  const participation = await db.contestParticipation.create({
    data: {
      contestId: contest.id,
      profileId: profile.id,
      coverImage,
    },

  });
  return c.json({
    ...participation,
    contest,
  }, HttpStatusCodes.OK);
};

export const leave: AppRouteHandler<LeaveRoute> = async (c) => {
  const { userId, contestId } = c.req.valid("json");

  const profile = await db.profile.findFirst({
    where: { userId },
  });

  const contest = await db.contest.findFirst({
    where: {
      id: contestId,
    },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }
  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Check if participation exists
  const existing = await db.contestParticipation.findFirst({
    where: {
      profileId: profile.id,
      contestId: contest.id,
    },
  });

  if (!existing) {
    return sendErrorResponse(c, "notFound", "Contest participation not found");
  }

  // Delete the participation
  const deletedParticipation = await db.contestParticipation.delete({
    where: {
      id: existing.id,
    },
  });

  return c.json(deletedParticipation, HttpStatusCodes.OK);
};

export const getParticipants: AppRouteHandler<GetParticipantsRoute> = async (c) => {
  const { contestId: id } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");

  // Check if contest exists
  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Get participants with profile information
  const [participants, total] = await Promise.all([
    db.contestParticipation.findMany({
      where: { contestId: id },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        coverImage: true,
        isApproved: true,
        isParticipating: true,
        createdAt: true,
        updatedAt: true,
        profile: {
          select: {
            id: true,
            bio: true,
            freeVoterMessage: true,
            hobbiesAndPassions: true,
            paidVoterMessage: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.contestParticipation.count({
      where: { contestId: id },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: participants,
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

export const setContestWinner: AppRouteHandler<SetContestWinnerRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { winnerProfileId } = c.req.valid("json");

  // Check if contest exists
  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      awards: true,
    },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Check if the profile exists and is a participant in this contest
  const participant = await db.contestParticipation.findFirst({
    where: {
      contestId: id,
      profileId: winnerProfileId,
    },
  });

  if (!participant) {
    return sendErrorResponse(c, "notFound", "Profile is not a participant in this contest");
  }

  // Update the contest with the winner
  const updatedContest = await db.contest.update({
    where: { id },
    data: {
      winnerProfileId,
    },
    include: {
      awards: true,
      winner: true,
    },
  });

  // Get total participants
  const totalParticipants = await db.contestParticipation.count({
    where: { contestId: id },
  });

  // Get total votes for this contest
  const totalVotes = await db.vote.count({
    where: { contestId: id },
  });

  return c.json({
    contest: updatedContest,
    winner: updatedContest.winner,
    totalParticipants,
    totalVotes,
  }, HttpStatusCodes.OK);
};

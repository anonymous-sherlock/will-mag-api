import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";
import { utapi } from "@/lib/uploadthing";

import type { CheckParticipationRoute, GetContestWinnerRoute, GetParticipantsRoute, JoinRoute, LeaveRoute, SetContestWinnerRoute, UploadParticipationCoverImageRoute } from "./contest-participation.routes";

export const join: AppRouteHandler<JoinRoute> = async (c) => {
  const { profileId, contestId } = c.req.valid("json");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
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
    return sendErrorResponse(c, "conflict", "Participant already joined the contest");
  }

  const participation = await db.contestParticipation.create({
    data: {
      contestId: contest.id,
      profileId: profile.id,
    },
    include: {
      contest: true,
      coverImage: true,
    },
  });
  return c.json(participation, HttpStatusCodes.OK);
};

export const leave: AppRouteHandler<LeaveRoute> = async (c) => {
  const { profileId, contestId } = c.req.valid("json");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
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

  if (!existing) {
    return sendErrorResponse(c, "notFound", "Contest participation not found");
  }

  const deletedParticipation = await db.contestParticipation.delete({
    where: {
      id: existing.id,
    },
    include: {
      coverImage: true,
    },
  });

  return c.json(deletedParticipation, HttpStatusCodes.OK);
};

export const getParticipants: AppRouteHandler<GetParticipantsRoute> = async (c) => {
  const { contestId: id } = c.req.valid("param");
  const { page, limit } = c.req.valid("query");

  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const [participants, total] = await Promise.all([
    db.contestParticipation.findMany({
      where: { contestId: id },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        mediaId: true,
        isApproved: true,
        isParticipating: true,
        createdAt: true,
        updatedAt: true,
        contestId: true,
        coverImage: true,
        profile: {
          select: {
            id: true,
            bio: true,
            freeVoterMessage: true,
            hobbiesAndPassions: true,
            paidVoterMessage: true,
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                image: true,
              },
            },
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

  const totalParticipants = await db.contestParticipation.count({
    where: { contestId: id },
  });

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
  const { profileId } = c.req.valid("json");

  const contest = await db.contest.findUnique({
    where: { id },
    include: {
      awards: true,
    },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const participant = await db.contestParticipation.findFirst({
    where: {
      contestId: id,
      profileId,
    },
  });

  if (!participant) {
    return sendErrorResponse(c, "notFound", "Profile is not a participant in this contest");
  }

  const updatedContest = await db.contest.update({
    where: { id },
    data: {
      winnerProfileId: profileId,
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

export const checkParticipation: AppRouteHandler<CheckParticipationRoute> = async (c) => {
  const { profileId, contestId } = c.req.valid("param");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  const contest = await db.contest.findFirst({
    where: { id: contestId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }
  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  const participation = await db.contestParticipation.findFirst({
    where: {
      profileId: profile.id,
      contestId: contest.id,
    },
    include: {
      coverImage: true,
    },
  });

  return c.json({
    hasJoined: !!participation,
    participation,
    contest,
  }, HttpStatusCodes.OK);
};

export const uploadParticipationCoverImage: AppRouteHandler<UploadParticipationCoverImageRoute> = async (c) => {
  const { participationId } = c.req.valid("param");
  const { file } = c.req.valid("form");

  if (!file) {
    return sendErrorResponse(c, "badRequest", "No file uploaded");
  }

  // Check if contest participation exists
  const participation = await db.contestParticipation.findUnique({
    where: { id: participationId },
    include: { contest: true },
  });

  if (!participation) {
    return sendErrorResponse(c, "notFound", "Contest participation not found");
  }

  // Upload file using utapi
  const uploaded = await utapi.uploadFiles([file], {
    concurrency: 1,
    acl: "public-read",
    contentDisposition: "inline",
  });

  if (!uploaded || uploaded.length === 0 || !uploaded[0].data) {
    return sendErrorResponse(c, "badRequest", "Upload failed");
  }

  const upload = uploaded[0];

  // Create media record for the uploaded file
  const media = await db.media.create({
    data: {
      key: upload.data.key,
      url: upload.data.ufsUrl,
      size: upload.data.size,
      name: upload.data.name,
      status: "COMPLETED",
      mediaType: "CONTEST_PARTICIPATION_COVER",
      type: file.type || "image/jpeg",
      contestId: participation.contestId,
    },
  });

  // Update participation with the uploaded image as cover image
  const updatedParticipation = await db.contestParticipation.update({
    where: { id: participationId },
    data: {
      mediaId: media.id,
    },
    include: {
      contest: true,
      coverImage: true,
    },
  });

  return c.json(updatedParticipation, HttpStatusCodes.OK);
};

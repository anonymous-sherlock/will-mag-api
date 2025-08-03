import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type { JoinRoute, LeaveRoute } from "./contest-participation.routes";

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

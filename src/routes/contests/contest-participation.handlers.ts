import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type { JoinRoute, LeaveRoute } from "./contest-participation.routes";

export const join: AppRouteHandler<JoinRoute> = async (c) => {
  const data = c.req.valid("json");
  const existing = await db.contestParticipation.findFirst({
    where: {
      profileId: data.profileId,
      contestId: data.contestId,
    },
  });
  if (existing) {
    return c.json(existing, HttpStatusCodes.OK);
  }

  const participation = await db.contestParticipation.create({
    data,
  });
  return c.json(participation, HttpStatusCodes.OK);
};

export const leave: AppRouteHandler<LeaveRoute> = async (c) => {
  const data = c.req.valid("json");

  // Check if participation exists
  const existing = await db.contestParticipation.findFirst({
    where: {
      profileId: data.profileId,
      contestId: data.contestId,
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

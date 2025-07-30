import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";

import { db } from "@/db";

import type { JoinRoute } from "./contest-participation.routes";

export const join: AppRouteHandler<JoinRoute> = async (c) => {
  const data = c.req.valid("json");
  // Optionally, check if already joined
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

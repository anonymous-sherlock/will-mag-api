import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { FREE_VOTE_INTERVAL } from "@/constants";
import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type { IsFreeVoteAvailable } from "./is-free-vote-available.routes";

export const isFreeVoteAvailable: AppRouteHandler<IsFreeVoteAvailable> = async (c) => {
  const { profileId } = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { lastFreeVoteAt: true },
  });
  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found.");
  }
  if (!profile.lastFreeVoteAt) {
    return c.json({ available: true }, HttpStatusCodes.OK);
  }
  const now = new Date();
  const last = new Date(profile.lastFreeVoteAt);
  const diff = now.getTime() - last.getTime();
  if (diff >= FREE_VOTE_INTERVAL) {
    return c.json({ available: true }, HttpStatusCodes.OK);
  }
  const nextAvailableAt = new Date(last.getTime() + FREE_VOTE_INTERVAL);
  return c.json({ available: false, nextAvailableAt }, HttpStatusCodes.OK);
};

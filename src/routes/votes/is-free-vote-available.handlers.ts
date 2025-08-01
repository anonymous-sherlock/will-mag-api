import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";

import { db } from "@/db";

import type { IsFreeVoteAvailable } from "./is-free-vote-available.routes";

export const isFreeVoteAvailable: AppRouteHandler<IsFreeVoteAvailable> = async (c) => {
  const { profileId } = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
    select: { lastFreeVoteAt: true },
  });
  if (!profile) {
    return c.json({ error: "Profile not found" }, HttpStatusCodes.NOT_FOUND);
  }
  if (!profile.lastFreeVoteAt) {
    return c.json({ available: true }, HttpStatusCodes.OK);
  }
  const now = new Date();
  const last = new Date(profile.lastFreeVoteAt);
  const diff = now.getTime() - last.getTime();
  if (diff >= 24 * 60 * 60 * 1000) {
    return c.json({ available: true }, HttpStatusCodes.OK);
  }
  const nextAvailableAt = new Date(last.getTime() + 24 * 60 * 60 * 1000);
  return c.json({ available: false, nextAvailableAt }, HttpStatusCodes.OK);
};

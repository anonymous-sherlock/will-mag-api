import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";

import type { CreateContestAwardsRoute, DeleteAwardRoute, GetAwardRoute, GetContestAwardsRoute } from "./award.routes";

export const createContestAwards: AppRouteHandler<CreateContestAwardsRoute> = async (c) => {
  const { contestId: id } = c.req.valid("param");
  const awardsData = c.req.valid("json");

  // Check if contest exists
  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Create awards for the contest
  await db.award.createMany({
    data: awardsData.map(award => ({
      ...award,
      contestId: id,
    })),
    skipDuplicates: true,
  });

  // Fetch the created awards to return them
  const awards = await db.award.findMany({
    where: {
      contestId: id,
      name: {
        in: awardsData.map(award => award.name),
      },
    },
  });

  return c.json(awards, HttpStatusCodes.CREATED);
};

export const getContestAwards: AppRouteHandler<GetContestAwardsRoute> = async (c) => {
  const { contestId: id } = c.req.valid("param");

  // Check if contest exists
  const contest = await db.contest.findUnique({
    where: { id },
  });

  if (!contest) {
    return sendErrorResponse(c, "notFound", "Contest not found");
  }

  // Get all awards for the contest
  const awards = await db.award.findMany({
    where: {
      contestId: id,
    },
  });

  return c.json(awards, HttpStatusCodes.OK);
};

export const getAward: AppRouteHandler<GetAwardRoute> = async (c) => {
  const { awardId } = c.req.valid("param");

  // Check if award exists
  const award = await db.award.findUnique({
    where: { id: awardId },
  });

  if (!award) {
    return sendErrorResponse(c, "notFound", "Award not found");
  }

  return c.json(award, HttpStatusCodes.OK);
};

export const deleteAward: AppRouteHandler<DeleteAwardRoute> = async (c) => {
  const { awardId } = c.req.valid("param");

  // Check if award exists
  const award = await db.award.findUnique({
    where: { id: awardId },
  });

  if (!award) {
    return sendErrorResponse(c, "notFound", "Award not found");
  }

  // Delete the award
  await db.award.delete({
    where: { id: awardId },
  });

  return c.json({ message: "Award deleted successfully" }, HttpStatusCodes.OK);
};

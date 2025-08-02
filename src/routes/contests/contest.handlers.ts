import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./contest.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");

  const [contests, total] = await Promise.all([
    db.contest.findMany({
      skip: (page - 1) * limit,
      take: limit,
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
  const contest = c.req.valid("json");
  const insertedContest = await db.contest.create({
    data: contest,
  });
  return c.json(insertedContest, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const contest = await db.contest.findUnique({
    where: { id },
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

  await db.contest.delete({
    where: { id },
  });

  return c.json({ message: "Contest deleted successfully" }, HttpStatusCodes.OK);
};

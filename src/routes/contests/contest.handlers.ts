import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";

import { db } from "@/db";

import type { CreateRoute, ListRoute } from "./contest.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const contest = await db.contest.findMany();

  return c.json(contest, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const contest = c.req.valid("json");
  const insertedContest = await db.contest.create({
    data: contest,
  });
  return c.json(insertedContest, HttpStatusCodes.OK);
};

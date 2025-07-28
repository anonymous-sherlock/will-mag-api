import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";

import { db } from "@/db";

import type { CreateRoute, ListRoute } from "./user.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const users = await db.user.findMany({});
  return c.json(users);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const user = c.req.valid("json");
  const insertedUser = await db.user.create({
    data: user,
  });
  return c.json(insertedUser, HttpStatusCodes.OK);
};

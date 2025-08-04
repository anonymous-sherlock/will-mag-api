import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";

import type { ListRoute } from "./ranks.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { limit, page } = c.req.valid("query");

  const ranks = await db.profile.findMany({
    select: {
      id: true,
      userId: true,
      user: {
        select: { name: true },
      },
      _count: {
        select: { votesReceived: true },
      },
    },
    take: limit,
    skip: (page - 1) * limit,
    orderBy: {
      votesReceived: {
        _count: "desc",
      },
    },
  });

  const formattedRanks = ranks.map((rank) => {
    return {
      profileId: rank.id,
      name: rank.user.name,
      votesRecieved: rank._count.votesReceived,
    };
  });

  return c.json(formattedRanks, HttpStatusCodes.OK);
};

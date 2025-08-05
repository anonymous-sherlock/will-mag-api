import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { CreateRoute, GetByUserIdRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./profile.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { page, limit } = c.req.valid("query");

  const [profiles, total] = await Promise.all([
    db.profile.findMany({
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.profile.count(),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: profiles,
    pagination,
  }, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profile = c.req.valid("json");
  const insertedProfile = await db.profile.upsert({
    where: { userId: profile.userId },
    update: {
      ...profile,
    },
    create: {
      ...profile,
    },
  });
  return c.json(insertedProfile, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  return c.json(profile, HttpStatusCodes.OK);
};

export const getByUserId: AppRouteHandler<GetByUserIdRoute> = async (c) => {
  const { userId } = c.req.valid("param");
  const profile = await db.profile.findUnique({
    where: { userId },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  return c.json(profile, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const profileData = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  const updatedProfile = await db.profile.update({
    where: { id },
    data: profileData,
  });

  return c.json(updatedProfile, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  await db.profile.delete({
    where: { id },
  });

  return c.json({ message: "Profile deleted successfully" }, HttpStatusCodes.OK);
};

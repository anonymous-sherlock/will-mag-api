import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";

import { db } from "@/db";

import type { CreateRoute, GetOneRoute, ListRoute, PatchRoute, RemoveRoute } from "./profile.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const profiles = await db.profile.findMany();

  return c.json(profiles, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const profile = c.req.valid("json");
  const insertedProfile = await db.profile.create({
    data: profile,
  });
  return c.json(insertedProfile, HttpStatusCodes.OK);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile) {
    return c.json({
      error: {
        issues: [{ code: "NOT_FOUND", path: ["id"], message: "Profile not found" }],
        name: "NotFoundError",
      },
      success: false,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(profile, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const profileData = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id },
  });

  if (!profile) {
    return c.json({
      error: {
        issues: [{ code: "NOT_FOUND", path: ["id"], message: "Profile not found" }],
        name: "NotFoundError",
      },
      success: false,
    }, HttpStatusCodes.NOT_FOUND);
  }

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

  if (!profile) {
    return c.json({
      error: {
        issues: [{ code: "NOT_FOUND", path: ["id"], message: "Profile not found" }],
        name: "NotFoundError",
      },
      success: false,
    }, HttpStatusCodes.NOT_FOUND);
  }

  await db.profile.delete({
    where: { id },
  });

  return c.json({ message: "Profile deleted successfully" }, HttpStatusCodes.OK);
};

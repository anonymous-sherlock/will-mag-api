import * as HttpStatusCodes from "stoker/http-status-codes";

import type { AppRouteHandler } from "@/lib/types";

import { db } from "@/db";
import { auth } from "@/lib/auth";

import type { CreateRoute, GetOneRoute, GetUserProfileRoute, ListRoute, PatchRoute, RemoveRoute } from "./user.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const users = await db.user.findMany();
  return c.json(users, HttpStatusCodes.OK);
};

export const create: AppRouteHandler<CreateRoute> = async (c) => {
  const userData = c.req.valid("json");
  const newUser = await auth.api.signUpEmail({
    body: {
      name: userData.name,
      email: userData.email,
      password: userData.password,
      username: userData.username,
      image: userData.image ?? undefined,
    },
  });

  const user = await db.user.findFirst({
    where: { id: newUser.user.id },
  });

  if (!user) {
    return c.json({
      error: {
        issues: [{ code: "NOT_FOUND", path: ["id"], message: "User not found" }],
        name: "NotFoundError",
      },
      success: false,
    }, HttpStatusCodes.NOT_FOUND);
  }
  return c.json(user, HttpStatusCodes.OK);
};
export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const user = await db.user.findUnique({
    where: { id },
  });

  if (!user) {
    return c.json({
      error: {
        issues: [{ code: "NOT_FOUND", path: ["id"], message: "User not found" }],
        name: "NotFoundError",
      },
      success: false,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const userData = c.req.valid("json");
  const currentUser = c.get("user");

  // Check if user is authenticated
  if (!currentUser) {
    return c.json({
      error: {
        issues: [{ code: "UNAUTHORIZED", path: ["auth"], message: "Authentication required" }],
        name: "UnauthorizedError",
      },
      success: false,
    }, HttpStatusCodes.UNAUTHORIZED);
  }

  // Check if user is updating their own profile or is an admin
  if (currentUser.id !== id && currentUser.role !== "ADMIN") {
    return c.json({
      error: {
        issues: [{ code: "FORBIDDEN", path: ["auth"], message: "Insufficient permissions" }],
        name: "ForbiddenError",
      },
      success: false,
    }, HttpStatusCodes.FORBIDDEN);
  }

  const existingUser = await db.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return c.json({
      error: {
        issues: [{ code: "NOT_FOUND", path: ["id"], message: "User not found" }],
        name: "NotFoundError",
      },
      success: false,
    }, HttpStatusCodes.NOT_FOUND);
  }

  const updatedUser = await db.user.update({
    where: { id },
    data: userData,
  });

  return c.json(updatedUser, HttpStatusCodes.OK);
};

export const remove: AppRouteHandler<RemoveRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const currentUser = c.get("user");

  // Check if user is authenticated
  if (!currentUser) {
    return c.json({
      error: {
        issues: [{ code: "UNAUTHORIZED", path: ["auth"], message: "Authentication required" }],
        name: "UnauthorizedError",
      },
      success: false,
    }, HttpStatusCodes.UNAUTHORIZED);
  }

  // Check if user is deleting their own account or is an admin
  if (currentUser.id !== id && currentUser.role !== "ADMIN") {
    return c.json({
      error: {
        issues: [{ code: "FORBIDDEN", path: ["auth"], message: "Insufficient permissions" }],
        name: "ForbiddenError",
      },
      success: false,
    }, HttpStatusCodes.FORBIDDEN);
  }

  const existingUser = await db.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return c.json({
      error: {
        issues: [{ code: "NOT_FOUND", path: ["id"], message: "User not found" }],
        name: "NotFoundError",
      },
      success: false,
    }, HttpStatusCodes.NOT_FOUND);
  }

  await db.user.delete({
    where: { id },
  });

  return c.json({ message: "User deleted successfully" }, HttpStatusCodes.OK);
};

export const getUserProfile: AppRouteHandler<GetUserProfileRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const currentUser = c.get("user");

  // Check if user is authenticated
  if (!currentUser) {
    return c.json({
      error: {
        issues: [{ code: "UNAUTHORIZED", path: ["auth"], message: "Authentication required" }],
        name: "UnauthorizedError",
      },
      success: false,
    }, HttpStatusCodes.UNAUTHORIZED);
  }

  const user = await db.user.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    return c.json({
      error: {
        issues: [{ code: "NOT_FOUND", path: ["id"], message: "User or profile not found" }],
        name: "NotFoundError",
      },
      success: false,
    }, HttpStatusCodes.NOT_FOUND);
  }

  return c.json(user.profile, HttpStatusCodes.OK);
};

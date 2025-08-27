import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { auth } from "@/lib/auth";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { ChangeUserTypeRoute, CreateRoute, GetByEmailRoute, GetByUsernameRoute, GetOneRoute, GetUserProfileRoute, ListRoute, PatchRoute, RemoveRoute } from "./user.routes";

export const list: AppRouteHandler<ListRoute> = async (c) => {
  const { page, limit, search, sortBy, sortOrder } = c.req.valid("query");

  const where: Prisma.UserWhereInput = {};
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { email: { contains: search, search } },
      { username: { contains: search, search } },

    ];
  }

  const orderBy: Prisma.UserOrderByWithRelationInput = {
    [sortBy]: sortOrder,
  };

  const [users, total] = await Promise.all([
    db.user.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where,
      orderBy,
    }),
    db.user.count({ where }),
  ]);
  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    data: users,
    pagination,
  }, HttpStatusCodes.OK);
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
      type: userData.type ?? "VOTER",
    },
  });
  const user = await db.user.findFirst({
    where: { id: newUser.user.id },
  });

  if (!user) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  if (userData.type === "VOTER") {
    await db.profile.upsert({
      where: { userId: user.id },
      update: {
        address: "",
      },
      create: {
        userId: user.id,
        address: "",
      },
    });
  }

  return c.json(user, HttpStatusCodes.CREATED);
};

export const getOne: AppRouteHandler<GetOneRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const user = await db.user.findUnique({
    where: { id },
  });

  if (!user) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const getByEmail: AppRouteHandler<GetByEmailRoute> = async (c) => {
  const { email } = c.req.valid("param");

  const user = await db.user.findUnique({
    where: { email },
  });

  if (!user) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const getByUsername: AppRouteHandler<GetByUsernameRoute> = async (c) => {
  const { username } = c.req.valid("param");

  const user = await db.user.findUnique({
    where: { username },
  });

  if (!user) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  return c.json(user, HttpStatusCodes.OK);
};

export const patch: AppRouteHandler<PatchRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const userData = c.req.valid("json");
  const currentUser = c.get("user");

  if (!currentUser) {
    return sendErrorResponse(c, "unauthorized");
  }

  if (currentUser.id !== id && currentUser.role !== "ADMIN") {
    return sendErrorResponse(c, "forbidden");
  }

  const existingUser = await db.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return sendErrorResponse(c, "notFound", "User not found");
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
  if (!currentUser) {
    return sendErrorResponse(c, "unauthorized");
  }

  if (currentUser.id !== id && currentUser.role !== "ADMIN") {
    return sendErrorResponse(c, "forbidden");
  }

  const existingUser = await db.user.findUnique({
    where: { id },
  });

  if (!existingUser)
    return sendErrorResponse(c, "notFound", "User not found");

  await db.user.delete({
    where: { id },
  });

  return c.json({ message: "User deleted successfully" }, HttpStatusCodes.OK);
};

export const getUserProfile: AppRouteHandler<GetUserProfileRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const currentUser = c.get("user");

  // Check if user is authenticated
  if (!currentUser)
    return sendErrorResponse(c, "unauthorized");

  const user = await db.user.findUnique({
    where: { id },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  return c.json(user.profile, HttpStatusCodes.OK);
};

export const changeUserType: AppRouteHandler<ChangeUserTypeRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const { type } = c.req.valid("json");
  const currentUser = c.get("user");

  if (!currentUser) {
    return sendErrorResponse(c, "unauthorized");
  }

  // Only admins can change user types
  if (currentUser.role !== "ADMIN") {
    return sendErrorResponse(c, "forbidden");
  }

  const existingUser = await db.user.findUnique({
    where: { id },
  });

  if (!existingUser) {
    return sendErrorResponse(c, "notFound", "User not found");
  }

  if (type === "VOTER") {
    await db.profile.upsert({
      where: { userId: id },
      update: {
        address: "",
      },
      create: {
        userId: id,
        address: "",
      },
    });
  }

  const updatedUser = await db.user.update({
    where: { id },
    data: { type },
  });

  return c.json(updatedUser, HttpStatusCodes.OK);
};

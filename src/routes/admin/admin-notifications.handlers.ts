import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type { GetAllNotifications } from "./admin-notifications.routes";

export const getAllNotifications: AppRouteHandler<GetAllNotifications> = async (c) => {
  const query = c.req.valid("query");
  const {
    page = 1,
    limit = 20,
    userId,
    profileId,
    type,
    isRead,
    isArchived,
    startDate,
    endDate,
    sortBy,
    sortOrder,
    search,
  } = query;

  // Build where clause for filtering
  const where: Prisma.NotificationWhereInput = {};

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { message: { contains: search } },
    ];
  }

  if (userId) {
    where.profile = {
      userId,
    };
  }

  if (profileId) {
    where.profileId = profileId;
  }

  if (type) {
    where.type = type;
  }

  if (isRead !== undefined) {
    where.isRead = isRead === "true";
  }

  if (isArchived !== undefined) {
    where.isArchived = isArchived === "true";
  }

  // Date filtering
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate && startDate !== "") {
      // If it's just a date (YYYY-MM-DD), set it to start of day
      const startDateTime = startDate.includes("T") ? startDate : `${startDate}T00:00:00.000Z`;
      where.createdAt.gte = new Date(startDateTime);
    }
    if (endDate && endDate !== "") {
      // If it's just a date (YYYY-MM-DD), set it to end of day
      const endDateTime = endDate.includes("T") ? endDate : `${endDate}T23:59:59.999Z`;
      where.createdAt.lte = new Date(endDateTime);
    }
  }

  // Build order by clause
  const orderBy: Prisma.NotificationOrderByWithRelationInput = {};
  switch (sortBy) {
    case "createdAt":
      orderBy.createdAt = sortOrder;
      break;
    case "updatedAt":
      orderBy.updatedAt = sortOrder;
      break;
    default:
      orderBy.createdAt = sortOrder;
      break;
  }

  // Get total count for pagination
  const total = await db.notification.count({ where });

  // Calculate pagination metadata
  const pagination = calculatePaginationMetadata(total, page, limit);

  // Get notifications with related data
  const notifications = await db.notification.findMany({
    where,
    orderBy,
    skip: (page - 1) * limit,
    take: limit,
    include: {
      profile: {
        include: {
          coverImage: {
            select: {
              url: true,
            },
          },
          user: {
            select: {
              id: true,
              email: true,
              username: true,
              displayUsername: true,
              name: true,
              image: true,
              role: true,
              type: true,
              isActive: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  // Transform the data to match the admin schema
  const transformedNotifications = notifications.map((notification) => {
    // Ensure profile and user exist
    if (!notification.profile || !notification.profile.user) {
      throw new Error(`Notification ${notification.id} has invalid profile or user data`);
    }

    return {
      id: notification.id,
      title: notification.title,
      message: notification.message,
      type: notification.type,
      icon: notification.icon,
      action: notification.action,
      isRead: notification.isRead,
      isArchived: notification.isArchived,
      createdAt: notification.createdAt.toISOString(),
      updatedAt: notification.updatedAt.toISOString(),
      user: {
        id: notification.profile.user.id,
        email: notification.profile.user.email,
        username: notification.profile.user.username,
        displayUsername: notification.profile.user.displayUsername,
        name: notification.profile.user.name,
        image: notification.profile.coverImage?.url || notification.profile.user.image,
        role: notification.profile.user.role,
        type: notification.profile.user.type,
        isActive: notification.profile.user.isActive,
        createdAt: notification.profile.user.createdAt.toISOString(),
      },
      profile: {
        id: notification.profile.id,
        bio: notification.profile.bio,
        instagram: notification.profile.instagram,
        tiktok: notification.profile.tiktok,
      },
    };
  });

  return c.json({
    data: transformedNotifications,
    pagination,
  }, HttpStatusCodes.OK);
};

import * as HttpStatusCodes from "stoker/http-status-codes";

import type { Prisma } from "@/generated/prisma/index.js";
import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
import { calculatePaginationMetadata } from "@/lib/queries/query.helper";

import type {
  CreateNotificationRoute,
  DeleteNotificationRoute,
  GetArchivedNotificationsRoute,
  GetNotificationRoute,
  GetNotificationsRoute,
  GetNotificationStatsRoute,
  MarkAllAsReadRoute,
  MarkAsReadRoute,
  ToggleArchiveRoute,
  UpdateNotificationRoute,
} from "./notification.routes";

export const getNotifications: AppRouteHandler<GetNotificationsRoute> = async (c) => {
  const { page = 1, limit = 10, isRead, isArchived, profileId } = c.req.valid("query");

  const profile = await db.profile.findFirst({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const skip = (page - 1) * limit;

  const where: Prisma.NotificationWhereInput = {
    profileId: profile.id,
  };
  if (isRead !== undefined)
    where.isRead = isRead;
  if (isArchived !== undefined)
    where.isArchived = isArchived;

  const [notifications, total] = await Promise.all([
    db.notification.findMany({
      where: {
        profileId: profile.id,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.notification.count({ where }),
  ]);
  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    notifications,
    pagination,
  }, HttpStatusCodes.OK);
};

export const createNotification: AppRouteHandler<CreateNotificationRoute> = async (c) => {
  const data = c.req.valid("json");

  const profile = await db.profile.findUnique({
    where: { id: data.profileId },
  });

  if (!profile)
    return sendErrorResponse(c, "notFound", "Profile not found");

  const notification = await db.notification.create({
    data: {
      ...data,
      profileId: profile.id,
    },
  });

  return c.json(notification, HttpStatusCodes.CREATED);
};

export const getNotification: AppRouteHandler<GetNotificationRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const notification = await db.notification.findFirst({
    where: {
      id,
    },
  });

  if (!notification) {
    return sendErrorResponse(c, "notFound", "Notification not found");
  }

  return c.json(notification, HttpStatusCodes.OK);
};

export const updateNotification: AppRouteHandler<UpdateNotificationRoute> = async (c) => {
  const { id } = c.req.valid("param");
  const data = c.req.valid("json");

  const existing = await db.notification.findUnique({
    where: {
      id,
    },
  });

  if (!existing) {
    return sendErrorResponse(c, "notFound", "Notification not found");
  }

  const notification = await db.notification.update({
    where: { id },
    data,
  });

  return c.json(notification, HttpStatusCodes.OK);
};

export const deleteNotification: AppRouteHandler<DeleteNotificationRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const existing = await db.notification.findUnique({
    where: {
      id,
    },
  });

  if (!existing) {
    return sendErrorResponse(c, "notFound", "Notification not found");
  }

  const notification = await db.notification.delete({
    where: { id },
  });

  return c.json(notification, HttpStatusCodes.OK);
};

export const markAsRead: AppRouteHandler<MarkAsReadRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const existing = await db.notification.findUnique({
    where: {
      id,
    },
  });

  if (!existing) {
    return sendErrorResponse(c, "notFound", "Notification not found");
  }

  const notification = await db.notification.update({
    where: { id },
    data: { isRead: true },
  });

  return c.json(notification, HttpStatusCodes.OK);
};

export const markAllAsRead: AppRouteHandler<MarkAllAsReadRoute> = async (c) => {
  const { profileId } = c.req.valid("param");
  const profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const result = await db.notification.updateMany({
    where: {
      profileId: profile.id,
      isRead: false,
    },
    data: { isRead: true },
  });

  return c.json({
    message: "All notifications marked as read",
    updatedCount: result.count,
  }, HttpStatusCodes.OK);
};

export const toggleArchive: AppRouteHandler<ToggleArchiveRoute> = async (c) => {
  const { id } = c.req.valid("param");

  const existing = await db.notification.findUnique({
    where: { id },
  });

  if (!existing) {
    return sendErrorResponse(c, "notFound", "Notification not found");
  }

  const notification = await db.notification.update({
    where: { id },
    data: { isArchived: !existing.isArchived },
  });

  return c.json(notification, HttpStatusCodes.OK);
};

export const getArchivedNotifications: AppRouteHandler<GetArchivedNotificationsRoute> = async (c) => {
  const { profileId } = c.req.valid("param");
  const { page = 1, limit = 10 } = c.req.valid("query");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const skip = (page - 1) * limit;

  const [archivedNotifications, total] = await Promise.all([
    db.notification.findMany({
      where: {
        profileId: profile.id,
        isArchived: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    db.notification.count({
      where: {
        profileId: profile.id,
        isArchived: true,
      },
    }),
  ]);

  const pagination = calculatePaginationMetadata(total, page, limit);

  return c.json({
    archivedNotifications,
    pagination,
  }, HttpStatusCodes.OK);
};

export const getNotificationStats: AppRouteHandler<GetNotificationStatsRoute> = async (c) => {
  const { profileId } = c.req.valid("param");

  const profile = await db.profile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    return sendErrorResponse(c, "notFound", "Profile not found");
  }

  const [totalCount, unreadCount, archivedCount] = await Promise.all([
    db.notification.count({
      where: { profileId: profile.id },
    }),
    db.notification.count({
      where: {
        profileId: profile.id,
        isRead: false,
      },
    }),
    db.notification.count({
      where: {
        profileId: profile.id,
        isArchived: true,
      },
    }),
  ]);

  return c.json({
    totalCount,
    unreadCount,
    archivedCount,
  }, HttpStatusCodes.OK);
};

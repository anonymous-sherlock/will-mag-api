import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent, jsonContentRequired } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import {
  NotificationInsertSchema,
  NotificationSelectSchema,
  NotificationUpdateSchema,
} from "@/db/schema/notification.schema";
import { NotFoundResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Notification"];

export const getNotifications = createRoute({
  path: "/notifications",
  method: "get",
  summary: "Get Notifications",
  description: "Get paginated list of notifications for the authenticated user.",
  tags,
  request: {
    query: PaginationQuerySchema.extend({
      limit: z.coerce.number().default(10),
      isRead: z.boolean().optional(),
      isArchived: z.boolean().optional(),
      profileId: z.string().min(4),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(NotificationSelectSchema, "notifications"),
      "List of notifications",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Notifications not found"),
  },
});

export const createNotification = createRoute({
  path: "/notifications",
  method: "post",
  summary: "Create Notification",
  description: "Create a new notification.",
  tags,
  request: {
    body: jsonContentRequired(
      NotificationInsertSchema,
      "The notification payload",
    ),
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      NotificationSelectSchema,
      "The created notification",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(NotificationInsertSchema),
      "The validation error(s)",
    ),
  },
});

export const getNotification = createRoute({
  path: "/notifications/{id}",
  method: "get",
  summary: "Get Notification",
  description: "Get a specific notification by ID.",
  tags,
  request: {
    params: z.object({
      id: z.string().describe("The notification ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      NotificationSelectSchema,
      "The notification",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Notification not found"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const updateNotification = createRoute({
  path: "/notifications/{id}",
  method: "put",
  summary: "Update Notification",
  description: "Update a notification by ID.",
  tags,
  request: {
    params: z.object({
      id: z.string().describe("The notification ID"),
    }),
    body: jsonContentRequired(
      NotificationUpdateSchema,
      "The notification update payload",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      NotificationSelectSchema,
      "The updated notification",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Notification not found"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(NotificationUpdateSchema),
      "The validation error(s)",
    ),
  },
});

export const deleteNotification = createRoute({
  path: "/notifications/{id}",
  method: "delete",
  summary: "Delete Notification",
  description: "Delete a notification by ID.",
  tags,
  request: {
    params: z.object({
      id: z.string().describe("The notification ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      NotificationSelectSchema,
      "The deleted notification",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Notification not found"),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
  },
});

export const markAsRead = createRoute({
  path: "/notifications/{id}/read",
  method: "patch",
  summary: "Mark Notification as Read",
  description: "Mark a notification as read.",
  tags,
  request: {
    params: z.object({
      id: z.string().describe("The notification ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      NotificationSelectSchema,
      "The updated notification",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Notification not found"),
  },
});

export const markAllAsRead = createRoute({
  path: "/notifications/{profileId}/read-all",
  method: "patch",
  summary: "Mark All Notifications as Read",
  description: "Mark all notifications as read for the authenticated user.",
  tags,
  request: {
    params: z.object({
      profileId: z.string().describe("The Profile ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        updatedCount: z.number(),
      }),
      "Success response with count of updated notifications",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const toggleArchive = createRoute({
  path: "/notifications/{id}/archive",
  method: "patch",
  summary: "Toggle Notification Archive Status",
  description: "Archive or unarchive a notification by ID.",
  tags,
  request: {
    params: z.object({
      id: z.string().describe("The notification ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      NotificationSelectSchema,
      "The updated notification with archive status",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Notification not found"),
  },
});

export const getArchivedNotifications = createRoute({
  path: "/notifications/{profileId}/archived",
  method: "get",
  summary: "Get Archived Notifications",
  description: "Get paginated list of archived notifications for the authenticated user.",
  tags,
  request: {
    params: z.object({
      profileId: z.string().describe("The Profile ID"),
    }),
    query: PaginationQuerySchema.extend({
      limit: z.coerce.number().default(10),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(NotificationSelectSchema, "archivedNotifications"),
      "List of archived notifications",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const getNotificationStats = createRoute({
  path: "/notifications/{profileId}/stats",
  method: "get",
  summary: "Get Notification Statistics",
  description: "Get notification statistics for a specific profile including total, unread, and archived counts.",
  tags,
  request: {
    params: z.object({
      profileId: z.string().describe("The Profile ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        totalCount: z.number(),
        unreadCount: z.number(),
        archivedCount: z.number(),
      }),
      "Notification statistics",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export type GetNotificationsRoute = typeof getNotifications;
export type GetNotificationRoute = typeof getNotification;
export type CreateNotificationRoute = typeof createNotification;
export type UpdateNotificationRoute = typeof updateNotification;
export type DeleteNotificationRoute = typeof deleteNotification;
export type MarkAsReadRoute = typeof markAsRead;
export type MarkAllAsReadRoute = typeof markAllAsRead;
export type ToggleArchiveRoute = typeof toggleArchive;
export type GetArchivedNotificationsRoute = typeof getArchivedNotifications;
export type GetNotificationStatsRoute = typeof getNotificationStats;

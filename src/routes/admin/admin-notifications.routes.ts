import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { z } from "zod";

import { AdminNotificationSchema } from "@/db/schema/admin-notifications.schema";
import { ForbiddenResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Admin"];

export const getAllNotifications = createRoute({
  path: "/admin/notifications",
  method: "get",
  summary: "Get all notifications (Admin only)",
  description: "Get a paginated list of all notifications with detailed information including user and profile details",
  tags,
  request: {
    query: PaginationQuerySchema.extend({
      userId: z.string().optional().describe("Filter notifications by user ID"),
      profileId: z.string().optional().describe("Filter notifications by profile ID"),
      type: z.enum([
        "COMPETITION_JOINED",
        "COMPETITION_LEFT",
        "COMPETITION_CREATED",
        "COMPETITION_UPCOMING",
        "VOTE_RECEIVED",
        "VOTE_PREMIUM",
        "SETTINGS_CHANGED",
        "REMINDER",
        "TIP",
        "MOTIVATION",
        "SYSTEM",
      ]).optional().describe("Filter notifications by type"),
      isRead: z.enum(["true", "false"]).optional().describe("Filter by read status"),
      isArchived: z.enum(["true", "false"]).optional().describe("Filter by archived status"),
      startDate: z.string().optional().or(z.literal("")).describe("Filter notifications from this date (ISO string or YYYY-MM-DD)"),
      endDate: z.string().optional().or(z.literal("")).describe("Filter notifications until this date (ISO string or YYYY-MM-DD)"),
      sortBy: z.enum(["createdAt", "updatedAt"]).default("createdAt").optional().describe("Sort by field"),
      sortOrder: z.enum(["asc", "desc"]).default("desc").optional().describe("Sort order"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(AdminNotificationSchema),
      "List of notifications with pagination",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
  },
});

export type GetAllNotifications = typeof getAllNotifications;

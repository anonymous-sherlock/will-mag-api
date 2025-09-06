import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import { BadRequestResponse, InternalServerErrorResponse } from "@/lib/openapi.responses";

const tags = ["Admin", "ProfileStats"];

export const recalculateAllStats = createRoute({
  path: "/admin/profile-stats/recalculate-all",
  method: "post",
  tags,
  summary: "Recalculate All Profile Stats",
  description: "Admin endpoint to recalculate ProfileStats for all MODEL profiles. Useful for data migration or fixing inconsistencies.",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        summary: z.object({
          profilesProcessed: z.number(),
          totalFreeVotes: z.number(),
          totalPaidVotes: z.number(),
          totalWeightedScore: z.number(),
        }),
      }),
      "ProfileStats recalculated successfully",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to recalculate ProfileStats"),
  },
});

export const recalculateProfileStatsById = createRoute({
  path: "/admin/profile-stats/recalculate/{profileId}",
  method: "post",
  tags,
  summary: "Recalculate Profile Stats by ID",
  description: "Admin endpoint to recalculate ProfileStats for a specific profile by profile ID.",
  request: {
    params: z.object({
      profileId: z.string().describe("Profile ID to recalculate stats for"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        stats: z.object({
          freeVotes: z.number(),
          paidVotes: z.number(),
          weightedScore: z.number(),
        }),
      }),
      "ProfileStats recalculated successfully",
    ),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Profile ID is required"),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to recalculate ProfileStats"),
  },
});

export type RecalculateAllStatsRoute = typeof recalculateAllStats;
export type RecalculateProfileStatsByIdRoute = typeof recalculateProfileStatsById;

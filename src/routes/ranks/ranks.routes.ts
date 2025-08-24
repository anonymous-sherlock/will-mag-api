import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { RankSchema } from "@/db/schema/rank.schema";
import { ConflictResponse, NotFoundResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema } from "@/lib/queries/query.schema";

const tags = ["Rank"];

export const list = createRoute({
  path: "/ranks",
  method: "get",
  tags,
  summary: "Rank List",
  decscription: "",
  request: {
    query: z.object({
      limit: z.coerce.number().optional().default(50),
      page: z.coerce.number().optional().default(1),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(RankSchema),
      "The rank list",
    ),
    [HttpStatusCodes.UNPROCESSABLE_ENTITY]: jsonContent(
      createErrorSchema(
        z.object({
          limit: z.string().optional().describe("Invalid limit parameter"),
          page: z.string().optional().describe("Invalid page parameter"),
        }),
      ),
      "The validation error(s)",
    ),
  },
});

export const assignManualRank = createRoute({
  path: "/ranks/assign",
  method: "post",
  tags,
  summary: "Assign Manual Rank",
  description: "Admin endpoint to assign manual ranks to profiles (top 20)",
  request: {
    body: jsonContent(
      z.object({
        profileId: z.string().describe("Profile ID to assign rank to"),
        manualRank: z.number().min(1).max(20).describe("Manual rank (1-20)"),
      }),
      "Rank assignment data",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        rank: RankSchema,
      }),
      "Rank assigned successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
    [HttpStatusCodes.CONFLICT]: ConflictResponse("Rank already assigned to another profile"),

  },
});

export const updateComputedRanks = createRoute({
  path: "/ranks/update-computed",
  method: "post",
  tags,
  summary: "Update Computed Ranks",
  description: "Cron job endpoint to update computed ranks for all profiles based on vote counts. Designed for large-scale operations.",
  request: {
    body: jsonContent(
      z.object({
        batchSize: z.number().min(100).max(10000).optional().default(1000).describe("Number of profiles to process in each batch"),
        forceUpdate: z.boolean().optional().default(false).describe("Force update even if no vote changes detected"),
      }),
      "Rank update configuration",
    ),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        success: z.boolean(),
        message: z.string(),
        summary: z.object({
          totalProfiles: z.number(),
          profilesUpdated: z.number(),
          profilesCreated: z.number(),
          processingTime: z.number(),
          batchesProcessed: z.number(),
        }),
      }),
      "Ranks updated successfully",
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: jsonContent(
      createErrorSchema(
        z.object({
          error: z.string().describe("Error message"),
        }),
      ),
      "Internal server error",
    ),
  },
});

export type ListRoute = typeof list;
export type AssignManualRankRoute = typeof assignManualRank;
export type UpdateComputedRanksRoute = typeof updateComputedRanks;

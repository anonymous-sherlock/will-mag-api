import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { RankSchema } from "@/db/schema/rank.schema";
import { BadRequestResponse, ConflictResponse, NotFoundResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Rank"];

export const list = createRoute({
  path: "/ranks",
  method: "get",
  tags,
  summary: "Rank List",
  decscription: "",
  request: {
    query: PaginationQuerySchema.extend({
      limit: z.coerce.number().optional().default(50),
      profileId: z.string().optional(),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        currentProfile: RankSchema.nullable(),
        ...createPaginatedResponseSchema(RankSchema).shape,
      }),
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
  description: "Admin endpoint to assign manual ranks to profiles (ranks 1-5 only)",
  request: {
    body: jsonContent(
      z.object({
        profileId: z.string().describe("Profile ID to assign rank to"),
        manualRank: z.number().min(1).max(5).describe("Manual rank (1-5 only)"),
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
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Manual ranks can only be assigned to MODEL users"),
    [HttpStatusCodes.CONFLICT]: ConflictResponse("Rank already assigned to another profile"),

  },
});

export const updateComputedRanks = createRoute({
  path: "/ranks/update-computed",
  method: "post",
  tags,
  summary: "Update Computed Ranks",
  description: "Cron job endpoint to update computed ranks for all profiles using weighted scoring (paid votes > free votes). Manual ranks restricted to 1-5, computed ranks start from 6+. Designed for large-scale operations.",
  request: {
    body: jsonContent(
      z.object({
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
          availableRanks: z.number().optional().describe("Number of available rank positions (1-5)"),
          scoringWeights: z.object({
            paidVoteWeight: z.number(),
            freeVoteWeight: z.number(),
          }).optional().describe("Vote scoring weights"),
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

export const getProfileRank = createRoute({
  path: "/ranks/profile/{profileId}",
  method: "get",
  tags,
  summary: "Get Profile Rank",
  description: "Get the rank information for a specific profile by profile ID",
  request: {
    params: z.object({
      profileId: z.string().describe("Profile ID to get rank for"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      RankSchema,
      "Profile rank retrieved successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
  },
});

export const removeManualRank = createRoute({
  path: "/ranks/remove",
  method: "post",
  tags,
  summary: "Remove Manual Rank",
  description: "Admin endpoint to assign manual ranks to profiles (ranks 1-5 only)",
  request: {
    body: jsonContent(
      z.object({
        profileId: z.string().describe("Profile ID to remove rank"),
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
      "Rank removed successfully",
    ),
    [HttpStatusCodes.NOT_FOUND]: NotFoundResponse("Profile not found"),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Manual ranks can only be removed from MODEL users"),
  },
});

export type ListRoute = typeof list;
export type AssignManualRankRoute = typeof assignManualRank;
export type RemoveManualRankRoute = typeof removeManualRank;
export type UpdateComputedRanksRoute = typeof updateComputedRanks;
export type GetProfileRankRoute = typeof getProfileRank;

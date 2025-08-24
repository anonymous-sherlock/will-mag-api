import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createErrorSchema } from "stoker/openapi/schemas";

import { RankSchema } from "@/db/schema/rank.schema";
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
    [HttpStatusCodes.BAD_REQUEST]: jsonContent(
      createErrorSchema(
        z.object({
          error: z.string().describe("Error message"),
        }),
      ),
      "Invalid request data",
    ),
    [HttpStatusCodes.CONFLICT]: jsonContent(
      createErrorSchema(
        z.object({
          error: z.string().describe("Rank already assigned to another profile"),
        }),
      ),
      "Rank conflict",
    ),
  },
});

export type ListRoute = typeof list;
export type AssignManualRankRoute = typeof assignManualRank;

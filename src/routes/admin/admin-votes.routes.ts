import { createRoute } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { z } from "zod";

import { AdminVoteSchema } from "@/db/schema/admin-votes.schema";
import { ForbiddenResponse, UnauthorizedResponse } from "@/lib/openapi.responses";
import { createPaginatedResponseSchema, PaginationQuerySchema } from "@/lib/queries/query.schema";

const tags = ["Admin"];

export const getAllVotes = createRoute({
  path: "/admin/votes",
  method: "get",
  summary: "Get all votes (Admin only)",
  description: "Get a paginated list of all votes with detailed information including contest, voter, votee, and payment details",
  tags,
  request: {
    query: PaginationQuerySchema.extend({
      contestId: z.string().optional().describe("Filter votes by contest ID"),
      voterId: z.string().optional().describe("Filter votes by voter ID"),
      modelId: z.string().optional().describe("Filter votes by model ID"),
      type: z.enum(["all", "FREE", "PAID"]).default("all").optional().describe("Filter votes by type"),
      startDate: z.string().optional().or(z.literal("")).describe("Filter votes from this date (ISO string or YYYY-MM-DD)"),
      endDate: z.string().optional().or(z.literal("")).describe("Filter votes until this date (ISO string or YYYY-MM-DD)"),
      sortBy: z.enum(["createdAt", "count"]).default("createdAt").optional().describe("Sort by createdAt"),
      sortOrder: z.enum(["asc", "desc"]).default("desc").optional().describe("Sort order"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      createPaginatedResponseSchema(AdminVoteSchema),
      "List of votes with pagination",
    ),
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.FORBIDDEN]: ForbiddenResponse(),
  },
});

export type GetAllVotes = typeof getAllVotes;

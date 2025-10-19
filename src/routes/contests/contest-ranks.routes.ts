import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import { InternalServerErrorResponse } from "@/lib/openapi.responses";

export const tags = ["Contest Ranks"];

export const contestRanksUpdate = createRoute({
  path: "/contest-ranks/{contestId}/update",
  method: "post",
  tags,
  summary: "Update Contest Rankings",
  description: "Recalculate and update contest rankings",
  request: {
    params: z.object({
      contestId: z.string().min(1, "contestId is required"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
        contestId: z.string(),
      }),
      "Contest rankings updated successfully"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to update contest rankings"),
  },
});

export const updateAllContestRankings = createRoute({
  path: "/contest-ranks/update-all",
  method: "post",
  tags,
  summary: "Update All Contest Rankings",
  description: "Recalculate and update all contest rankings",
  responses: {
    [HttpStatusCodes.OK]: jsonContent(
      z.object({
        message: z.string(),
      }),
      "All contest rankings updated successfully"
    ),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse("Failed to update all contest rankings"),
  },
});

export type ContestRanksUpdateRoute = typeof contestRanksUpdate;
export type UpdateAllContestRankingsRoute = typeof updateAllContestRankings;

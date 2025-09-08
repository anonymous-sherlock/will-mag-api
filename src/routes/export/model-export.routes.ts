import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";

import { BadRequestResponse, UnauthorizedResponse } from "@/lib/openapi.responses";

const tags = ["Export"];

export const exportModelData = createRoute({
  path: "/export/models",
  method: "get",
  tags,
  summary: "Export Model Data",
  description: "Export comprehensive model data including profile details, contest participations, votes received, and rankings in Excel format",
  request: {
    query: z.object({
      format: z.enum(["excel", "csv"]).default("excel").describe("Export format"),
      includeInactive: z.union([z.boolean(), z.literal("true"), z.literal("false")]).default(false).describe("Include inactive models"),
      contestId: z.string().optional().describe("Filter by specific contest ID"),
    }),
  },
  responses: {
    [HttpStatusCodes.OK]: {
      description: "Model data export file",
      content: {
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
          schema: {
            type: "string",
            format: "binary",
          },
        },
        "text/csv": {
          schema: {
            type: "string",
            format: "binary",
          },
        },
      },
      headers: {
        "Content-Disposition": {
          description: "Attachment filename",
          schema: {
            type: "string",
          },
        },
      },
    },
    [HttpStatusCodes.UNAUTHORIZED]: UnauthorizedResponse(),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse("Invalid export parameters"),
  },
});

export type ExportModelDataRoute = typeof exportModelData;

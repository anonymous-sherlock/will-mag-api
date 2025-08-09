import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";

import { MediaInsertSchema, MediaSelectSchema } from "@/db/schema/media.schema";
import { BadRequestResponse, InternalServerErrorResponse } from "@/lib/openapi.responses";

const tags = ["Media"];

export const uploadMedia = createRoute({
  method: "post",
  path: "/media/profile/{profileId}/upload",
  tags,
  summary: "Upload Media File",
  description: "Upload a media file using multipart/form-data.",
  request: {
    params: z.object({
      profileId: z.string().optional(),
    }),
    body: {
      content: {
        "multipart/form-data": {
          schema: MediaInsertSchema.extend({
            file: z.instanceof(File).describe("The file to upload"),
          }),
        },
      },
      required: true,
    },
  },
  responses: {
    [HttpStatusCodes.CREATED]: jsonContent(
      MediaSelectSchema,
      "The uploaded media metadata",
    ),
    [HttpStatusCodes.BAD_REQUEST]: BadRequestResponse(),
    [HttpStatusCodes.INTERNAL_SERVER_ERROR]: InternalServerErrorResponse(),
  },
});

export type UploadMediaRoute = typeof uploadMedia;

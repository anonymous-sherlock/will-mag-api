import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
import { sendErrorResponse } from "@/helpers/send-error-response";
// import { File_Status } from "@/generated/prisma/index.js";
import { utapi } from "@/lib/uploadthing";

import type { UploadMediaRoute } from "./media.routes";

export const uploadMedia: AppRouteHandler<UploadMediaRoute> = async (c) => {
  const { file, mediaType, profileId } = c.req.valid("form");
  if (!file) {
    return sendErrorResponse(c, "badRequest");
  }

  // Upload file using utapi
  const uploaded = await utapi.uploadFiles([file], {
    concurrency: 6,
    acl: "public-read",
    contentDisposition: "inline",
  });

  if (!uploaded || !uploaded[0]) {
    return sendErrorResponse(c, "internalServerError", "Upload Failed");
  }

  const files = uploaded[0].data;
  if (!files) {
    return sendErrorResponse(c, "internalServerError");
  }
  const fileMeta = await db.media.create({
    data: {
      key: files.key,
      url: files.ufsUrl,
      size: files.size,
      name: files.name,
      status: "COMPLETED",
      mediaType,
      profileId,
    },
  });

  return c.json(fileMeta, 201);
};

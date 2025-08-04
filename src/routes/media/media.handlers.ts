import type { AppRouteHandler } from "@/types/types";

import { db } from "@/db";
// import { File_Status } from "@/generated/prisma/index.js";
import { utapi } from "@/lib/uploadthing";

import type { UploadMediaRoute } from "./media.routes";

export const uploadMedia: AppRouteHandler<UploadMediaRoute> = async (c) => {
  const { file, mediaType, profileId } = c.req.valid("form");
  if (!file) {
    return c.json({ error: "No file uploaded" }, 400);
  }

  // Upload file using utapi

  const uploaded = await utapi.uploadFiles([file], {
    concurrency: 6,
    acl: "public-read",
    contentDisposition: "inline",
  });

  if (!uploaded || !uploaded[0]) {
    return c.json({ error: "Upload failed" }, 500);
  }

  const files = uploaded[0].data;
  if (!files) {
    return c.json({ error: "Upload failed" }, 500);
  }
  const fileMeta = await db.media.create({
    data: {
      key: files.key,
      url: files.url,
      size: files.size,
      name: files.name,
      status: "COMPLETED",
      originalFileName: files.name,
      mediaType,
      profileId,
    },
  });
  // const media = await db.media.create({
  //   data: {
  //     key,
  //     url,
  //     size,
  //     type,
  //     name,
  //     status: File_Status.COMPLETED,
  //     originalFileName: file.name,
  //   },
  // });
  return c.json(fileMeta, 201);
};

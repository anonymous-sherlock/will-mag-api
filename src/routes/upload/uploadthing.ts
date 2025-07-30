/* eslint-disable no-console */
import type { FileRouter } from "uploadthing/server";

import { createUploadthing } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  // Define as many FileRoutes as you like, each with a unique routeSlug
  profilePictures: f(["image"]).onUploadComplete(data => console.log("file", data)),
  // coverImage upload should return the Media ID for use as coverImageId
  coverImage: f(["image"]).onUploadComplete(async (data) => {
    // Here you should create a Media record in your DB and return its ID
    // Example (pseudo-code):
    // const media = await db.media.create({ data: { ...data } });
    // return { mediaId: media.id };
    console.log("file", data);
  }),
};

export type OurFileRouter = typeof uploadRouter;

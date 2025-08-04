/* eslint-disable no-console */

import { createUploadthing } from "uploadthing/server";

const f = createUploadthing();

export const uploadRouter = {
  profileImages: f(["image"]).onUploadComplete(data => console.log("file", data)),
  votingImages: f(["image"]).onUploadComplete(data => console.log("file", data)),
  coverImage: f(["image"]).onUploadComplete(async (data) => { console.log("file", data); }),
};

export type OurFileRouter = typeof uploadRouter;

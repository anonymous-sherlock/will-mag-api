import { createRouteHandler } from "uploadthing/server";

import { createBaseAPIRouter } from "@/lib/create-app";

import { uploadRouter } from "./uploadthing";

const handlers = createRouteHandler({
  router: uploadRouter,
  config: { logLevel: "Debug" },
});

const router = createBaseAPIRouter().on(["GET", "POST", "PUT", "DELETE", "PATCH"], "/uploadthing", context => handlers(context.req.raw));

export default router;

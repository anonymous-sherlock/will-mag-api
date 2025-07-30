import { createRouteHandler } from "uploadthing/server";

import { createBaseAPIRouter } from "@/lib/create-app";

import { uploadRouter } from "./uploadthing";

const handlers = createRouteHandler({
  router: uploadRouter,
  config: { isDev: true },
});

const router = createBaseAPIRouter().all("/uploadthing", context => handlers(context.req.raw));

export default router;

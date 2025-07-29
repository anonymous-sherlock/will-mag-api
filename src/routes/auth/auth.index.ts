import { auth } from "@/lib/auth";
import { createBaseAPIRouter } from "@/lib/create-app";

const router = createBaseAPIRouter().on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw);
});

export default router;

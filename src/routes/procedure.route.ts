import * as HttpStatusCodes from "stoker/http-status-codes";
import { UNAUTHORIZED } from "stoker/http-status-phrases";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import { auth } from "@/lib/auth";
import { createBaseAPIRouter } from "@/lib/create-app";

export const publicProcedure = createBaseAPIRouter();
export const privateProcedure = publicProcedure.use("*", async (c, next) => {
  const session = await auth.api.getSession({ headers: c.req.raw.headers });

  if (!session) {
    c.set("user", null);
    c.set("session", null);
    return c.json(createMessageObjectSchema(UNAUTHORIZED), HttpStatusCodes.UNAUTHORIZED);
  }

  c.set("user", session.user);
  c.set("session", session.session);
  return next();
});

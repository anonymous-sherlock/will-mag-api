import { createRoute, z } from "@hono/zod-openapi";
import * as HttpStatusCodes from "stoker/http-status-codes";
import { jsonContent } from "stoker/openapi/helpers";
import { createMessageObjectSchema } from "stoker/openapi/schemas";

import env from "@/env";
import { createRouter } from "@/lib/create-app";

const router = createRouter()
  .openapi(
    createRoute({
      tags: ["Index"],
      method: "get",
      path: "/",
      responses: {
        [HttpStatusCodes.OK]: jsonContent(
          createMessageObjectSchema("Will Mag API").extend({
            "API Doc": z.string(),
            "API Reference": z.string(),
          }),
          "Will Mag Index",
        ),
      },
    }),
    (c) => {
      return c.json({
        "message": "Will Mag API",
        "API Doc": `${env.PUBLIC_APP_URL}/api/v1/doc`,
        "API Reference": `${env.PUBLIC_APP_URL}/reference`,
      }, HttpStatusCodes.OK);
    },
  );

export default router;

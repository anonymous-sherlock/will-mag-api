import { compress } from "hono/compress";

import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./image.handlers";
import * as routes from "./image.routes";

const imageRouter = createRouteBuilder()
  .openapi(routes.transformImage, handlers.transformImage, {
    auth: "public",
    middlewares: [compress()],
  })
  .openapi(routes.healthCheck, handlers.healthCheck, "public");

export default imageRouter.getRouter();

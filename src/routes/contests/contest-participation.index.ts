import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./contest-participation.handlers";
import * as routes from "./contest-participation.routes";

const router = createBaseAPIRouter()
  .openapi(routes.join, handlers.join)
  .openapi(routes.leave, handlers.leave);

export default router;

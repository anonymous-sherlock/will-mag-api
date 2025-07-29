import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./contest.handlers";
import * as routes from "./contest.routes";

const router = createBaseAPIRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create);

export default router;

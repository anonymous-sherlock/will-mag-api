import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./user.handlers";
import * as routes from "./user.routes";

const router = createBaseAPIRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create);

export default router;

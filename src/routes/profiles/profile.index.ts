import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./profile.handlers";
import * as routes from "./profile.routes";

const router = createBaseAPIRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.getByUserId, handlers.getByUserId)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove);

export default router;

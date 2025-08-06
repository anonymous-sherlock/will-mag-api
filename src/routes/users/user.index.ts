import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./user.handlers";
import * as routes from "./user.routes";

const userRoutes = createBaseAPIRouter()
  .openapi(routes.create, handlers.create)
  .openapi(routes.list, handlers.list)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.getUserProfile, handlers.getUserProfile)
  .openapi(routes.remove, handlers.remove);

export default userRoutes;

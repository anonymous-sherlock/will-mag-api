import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./profile.handlers";
import * as routes from "./profile.routes";

const profileRouter = createRouteBuilder()
  .openapi(routes.list, handlers.list, "private")
  .openapi(routes.create, handlers.create, "private")
  .openapi(routes.getOne, handlers.getOne, "private")
  .openapi(routes.getByUserId, handlers.getByUserId, "private")
  .openapi(routes.patch, handlers.patch, "private")
  .openapi(routes.remove, handlers.remove, "private");

export default profileRouter.getRouter();

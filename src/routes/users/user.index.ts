import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./user.handlers";
import * as routes from "./user.routes";

const userRoutes = createRouteBuilder()
  .openapi(routes.list, handlers.list, "public")
  .openapi(routes.create, handlers.create, "admin")
  .openapi(routes.getOne, handlers.getOne, "private")
  .openapi(routes.getByEmail, handlers.getByEmail, "private")
  .openapi(routes.getByUsername, handlers.getByUsername, "private")
  .openapi(routes.patch, handlers.patch, "private")
  .openapi(routes.getUserProfile, handlers.getUserProfile, "private")
  .openapi(routes.changeUserType, handlers.changeUserType, "admin")
  .openapi(routes.remove, handlers.remove, "admin")
  .openapi(routes.updateNullUsernames, handlers.updateNullUsernames, "admin")
  .openapi(routes.createVoterProfile, handlers.createVoterProfile, "private");

export default userRoutes.getRouter();

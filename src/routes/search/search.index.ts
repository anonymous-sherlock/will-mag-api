import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./search.handlers";
import * as routes from "./search.routes";

const searchRoutes = createRouteBuilder()
  .openapi(routes.searchProfiles, handlers.searchProfiles)
  .openapi(routes.searchContests, handlers.searchContests)
  .openapi(routes.searchUsers, handlers.searchUsers);

export default searchRoutes.getRouter();

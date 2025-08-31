import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./admin-votes.handlers";
import * as routes from "./admin-votes.routes";

const adminVotesRoutes = createRouteBuilder()
  .openapi(routes.getAllVotes, handlers.getAllVotes, "admin");

export default adminVotesRoutes.getRouter();

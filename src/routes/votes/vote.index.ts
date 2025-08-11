import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./vote.handlers";
import * as routes from "./vote.routes";

const votesRoutes = createRouteBuilder()
  .openapi(routes.freeVote, handlers.freeVote)
  .openapi(routes.payVote, handlers.payVote)
  .openapi(routes.isFreeVoteAvailable, handlers.isFreeVoteAvailable)
  .openapi(routes.getLatestVotes, handlers.getLatestVotes, "admin")
  .openapi(routes.getVotesByProfileId, handlers.getVotesByProfileId);

export default votesRoutes.getRouter();

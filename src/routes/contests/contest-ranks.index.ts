import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./contest-ranks.handlers";
import * as routes from "./contest-ranks.routes";

const contestRanksRouter = createRouteBuilder()
  .openapi(routes.contestRanksUpdate, handlers.contestRanksUpdate, "public")
  .openapi(routes.updateAllContestRankings, handlers.updateAllContestRankings, "public");

export default contestRanksRouter.getRouter();

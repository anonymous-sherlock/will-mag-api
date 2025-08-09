import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./award.handlers";
import * as routes from "./award.routes";

const awardsRouter = createRouteBuilder()
  .openapi(routes.createContestAwards, handlers.createContestAwards)
  .openapi(routes.getContestAwards, handlers.getContestAwards)
  .openapi(routes.getAward, handlers.getAward)
  .openapi(routes.updateAward, handlers.updateAward)
  .openapi(routes.deleteAward, handlers.deleteAward);

export default awardsRouter.getRouter();

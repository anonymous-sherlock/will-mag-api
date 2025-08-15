import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./contest.handlers";
import * as routes from "./contest.routes";

const contestRouter = createRouteBuilder()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.getBySlug, handlers.getBySlug)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getUpcomingContests, handlers.getUpcomingContests)
  .openapi(routes.getAvailableContests, handlers.getAvailableContests)
  .openapi(routes.getJoinedContests, handlers.getJoinedContests)
  .openapi(routes.uploadContestImages, handlers.uploadContestImages)
  .openapi(routes.removeContestImage, handlers.removeContestImage)
  .openapi(routes.getContestStats, handlers.getContestStats)
  .openapi(routes.getContestLeaderboard, handlers.getContestLeaderboard);

export default contestRouter.getRouter();

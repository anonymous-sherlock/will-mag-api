import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./contest.handlers";
import * as routes from "./contest.routes";

const router = createBaseAPIRouter()
  .openapi(routes.list, handlers.list)
  .openapi(routes.create, handlers.create)
  .openapi(routes.getOne, handlers.getOne)
  .openapi(routes.patch, handlers.patch)
  .openapi(routes.remove, handlers.remove)
  .openapi(routes.getUpcomingContests, handlers.getUpcomingContests)
  .openapi(routes.getJoinedContests, handlers.getJoinedContests)
  .openapi(routes.getContestWinner, handlers.getContestWinner);

export default router;

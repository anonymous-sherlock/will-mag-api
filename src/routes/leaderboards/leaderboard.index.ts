import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./leaderboard.handlers";
import * as routes from "./leaderboard.routes";

const router = createBaseAPIRouter()
  .openapi(routes.getLeaderboard, handlers.getLeaderboard);

export default router;

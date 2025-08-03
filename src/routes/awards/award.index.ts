import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./award.handlers";
import * as routes from "./award.routes";

const router = createBaseAPIRouter()
  .openapi(routes.createContestAwards, handlers.createContestAwards)
  .openapi(routes.getContestAwards, handlers.getContestAwards)
  .openapi(routes.getAward, handlers.getAward)
  .openapi(routes.updateAward, handlers.updateAward)
  .openapi(routes.deleteAward, handlers.deleteAward);

export default router;

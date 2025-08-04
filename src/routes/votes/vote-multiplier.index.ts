import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./vote-multiplier.handlers";
import * as routes from "./vote-multiplier.routes";

const router = createBaseAPIRouter()
  .openapi(routes.createVoteMultiplierPeriod, handlers.createVoteMultiplierPeriod)
  .openapi(routes.getVoteMultiplierPeriods, handlers.getVoteMultiplierPeriods)
  .openapi(routes.getActiveVoteMultiplier, handlers.getActiveVoteMultiplier)
  .openapi(routes.updateVoteMultiplierPeriod, handlers.updateVoteMultiplierPeriod)
  .openapi(routes.deleteVoteMultiplierPeriod, handlers.deleteVoteMultiplierPeriod);

export default router;
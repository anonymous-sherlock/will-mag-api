import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./contest-participation.handlers";
import * as routes from "./contest-participation.routes";

const router = createBaseAPIRouter()
  .openapi(routes.join, handlers.join)
  .openapi(routes.leave, handlers.leave)
  .openapi(routes.getParticipants, handlers.getParticipants)
  .openapi(routes.getContestWinner, handlers.getContestWinner)
  .openapi(routes.setContestWinner, handlers.setContestWinner)
  .openapi(routes.checkParticipation, handlers.checkParticipation)
  .openapi(routes.uploadParticipationCoverImage, handlers.uploadParticipationCoverImage);

export default router;

import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./profile-stats";
import * as routes from "./profile-stats.routes";

const adminProfileStatsRoutes = createRouteBuilder()
  .openapi(routes.recalculateAllStats, handlers.recalculateAllStats)
  .openapi(routes.recalculateProfileStatsById, handlers.recalculateProfileStatsById);

export default adminProfileStatsRoutes.getRouter();

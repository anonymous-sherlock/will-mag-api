import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./analytics.handlers";
import * as routes from "./analytics.routes";

const analyticsRouter = createRouteBuilder()
  .openapi(routes.getDashboardStats, handlers.getDashboardStats, "private")
  .openapi(routes.getDetailedAnalytics, handlers.getDetailedAnalytics, "private")
  .openapi(routes.getContestAnalytics, handlers.getContestAnalytics, "public");

export default analyticsRouter.getRouter();

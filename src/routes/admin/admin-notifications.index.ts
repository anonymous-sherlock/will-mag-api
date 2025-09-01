import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./admin-notifications.handlers";
import * as routes from "./admin-notifications.routes";

const adminNotificationsRoutes = createRouteBuilder()
  .openapi(routes.getAllNotifications, handlers.getAllNotifications, "admin");

export default adminNotificationsRoutes.getRouter();

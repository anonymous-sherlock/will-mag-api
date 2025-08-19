import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./notification.handlers";
import * as routes from "./notification.routes";

const notificationRouter = createRouteBuilder()
  .openapi(routes.getNotifications, handlers.getNotifications)
  .openapi(routes.getNotification, handlers.getNotification)
  .openapi(routes.createNotification, handlers.createNotification)
  .openapi(routes.updateNotification, handlers.updateNotification)
  .openapi(routes.deleteNotification, handlers.deleteNotification)
  .openapi(routes.markAsRead, handlers.markAsRead)
  .openapi(routes.markAllAsRead, handlers.markAllAsRead)
  .openapi(routes.toggleArchive, handlers.toggleArchive)
  .openapi(routes.getArchivedNotifications, handlers.getArchivedNotifications)
  .openapi(routes.getNotificationStats, handlers.getNotificationStats);

export default notificationRouter.getRouter();

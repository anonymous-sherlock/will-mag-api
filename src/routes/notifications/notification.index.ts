import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./notification.handlers";
import * as routes from "./notification.routes";

const router = createBaseAPIRouter()
  .openapi(routes.getNotifications, handlers.getNotifications)
  .openapi(routes.getNotification, handlers.getNotification)
  .openapi(routes.createNotification, handlers.createNotification)
  .openapi(routes.updateNotification, handlers.updateNotification)
  .openapi(routes.deleteNotification, handlers.deleteNotification)
  .openapi(routes.markAsRead, handlers.markAsRead)
  .openapi(routes.markAllAsRead, handlers.markAllAsRead);

export default router;

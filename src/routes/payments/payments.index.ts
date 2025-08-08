import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./payments.handlers";
import * as routes from "./payments.routes";

const router = createBaseAPIRouter()
  .openapi(routes.getPaymentHistory, handlers.getPaymentHistory)
  .openapi(routes.getAllPayments, handlers.getAllPayments);

export default router;

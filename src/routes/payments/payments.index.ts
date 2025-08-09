import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./payments.handlers";
import * as routes from "./payments.routes";

const paymentRouter = createRouteBuilder()
  .openapi(routes.getPaymentHistory, handlers.getPaymentHistory, "private")
  .openapi(routes.getAllPayments, handlers.getAllPayments, "private");

export default paymentRouter.getRouter();

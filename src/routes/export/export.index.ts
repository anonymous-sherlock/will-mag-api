import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./model-export.handlers";
import * as routes from "./model-export.routes";

const exportRouter = createRouteBuilder()
  .openapi(routes.exportModelData, handlers.exportModelData, "admin");

export default exportRouter.getRouter();

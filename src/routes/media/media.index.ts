import { createRouteBuilder } from "../procedure.route";
import * as handlers from "./media.handlers";
import * as routes from "./media.routes";

const mediaRouter = createRouteBuilder().openapi(routes.uploadMedia, handlers.uploadMedia);

export default mediaRouter.getRouter();

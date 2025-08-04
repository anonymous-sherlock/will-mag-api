import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./media.handlers";
import * as routes from "./media.routes";

const router = createBaseAPIRouter().openapi(routes.uploadMedia, handlers.uploadMedia);

export default router;

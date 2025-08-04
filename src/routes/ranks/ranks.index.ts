import { createBaseAPIRouter } from "@/lib/create-app";

import * as handlers from "./ranks.handlers";
import * as routes from "./ranks.routes";

const router = createBaseAPIRouter().openapi(routes.list, handlers.list);

export default router;

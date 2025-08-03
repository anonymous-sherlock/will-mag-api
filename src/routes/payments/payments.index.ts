import { createBaseAPIRouter } from '@/lib/create-app';

import * as handlers from './payments.handlers';
import * as routes from './payments.routes';

const router = createBaseAPIRouter().openapi(routes.payVote, handlers.payVote);

export default router;

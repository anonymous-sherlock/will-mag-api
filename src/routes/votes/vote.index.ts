import { createBaseAPIRouter } from '@/lib/create-app';

import * as freeVoteHandlers from './is-free-vote-available.handlers';
import * as freeVoteRoutes from './is-free-vote-available.routes';
import * as handlers from './vote.handlers';
import * as routes from './vote.routes';

const router = createBaseAPIRouter()
  .openapi(routes.vote, handlers.vote)
  .openapi(freeVoteRoutes.isFreeVoteAvailable, freeVoteHandlers.isFreeVoteAvailable)
  .openapi(routes.getLatestVotes, handlers.getLatestVotes);

export default router;

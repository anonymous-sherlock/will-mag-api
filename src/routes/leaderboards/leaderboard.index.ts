import { createRouteBuilder } from '../procedure.route';
import * as handlers from './leaderboard.handlers';
import * as routes from './leaderboard.routes';

const router = createRouteBuilder()
  .openapi(routes.getLeaderboard, handlers.getLeaderboard)
  .openapi(routes.getLeaderboardStats, handlers.getLeaderboardStats);

export default router.getRouter();

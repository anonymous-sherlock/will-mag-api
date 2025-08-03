import configureOpenAPI from '@/lib/configure-open-api';
import createApp from '@/lib/create-app';
import auth from '@/routes/auth/auth.index';
import contestParticipation from '@/routes/contests/contest-participation.index';
import contest from '@/routes/contests/contest.index';
import index from '@/routes/index.route';
import profile from '@/routes/profiles/profile.index';
import ranks from '@/routes/ranks/ranks.index';
import user from '@/routes/users/user.index';
import vote from '@/routes/votes/vote.index';
import payments from '@/routes/payments/payments.index';
import stripeWebhookRouter from './routes/webhooks/stripe/stripe.index';

const app = createApp();
configureOpenAPI(app);

const routes = [
  index,
  auth,
  user,
  profile,
  contest,
  contestParticipation,
  vote,
  ranks,
  payments,
] as const;

routes.forEach(route => {
  app.route('/', route);
});

app.route('/', stripeWebhookRouter);

export type AppType = (typeof routes)[number];

export default app;

import { Hono } from "hono";

import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import auth from "@/routes/auth/auth.index";
import awards from "@/routes/awards/award.index";
import contestParticipation from "@/routes/contests/contest-participation.index";
import contest from "@/routes/contests/contest.index";
import index from "@/routes/index.route";
import leaderboard from "@/routes/leaderboards/leaderboard.index";
import media from "@/routes/media/media.index";
import notification from "@/routes/notifications/notification.index";
import payment from "@/routes/payments/payments.index";
import profile from "@/routes/profiles/profile.index";
import ranks from "@/routes/ranks/ranks.index";
import search from "@/routes/search/search.index";
import uploadthing from "@/routes/upload/uploadthing.index";
import user from "@/routes/users/user.index";
import voteMultiplier from "@/routes/votes/vote-multiplier.index";
import vote from "@/routes/votes/vote.index";

import stripeWebhookRouter from "./routes/webhooks/stripe/stripe.index";

const app = createApp();
configureOpenAPI(app);

const routes = [index, auth, user, profile, notification, contest, awards, contestParticipation, vote, voteMultiplier, ranks, payment, leaderboard, media, uploadthing, search] as const;

routes.forEach((route) => {
  app.route("/", route);
});

const server = new Hono();

server.route("/", stripeWebhookRouter).route("/", app);

export type AppType = (typeof routes)[number];

export default server;

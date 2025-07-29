import configureOpenAPI from "@/lib/configure-open-api";
import createApp from "@/lib/create-app";
import auth from "@/routes/auth/auth.index";
import contest from "@/routes/contests/contest.index";
import index from "@/routes/index.route";
import user from "@/routes/users/user.index";

const app = createApp();

configureOpenAPI(app);

const routes = [
  index,
  auth,
  user,
  contest,
] as const;

routes.forEach((route) => {
  app.route("/", route);
});

export type AppType = typeof routes[number];

export default app;

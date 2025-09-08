import Cloudflare from "cloudflare";

import env from "../env";

export const client = new Cloudflare({
  apiToken: env.CLOUDFLARE_TOKEN,
});

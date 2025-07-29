import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { adminClient } from "better-auth/client/plugins";
import { username } from "better-auth/plugins";

import { db } from "@/db";

export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    username(),
    adminClient(),
  ],
  advanced: {
    crossSubDomainCookies: {
      enabled: true,
    },
  },
});

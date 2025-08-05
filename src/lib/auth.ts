import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { adminClient } from "better-auth/client/plugins";
import { bearer, openAPI, username } from "better-auth/plugins";

import { db } from "@/db";
import env from "@/env";

// Explicitly type the auth configuration to avoid DTS generation issues
export const auth = betterAuth({
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  basePath: "/api/v1/auth",
  baseURL: env.PUBLIC_APP_URL,
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: false,
  },
  username: {
    enabled: true,
  },
  databaseHooks: {
    user: {
      create: {
        async after(user, _context) {
          await db.profile.create({
            data: {
              userId: user.id,
              address: "",
            },
          });
        },
      },
    },
  },
  user: {
    additionalFields: {
      role: {
        type: ["USER", "ADMIN", "MODERATOR"],
        input: false,
      },
      emailVerified: {
        type: "date",
        input: false,
      },
    },
  },
  session: {
    additionalFields: {
      role: { type: "string" },
    },
  },
  plugins: [
    username({
      minUsernameLength: 3,
      maxUsernameLength: 100,

      usernameValidator: (username) => {
        if (username === "admin") {
          return false;
        }
        return true;
      },
    }),
    adminClient(),
    openAPI(),
    bearer(),
  ],

  advanced: {
    database: {
      generateId: false,
    },
    crossSubDomainCookies: {
      enabled: true,
    },
  },
  logger: {
    disabled: false,
    level: "error",
    log: (level, message, ...args) => {
      // Custom logging implementation
      console.warn(`[${level}] ${message}`, ...args);
    },
  },

});

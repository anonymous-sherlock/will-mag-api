import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { adminClient } from "better-auth/client/plugins";
import { bearer, customSession, openAPI, username } from "better-auth/plugins";

import { db } from "@/db";
import env from "@/env";
import { sendEmailAction } from "@/helpers/send-email-action";

export const auth = betterAuth({
  appName: "Swing Magazine",
  database: prismaAdapter(db, {
    provider: "mysql",
  }),
  basePath: "/api/v1/auth",
  baseURL: env.PUBLIC_APP_URL,
  emailAndPassword: {
    requireEmailVerification: false,
    enabled: true,
    minPasswordLength: 6,
    autoSignIn: false,
    sendResetPassword: async ({ user, url }) => {
      await sendEmailAction({
        to: user.email,
        subject: "Reset your password",
        meta: {
          description: "Please click the link below to reset your password.",
          link: String(url),
        },
      });
    },
  },
  username: {
    enabled: true,
  },
  databaseHooks: {
    user: {

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
      profileId: { type: "string", required: false, input: false },

    },
  },
  session: {
    expiresIn: 30 * 24 * 60 * 60,
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60,
    },
    additionalFields: {
      role: { type: ["USER", "ADMIN", "MODERATOR"], input: false },
      profileId: { type: "string", required: false, input: false },
    },
  },
  plugins: [
    customSession(async ({ user, session }) => {
      const profile = await db.profile.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });

      return {
        user: {
          ...user,
          profileId: profile?.id || null,
        },
        session: {
          ...session,
          profileId: profile?.id || null,
        },
      };
    }),
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

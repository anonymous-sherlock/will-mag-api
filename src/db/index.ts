import env from "@/env";
import { PrismaClient } from "@/generated/prisma/index";

declare global {
  /* eslint-disable vars-on-top */
  var cachedPrisma: PrismaClient;
}

let prisma: PrismaClient;
if (env.NODE_ENV === "production") {
  prisma = new PrismaClient();
}
else {
  if (!globalThis.cachedPrisma) {
    globalThis.cachedPrisma = new PrismaClient();
  }
  prisma = globalThis.cachedPrisma;
}

export const db = prisma;

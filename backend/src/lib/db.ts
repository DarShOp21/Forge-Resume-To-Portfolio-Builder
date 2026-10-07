import { PrismaClient } from "@prisma/client";

// Standard singleton pattern - `tsx watch` / hot-reload in dev would
// otherwise create a new PrismaClient (and a new connection pool) on
// every file change.
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const db = global.__prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__prisma = db;
}

import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getConfig } from "./config";

function createDb(connectionString: string) {
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 }), log: [], omit: { applicationFile: { content: true } } });
}

const globalDb = globalThis as unknown as { applicationDb?: ReturnType<typeof createDb> };

export function getDb() {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!globalDb.applicationDb) globalDb.applicationDb = createDb(DATABASE_URL);
  return globalDb.applicationDb;
}

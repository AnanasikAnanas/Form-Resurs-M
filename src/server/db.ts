import "server-only";
import { PrismaClient } from "@/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { getConfig } from "./config";

const globalDb = globalThis as unknown as { inquiryDb?: PrismaClient };

export function getDb() {
  const { DATABASE_URL } = getConfig();
  if (!DATABASE_URL) throw new Error("DATABASE_NOT_CONFIGURED");
  if (!globalDb.inquiryDb) {
    globalDb.inquiryDb = new PrismaClient({ adapter: new PrismaPg({ connectionString: DATABASE_URL, max: 5, connectionTimeoutMillis: 5000, idleTimeoutMillis: 30000 }), log: [] });
  }
  return globalDb.inquiryDb;
}

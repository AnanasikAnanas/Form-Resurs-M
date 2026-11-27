import "server-only";
import { readdir, lstat, rm } from "node:fs/promises";
import path from "node:path";
import { getDb } from "./db";
import { getConfig } from "./config";
import { deleteStoredFiles, privateRoot } from "./uploads";

export async function deleteInquiry(id: string) {
  const db = getDb();
  await db.application.update({ where: { id }, data: { expiresAt: new Date() } });
  await db.notificationJob.updateMany({ where: { inquiryId: id }, data: { status: "CANCELLED", leaseToken: null, leaseUntil: null } });
  const legacy = await db.applicationFile.count({ where: { inquiryId: id, storageKey: { not: null } } });
  if (legacy) await deleteStoredFiles(id);
  await db.$transaction([
    db.application.delete({ where: { id } }),
    db.accessAudit.create({ data: { action: "DELETE", reference: id } }),
  ]);
}

export async function cleanupExpired() {
  const db = getDb();
  const now = new Date();
  const expired = await db.application.findMany({ where: { expiresAt: { lte: now } }, take: 100, select: { id: true } });
  for (const inquiry of expired) await deleteInquiry(inquiry.id);
  const root = await privateRoot();
  const cutoff = Date.now() - 86400000;
  const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
  for (const directory of [root, path.join(root, ".staging")]) {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    for (const entry of entries) {
      if (!entry.isDirectory() || !uuid.test(entry.name)) continue;
      const target = path.join(directory, entry.name);
      if ((await lstat(target)).mtimeMs >= cutoff) continue;
      if (directory === root && await db.application.count({ where: { id: entry.name } })) continue;
      await rm(target, { recursive: true, force: true });
    }
  }
  await db.rateLimit.deleteMany({ where: { expiresAt: { lt: new Date(Date.now() - 86400000) } } });
  const retention = getConfig().INQUIRY_RETENTION_DAYS;
  if (retention) await db.accessAudit.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - retention * 86400000) } } });
  return expired.length;
}

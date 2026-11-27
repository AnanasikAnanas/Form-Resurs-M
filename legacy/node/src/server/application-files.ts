import "server-only";
import { getDb } from "./db";
import { readStoredFile, sha256 } from "./uploads";

export async function readApplicationFile(id: string, db = getDb()) {
  const file = await db.applicationFile.findFirst({ where: { id, inquiry: { expiresAt: { gt: new Date() } } }, select: { content: true, storageKey: true, sha256: true, size: true, originalName: true, mime: true } });
  if (!file) throw new Error("FILE_NOT_FOUND");
  const content = file.content ? Buffer.from(file.content) : file.storageKey ? await readStoredFile(file.storageKey) : null;
  if (!content || content.length !== file.size || sha256(content) !== file.sha256) throw new Error("FILE_INTEGRITY");
  return { content, filename: file.originalName, contentType: file.mime };
}

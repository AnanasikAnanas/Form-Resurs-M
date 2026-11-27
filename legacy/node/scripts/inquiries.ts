import { loadEnvConfig } from "@next/env";
import { writeFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

loadEnvConfig(process.cwd());

async function main() {
  const { getDb } = await import("../src/server/db");
  const db = getDb();
  const [command, value, fileId, destination] = process.argv.slice(2);
  try {
    if (command === "list") {
      const records = await db.application.findMany({ where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, createdAt: true, service: true, notification: { select: { status: true } }, _count: { select: { files: true } } } });
      await db.accessAudit.create({ data: { action: "LIST" } });
      console.log(JSON.stringify(records, null, 2));
    } else if (command === "show") {
      const id = z.uuid().parse(value);
      const record = await db.application.findFirst({ where: { id, expiresAt: { gt: new Date() } }, include: { files: true, notification: true } });
      if (!record) throw new Error("NOT_FOUND");
      await db.accessAudit.create({ data: { action: "READ", reference: id } });
      console.log(JSON.stringify(record, null, 2));
    } else if (command === "file") {
      const id = z.uuid().parse(value);
      const attachment = await db.applicationFile.findFirst({ where: { id: z.uuid().parse(fileId), inquiryId: id, inquiry: { expiresAt: { gt: new Date() } } } });
      if (!attachment || !destination) throw new Error("FILE_NOT_FOUND");
      const parent = await realpath(path.dirname(path.resolve(destination)));
      if ((await stat(parent)).mode & 0o077) throw new Error("DESTINATION_NOT_PRIVATE");
      const output = path.join(parent, path.basename(destination));
      for (const name of ["public", "out", ".next"]) {
        const forbidden = await realpath(path.resolve(name)).catch(() => path.resolve(name));
        if (output === forbidden || output.startsWith(forbidden + path.sep)) throw new Error("PUBLIC_DESTINATION");
      }
      const { readApplicationFile } = await import("../src/server/application-files");
      const { content: data } = await readApplicationFile(attachment.id);
      await db.accessAudit.create({ data: { action: "FILE_READ", reference: id } });
      await writeFile(output, data, { flag: "wx", mode: 0o600 });
      console.log("Файл сохранён в указанный закрытый каталог.");
    } else if (command === "migrate-files") {
      const { readStoredFile, sha256, scanBuffer } = await import("../src/server/uploads");
      const pending = await db.applicationFile.findMany({ where: { content: null, storageKey: { not: null } }, take: 25, select: { id: true, inquiryId: true, storageKey: true, sha256: true, size: true } });
      for (const file of pending) {
        const data = await readStoredFile(file.storageKey!);
        if (data.length !== file.size || sha256(data) !== file.sha256) throw new Error("FILE_INTEGRITY");
        await scanBuffer(data, file.storageKey!.split(".").pop()!);
        await db.$transaction([
          db.applicationFile.updateMany({ where: { id: file.id, content: null, storageKey: file.storageKey }, data: { content: new Uint8Array(data) } }),
          db.accessAudit.create({ data: { action: "FILE_MIGRATE", reference: file.inquiryId } }),
        ]);
      }
      console.log(JSON.stringify({ processed: pending.length }));
    } else if (command === "delete") {
      const { deleteInquiry } = await import("../src/server/maintenance");
      await deleteInquiry(z.uuid().parse(value));
      console.log("Обращение и вложения удалены.");
    } else if (command === "cleanup") {
      const { cleanupExpired } = await import("../src/server/maintenance");
      console.log(JSON.stringify({ deleted: await cleanupExpired() }));
    } else if (command === "notifications") {
      const { processNotifications } = await import("../src/server/notifications");
      console.log(JSON.stringify({ processed: await processNotifications() }));
    } else if (command === "retry-notifications") {
      const result = await db.notificationJob.updateMany({ where: { status: { in: ["FAILED", "NOT_CONFIGURED"] }, inquiry: { expiresAt: { gt: new Date() } } }, data: { status: "PENDING", attempts: 0, lastErrorCode: null, leaseUntil: null, leaseToken: null, nextAttemptAt: new Date() } });
      await db.accessAudit.create({ data: { action: "RETRY_NOTIFICATIONS" } });
      console.log(JSON.stringify({ scheduled: result.count }));
    } else throw new Error("COMMAND_INVALID");
  } finally { await db.$disconnect(); }
}

main().catch(() => { console.error("Команда не выполнена. Проверьте параметры, конфигурацию и доступность базы. Персональные данные и секреты не выведены."); process.exitCode = 1; });

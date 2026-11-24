import "server-only";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { getConfig } from "./config";
import { getDb } from "./db";
import { reportEvent } from "./errors";

async function withDeadline<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("SMTP_TIMEOUT")), milliseconds); })]);
  } finally { clearTimeout(timer); }
}

export async function deliverNotification(id: string) {
  const db = getDb();
  const now = new Date();
  const lease = new Date(Date.now() + 60000);
  const claimed = await db.notification.updateMany({ where: { id, nextAttemptAt: { lte: now }, OR: [{ status: { in: ["PENDING", "RETRY", "NOT_CONFIGURED"] } }, { status: "SENDING", leaseUntil: { lt: now } }] }, data: { status: "SENDING", leaseUntil: lease } });
  if (claimed.count !== 1) return;
  const notification = await db.notification.findUnique({ where: { id }, include: { inquiry: { select: { id: true, service: true, createdAt: true, expiresAt: true, _count: { select: { files: true } } } } } });
  if (!notification) return;
  if (notification.inquiry.expiresAt <= now) {
    await db.notification.updateMany({ where: { id, status: "SENDING", leaseUntil: lease }, data: { status: "EXPIRED", leaseUntil: null } });
    return;
  }
  const config = getConfig();
  if (!config.SMTP_HOST || !config.SMTP_FROM || !config.MANAGER_EMAIL) {
    await db.notification.updateMany({ where: { id, status: "SENDING", leaseUntil: lease }, data: { status: "NOT_CONFIGURED", leaseUntil: null, lastErrorCode: "SMTP_NOT_CONFIGURED", nextAttemptAt: new Date(Date.now() + 60000) } });
    reportEvent("SMTP_NOT_CONFIGURED", notification.inquiryId);
    return;
  }
  const transport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE === "true", requireTLS: config.SMTP_SECURE !== "true", auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000, disableFileAccess: true, disableUrlAccess: true });
  try {
    const result = await withDeadline(transport.sendMail({ from: config.SMTP_FROM, to: config.MANAGER_EMAIL, subject: `Новое обращение ${notification.inquiryId}`, messageId: `<inquiry-${notification.inquiryId}@${new URL(config.origin).hostname}>`, text: `Обращение сохранено.\nНомер: ${notification.inquiryId}\nУслуга: ${notification.inquiry.service}\nПолучено: ${notification.inquiry.createdAt.toISOString()}\nВложений: ${notification.inquiry._count.files}\nОткройте обращение через защищённый доступ к серверу. Персональные данные и документы по почте не передаются.` }), 20000);
    if (!result.accepted?.length) throw new Error("SMTP_NOT_ACCEPTED");
    await db.notification.updateMany({ where: { id, status: "SENDING", leaseUntil: lease }, data: { status: "SENT", attempts: { increment: 1 }, leaseUntil: null, sentAt: new Date(), lastErrorCode: null } });
  } catch {
    const attempts = notification.attempts + 1;
    await db.notification.updateMany({ where: { id, status: "SENDING", leaseUntil: lease }, data: { status: attempts >= 8 ? "FAILED" : "RETRY", attempts, leaseUntil: null, lastErrorCode: "SMTP_DELIVERY_FAILED", nextAttemptAt: new Date(Date.now() + Math.min(86400, 60 * 2 ** attempts) * 1000) } });
    reportEvent("SMTP_DELIVERY_FAILED", notification.inquiryId);
  } finally { transport.close(); }
}

export async function processNotifications() {
  const entries = await getDb().notification.findMany({ where: { nextAttemptAt: { lte: new Date() }, OR: [{ status: { in: ["PENDING", "RETRY", "NOT_CONFIGURED"] } }, { status: "SENDING", leaseUntil: { lt: new Date() } }] }, take: 50, orderBy: { nextAttemptAt: "asc" }, select: { id: true } });
  for (const entry of entries) {
    try { await deliverNotification(entry.id); }
    catch { reportEvent("NOTIFICATION_WORKER_FAILED", randomUUID()); }
  }
  return entries.length;
}

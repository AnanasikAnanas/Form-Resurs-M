import "server-only";
import { randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { services } from "@/content/services";
import { getConfig } from "./config";
import { getDb } from "./db";
import { reportEvent } from "./errors";
import { readApplicationFile } from "./application-files";

async function withDeadline<T>(operation: Promise<T>, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([operation, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("SMTP_TIMEOUT")), milliseconds); })]);
  } finally { clearTimeout(timer); }
}

export async function deliverNotification(id: string, db = getDb()) {
  const config = getConfig();
  const now = new Date();
  const available = { OR: [{ status: { in: ["PENDING", "RETRY", "NOT_CONFIGURED"] } }, { status: "SENDING", OR: [{ leaseUntil: { lt: now } }, { leaseUntil: null }] }] };
  await db.notificationJob.updateMany({ where: { id, attempts: { gte: config.NOTIFICATION_MAX_ATTEMPTS }, ...available }, data: { status: "FAILED", leaseUntil: null, leaseToken: null } });
  const leaseToken = randomUUID();
  const claimed = await db.notificationJob.updateMany({ where: { id, attempts: { lt: config.NOTIFICATION_MAX_ATTEMPTS }, nextAttemptAt: { lte: now }, ...available }, data: { status: "SENDING", leaseToken, leaseUntil: new Date(Date.now() + 60000), attempts: { increment: 1 } } });
  if (claimed.count !== 1) return;
  const job = await db.notificationJob.findUnique({ where: { id }, include: { inquiry: { select: { id: true, name: true, company: true, phone: true, email: true, task: true, service: true, createdAt: true, expiresAt: true, files: { select: { id: true, size: true, originalName: true } } } } } });
  if (!job || job.leaseToken !== leaseToken) return;
  const owner = { id, status: "SENDING", leaseToken };
  const retry = async (code: string, status: string) => {
    await db.notificationJob.updateMany({ where: owner, data: { status: job.attempts >= config.NOTIFICATION_MAX_ATTEMPTS ? "FAILED" : status, leaseUntil: null, leaseToken: null, lastErrorCode: code, nextAttemptAt: new Date(Date.now() + Math.min(86400, 60 * 2 ** (job.attempts - 1)) * 1000) } });
    reportEvent(code, job.inquiryId);
  };
  if (job.inquiry.expiresAt <= now) {
    await db.notificationJob.updateMany({ where: owner, data: { status: "EXPIRED", leaseUntil: null, leaseToken: null } });
    return;
  }
  const recipient = config.PROJECT_MANAGER_EMAIL || config.MANAGER_EMAIL;
  if (!config.SMTP_HOST || !config.SMTP_FROM || !recipient) {
    await retry("SMTP_NOT_CONFIGURED", "NOT_CONFIGURED");
    return;
  }
  const transport = nodemailer.createTransport({ host: config.SMTP_HOST, port: config.SMTP_PORT, secure: config.SMTP_SECURE === "true", requireTLS: config.SMTP_SECURE !== "true", auth: config.SMTP_USER ? { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } : undefined, connectionTimeout: 5000, greetingTimeout: 5000, socketTimeout: 10000, disableFileAccess: true, disableUrlAccess: true });
  try {
    const application = job.inquiry;
    const service = services.find(entry => entry.slug === application.service)?.title || application.service;
    const text = `Номер заявки: ${application.id}\nДата обращения (UTC): ${application.createdAt.toISOString()}\nИмя: ${application.name}\nОрганизация: ${application.company}\nТелефон: ${application.phone}\nEmail: ${application.email}\nУслуга: ${service}\nОписание задачи:\n${application.task}`;
    const estimate = Buffer.byteLength(text, "utf8") * 3 + 128 * 1024 + application.files.reduce((sum, file) => {
      const encoded = Math.ceil(file.size / 3) * 4;
      return sum + encoded + Math.ceil(encoded / 76) * 2 + 4096;
    }, 0);
    const attach = estimate <= config.SMTP_ATTACHMENT_MAX_MB * 1024 * 1024;
    const attachments = attach ? await Promise.all(application.files.map(file => readApplicationFile(file.id, db))) : [];
    const access = !attach ? `\n\nВложения превышают лимит письма. Доступ только по индивидуальной SSH-учётной записи уполномоченного сотрудника. На сервере выполните:\n${application.files.map(file => `npm run inquiries -- file ${application.id} ${file.id} /закрытый/каталог/${file.id}`).join("\n")}\nПубличных ссылок на документы нет.` : "";
    if (!await db.notificationJob.count({ where: { ...owner, leaseUntil: { gt: new Date() }, inquiry: { expiresAt: { gt: new Date() } } } })) return;
    const result = await withDeadline(transport.sendMail({ from: config.SMTP_FROM, to: recipient, subject: `Новое обращение ${application.id}`, messageId: `<inquiry-${application.id}@${new URL(config.origin).hostname}>`, text: text + access, attachments }), 20000);
    if (!result.accepted?.some(address => typeof address === "string" && address.toLowerCase() === recipient.toLowerCase())) throw new Error("SMTP_NOT_ACCEPTED");
    await db.notificationJob.updateMany({ where: owner, data: { status: "SENT", leaseUntil: null, leaseToken: null, sentAt: new Date(), lastErrorCode: null } });
  } catch { await retry("SMTP_DELIVERY_FAILED", "RETRY"); }
  finally { transport.close(); }
}

export async function processNotifications() {
  const entries = await getDb().notificationJob.findMany({ where: { nextAttemptAt: { lte: new Date() }, OR: [{ status: { in: ["PENDING", "RETRY", "NOT_CONFIGURED"] } }, { status: "SENDING", OR: [{ leaseUntil: { lt: new Date() } }, { leaseUntil: null }] }] }, take: 50, orderBy: { nextAttemptAt: "asc" }, select: { id: true } });
  for (const entry of entries) {
    try { await deliverNotification(entry.id); }
    catch { reportEvent("NOTIFICATION_WORKER_FAILED", randomUUID()); }
  }
  return entries.length;
}

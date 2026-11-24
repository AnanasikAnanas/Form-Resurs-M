import { randomUUID } from "node:crypto";
import { z } from "zod";
import { inquirySchema } from "@/lib/inquiry-schema";
import { getDb } from "@/server/db";
import { getInquiryAvailability } from "@/server/legal";
import { checkOrigin, checkRateLimit, verifyFormToken } from "@/server/security";
import { readMultipart } from "@/server/request-body";
import { prepareFiles, storeFiles, sha256, deleteStoredFiles } from "@/server/uploads";
import { deliverNotification } from "@/server/notifications";
import { errorResponse, jsonResponse } from "@/server/http";
import { RequestError, reportEvent } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    checkOrigin(request);
    const { config, legal, enabled } = await getInquiryAvailability();
    if (!enabled || !legal) throw new RequestError(503, "DISABLED", "Приём обращений пока не подключён.");
    await checkRateLimit(request, "submit");
    const form = await readMultipart(request, config.limits.maxTotalBytes + 128 * 1024);
    const values: Record<string, string> = {};
    const files: File[] = [];
    const allowed = new Set(["name", "company", "phone", "email", "service", "task", "consent", "website", "token", "key"]);
    for (const [key, value] of form.entries()) {
      if (key === "files" && typeof value !== "string") { if (value.size || value.name) files.push(value); continue; }
      if (!allowed.has(key) || typeof value !== "string" || key in values) throw new RequestError(400, "FORM_FIELDS", "Проверьте поля формы.");
      values[key] = value;
    }
    if (values.website) throw new RequestError(400, "FORM_REJECTED", "Не удалось проверить обращение.");
    const key = z.uuid().safeParse(values.key);
    if (!key.success || !values.token) throw new RequestError(400, "FORM_TOKEN", "Обновите форму и повторите отправку.");
    verifyFormToken(values.token, key.data, legal);
    const parsed = inquirySchema.safeParse(Object.fromEntries(Object.entries(values).filter(([key]) => !["token", "key", "website"].includes(key))));
    if (!parsed.success) return jsonResponse({ ok: false, message: "Проверьте поля формы.", fieldErrors: parsed.error.flatten().fieldErrors }, 422);
    const prepared = await prepareFiles(files, config.limits);
    const fingerprint = sha256(JSON.stringify({ data: parsed.data, files: prepared.map((file) => ({ name: file.originalName, hash: file.inputHash })), policy: legal.policyHash, consent: legal.consentHash }));
    const db = getDb();
    const existing = await db.inquiry.findUnique({ where: { idempotencyKey: key.data }, select: { id: true, fingerprint: true } });
    if (existing) {
      if (existing.fingerprint !== fingerprint) throw new RequestError(409, "IDEMPOTENCY", "Предыдущая отправка уже сохранена. Для новой заявки обновите форму.");
      return jsonResponse({ ok: true, id: existing.id, message: "Обращение уже сохранено." });
    }
    const id = randomUUID();
    const metadata = await storeFiles(id, prepared);
    const { name, company, phone, email, service, task } = parsed.data;
    let notificationId: string;
    try {
      const result = await db.inquiry.create({ data: { id, idempotencyKey: key.data, fingerprint, name, company, phone, email, service, task, policyVersion: legal.policyVersion, consentVersion: legal.consentVersion, policyHash: legal.policyHash, consentHash: legal.consentHash, policyText: legal.policy, consentText: legal.consent, expiresAt: new Date(Date.now() + config.INQUIRY_RETENTION_DAYS * 86400000), files: { create: metadata }, notification: { create: {} } }, select: { notification: { select: { id: true } } } });
      notificationId = result.notification!.id;
    } catch (error) {
      const duplicate = await db.inquiry.findUnique({ where: { idempotencyKey: key.data }, select: { id: true, fingerprint: true } }).catch(() => null);
      if (duplicate && duplicate.id !== id && duplicate.fingerprint === fingerprint) {
        await deleteStoredFiles(id);
        return jsonResponse({ ok: true, id: duplicate.id, message: "Обращение уже сохранено." });
      }
      reportEvent("INQUIRY_COMMIT_UNCERTAIN", id);
      throw error;
    }
    try { await deliverNotification(notificationId); }
    catch { reportEvent("NOTIFICATION_DEFERRED", id); }
    return jsonResponse({ ok: true, id, message: "Обращение сохранено. Менеджер свяжется с вами по указанным контактам." }, 201);
  } catch (error) { return errorResponse(error); }
}

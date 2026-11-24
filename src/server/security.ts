import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { getDb } from "./db";
import { getConfig } from "./config";
import { RequestError } from "./errors";

export function checkOrigin(request: Request, required = true) {
  const { origin } = getConfig();
  const supplied = request.headers.get("origin");
  if ((required && supplied !== origin) || (supplied && supplied !== origin) || request.headers.get("sec-fetch-site") === "cross-site") throw new RequestError(403, "ORIGIN", "Отправляйте обращение со страницы сайта.");
}

export function secretHash(value: string) {
  const secret = getConfig().FORM_SECRET;
  if (!secret) throw new Error("FORM_SECRET_MISSING");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function clientKey(request: Request) {
  const header = getConfig().CLIENT_IP_HEADER;
  if (!header) return "shared";
  const ip = request.headers.get(header)?.trim();
  if (!ip || !isIP(ip)) throw new RequestError(400, "CLIENT_ADDRESS", "Не удалось проверить источник обращения.");
  return secretHash(ip);
}

async function takeLimit(key: string, seconds: number, max: number) {
  const now = Date.now();
  const bucket = Math.floor(now / (seconds * 1000));
  const expiresAt = new Date((bucket + 1) * seconds * 1000);
  const rows = await getDb().$queryRaw<{ hits: number }[]>`
    INSERT INTO "RateLimit" ("key", "hits", "expiresAt") VALUES (${key + ":" + bucket}, 1, ${expiresAt})
    ON CONFLICT ("key") DO UPDATE SET "hits" = LEAST("RateLimit"."hits" + 1, 1000000)
    RETURNING "hits"`;
  if (rows[0].hits > max) throw new RequestError(429, "RATE_LIMIT", "Слишком много обращений. Попробуйте позже.");
}

export async function checkRateLimit(request: Request, kind: "token" | "submit") {
  const config = getConfig();
  await takeLimit(`${kind}:global`, 60, config.RATE_LIMIT_GLOBAL_PER_MINUTE * (kind === "token" ? 4 : 1));
  await takeLimit(`${kind}:${clientKey(request)}`, config.RATE_LIMIT_WINDOW_SECONDS, kind === "token" ? 30 : config.RATE_LIMIT_MAX_REQUESTS);
}

const tokenSchema = z.object({ key: z.uuid(), issuedAt: z.number().int(), policyHash: z.string().length(64), consentHash: z.string().length(64) }).strict();
type LegalHashes = { policyHash: string; consentHash: string };

export function createFormToken(legal: LegalHashes, key: string = randomUUID(), now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ key, issuedAt: now, policyHash: legal.policyHash, consentHash: legal.consentHash })).toString("base64url");
  return { token: payload + "." + secretHash(payload), key };
}

export function verifyFormToken(value: string, key: string, legal: LegalHashes, now = Date.now()) {
  if (value.length > 2000) throw new RequestError(400, "FORM_TOKEN", "Обновите форму и повторите отправку.");
  const segments = value.split(".");
  const [payload, signature] = segments;
  const expected = Buffer.from(secretHash(payload || ""), "hex");
  const supplied = Buffer.from(signature || "", "hex");
  if (segments.length !== 2 || !/^[A-Za-z0-9_-]+$/.test(payload || "") || !/^[a-f0-9]{64}$/.test(signature || "") || supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new RequestError(400, "FORM_TOKEN", "Обновите форму и повторите отправку.");
  let data: z.infer<typeof tokenSchema>;
  try { data = tokenSchema.parse(JSON.parse(Buffer.from(payload, "base64url").toString())); }
  catch { throw new RequestError(400, "FORM_TOKEN", "Обновите форму и повторите отправку."); }
  if (data.key !== key || data.policyHash !== legal.policyHash || data.consentHash !== legal.consentHash || now - data.issuedAt > 30 * 60 * 1000 || now < data.issuedAt) throw new RequestError(400, "FORM_EXPIRED", "Условия формы обновились или время ожидания истекло. Обновите форму.");
  if (now - data.issuedAt < 2000) throw new RequestError(400, "TOO_FAST", "Подождите несколько секунд и повторите отправку.");
}

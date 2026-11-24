import "server-only";
import { randomUUID } from "node:crypto";
import { RequestError, reportEvent } from "./errors";

export function jsonResponse(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", ...extra } });
}

export function errorResponse(error: unknown) {
  if (error instanceof RequestError) return jsonResponse({ ok: false, code: error.code, message: error.message }, error.status, error.status === 429 ? { "Retry-After": "900" } : {});
  const reference = randomUUID();
  reportEvent("INQUIRY_REQUEST_FAILED", reference);
  return jsonResponse({ ok: false, code: "UNAVAILABLE", message: "Не удалось подтвердить сохранение обращения. Данные формы сохранены на экране. Повторите отправку позже.", reference }, 503);
}

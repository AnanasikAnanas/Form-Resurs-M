import { z } from "zod";
import { getInquiryAvailability } from "@/server/legal";
import { checkOrigin, checkRateLimit, createFormToken } from "@/server/security";
import { errorResponse, jsonResponse } from "@/server/http";
import { RequestError } from "@/server/errors";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    checkOrigin(request, false);
    const { enabled, legal } = await getInquiryAvailability();
    if (!enabled || !legal) throw new RequestError(503, "DISABLED", "Приём обращений пока не подключён.");
    await checkRateLimit(request, "token");
    const key = z.uuid().safeParse(new URL(request.url).searchParams.get("key"));
    if (!key.success) throw new RequestError(400, "KEY", "Обновите страницу формы.");
    return jsonResponse({ ok: true, ...createFormToken(legal, key.data), documentVersion: `${legal.policyHash}:${legal.consentHash}` });
  } catch (error) { return errorResponse(error); }
}

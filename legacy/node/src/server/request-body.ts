import "server-only";
import { RequestError } from "./errors";

export async function readMultipart(request: Request, maxBytes: number) {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.length > 200 || !/^multipart\/form-data;\s*boundary=/i.test(contentType)) throw new RequestError(415, "CONTENT_TYPE", "Используйте форму обращения.");
  const length = request.headers.get("content-length");
  if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new RequestError(413, "BODY_SIZE", "Общий размер обращения превышает допустимый.");
  const reader = request.body?.getReader();
  if (!reader) throw new RequestError(400, "EMPTY_BODY", "Заполните форму обращения.");
  let total = 0;
  const chunks: Uint8Array[] = [];
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new RequestError(408, "BODY_TIMEOUT", "Загрузка заняла слишком много времени. Повторите отправку.")), 15000); });
  try {
    while (true) {
      const { value, done } = await Promise.race([reader.read(), timeout]);
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) throw new RequestError(413, "BODY_SIZE", "Общий размер обращения превышает допустимый.");
      chunks.push(value);
    }
    const data = Buffer.concat(chunks, total);
    const boundary = contentType.match(/boundary=(?:"([^"]+)"|([^;\s]+))/i)?.slice(1).find(Boolean);
    if (!boundary || boundary.length > 70 || /[\r\n]/.test(boundary)) throw new RequestError(400, "MULTIPART", "Не удалось прочитать форму.");
    const delimiter = Buffer.from("\r\n--" + boundary);
    let parts = 1;
    let position = 0;
    while ((position = data.indexOf(delimiter, position)) !== -1) {
      if (++parts > 32) throw new RequestError(400, "MULTIPART_PARTS", "В форме слишком много полей или файлов.");
      position += delimiter.length;
    }
    try { return await new Request(request.url, { method: "POST", headers: { "content-type": contentType }, body: new Uint8Array(data) }).formData(); }
    catch { throw new RequestError(400, "MULTIPART", "Не удалось прочитать форму. Повторите отправку."); }
  } finally {
    clearTimeout(timer);
    void reader.cancel().catch(() => {});
  }
}

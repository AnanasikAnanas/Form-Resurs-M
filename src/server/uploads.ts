import "server-only";
import path from "node:path";
import { constants } from "node:fs";
import { mkdir, lstat, realpath, writeFile, rename, rm, open, readdir, readFile } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileTypeFromBuffer } from "file-type";
import sharp from "sharp";
import { PDFDocument, PDFDict, PDFArray, PDFName, PDFRawStream, type PDFObject } from "pdf-lib";
import { fileFormats, type UploadLimits, type FileFormat } from "@/lib/inquiry-schema";
import { getConfig } from "./config";
import { RequestError } from "./errors";

const runFile = promisify(execFile);
const uuid = /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i;
export const sha256 = (data: Uint8Array | string) => createHash("sha256").update(data).digest("hex");
export type PreparedFile = { id: string; originalName: string; mime: string; extension: string; data: Buffer; inputHash: string };

async function normalizePdf(data: Buffer) {
  const pdf = await PDFDocument.load(data, { ignoreEncryption: false, updateMetadata: false, throwOnInvalidObject: true });
  if (pdf.isEncrypted || pdf.getPageCount() < 1 || pdf.getPageCount() > 100) throw new Error("PDF_INVALID");
  const forbidden = new Set(["OpenAction", "AA", "JS", "JavaScript", "Launch", "EmbeddedFiles", "EmbeddedFile", "XFA", "RichMedia", "AcroForm", "URI", "GoToR", "GoToE", "SubmitForm", "ImportData", "Sound", "Movie", "3D"]);
  const seen = new Set<PDFObject>();
  function inspect(object: PDFObject) {
    if (seen.has(object)) return;
    seen.add(object);
    if (seen.size > 50000) throw new Error("PDF_TOO_COMPLEX");
    if (object instanceof PDFName && forbidden.has(object.decodeText())) throw new Error("PDF_ACTIVE_CONTENT");
    if (object instanceof PDFDict) for (const [key, value] of object.entries()) { inspect(key); inspect(value); }
    if (object instanceof PDFArray) for (const value of object.asArray()) inspect(value);
    if (object instanceof PDFRawStream) inspect(object.dict);
  }
  for (const [, object] of pdf.context.enumerateIndirectObjects()) inspect(object);
  return Buffer.from(await pdf.save({ useObjectStreams: false, addDefaultPage: false }));
}

export async function prepareFiles(files: File[], limits: UploadLimits): Promise<PreparedFile[]> {
  if (files.length > limits.maxFiles) throw new RequestError(400, "FILE_COUNT", `Разрешено не более ${limits.maxFiles} файлов.`);
  if (files.reduce((total, file) => total + file.size, 0) > limits.maxTotalBytes) throw new RequestError(413, "FILES_TOTAL", "Суммарный размер файлов превышает допустимый.");
  const prepared: PreparedFile[] = [];
  let outputBytes = 0;
  for (const file of files) {
    if (file.size <= 0 || file.size > limits.maxFileBytes) throw new RequestError(400, "FILE_SIZE", "Один из файлов пуст или превышает допустимый размер.");
    const name = file.name.normalize("NFC");
    if (name.length > 180 || /[\/\\\u0000-\u001f\u007f]/u.test(name) || name.includes("..")) throw new RequestError(400, "FILE_NAME", "Переименуйте файл без специальных символов и путей.");
    const extension = name.split(".").pop()?.toLowerCase();
    const format = limits.formats.find((key) => (fileFormats[key].extensions as readonly string[]).includes(extension ?? ""));
    if (!format) throw new RequestError(400, "FILE_FORMAT", "Недопустимый формат файла.");
    const input = Buffer.from(await file.arrayBuffer());
    const detected = await fileTypeFromBuffer(input).catch(() => undefined);
    if (!detected || detected.mime !== fileFormats[format].mime || (file.type && file.type !== detected.mime && file.type !== "application/octet-stream")) throw new RequestError(400, "FILE_CONTENT", "Содержимое файла не соответствует его формату.");
    let data: Buffer;
    try {
      data = format === "pdf" ? await normalizePdf(input) : await sharp(input, { limitInputPixels: 20000000, pages: 1, failOn: "warning" }).rotate().toFormat(format === "jpg" ? "jpeg" : format as Exclude<FileFormat, "jpg" | "pdf">).toBuffer();
    } catch { throw new RequestError(400, "FILE_UNSAFE", "Файл повреждён, защищён паролем или содержит недопустимые элементы."); }
    outputBytes += data.length;
    if (data.length > limits.maxFileBytes || outputBytes > limits.maxTotalBytes) throw new RequestError(400, "NORMALIZED_FILE_SIZE", "Размер обработанных файлов превышает допустимый.");
    prepared.push({ id: randomUUID(), originalName: name, mime: detected.mime, extension: format === "jpg" ? "jpg" : format, data, inputHash: sha256(input) });
  }
  return prepared;
}

export async function privateRoot() {
  const root = getConfig().uploadDir;
  await mkdir(root, { recursive: true, mode: 0o700 });
  const stat = await lstat(root);
  if (!stat.isDirectory() || stat.isSymbolicLink() || (stat.mode & 0o077) !== 0) throw new Error("PRIVATE_ROOT_INVALID");
  const canonical = await realpath(root);
  for (const name of ["public", ".next", "out"]) {
    const forbidden = await realpath(path.resolve(name)).catch(() => path.resolve(name));
    if (canonical === forbidden || canonical.startsWith(forbidden + path.sep)) throw new Error("PRIVATE_ROOT_PUBLIC");
  }
  const marker = path.join(canonical, ".form-resurs-storage");
  const markerStat = await lstat(marker).catch(() => null);
  if (!markerStat) {
    if ((await readdir(canonical)).length && !(await lstat(marker).catch(() => null))) throw new Error("PRIVATE_ROOT_NOT_EMPTY");
    await writeFile(marker, "form-resurs-v2\n", { flag: "wx", mode: 0o600, flush: true }).catch((error: NodeJS.ErrnoException) => { if (error.code !== "EEXIST") throw error; });
  }
  if ((await lstat(marker)).isSymbolicLink() || await readFile(marker, "utf8") !== "form-resurs-v2\n") throw new Error("PRIVATE_ROOT_MARKER_INVALID");
  return canonical;
}

export async function storeFiles(inquiryId: string, files: PreparedFile[]) {
  if (!uuid.test(inquiryId)) throw new Error("INQUIRY_ID_INVALID");
  const config = getConfig();
  const root = await privateRoot();
  const stagingRoot = path.join(root, ".staging");
  await mkdir(stagingRoot, { recursive: true, mode: 0o700 });
  if ((await lstat(stagingRoot)).isSymbolicLink()) throw new Error("STAGING_DIRECTORY_INVALID");
  const staging = path.join(stagingRoot, randomUUID());
  await mkdir(staging, { mode: 0o700 });
  try {
    const metadata = [];
    for (const file of files) {
      const filename = `${file.id}.${file.extension}`;
      const target = path.join(staging, filename);
      await writeFile(target, file.data, { flag: "wx", mode: 0o600, flush: true });
      if (config.CLAMDSCAN_PATH) {
        if (!path.isAbsolute(config.CLAMDSCAN_PATH)) throw new Error("SCANNER_PATH_INVALID");
        try { await runFile(config.CLAMDSCAN_PATH, ["--no-summary", "--fdpass", target], { timeout: 15000, maxBuffer: 16384 }); }
        catch (error) {
          if ((error as { code?: unknown }).code === 1) throw new RequestError(400, "FILE_SCAN", "Проверка безопасности файла не пройдена. Удалите вложение.");
          throw new RequestError(503, "SCANNER_UNAVAILABLE", "Проверка вложений временно недоступна. Отправьте обращение без файлов или повторите позже.");
        }
      } else if (config.UPLOAD_SCAN_REQUIRED === "true") throw new RequestError(503, "SCANNER_UNAVAILABLE", "Проверка вложений временно недоступна. Отправьте обращение без файлов или повторите позже.");
      metadata.push({ id: file.id, originalName: file.originalName, storageKey: `${inquiryId}/${filename}`, mime: file.mime, size: file.data.length, sha256: sha256(file.data) });
    }
    await rename(staging, path.join(root, inquiryId));
    return metadata;
  } catch (error) {
    await rm(staging, { recursive: true, force: true });
    throw error;
  }
}

export async function deleteStoredFiles(id: string) {
  if (!uuid.test(id)) throw new Error("INQUIRY_ID_INVALID");
  await rm(path.join(await privateRoot(), id), { recursive: true, force: true });
}

export async function readStoredFile(key: string) {
  if (!/^[\da-f-]{36}\/[\da-f-]{36}\.(jpg|png|webp|pdf)$/i.test(key)) throw new Error("STORAGE_KEY_INVALID");
  const [directory, filename] = key.split("/");
  if (!uuid.test(directory) || !uuid.test(filename.split(".")[0])) throw new Error("STORAGE_KEY_INVALID");
  const root = await privateRoot();
  const folder = path.join(root, directory);
  if ((await lstat(folder)).isSymbolicLink()) throw new Error("STORAGE_DIRECTORY_INVALID");
  const handle = await open(path.join(folder, filename), constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!(await handle.stat()).isFile()) throw new Error("STORAGE_FILE_INVALID");
    return await handle.readFile();
  } finally { await handle.close(); }
}

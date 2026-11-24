import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import sharp from "sharp";
import { PDFDocument, PDFName } from "pdf-lib";
import { inquirySchema, type UploadLimits } from "../src/lib/inquiry-schema";
import { createFormToken, verifyFormToken, checkOrigin } from "../src/server/security";
import { readMultipart } from "../src/server/request-body";
import { prepareFiles, storeFiles, readStoredFile, deleteStoredFiles, privateRoot } from "../src/server/uploads";
import { POST } from "../src/app/api/inquiries/route";
import { GET } from "../src/app/api/inquiries/token/route";

process.env.FORM_SECRET = "unit-test-only-secret-".repeat(3);
process.env.APP_ORIGIN = "http://localhost:3000";
process.env.INQUIRIES_ENABLED = "false";
process.env.UPLOAD_SCAN_REQUIRED = "false";

const input = { name: "Тестовый заказчик", company: "Тестовое предприятие", phone: "+7 (999) 123-45-67", email: "fixture@example.invalid", service: "mold-repair", task: "Тестовое описание задачи для проверки.", consent: "yes" };
const hashes = { policyHash: "a".repeat(64), consentHash: "b".repeat(64) };
const limits: UploadLimits = { maxFiles: 5, maxFileBytes: 1024 * 1024, maxTotalBytes: 2 * 1024 * 1024, formats: ["jpg", "png", "webp", "pdf"] };
const upload = (data: Uint8Array, name: string, type = "") => new File([new Uint8Array(data)], name, { type });

test("Zod rejects missing consent, invalid contacts, unknown service and additional fields", () => {
  assert.equal(inquirySchema.safeParse(input).success, true);
  for (const patch of [{ consent: "no" }, { phone: "123" }, { phone: "abcdefghij" }, { email: "invalid" }, { service: "fake-service" }, { task: "\u0000broken" }, { extra: "value" }]) assert.equal(inquirySchema.safeParse({ ...input, ...patch }).success, false);
});

test("form token rejects tampering, replay with another key, changed consent, early and expired submissions", () => {
  const key = randomUUID();
  const { token } = createFormToken(hashes, key, 10000);
  assert.doesNotThrow(() => verifyFormToken(token, key, hashes, 12500));
  assert.throws(() => verifyFormToken(token + "00", key, hashes, 12500));
  assert.throws(() => verifyFormToken(token + "zz", key, hashes, 12500));
  assert.throws(() => verifyFormToken(token + ".", key, hashes, 12500));
  assert.throws(() => verifyFormToken(token, randomUUID(), hashes, 12500));
  assert.throws(() => verifyFormToken(token, key, { ...hashes, consentHash: "c".repeat(64) }, 12500));
  assert.throws(() => verifyFormToken(token, key, hashes, 11000));
  assert.throws(() => verifyFormToken(token, key, hashes, 10000 + 31 * 60000));
});

test("origin checking requires exact origin for POST and rejects cross-site requests", () => {
  assert.doesNotThrow(() => checkOrigin(new Request("http://localhost:3000", { headers: { origin: "http://localhost:3000" } })));
  assert.throws(() => checkOrigin(new Request("http://localhost:3000")));
  assert.throws(() => checkOrigin(new Request("http://localhost:3000", { headers: { origin: "https://attacker.invalid" } })));
  assert.throws(() => checkOrigin(new Request("http://localhost:3000", { headers: { origin: "http://localhost:3000", "sec-fetch-site": "cross-site" } })));
});

test("multipart is bounded even without Content-Length", async () => {
  const request = new Request("http://localhost:3000", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=test" }, body: new Uint8Array(2048) });
  await assert.rejects(() => readMultipart(request, 1024), /размер/);
  await assert.rejects(() => readMultipart(new Request("http://localhost:3000", { method: "POST", body: "{}" }), 1024));
  const parts = new Request("http://localhost:3000", { method: "POST", headers: { "content-type": "multipart/form-data; boundary=test" }, body: ("\r\n--test\r\nContent-Disposition: form-data; name=\"x\"\r\n\r\na").repeat(40) });
  await assert.rejects(() => readMultipart(parts, 10000), /слишком много/);
});

test("images are decoded and rewritten without EXIF; spoofing and dangerous filenames are rejected", async () => {
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "red" } }).png().withMetadata({ exif: { IFD0: { Artist: "PRIVATE_TEST_METADATA" } } }).toBuffer();
  const prepared = await prepareFiles([upload(image, "Чертёж.png", "image/png")], limits);
  assert.equal(prepared.length, 1);
  assert.equal((await sharp(prepared[0].data).metadata()).exif, undefined);
  await assert.rejects(() => prepareFiles([upload(image, "../drawing.png", "image/png")], limits));
  await assert.rejects(() => prepareFiles([upload(image, "drawing.pdf", "application/pdf")], limits));
  await assert.rejects(() => prepareFiles([upload(new TextEncoder().encode("<script>alert(1)</script>"), "drawing.png", "image/png")], limits));
  await assert.rejects(() => prepareFiles([upload(image, "drawing.svg", "image/svg+xml")], limits));
  await assert.rejects(() => prepareFiles(Array.from({ length: 6 }, () => upload(image, "drawing.png")), limits));
  await assert.rejects(() => prepareFiles([upload(image, "drawing.png")], { ...limits, maxFileBytes: 1 }));
  const huge = await sharp({ create: { width: 5000, height: 5000, channels: 3, background: "white" } }).png().toBuffer();
  await assert.rejects(() => prepareFiles([upload(huge, "large.png", "image/png")], limits));
});

test("PDF is parsed and active actions are rejected", async () => {
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const clean = await prepareFiles([upload(await pdf.save(), "drawing.pdf", "application/pdf")], limits);
  assert.equal(clean[0].mime, "application/pdf");
  pdf.catalog.set(PDFName.of("OpenAction"), pdf.context.obj({ S: "JavaScript", JS: "app.alert(1)" }));
  const active = await pdf.save();
  await assert.rejects(() => prepareFiles([upload(active, "active.pdf", "application/pdf")], limits));
});

test("private storage, safe identifiers, symlink protection and scanner failure are enforced", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "form-v2-upload-test-"));
  process.env.UPLOAD_DIR = root;
  const image = await sharp({ create: { width: 8, height: 8, channels: 3, background: "white" } }).png().toBuffer();
  const files = await prepareFiles([upload(image, "drawing.png", "image/png")], limits);
  const id = randomUUID();
  try {
    const stored = await storeFiles(id, files);
    assert.equal((await readStoredFile(stored[0].storageKey)).length, files[0].data.length);
    await assert.rejects(() => readStoredFile("../../package.json"));
    const linkName = randomUUID() + ".png";
    await symlink(path.resolve("package.json"), path.join(root, id, linkName));
    await assert.rejects(() => readStoredFile(id + "/" + linkName));
    await deleteStoredFiles(id);
    process.env.UPLOAD_SCAN_REQUIRED = "true";
    await assert.rejects(() => storeFiles(randomUUID(), files), /временно недоступна/);
    process.env.CLAMDSCAN_PATH = process.execPath;
    await assert.rejects(() => storeFiles(randomUUID(), files), /временно недоступна/);
    delete process.env.CLAMDSCAN_PATH;
    process.env.UPLOAD_DIR = path.resolve("public/uploads");
    await assert.rejects(() => privateRoot());
  } finally {
    process.env.UPLOAD_SCAN_REQUIRED = "false";
    delete process.env.CLAMDSCAN_PATH;
    delete process.env.UPLOAD_DIR;
    await rm(root, { recursive: true, force: true });
  }
});

test("disabled API fails closed without a database and does not return secrets", async () => {
  const response = await POST(new Request("http://localhost:3000/api/inquiries/", { method: "POST", headers: { origin: "http://localhost:3000" } }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).code, "DISABLED");
  const token = await GET(new Request("http://localhost:3000/api/inquiries/token/?key=" + randomUUID()));
  assert.equal(token.status, 503);
  const forbidden = await POST(new Request("http://localhost:3000/api/inquiries/", { method: "POST", headers: { origin: "https://attacker.invalid" } }));
  assert.equal(forbidden.status, 403);
});


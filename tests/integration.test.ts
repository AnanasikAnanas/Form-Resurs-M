import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, writeFile, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import tls from "node:tls";
import sharp from "sharp";
import { PDFDocument } from "pdf-lib";

const execute = promisify(execFile);
const url = process.env.TEST_DATABASE_URL;

async function testSmtp(cert: string, key: string) {
  const messages: string[] = [];
  const server = tls.createServer({ cert: await readFile(cert), key: await readFile(key) }, (socket) => {
    socket.setEncoding("utf8");
    socket.write("220 localhost ESMTP\r\n");
    let buffer = "";
    let data = false;
    let message = "";
    socket.on("data", (chunk) => {
      buffer += chunk;
      let position: number;
      while ((position = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, position);
        buffer = buffer.slice(position + 2);
        if (data) {
          if (line === ".") { messages.push(message); message = ""; data = false; socket.write("250 Accepted\r\n"); }
          else message += line + "\r\n";
        } else if (/^EHLO|^HELO/i.test(line)) socket.write("250-localhost\r\n250 SIZE 200000\r\n");
        else if (/^DATA$/i.test(line)) { data = true; socket.write("354 Send message\r\n"); }
        else if (/^QUIT$/i.test(line)) socket.end("221 Bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
    socket.on("error", () => {});
  });
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", () => resolve()); });
  return { server, messages, port: (server.address() as { port: number }).port };
}

test("PostgreSQL: API, attachments, idempotency, notification failures, rate limits and retention", { skip: !url }, async (t) => {
  assert.match(new URL(url!).pathname, /_test$/);
  const directory = await mkdtemp(path.join(os.tmpdir(), "form-v2-integration-"));
  const policyPath = path.join(directory, "policy.txt");
  const consentPath = path.join(directory, "consent.txt");
  await writeFile(policyPath, "ТОЛЬКО ДЛЯ АВТОТЕСТОВ. НЕ ЮРИДИЧЕСКИЙ ДОКУМЕНТ. Тест политики.");
  await writeFile(consentPath, "ТОЛЬКО ДЛЯ АВТОТЕСТОВ. НЕ ЮРИДИЧЕСКИЙ ДОКУМЕНТ. Тест согласия.");
  Object.assign(process.env, {
    DATABASE_URL: url!, APP_ORIGIN: "http://localhost:3000", INQUIRIES_ENABLED: "true",
    FORM_SECRET: "integration-fixture-only-secret-".repeat(3),
    PRIVACY_POLICY_PATH: policyPath, PRIVACY_CONSENT_PATH: consentPath,
    PRIVACY_POLICY_VERSION: "TEST-1", PRIVACY_CONSENT_VERSION: "TEST-1",
    UPLOAD_DIR: path.join(directory, "uploads"), UPLOAD_SCAN_REQUIRED: "false",
    RATE_LIMIT_MAX_REQUESTS: "100", RATE_LIMIT_GLOBAL_PER_MINUTE: "1000", CLIENT_IP_HEADER: "",
  });
  for (const name of ["SMTP_HOST", "SMTP_FROM", "SMTP_USER", "SMTP_PASSWORD", "MANAGER_EMAIL", "CLAMDSCAN_PATH"]) delete process.env[name];
  await execute(path.resolve("node_modules/.bin/prisma"), ["migrate", "deploy"], { env: process.env });
  const { getDb } = await import("../src/server/db");
  const db = getDb();
  const { POST } = await import("../src/app/api/inquiries/route");
  const { GET } = await import("../src/app/api/inquiries/token/route");
  const { getLegalDocuments } = await import("../src/server/legal");
  const { createFormToken, checkRateLimit } = await import("../src/server/security");
  const { deliverNotification } = await import("../src/server/notifications");
  const { cleanupExpired } = await import("../src/server/maintenance");
  const { readStoredFile } = await import("../src/server/uploads");
  const legal = (await getLegalDocuments())!;
  const key = randomUUID();
  const token = createFormToken(legal, key, Date.now() - 3000).token;
  const company = "V2Fixture-" + randomUUID();
  const input = { name: "Fixture client", company, phone: "+79991234567", email: "private-fixture@example.invalid", service: "mold-repair", task: "Test data '); DROP TABLE Inquiry; --", consent: "yes", website: "" };
  const image = await sharp({ create: { width: 10, height: 10, channels: 3, background: "red" } }).png().toBuffer();
  const pdf = await PDFDocument.create();
  pdf.addPage();
  const pdfData = await pdf.save();
  const attachments = [new File([new Uint8Array(image)], "drawing.png", { type: "image/png" }), new File([new Uint8Array(pdfData)], "spec.pdf", { type: "application/pdf" })];

  const send = (patch: Record<string, string> = {}, files = attachments, requestKey = key) => {
    const data = new FormData();
    for (const [field, value] of Object.entries({ ...input, ...patch })) data.set(field, value);
    data.set("key", requestKey);
    data.set("token", requestKey === key ? token : createFormToken(legal, requestKey, Date.now() - 3000).token);
    for (const file of files) data.append("files", file);
    return POST(new Request("http://localhost:3000/api/inquiries/", { method: "POST", headers: { origin: "http://localhost:3000" }, body: data }));
  };

  let id = "";
  try {
    await t.test("token endpoint checks the database limiter and returns the current document version", async () => {
      const response = await GET(new Request("http://localhost:3000/api/inquiries/token/?key=" + randomUUID()));
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.equal(body.documentVersion, legal.policyHash + ":" + legal.consentHash);
      assert.equal(response.headers.get("cache-control"), "no-store");
    });
    await t.test("valid inquiry and attachments persist, missing SMTP is recorded separately", async () => {
      const response = await send();
      assert.equal(response.status, 201);
      const body = await response.json();
      id = body.id;
      const record = await db.inquiry.findUniqueOrThrow({ where: { id }, include: { files: true, notification: true } });
      assert.equal(record.email, input.email);
      assert.equal(record.task, input.task);
      assert.equal(record.files.length, 2);
      assert.equal(record.notification!.status, "NOT_CONFIGURED");
      assert.equal(record.policyText, legal.policy);
      assert.equal(record.consentText, legal.consent);
      assert.ok(record.consentAcceptedAt);
      for (const file of record.files) assert.equal((await readStoredFile(file.storageKey)).length, file.size);
    });
    await t.test("repeated request is idempotent and conflicting reuse is rejected", async () => {
      const response = await send();
      assert.equal(response.status, 200);
      assert.equal((await response.json()).id, id);
      assert.equal(await db.inquiry.count({ where: { idempotencyKey: key } }), 1);
      assert.equal((await send({ task: "Different task with enough text." })).status, 409);
    });
    await t.test("bad consent, bot trap and disguised executable are rejected without creating an inquiry", async () => {
      assert.equal((await send({ consent: "no" }, [], randomUUID())).status, 422);
      assert.equal((await send({ website: "https://bot.invalid" }, [], randomUUID())).status, 400);
      const fake = new File(["MZ executable content"], "test.pdf", { type: "application/pdf" });
      assert.equal((await send({}, [fake], randomUUID())).status, 400);
      assert.equal(await db.inquiry.count({ where: { company } }), 1);
    });
    await t.test("SMTP failure preserves inquiry and schedules retry", async () => {
      Object.assign(process.env, { SMTP_HOST: "127.0.0.1", SMTP_PORT: "1", SMTP_SECURE: "true", SMTP_FROM: "sender@example.invalid", MANAGER_EMAIL: "manager@example.invalid" });
      const notification = await db.notification.findUniqueOrThrow({ where: { inquiryId: id } });
      await db.notification.update({ where: { id: notification.id }, data: { status: "PENDING", nextAttemptAt: new Date() } });
      await deliverNotification(notification.id);
      const result = await db.notification.findUniqueOrThrow({ where: { id: notification.id } });
      assert.equal(result.status, "RETRY");
      assert.equal(result.lastErrorCode, "SMTP_DELIVERY_FAILED");
      assert.equal(await db.inquiry.count({ where: { id } }), 1);
    });
    await t.test("TLS SMTP receives an actual notification without contacts or documents", { skip: !process.env.TEST_SMTP_CERT || !process.env.TEST_SMTP_KEY }, async () => {
      const smtp = await testSmtp(process.env.TEST_SMTP_CERT!, process.env.TEST_SMTP_KEY!);
      try {
        process.env.SMTP_PORT = String(smtp.port);
        const notification = await db.notification.findUniqueOrThrow({ where: { inquiryId: id } });
        await db.notification.update({ where: { id: notification.id }, data: { status: "PENDING", nextAttemptAt: new Date(), leaseUntil: null } });
        await Promise.all([deliverNotification(notification.id), deliverNotification(notification.id)]);
        const result = await db.notification.findUniqueOrThrow({ where: { id: notification.id } });
        assert.equal(result.status, "SENT");
        assert.equal(smtp.messages.length, 1);
        assert.ok(smtp.messages[0].includes(id));
        assert.ok(!smtp.messages[0].includes(input.email));
        assert.ok(!smtp.messages[0].includes(input.phone));
        assert.ok(!smtp.messages[0].includes("Content-Disposition: attachment"));
      } finally { await new Promise<void>((resolve) => smtp.server.close(() => resolve())); }
    });
    await t.test("shared PostgreSQL limiter admits only the configured number under concurrency", async () => {
      await db.rateLimit.deleteMany();
      process.env.RATE_LIMIT_MAX_REQUESTS = "2";
      const results = await Promise.allSettled(Array.from({ length: 8 }, () => checkRateLimit(new Request("http://localhost:3000"), "submit")));
      assert.equal(results.filter((result) => result.status === "fulfilled").length, 2);
      process.env.RATE_LIMIT_MAX_REQUESTS = "100";
    });
    await t.test("expiry removes database records and the private directory", async () => {
      const folder = path.join(process.env.UPLOAD_DIR!, id);
      await db.inquiry.update({ where: { id }, data: { expiresAt: new Date(Date.now() - 1000) } });
      assert.equal(await cleanupExpired(), 1);
      assert.equal(await db.inquiry.count({ where: { id } }), 0);
      assert.equal(await db.notification.count({ where: { inquiryId: id } }), 0);
      await assert.rejects(() => stat(folder));
    });
  } finally {
    await db.inquiry.deleteMany({ where: { company } });
    await db.rateLimit.deleteMany();
    await db.$disconnect();
    await rm(directory, { recursive: true, force: true });
  }
});


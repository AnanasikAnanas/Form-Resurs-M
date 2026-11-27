import { test, type TestContext } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import tls from "node:tls";
import nodemailer, { type SendMailOptions } from "nodemailer";
import type { getDb } from "../src/server/db";
import { deliverNotification } from "../src/server/notifications";
import { readApplicationFile } from "../src/server/application-files";
import { sha256 } from "../src/server/uploads";

function fixture() {
  Object.assign(process.env, { DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/notification_unit_test", APP_ORIGIN: "http://localhost:3000", INQUIRIES_ENABLED: "false", SMTP_HOST: "127.0.0.1", SMTP_PORT: "1", SMTP_SECURE: "true", SMTP_FROM: "sender@example.invalid", PROJECT_MANAGER_EMAIL: "manager@example.invalid", MANAGER_EMAIL: "", SMTP_USER: "", SMTP_PASSWORD: "", SMTP_ATTACHMENT_MAX_MB: "10", NOTIFICATION_MAX_ATTEMPTS: "8" });
  const content = Buffer.from("synthetic attachment");
  const file = { id: randomUUID(), content: new Uint8Array(content), storageKey: null, sha256: sha256(content), size: content.length, originalName: "fixture.pdf", mime: "application/pdf" };
  const state = { id: randomUUID(), inquiryId: randomUUID(), status: "PENDING", attempts: 0, nextAttemptAt: new Date(0), leaseToken: null as string | null, leaseUntil: null as Date | null, lastErrorCode: null as string | null, sentAt: null as Date | null, inquiry: { id: randomUUID(), name: "Fixture Person", company: "Fixture Company", phone: "+79991234567", email: "fixture@example.invalid", task: "Synthetic task description", service: "mold-repair", createdAt: new Date(), expiresAt: new Date(Date.now() + 86400000), files: [{ id: file.id, size: file.size, originalName: file.originalName }] } };
  state.inquiry.id = state.inquiryId;
  type Update = { where: { attempts?: { gte?: number; lt?: number }; leaseToken?: string; nextAttemptAt?: { lte: Date } }; data: { status?: string; attempts?: { increment: number }; nextAttemptAt?: Date; leaseToken?: string | null; leaseUntil?: Date | null; lastErrorCode?: string | null; sentAt?: Date } };
  const updateMany = async (raw: unknown) => {
    const { where, data } = raw as Update;
    const available = ["PENDING", "RETRY", "NOT_CONFIGURED"].includes(state.status) || (state.status === "SENDING" && (!state.leaseUntil || state.leaseUntil < new Date()));
    if (where.attempts && !available) return { count: 0 };
    if (where.attempts?.gte !== undefined && state.attempts < where.attempts.gte) return { count: 0 };
    if (where.attempts?.lt !== undefined && state.attempts >= where.attempts.lt) return { count: 0 };
    if (where.leaseToken && state.leaseToken !== where.leaseToken) return { count: 0 };
    if (where.nextAttemptAt && state.nextAttemptAt > where.nextAttemptAt.lte) return { count: 0 };
    const { attempts, ...patch } = data;
    Object.assign(state, patch);
    if (attempts) state.attempts += attempts.increment;
    return { count: 1 };
  };
  const db = {
    notificationJob: { updateMany, findUnique: async () => structuredClone(state), count: async () => state.status === "SENDING" && state.inquiry.expiresAt > new Date() ? 1 : 0 },
    applicationFile: { findFirst: async () => structuredClone(file) },
  } as unknown as ReturnType<typeof getDb>;
  return { state, file, content, db };
}

function mockSmtp(t: TestContext, send: (mail: SendMailOptions) => Promise<{ accepted: string[] }>) {
  t.mock.method(nodemailer, "createTransport", (() => ({ sendMail: send, close() {} })) as never);
}

test("notification includes contact details and verified binary attachments only after SMTP acceptance", async t => {
  const { state, content, db } = fixture();
  let received: SendMailOptions | undefined;
  mockSmtp(t, async mail => { received = mail; return { accepted: ["manager@example.invalid"] }; });
  await deliverNotification(state.id, db);
  assert.equal(state.status, "SENT");
  assert.ok(state.sentAt);
  assert.equal(state.attempts, 1);
  assert.ok(String(received?.text).includes(state.inquiry.email));
  assert.ok(String(received?.text).includes(state.inquiry.phone));
  assert.ok(String(received?.text).includes(state.inquiry.task));
  assert.deepEqual(received?.attachments?.[0].content, content);
});

test("missing SMTP has finite retries and stops at the configured attempt budget", async () => {
  const { state, db } = fixture();
  delete process.env.SMTP_HOST;
  for (let attempt = 1; attempt <= 8; attempt++) {
    state.nextAttemptAt = new Date(0);
    await deliverNotification(state.id, db);
    assert.equal(state.attempts, attempt);
    assert.equal(state.status, attempt === 8 ? "FAILED" : "NOT_CONFIGURED");
  }
  state.nextAttemptAt = new Date(0);
  await deliverNotification(state.id, db);
  assert.equal(state.attempts, 8);
});

test("SMTP rejection never produces a SENT status and preserves the job for retry", async t => {
  const { state, db } = fixture();
  mockSmtp(t, async () => ({ accepted: [] }));
  await deliverNotification(state.id, db);
  assert.equal(state.status, "RETRY");
  assert.equal(state.sentAt, null);
  assert.equal(state.lastErrorCode, "SMTP_DELIVERY_FAILED");
  assert.ok(state.nextAttemptAt > new Date());
});

test("concurrent workers send only the successfully leased job", async t => {
  const { state, db } = fixture();
  let sends = 0;
  mockSmtp(t, async () => { sends++; return { accepted: ["manager@example.invalid"] }; });
  await Promise.all([deliverNotification(state.id, db), deliverNotification(state.id, db)]);
  assert.equal(sends, 1);
  assert.equal(state.attempts, 1);
});

test("a worker with a superseded lease cannot mark a job SENT", async t => {
  const { state, db } = fixture();
  mockSmtp(t, async () => { state.leaseToken = randomUUID(); return { accepted: ["manager@example.invalid"] }; });
  await deliverNotification(state.id, db);
  assert.equal(state.status, "SENDING");
  assert.equal(state.sentAt, null);
});

test("MIME encoding overhead is included in the attachment limit and large files use authenticated SSH access", async t => {
  const { state, db } = fixture();
  state.inquiry.files[0].size = Math.floor(7.35 * 1024 * 1024);
  let received: SendMailOptions | undefined;
  mockSmtp(t, async mail => { received = mail; return { accepted: ["manager@example.invalid"] }; });
  await deliverNotification(state.id, db);
  assert.deepEqual(received?.attachments, []);
  assert.ok(String(received?.text).includes("npm run inquiries -- file"));
  assert.ok(!String(received?.text).includes("https://"));
});

test("binary file reads reject content that fails the stored checksum", async () => {
  const { file, db } = fixture();
  file.sha256 = "0".repeat(64);
  await assert.rejects(() => readApplicationFile(file.id, db), /FILE_INTEGRITY/);
});

test("local TLS SMTP accepts an actual notification with a binary attachment", { skip: !process.env.TEST_SMTP_CERT || !process.env.TEST_SMTP_KEY }, async () => {
  const { state, content, db } = fixture();
  let message = "";
  let count = 0;
  const server = tls.createServer({ cert: await readFile(process.env.TEST_SMTP_CERT!), key: await readFile(process.env.TEST_SMTP_KEY!) }, socket => {
    socket.setEncoding("utf8");
    socket.write("220 localhost ESMTP\r\n");
    let buffer = "";
    let data = false;
    socket.on("data", chunk => {
      buffer += chunk;
      let position: number;
      while ((position = buffer.indexOf("\r\n")) >= 0) {
        const line = buffer.slice(0, position);
        buffer = buffer.slice(position + 2);
        if (data) {
          if (line === ".") { count++; data = false; socket.write("250 Accepted\r\n"); }
          else message += line + "\r\n";
        } else if (/^EHLO|^HELO/i.test(line)) socket.write("250-localhost\r\n250 SIZE 30000000\r\n");
        else if (/^DATA$/i.test(line)) { data = true; socket.write("354 Send message\r\n"); }
        else if (/^QUIT$/i.test(line)) socket.end("221 Bye\r\n");
        else socket.write("250 OK\r\n");
      }
    });
    socket.on("error", () => {});
  });
  server.on("tlsClientError", () => {});
  await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(0, "127.0.0.1", resolve); });
  process.env.SMTP_PORT = String((server.address() as { port: number }).port);
  try {
    await deliverNotification(state.id, db);
    assert.equal(state.status, "SENT");
    assert.equal(count, 1);
    assert.ok(message.includes(state.inquiry.id));
    assert.ok(message.includes(state.inquiry.email));
    assert.ok(message.includes("Content-Disposition: attachment"));
    assert.ok(message.includes(content.toString("base64")));
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});

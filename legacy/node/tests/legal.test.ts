import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { getLegalDocuments, getInquiryAvailability } from "../src/server/legal";

test("documents require explicit approval and the form requires an agreed retention setting", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "form-legal-test-"));
  try {
    const policy = path.join(directory, "policy.txt");
    const consent = path.join(directory, "consent.txt");
    await writeFile(policy, "Synthetic policy used only by automated tests.");
    await writeFile(consent, "Synthetic consent used only by automated tests.");
    Object.assign(process.env, { APP_ORIGIN: "http://localhost:3000", INQUIRIES_ENABLED: "true", DATABASE_URL: "postgresql://fixture:fixture@127.0.0.1:1/legal_unit_test", FORM_SECRET: "legal-unit-fixture-".repeat(3), PRIVACY_POLICY_PATH: policy, PRIVACY_CONSENT_PATH: consent, PRIVACY_POLICY_VERSION: "TEST-1", PRIVACY_CONSENT_VERSION: "TEST-1", LEGAL_DOCUMENTS_APPROVED: "false" });
    delete process.env.INQUIRY_RETENTION_DAYS;
    assert.equal(await getLegalDocuments(), null);
    assert.equal((await getInquiryAvailability()).enabled, false);
    process.env.LEGAL_DOCUMENTS_APPROVED = "true";
    assert.ok(await getLegalDocuments());
    assert.equal((await getInquiryAvailability()).enabled, false);
    process.env.INQUIRY_RETENTION_DAYS = "1";
    const availability = await getInquiryAvailability();
    assert.equal(availability.enabled, true);
    assert.equal(availability.legal?.consentVersion, "TEST-1");
    assert.equal(availability.legal?.consentHash.length, 64);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

import "server-only";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { site } from "@/content/site";
import { getConfig } from "./config";

export async function getLegalDocuments() {
  const config = getConfig();
  if (config.LEGAL_DOCUMENTS_APPROVED !== "true") return null;
  const read = async (file: string | undefined, fallback: string | null) => file ? (await readFile(file, "utf8")).trim() : fallback?.trim() || null;
  const policy = await read(config.PRIVACY_POLICY_PATH, site.privacy.approvedText);
  const consent = await read(config.PRIVACY_CONSENT_PATH, site.privacy.approvedConsent);
  if (!policy || !consent || !config.PRIVACY_POLICY_VERSION || !config.PRIVACY_CONSENT_VERSION) return null;
  if (policy.length > 200000 || consent.length > 50000) throw new Error("LEGAL_DOCUMENT_TOO_LONG");
  return { policy, consent, policyVersion: config.PRIVACY_POLICY_VERSION, consentVersion: config.PRIVACY_CONSENT_VERSION, policyHash: createHash("sha256").update(policy).digest("hex"), consentHash: createHash("sha256").update(consent).digest("hex") };
}

export async function getInquiryAvailability() {
  const config = getConfig();
  const legal = await getLegalDocuments();
  return { config, legal, enabled: config.INQUIRIES_ENABLED === "true" && Boolean(config.DATABASE_URL && config.FORM_SECRET && config.INQUIRY_RETENTION_DAYS && legal) };
}

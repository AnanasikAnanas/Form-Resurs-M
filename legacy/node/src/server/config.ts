import "server-only";
import path from "node:path";
import { z } from "zod";
import { fileFormats, type FileFormat } from "@/lib/inquiry-schema";

const integer = (fallback: number, max: number) => z.coerce.number().int().positive().max(max).default(fallback);
const envSchema = z.object({
  INQUIRIES_ENABLED: z.enum(["true", "false"]).default("false"),
  APP_ORIGIN: z.url().default("http://localhost:3000"),
  DATABASE_URL: z.string().optional(),
  FORM_SECRET: z.string().min(32).optional(),
  CLIENT_IP_HEADER: z.enum(["x-real-ip", ""]).default(""),
  UPLOAD_DIR: z.string().default(path.resolve("var/private-uploads")),
  UPLOAD_MAX_FILES: integer(5, 10),
  UPLOAD_MAX_FILE_MB: integer(10, 20),
  UPLOAD_MAX_TOTAL_MB: integer(20, 50),
  UPLOAD_FORMATS: z.string().default("jpg,png,webp,pdf"),
  UPLOAD_SCAN_REQUIRED: z.enum(["true", "false"]).default(process.env.NODE_ENV === "production" ? "true" : "false"),
  CLAMDSCAN_PATH: z.string().optional(),
  INQUIRY_RETENTION_DAYS: z.coerce.number().int().positive().max(3650).optional(),
  RATE_LIMIT_WINDOW_SECONDS: integer(900, 86400),
  RATE_LIMIT_MAX_REQUESTS: integer(5, 100),
  RATE_LIMIT_GLOBAL_PER_MINUTE: integer(30, 1000),
  PRIVACY_POLICY_PATH: z.string().optional(),
  PRIVACY_CONSENT_PATH: z.string().optional(),
  PRIVACY_POLICY_VERSION: z.string().max(100).optional(),
  PRIVACY_CONSENT_VERSION: z.string().max(100).optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: integer(587, 65535),
  SMTP_SECURE: z.enum(["true", "false"]).default("false"),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.email().optional(),
  PROJECT_MANAGER_EMAIL: z.email().optional(),
  SMTP_ATTACHMENT_MAX_MB: integer(10, 20),
  NOTIFICATION_MAX_ATTEMPTS: integer(8, 20),
  LEGAL_DOCUMENTS_APPROVED: z.enum(["true", "false"]).default("false"),
  MANAGER_EMAIL: z.email().optional(),
});

export function getConfig() {
  const emptyToUndefined = Object.fromEntries(Object.entries(process.env).map(([key, value]) => [key, value === "" ? undefined : value]));
  const parsed = envSchema.safeParse(emptyToUndefined);
  if (!parsed.success) throw new Error("SERVER_CONFIGURATION_INVALID");
  const env = parsed.data;
  const origin = new URL(env.APP_ORIGIN);
  if (origin.origin !== env.APP_ORIGIN || (process.env.NODE_ENV === "production" && env.INQUIRIES_ENABLED === "true" && origin.protocol !== "https:")) throw new Error("APP_ORIGIN_INVALID");
  if (process.env.NODE_ENV === "production" && env.INQUIRIES_ENABLED === "true" && env.UPLOAD_SCAN_REQUIRED !== "true") throw new Error("SCANNER_REQUIRED");
  const formats = env.UPLOAD_FORMATS.split(",").map((value) => value.trim());
  if (!formats.length || !formats.every((value) => Object.hasOwn(fileFormats, value))) throw new Error("UPLOAD_FORMATS_INVALID");
  const uploadDir = path.resolve(env.UPLOAD_DIR);
  for (const forbidden of ["public", ".next", "out"]) {
    const target = path.resolve(forbidden);
    if (uploadDir === target || uploadDir.startsWith(target + path.sep)) throw new Error("UPLOAD_DIRECTORY_PUBLIC");
  }
  return { ...env, origin: origin.origin, uploadDir, limits: { maxFiles: env.UPLOAD_MAX_FILES, maxFileBytes: env.UPLOAD_MAX_FILE_MB * 1024 * 1024, maxTotalBytes: env.UPLOAD_MAX_TOTAL_MB * 1024 * 1024, formats: formats as FileFormat[] } };
}

import { z } from "zod";

export const serviceSlugs = ["mold-repair", "mold-maintenance", "laser-welding", "mold-polishing"] as const;
export const fileFormats = {
  jpg: { mime: "image/jpeg", extensions: ["jpg", "jpeg"], label: "JPG" },
  png: { mime: "image/png", extensions: ["png"], label: "PNG" },
  webp: { mime: "image/webp", extensions: ["webp"], label: "WebP" },
  pdf: { mime: "application/pdf", extensions: ["pdf"], label: "PDF" },
} as const;
export type FileFormat = keyof typeof fileFormats;

const text = (min: number, max: number) => z.string().trim().min(min, `Введите не менее ${min} символов.`).max(max, `Не более ${max} символов.`).refine((value) => !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value), "Удалите недопустимые управляющие символы.");

export const inquirySchema = z.object({
  name: text(2, 100),
  company: text(2, 200),
  phone: text(10, 40).regex(/^[+\d()\s-]+$/, "Проверьте телефон.").refine((value) => { const digits = value.replace(/\D/g, ""); return digits.length >= 10 && digits.length <= 15; }, "Укажите телефон с кодом города или страны."),
  email: z.string().trim().max(254).email("Проверьте email."),
  service: z.enum(serviceSlugs, { error: "Выберите услугу." }),
  task: text(10, 6000),
  consent: z.literal("yes", { error: "Необходимо согласие на обработку персональных данных." }),
}).strict();

export type InquiryInput = z.infer<typeof inquirySchema>;
export type FieldErrors = Partial<Record<keyof InquiryInput | "files", string[]>>;
export type UploadLimits = { maxFiles: number; maxFileBytes: number; maxTotalBytes: number; formats: FileFormat[] };
export type InquirySettings = { enabled: boolean; limits: UploadLimits; documentVersion: string };

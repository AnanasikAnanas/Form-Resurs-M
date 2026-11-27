ALTER TABLE "InquiryFile" ADD COLUMN "content" BYTEA;
ALTER TABLE "InquiryFile" ALTER COLUMN "storageKey" DROP NOT NULL;
ALTER TABLE "Notification" ADD COLUMN "leaseToken" UUID;
ALTER TABLE "InquiryFile" ADD CONSTRAINT "InquiryFile_content_or_legacy_key" CHECK ("content" IS NOT NULL OR "storageKey" IS NOT NULL);
ALTER TABLE "InquiryFile" ADD CONSTRAINT "InquiryFile_content_size" CHECK ("content" IS NULL OR octet_length("content") = "size");

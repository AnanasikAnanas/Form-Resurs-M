-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Inquiry" (
    "id" UUID NOT NULL,
    "idempotencyKey" UUID NOT NULL,
    "fingerprint" VARCHAR(64) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "company" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(40) NOT NULL,
    "email" VARCHAR(254) NOT NULL,
    "service" VARCHAR(40) NOT NULL,
    "task" TEXT NOT NULL,
    "consentAcceptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "policyVersion" VARCHAR(100) NOT NULL,
    "consentVersion" VARCHAR(100) NOT NULL,
    "policyHash" VARCHAR(64) NOT NULL,
    "consentHash" VARCHAR(64) NOT NULL,
    "policyText" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InquiryFile" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "originalName" VARCHAR(180) NOT NULL,
    "storageKey" VARCHAR(100) NOT NULL,
    "mime" VARCHAR(80) NOT NULL,
    "size" INTEGER NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,

    CONSTRAINT "InquiryFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "inquiryId" UUID NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leaseUntil" TIMESTAMP(3),
    "lastErrorCode" VARCHAR(50),
    "sentAt" TIMESTAMP(3),

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" VARCHAR(120) NOT NULL,
    "hits" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "AccessAudit" (
    "id" UUID NOT NULL,
    "action" VARCHAR(30) NOT NULL,
    "reference" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Inquiry_idempotencyKey_key" ON "Inquiry"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Inquiry_createdAt_id_idx" ON "Inquiry"("createdAt", "id");

-- CreateIndex
CREATE INDEX "Inquiry_expiresAt_idx" ON "Inquiry"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "InquiryFile_storageKey_key" ON "InquiryFile"("storageKey");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_inquiryId_key" ON "Notification"("inquiryId");

-- CreateIndex
CREATE INDEX "Notification_status_nextAttemptAt_idx" ON "Notification"("status", "nextAttemptAt");

-- CreateIndex
CREATE INDEX "RateLimit_expiresAt_idx" ON "RateLimit"("expiresAt");

-- CreateIndex
CREATE INDEX "AccessAudit_createdAt_idx" ON "AccessAudit"("createdAt");

-- AddForeignKey
ALTER TABLE "InquiryFile" ADD CONSTRAINT "InquiryFile_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;


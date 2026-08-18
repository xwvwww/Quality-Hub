CREATE TABLE "AutomationApiKey" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "keyHash" VARCHAR(64) NOT NULL,
  "keyPrefix" VARCHAR(16) NOT NULL,
  "createdById" UUID NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastUsedAt" TIMESTAMP(3),
  "revokedAt" TIMESTAMP(3),
  CONSTRAINT "AutomationApiKey_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "AutomationApiKey_keyHash_key" ON "AutomationApiKey"("keyHash");
CREATE INDEX "AutomationApiKey_organizationId_projectId_revokedAt_idx" ON "AutomationApiKey"("organizationId", "projectId", "revokedAt");

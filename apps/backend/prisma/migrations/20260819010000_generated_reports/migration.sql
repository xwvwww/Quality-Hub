CREATE TYPE "ReportJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'JSON');

CREATE TABLE "GeneratedReport" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "testPlanId" UUID NOT NULL,
  "requestedById" UUID NOT NULL,
  "status" "ReportJobStatus" NOT NULL DEFAULT 'QUEUED',
  "format" "ReportFormat" NOT NULL DEFAULT 'PDF',
  "includeAttachments" BOOLEAN NOT NULL DEFAULT true,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "fileName" TEXT,
  "storageKey" TEXT,
  "mimeType" TEXT,
  "size" INTEGER,
  "error" TEXT,
  "snapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "GeneratedReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "GeneratedReport_storageKey_key" ON "GeneratedReport"("storageKey");
CREATE INDEX "GeneratedReport_organizationId_status_createdAt_idx" ON "GeneratedReport"("organizationId", "status", "createdAt");
CREATE INDEX "GeneratedReport_testPlanId_createdAt_idx" ON "GeneratedReport"("testPlanId", "createdAt");
CREATE INDEX "GeneratedReport_requestedById_createdAt_idx" ON "GeneratedReport"("requestedById", "createdAt");
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_testPlanId_fkey" FOREIGN KEY ("testPlanId") REFERENCES "TestPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GeneratedReport" ADD CONSTRAINT "GeneratedReport_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

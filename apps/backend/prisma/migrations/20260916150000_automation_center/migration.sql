CREATE TYPE "AutomationFramework" AS ENUM ('PLAYWRIGHT', 'SELENIUM');
CREATE TYPE "AutomationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'CANCELLED');

CREATE TABLE "AutomationSuite" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "createdById" UUID NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "framework" "AutomationFramework" NOT NULL,
  "command" VARCHAR(500) NOT NULL,
  "repository" VARCHAR(500),
  "branch" VARCHAR(150),
  "environment" VARCHAR(100),
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AutomationSuite_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AutomationRun" (
  "id" UUID NOT NULL,
  "organizationId" UUID NOT NULL,
  "projectId" UUID NOT NULL,
  "suiteId" UUID NOT NULL,
  "requestedById" UUID NOT NULL,
  "status" "AutomationRunStatus" NOT NULL DEFAULT 'QUEUED',
  "framework" "AutomationFramework" NOT NULL,
  "environment" VARCHAR(100),
  "commitSha" VARCHAR(100),
  "total" INTEGER NOT NULL DEFAULT 0,
  "passed" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "skipped" INTEGER NOT NULL DEFAULT 0,
  "durationMs" INTEGER NOT NULL DEFAULT 0,
  "error" TEXT,
  "reportUrl" VARCHAR(1000),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "AutomationRun_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "AutomationSuite_organizationId_projectId_enabled_idx" ON "AutomationSuite"("organizationId", "projectId", "enabled");
CREATE INDEX "AutomationRun_organizationId_projectId_createdAt_idx" ON "AutomationRun"("organizationId", "projectId", "createdAt");
CREATE INDEX "AutomationRun_suiteId_status_createdAt_idx" ON "AutomationRun"("suiteId", "status", "createdAt");
ALTER TABLE "AutomationSuite" ADD CONSTRAINT "AutomationSuite_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationSuite" ADD CONSTRAINT "AutomationSuite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationSuite" ADD CONSTRAINT "AutomationSuite_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "AutomationSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AutomationRun" ADD CONSTRAINT "AutomationRun_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

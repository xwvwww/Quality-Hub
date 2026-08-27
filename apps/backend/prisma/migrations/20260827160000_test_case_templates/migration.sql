CREATE TABLE "TestCaseTemplate" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "status" "TestCaseStatus" NOT NULL DEFAULT 'READY',
    "priority" "Priority" NOT NULL DEFAULT 'MEDIUM',
    "type" "TestType" NOT NULL DEFAULT 'FUNCTIONAL',
    "durationSeconds" INTEGER NOT NULL DEFAULT 0,
    "variables" JSONB NOT NULL DEFAULT '[]',
    "steps" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "TestCaseTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TestCaseTemplate_organizationId_name_key" ON "TestCaseTemplate"("organizationId", "name");
CREATE INDEX "TestCaseTemplate_organizationId_updatedAt_idx" ON "TestCaseTemplate"("organizationId", "updatedAt");
ALTER TABLE "TestCaseTemplate" ADD CONSTRAINT "TestCaseTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

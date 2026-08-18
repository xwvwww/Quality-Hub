ALTER TABLE "Project" ADD COLUMN "nextDefectNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Defect" ADD COLUMN "testCaseId" UUID,
ADD COLUMN "runCaseId" UUID,
ADD COLUMN "stepsToReproduce" TEXT,
ADD COLUMN "expectedResult" TEXT,
ADD COLUMN "actualResult" TEXT,
ADD COLUMN "environment" VARCHAR(100),
ADD COLUMN "build" VARCHAR(100);
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Defect" ADD CONSTRAINT "Defect_runCaseId_fkey" FOREIGN KEY ("runCaseId") REFERENCES "TestRunCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "Defect_projectId_createdAt_idx" ON "Defect"("projectId", "createdAt");

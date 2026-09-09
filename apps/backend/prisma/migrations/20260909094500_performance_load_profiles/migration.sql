CREATE TYPE "PerformanceLoadUnit" AS ENUM ('VIRTUAL_USERS', 'REQUESTS_PER_SECOND', 'CONCURRENT_REQUESTS');

ALTER TABLE "PerformanceRun"
  ADD COLUMN "scenario" VARCHAR(150),
  ADD COLUMN "loadValue" INTEGER,
  ADD COLUMN "loadUnit" "PerformanceLoadUnit";

CREATE INDEX "PerformanceRun_projectId_loadValue_createdAt_idx"
  ON "PerformanceRun"("projectId", "loadValue", "createdAt");

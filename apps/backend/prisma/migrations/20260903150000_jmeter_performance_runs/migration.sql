CREATE TYPE "PerformanceSource" AS ENUM ('JMETER');

CREATE TABLE "PerformanceRun" (
  "id" UUID NOT NULL, "organizationId" UUID NOT NULL, "projectId" UUID NOT NULL,
  "testRunId" UUID, "createdById" UUID NOT NULL, "source" "PerformanceSource" NOT NULL DEFAULT 'JMETER',
  "name" VARCHAR(255) NOT NULL, "environment" VARCHAR(100), "build" VARCHAR(100),
  "sampleCount" INTEGER NOT NULL, "errorCount" INTEGER NOT NULL, "durationMs" INTEGER NOT NULL,
  "throughput" DOUBLE PRECISION NOT NULL, "averageMs" DOUBLE PRECISION NOT NULL,
  "minMs" INTEGER NOT NULL, "maxMs" INTEGER NOT NULL, "p50Ms" INTEGER NOT NULL,
  "p90Ms" INTEGER NOT NULL, "p95Ms" INTEGER NOT NULL, "p99Ms" INTEGER NOT NULL,
  "receivedBytes" BIGINT NOT NULL DEFAULT 0, "sla" JSONB NOT NULL, "slaPassed" BOOLEAN NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PerformanceRun_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "PerformanceMetric" (
  "id" UUID NOT NULL, "performanceRunId" UUID NOT NULL, "label" VARCHAR(500) NOT NULL,
  "sampleCount" INTEGER NOT NULL, "errorCount" INTEGER NOT NULL, "throughput" DOUBLE PRECISION NOT NULL,
  "averageMs" DOUBLE PRECISION NOT NULL, "minMs" INTEGER NOT NULL, "maxMs" INTEGER NOT NULL,
  "p50Ms" INTEGER NOT NULL, "p90Ms" INTEGER NOT NULL, "p95Ms" INTEGER NOT NULL,
  "p99Ms" INTEGER NOT NULL, "receivedBytes" BIGINT NOT NULL DEFAULT 0,
  CONSTRAINT "PerformanceMetric_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "PerformanceRun_organizationId_createdAt_idx" ON "PerformanceRun"("organizationId", "createdAt");
CREATE INDEX "PerformanceRun_projectId_createdAt_idx" ON "PerformanceRun"("projectId", "createdAt");
CREATE INDEX "PerformanceRun_testRunId_idx" ON "PerformanceRun"("testRunId");
CREATE INDEX "PerformanceMetric_performanceRunId_p95Ms_idx" ON "PerformanceMetric"("performanceRunId", "p95Ms");
ALTER TABLE "PerformanceRun" ADD CONSTRAINT "PerformanceRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformanceRun" ADD CONSTRAINT "PerformanceRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PerformanceRun" ADD CONSTRAINT "PerformanceRun_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PerformanceRun" ADD CONSTRAINT "PerformanceRun_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PerformanceMetric" ADD CONSTRAINT "PerformanceMetric_performanceRunId_fkey" FOREIGN KEY ("performanceRunId") REFERENCES "PerformanceRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

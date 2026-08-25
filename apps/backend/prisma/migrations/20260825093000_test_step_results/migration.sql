CREATE TABLE "TestStepResult" (
    "id" UUID NOT NULL,
    "testResultId" UUID NOT NULL,
    "stepId" UUID NOT NULL,
    "status" "RunStatus" NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestStepResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TestStepResult_testResultId_stepId_key"
ON "TestStepResult"("testResultId", "stepId");

CREATE INDEX "TestStepResult_stepId_createdAt_idx"
ON "TestStepResult"("stepId", "createdAt");

ALTER TABLE "TestStepResult"
ADD CONSTRAINT "TestStepResult_testResultId_fkey"
FOREIGN KEY ("testResultId") REFERENCES "TestResult"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TestStepResult"
ADD CONSTRAINT "TestStepResult_stepId_fkey"
FOREIGN KEY ("stepId") REFERENCES "TestStep"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

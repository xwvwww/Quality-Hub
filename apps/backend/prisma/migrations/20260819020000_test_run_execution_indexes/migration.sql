CREATE INDEX "TestRunCase_testRunId_status_position_idx"
ON "TestRunCase"("testRunId", "status", "position");

CREATE INDEX "TestResult_runCaseId_createdAt_idx"
ON "TestResult"("runCaseId", "createdAt");

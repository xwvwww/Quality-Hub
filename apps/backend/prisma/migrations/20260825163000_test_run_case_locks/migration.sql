ALTER TABLE "TestRunCase"
ADD COLUMN "lockedById" UUID,
ADD COLUMN "lockExpiresAt" TIMESTAMP(3);

CREATE INDEX "TestRunCase_lockExpiresAt_idx" ON "TestRunCase"("lockExpiresAt");

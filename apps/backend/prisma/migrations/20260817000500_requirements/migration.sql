ALTER TABLE "Project" ADD COLUMN "nextRequirementNumber" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "Requirement" ADD COLUMN "authorId" UUID,
ADD COLUMN "assigneeId" UUID,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
UPDATE "Requirement" SET "authorId" = (SELECT "ownerId" FROM "Project" WHERE "Project"."id" = "Requirement"."projectId") WHERE "authorId" IS NULL;
ALTER TABLE "Requirement" ALTER COLUMN "authorId" SET NOT NULL;
CREATE INDEX "Requirement_projectId_status_priority_idx" ON "Requirement"("projectId", "status", "priority");

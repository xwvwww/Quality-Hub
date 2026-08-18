CREATE TYPE "TestStepSection" AS ENUM ('PRECONDITION', 'ACTION', 'POSTCONDITION');

ALTER TABLE "TestStep"
ADD COLUMN "section" "TestStepSection" NOT NULL DEFAULT 'ACTION';

DROP INDEX "TestStep_versionId_position_key";

CREATE UNIQUE INDEX "TestStep_versionId_section_position_key"
ON "TestStep"("versionId", "section", "position");

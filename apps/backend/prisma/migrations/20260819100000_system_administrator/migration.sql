ALTER TABLE "User" ADD COLUMN "isSystemAdmin" BOOLEAN NOT NULL DEFAULT false;

UPDATE "User"
SET "isSystemAdmin" = true
WHERE "email" = 'admin@example.com';

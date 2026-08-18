CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX IF NOT EXISTS "Project_name_trgm_idx" ON "Project" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TestCase_title_trgm_idx" ON "TestCase" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TestPlan_name_trgm_idx" ON "TestPlan" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "TestRun_name_trgm_idx" ON "TestRun" USING gin ("name" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Defect_title_trgm_idx" ON "Defect" USING gin ("title" gin_trgm_ops);
CREATE INDEX IF NOT EXISTS "Requirement_title_trgm_idx" ON "Requirement" USING gin ("title" gin_trgm_ops);

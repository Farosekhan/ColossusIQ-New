-- ════════════════════════════════════════════════════════════════════════════════════════════
--  0006 — AI Study Planner
--  study_plans: the one current study plan of each student (tasks and progress stored as JSON)
-- ════════════════════════════════════════════════════════════════════════════════════════════
SET client_encoding = 'UTF8';
BEGIN;

CREATE TABLE IF NOT EXISTS study_plans (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL UNIQUE,
  plan       jsonb NOT NULL CHECK (jsonb_typeof(plan) = 'object' AND pg_column_size(plan) < 600000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS study_plans_college_idx ON study_plans (college_id);

ALTER TABLE study_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_plans FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY college_isolation ON study_plans
    USING (app_scope_all() OR college_id = app_college())
    WITH CHECK (app_scope_all() OR college_id = app_college());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON study_plans TO ciq_app;

COMMIT;

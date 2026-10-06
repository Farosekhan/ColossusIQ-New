-- ════════════════════════════════════════════════════════════════════════════════════════════
--  0007 — per-user saved state
--  student_state: one small JSON document per (user, feature key), e.g. a student's language-learning progress
-- ════════════════════════════════════════════════════════════════════════════════════════════
SET client_encoding = 'UTF8';
BEGIN;

CREATE TABLE IF NOT EXISTS student_state (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL,
  key        text NOT NULL CHECK (key ~ '^[a-z][a-z0-9-]{1,39}$'),
  data       jsonb NOT NULL CHECK (pg_column_size(data) < 600000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, key)
);
CREATE INDEX IF NOT EXISTS student_state_college_idx ON student_state (college_id);

ALTER TABLE student_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_state FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY college_isolation ON student_state
    USING (app_scope_all() OR college_id = app_college())
    WITH CHECK (app_scope_all() OR college_id = app_college());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON student_state TO ciq_app;

COMMIT;

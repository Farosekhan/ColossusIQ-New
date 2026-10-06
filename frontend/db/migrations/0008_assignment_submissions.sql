-- ════════════════════════════════════════════════════════════════════════════════════════════
--  0008 — assignment submissions
--  assignments gain instructions, total marks and a real deadline; assignment_submissions holds what each student hands in
--  (one row per student and assignment) together with the marks and feedback the faculty give.
-- ════════════════════════════════════════════════════════════════════════════════════════════
SET client_encoding = 'UTF8';
BEGIN;

ALTER TABLE assignments ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS max_marks   int  NOT NULL DEFAULT 10;
ALTER TABLE assignments ADD COLUMN IF NOT EXISTS due_at      timestamptz;

DO $$ BEGIN
  ALTER TABLE assignments ADD CONSTRAINT assignments_max_marks_check CHECK (max_marks BETWEEN 1 AND 1000);
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS assignment_submissions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  college_id    uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  assignment_id uuid NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id       uuid NOT NULL,
  student_name  text NOT NULL,
  roll_no       text NOT NULL DEFAULT '',
  text          text NOT NULL DEFAULT '' CHECK (length(text) <= 8000),
  link          text NOT NULL DEFAULT '' CHECK (length(link) <= 500),
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  late          boolean NOT NULL DEFAULT false,
  marks         int CHECK (marks IS NULL OR marks >= 0),
  feedback      text NOT NULL DEFAULT '' CHECK (length(feedback) <= 1000),
  graded_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assignment_id, user_id)
);
CREATE INDEX IF NOT EXISTS assignment_submissions_college_idx ON assignment_submissions (college_id);
CREATE INDEX IF NOT EXISTS assignment_submissions_user_idx ON assignment_submissions (user_id);

ALTER TABLE assignment_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignment_submissions FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY college_isolation ON assignment_submissions
    USING (app_scope_all() OR college_id = app_college())
    WITH CHECK (app_scope_all() OR college_id = app_college());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON assignment_submissions TO ciq_app;

COMMIT;

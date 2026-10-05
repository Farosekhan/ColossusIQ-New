-- ════════════════════════════════════════════════════════════════════════════════════════════
--  0004 — assignments table
--  Stores assignments created by faculty members, including status and submission progress.
-- ════════════════════════════════════════════════════════════════════════════════════════════
SET client_encoding = 'UTF8';
BEGIN;

DO $$ BEGIN
  CREATE TYPE assignment_status AS ENUM ('Open', 'Closed', 'Draft');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE SEQUENCE IF NOT EXISTS seq_assignment_public START 1001;

CREATE TABLE IF NOT EXISTS assignments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id    text NOT NULL UNIQUE DEFAULT ('ASN-' || nextval('seq_assignment_public')),
  college_id   uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  author_id    uuid REFERENCES users(id) ON DELETE SET NULL,
  author_name  text NOT NULL DEFAULT 'Faculty Member',
  title        text NOT NULL,
  course       text NOT NULL,
  due          text NOT NULL,
  submitted    int NOT NULL DEFAULT 0 CHECK (submitted BETWEEN 0 AND 100),
  status       assignment_status NOT NULL DEFAULT 'Open',
  version      int NOT NULL DEFAULT 1,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS assignments_college_status_idx ON assignments (college_id, status);

ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY college_isolation ON assignments
    USING (app_scope_all() OR college_id = app_college())
    WITH CHECK (app_scope_all() OR college_id = app_college());
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON assignments TO ciq_app;
GRANT USAGE, SELECT ON SEQUENCE seq_assignment_public TO ciq_app;

COMMIT;

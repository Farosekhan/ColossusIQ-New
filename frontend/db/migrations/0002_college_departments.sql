-- ════════════════════════════════════════════════════════════════════════════════════════════
--  0002 — departments of a college
--  `departments` is the per-stream lookup (every engineering college can have "Computer Science
--  & Engineering"). A college chooses which of them it runs; this table records that choice with
--  the head of department and contacts. Counts (students, faculty …) are computed, not stored.
-- ════════════════════════════════════════════════════════════════════════════════════════════
SET client_encoding = 'UTF8';
BEGIN;

CREATE TYPE department_status AS ENUM ('Active', 'Inactive');
CREATE SEQUENCE seq_department_public START 1001;

CREATE TABLE college_departments (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id      text NOT NULL UNIQUE DEFAULT ('DEP-' || nextval('seq_department_public')),
  college_id     uuid NOT NULL REFERENCES colleges(id) ON DELETE RESTRICT,
  department_id  int NOT NULL REFERENCES departments(id),
  head_name      text CHECK (length(head_name) BETWEEN 2 AND 80),
  established    smallint CHECK (established BETWEEN 1850 AND 2030),
  status         department_status NOT NULL DEFAULT 'Active',
  email          citext CHECK (length(email) <= 120 AND email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone          text CHECK (phone ~ '^[6-9][0-9]{9}$'),
  notes          text CHECK (length(notes) <= 600),
  version        int NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (college_id, department_id)
);
CREATE INDEX ON college_departments (college_id, status);

CREATE TRIGGER college_departments_touch BEFORE UPDATE ON college_departments FOR EACH ROW EXECUTE FUNCTION touch_row();
CREATE TRIGGER college_departments_version BEFORE UPDATE ON college_departments FOR EACH ROW WHEN (OLD.version = NEW.version) EXECUTE FUNCTION bump_version();
-- The department must belong to the college's stream.
CREATE TRIGGER college_departments_stream BEFORE INSERT OR UPDATE ON college_departments FOR EACH ROW WHEN (NEW.college_id IS NOT NULL) EXECUTE FUNCTION enforce_stream_match();

ALTER TABLE college_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE college_departments FORCE ROW LEVEL SECURITY;
CREATE POLICY college_isolation ON college_departments
  USING (app_scope_all() OR college_id = app_college())
  WITH CHECK (app_scope_all() OR college_id = app_college());

GRANT SELECT, INSERT, UPDATE, DELETE ON college_departments TO ciq_app;
GRANT USAGE, SELECT ON SEQUENCE seq_department_public TO ciq_app;

-- Existing colleges start with the academic departments of their stream; the head is the college's
-- HOD account for that department, when there is one.
INSERT INTO college_departments (college_id, department_id, head_name, established)
SELECT c.id, d.id,
       (SELECT u.full_name FROM role_assignments ra JOIN users u ON u.id = ra.user_id
         WHERE ra.college_id = c.id AND ra.role = 'hod' AND ra.department_id = d.id ORDER BY ra.created_at LIMIT 1),
       c.established
FROM colleges c
JOIN college_types ct ON ct.name = c.type
JOIN departments d ON d.stream_key = ct.stream_key AND d.name NOT LIKE '%Administration'
ON CONFLICT (college_id, department_id) DO NOTHING;

COMMIT;

-- ════════════════════════════════════════════════════════════════════════════════════════════
--  0003 — Question Bank
--  Tagged questions by topic, difficulty, Bloom level and course outcome.
-- ════════════════════════════════════════════════════════════════════════════════════════════
SET client_encoding = 'UTF8';
BEGIN;

DO $$ BEGIN
  CREATE TYPE question_difficulty AS ENUM ('Easy', 'Medium', 'Hard');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE question_status AS ENUM ('Active', 'Draft', 'Archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE SEQUENCE IF NOT EXISTS seq_question_public START 1040;

CREATE TABLE IF NOT EXISTS question_bank (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id     text NOT NULL UNIQUE DEFAULT ('Q-' || nextval('seq_question_public')),
  college_id    uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  question      text NOT NULL CHECK (length(question) BETWEEN 3 AND 2000),
  topic         text NOT NULL CHECK (length(topic) BETWEEN 2 AND 100),
  difficulty    question_difficulty NOT NULL DEFAULT 'Medium',
  bloom         bloom_level NOT NULL DEFAULT 'Understand',
  co            text NOT NULL CHECK (length(co) BETWEEN 2 AND 20),
  marks         smallint NOT NULL DEFAULT 2 CHECK (marks BETWEEN 1 AND 50),
  explanation   text NOT NULL DEFAULT '' CHECK (length(explanation) <= 2000),
  status        question_status NOT NULL DEFAULT 'Active',
  version       int NOT NULL DEFAULT 1,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_question_bank_college_status ON question_bank (college_id, status);
CREATE INDEX IF NOT EXISTS idx_question_bank_topic ON question_bank (college_id, topic);
CREATE INDEX IF NOT EXISTS idx_question_bank_difficulty ON question_bank (college_id, difficulty);

DROP TRIGGER IF EXISTS question_bank_touch ON question_bank;
CREATE TRIGGER question_bank_touch BEFORE UPDATE ON question_bank FOR EACH ROW EXECUTE FUNCTION touch_row();

DROP TRIGGER IF EXISTS question_bank_version ON question_bank;
CREATE TRIGGER question_bank_version BEFORE UPDATE ON question_bank FOR EACH ROW WHEN (OLD.version = NEW.version) EXECUTE FUNCTION bump_version();

ALTER TABLE question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE question_bank FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS college_isolation ON question_bank;
CREATE POLICY college_isolation ON question_bank
  USING (app_scope_all() OR college_id = app_college())
  WITH CHECK (app_scope_all() OR college_id = app_college());

GRANT SELECT, INSERT, UPDATE, DELETE ON question_bank TO ciq_app;
GRANT USAGE, SELECT ON SEQUENCE seq_question_public TO ciq_app;

-- Seed initial real questions for existing active colleges
INSERT INTO question_bank (college_id, question, topic, difficulty, bloom, co, marks, explanation, status)
SELECT c.id, q.question, q.topic, q.difficulty::question_difficulty, q.bloom::bloom_level, q.co, q.marks, q.explanation, 'Active'::question_status
FROM colleges c
CROSS JOIN (VALUES
  ('Differentiate 3NF and BCNF with a suitable functional dependency example.', 'Transactions', 'Easy', 'Apply', 'CO4', 5, '3NF allows transitive dependency if the attribute is prime, whereas BCNF strictly disallows any non-trivial FD X->A unless X is a superkey.'),
  ('Explain two-phase locking (2PL) protocol and describe how it guarantees serializability.', 'SQL', 'Hard', 'Apply', 'CO5', 10, '2PL has a growing phase where locks are acquired and a shrinking phase where locks are released.'),
  ('What is a view in SQL? List its advantages in multi-tenant database systems.', 'Transactions', 'Easy', 'Understand', 'CO2', 2, 'A view is a virtual table based on the result-set of an SQL statement. It provides data isolation and query simplification.'),
  ('Explain ACID properties in relational database management systems.', 'Indexing', 'Hard', 'Understand', 'CO1', 5, 'Atomicity, Consistency, Isolation, and Durability ensure reliable transaction processing.'),
  ('Explain lossless-join decomposition and provide conditions to verify it.', 'Normalization', 'Hard', 'Apply', 'CO4', 8, 'Decomposition of R into R1 and R2 is lossless if R1 intersect R2 is a superkey of R1 or R2.'),
  ('Define functional dependency and state Armstrong axioms with examples.', 'Normalization', 'Medium', 'Remember', 'CO2', 4, 'A functional dependency is a constraint between two sets of attributes in a relation.'),
  ('Construct a B+ tree for keys [10, 20, 5, 15, 30, 25] with order 3.', 'Indexing', 'Hard', 'Apply', 'CO3', 10, 'B+ trees maintain balanced height and keep all records in leaf nodes connected sequentially.'),
  ('Write an optimized SQL query to find the second-highest salary without using LIMIT.', 'SQL', 'Medium', 'Apply', 'CO3', 4, 'SELECT MAX(salary) FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);'),
  ('Discuss conflict serializability and precedence graphs for schedule verification.', 'Transactions', 'Hard', 'Analyse', 'CO4', 10, 'A schedule is conflict serializable if its precedence graph has no cycles.'),
  ('Explain the differences between clustered and non-clustered indexes in PostgreSQL.', 'Indexing', 'Medium', 'Understand', 'CO1', 5, 'Clustered index dictates the physical order of data on disk, while non-clustered index creates a separate pointer structure.')
) AS q(question, topic, difficulty, bloom, co, marks, explanation)
WHERE c.status = 'Active'
ON CONFLICT DO NOTHING;

COMMIT;

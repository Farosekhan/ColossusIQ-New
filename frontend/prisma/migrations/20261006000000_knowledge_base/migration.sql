-- ════════════════════════════════════════════════════════════════════════════════════════════
--  0005 — institutional knowledge base (RAG)
--  knowledge_documents: one row per uploaded regulation, circular, handbook …
--  knowledge_chunks:    the passages each document is split into, with their embedding
--                       (double precision[]; empty = keyword search only)
-- ════════════════════════════════════════════════════════════════════════════════════════════
SET client_encoding = 'UTF8';
BEGIN;

CREATE SEQUENCE IF NOT EXISTS seq_knowledge_public START 1001;

CREATE TABLE IF NOT EXISTS knowledge_documents (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_id      text NOT NULL UNIQUE DEFAULT ('KB-' || nextval('seq_knowledge_public')),
  college_id     uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  title          text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 140),
  doc_type       text NOT NULL CHECK (doc_type IN ('Regulation','Calendar','Handbook','Policy','Guideline','Lab manual','Circular','Syllabus','Accreditation Evidence')),
  owner          text NOT NULL,
  scope          text NOT NULL,
  description    text NOT NULL DEFAULT '',
  file_name      text NOT NULL DEFAULT '',
  mime           text NOT NULL DEFAULT '',
  size_bytes     int  NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  status         text NOT NULL DEFAULT 'Pending approval' CHECK (status IN ('Approved','Pending approval','Archived')),
  embed_model    text,
  chunk_count    int  NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
  embedded_count int  NOT NULL DEFAULT 0 CHECK (embedded_count >= 0 AND embedded_count <= chunk_count),
  uploaded_by_id uuid,
  uploaded_by    text NOT NULL,
  approved_by    text,
  approved_at    timestamptz,
  version        int  NOT NULL DEFAULT 1,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS knowledge_documents_college_status_idx ON knowledge_documents (college_id, status);

CREATE TABLE IF NOT EXISTS knowledge_chunks (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  college_id  uuid NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
  chunk_index int  NOT NULL CHECK (chunk_index >= 0),
  section     text NOT NULL,
  content     text NOT NULL,
  tokens      int  NOT NULL CHECK (tokens > 0),
  page        int,
  embedding   double precision[] NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (document_id, chunk_index)
);
CREATE INDEX IF NOT EXISTS knowledge_chunks_college_idx ON knowledge_chunks (college_id);

ALTER TABLE knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_documents FORCE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks FORCE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY college_isolation ON knowledge_documents
    USING (app_scope_all() OR college_id = app_college())
    WITH CHECK (app_scope_all() OR college_id = app_college());
EXCEPTION WHEN duplicate_object THEN null;
END $$;
DO $$ BEGIN
  CREATE POLICY college_isolation ON knowledge_chunks
    USING (app_scope_all() OR college_id = app_college())
    WITH CHECK (app_scope_all() OR college_id = app_college());
EXCEPTION WHEN duplicate_object THEN null;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON knowledge_documents, knowledge_chunks TO ciq_app;
GRANT USAGE, SELECT ON SEQUENCE seq_knowledge_public TO ciq_app;

COMMIT;

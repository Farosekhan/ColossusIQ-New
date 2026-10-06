import "server-only";
import { ALL_COLLEGES } from "@/config/tenancy";
import { dataBackend } from "@/lib/data";
import type { KbDocType, KbStatus } from "@/lib/api/knowledge-schemas";
import { postgresKnowledge } from "@/lib/data/postgres/knowledge";
import { sharedState } from "./global-state";

/* Storage for the Knowledge Base: an in-memory store for the demo backend and PostgreSQL (see data/postgres/knowledge.ts). */

export interface KbDocRow {
  /** Public id, e.g. KB-1001. */
  id: string;
  /** College public id, e.g. COL-1001. */
  collegeId: string;
  title: string;
  type: KbDocType;
  owner: string;
  scope: string;
  description: string;
  fileName: string;
  mime: string;
  sizeBytes: number;
  status: KbStatus;
  embedModel: string | null;
  chunkCount: number;
  embeddedCount: number;
  uploadedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewDoc {
  title: string;
  type: KbDocType;
  owner: string;
  scope: string;
  description: string;
  fileName: string;
  mime: string;
  sizeBytes: number;
  status: KbStatus;
  embedModel: string | null;
  uploadedBy: string;
  approvedBy: string | null;
}
export interface NewChunk {
  section: string;
  content: string;
  tokens: number;
  page: number | null;
  embedding: number[] | null;
}
export interface KbChunkRow {
  id: string;
  index: number;
  section: string;
  content: string;
  tokens: number;
  page: number | null;
  embedded: boolean;
}
/** A passage of an approved document, with what is needed to rank it and cite it. */
export interface SearchChunk {
  docId: string;
  docTitle: string;
  section: string;
  content: string;
  page: number | null;
  embedding: number[] | null;
}
export interface DocPatch {
  title?: string;
  type?: KbDocType;
  owner?: string;
  scope?: string;
  description?: string;
  status?: KbStatus;
  approvedBy?: string | null;
}

export interface KbStore {
  list(scope: string): Promise<KbDocRow[]>;
  get(scope: string, id: string): Promise<KbDocRow | undefined>;
  findByTitle(scope: string, title: string): Promise<KbDocRow | undefined>;
  create(collegeId: string, doc: NewDoc, chunks: NewChunk[]): Promise<KbDocRow>;
  update(scope: string, id: string, patch: DocPatch): Promise<KbDocRow | undefined>;
  remove(scope: string, id: string): Promise<boolean>;
  chunks(scope: string, id: string, limit: number): Promise<KbChunkRow[]>;
  /** The text of every passage in order (for re-embedding). */
  chunkTexts(scope: string, id: string): Promise<{ title: string; items: Array<{ section: string; content: string }> } | undefined>;
  /** Replaces every passage's embedding; undefined when the document changed or has a different passage count. */
  setEmbeddings(scope: string, id: string, vectors: number[][], model: string): Promise<KbDocRow | undefined>;
  searchable(scope: string): Promise<SearchChunk[]>;
}

/* ───────────────────────────── memory ─────────────────────────── */

interface MemChunk extends NewChunk {
  id: string;
}
interface MemDoc {
  row: KbDocRow;
  chunks: MemChunk[];
}
const mem = sharedState("knowledge.docs", () => ({ seq: 1000, docs: new Map<string, MemDoc>() }));
const visible = (scope: string, d: MemDoc) => scope === ALL_COLLEGES || d.row.collegeId === scope;
const clone = (r: KbDocRow): KbDocRow => ({ ...r });

const memoryKnowledge: KbStore = {
  async list(scope) {
    return [...mem.docs.values()].filter((d) => visible(scope, d)).map((d) => clone(d.row)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(scope, id) {
    const d = mem.docs.get(id);
    return d && visible(scope, d) ? clone(d.row) : undefined;
  },
  async findByTitle(scope, title) {
    const t = title.trim().toLowerCase();
    const d = [...mem.docs.values()].find((x) => visible(scope, x) && x.row.status !== "Archived" && x.row.title.toLowerCase() === t);
    return d ? clone(d.row) : undefined;
  },
  async create(collegeId, doc, chunks) {
    const id = `KB-${++mem.seq}`;
    const now = new Date().toISOString();
    const row: KbDocRow = {
      ...doc,
      id,
      collegeId,
      chunkCount: chunks.length,
      embeddedCount: chunks.filter((c) => c.embedding).length,
      approvedAt: doc.status === "Approved" ? now : null,
      createdAt: now,
      updatedAt: now,
    };
    mem.docs.set(id, { row, chunks: chunks.map((c, i) => ({ ...c, id: `${id}-c${i + 1}` })) });
    return clone(row);
  },
  async update(scope, id, patch) {
    const d = mem.docs.get(id);
    if (!d || !visible(scope, d)) return undefined;
    const approving = patch.status === "Approved" && d.row.status !== "Approved";
    d.row = {
      ...d.row,
      ...Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)),
      approvedAt: approving ? new Date().toISOString() : d.row.approvedAt,
      updatedAt: new Date().toISOString(),
    };
    return clone(d.row);
  },
  async remove(scope, id) {
    const d = mem.docs.get(id);
    if (!d || !visible(scope, d)) return false;
    mem.docs.delete(id);
    return true;
  },
  async chunks(scope, id, limit) {
    const d = mem.docs.get(id);
    if (!d || !visible(scope, d)) return [];
    return d.chunks.slice(0, limit).map((c, i) => ({ id: c.id, index: i + 1, section: c.section, content: c.content, tokens: c.tokens, page: c.page, embedded: Boolean(c.embedding) }));
  },
  async chunkTexts(scope, id) {
    const d = mem.docs.get(id);
    return d && visible(scope, d) ? { title: d.row.title, items: d.chunks.map((c) => ({ section: c.section, content: c.content })) } : undefined;
  },
  async setEmbeddings(scope, id, vectors, model) {
    const d = mem.docs.get(id);
    if (!d || !visible(scope, d) || d.chunks.length !== vectors.length) return undefined;
    d.chunks.forEach((c, i) => (c.embedding = vectors[i]!));
    d.row = { ...d.row, embedModel: model, embeddedCount: vectors.length, updatedAt: new Date().toISOString() };
    return clone(d.row);
  },
  async searchable(scope) {
    const out: SearchChunk[] = [];
    for (const d of mem.docs.values()) {
      if (!visible(scope, d) || d.row.status !== "Approved") continue;
      for (const c of d.chunks) out.push({ docId: d.row.id, docTitle: d.row.title, section: c.section, content: c.content, page: c.page, embedding: c.embedding });
    }
    return out;
  },
};

export function kbStore(): KbStore {
  return dataBackend() === "postgres" ? postgresKnowledge : memoryKnowledge;
}

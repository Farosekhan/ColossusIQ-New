import "server-only";
import type { KnowledgeDocument } from "@prisma/client";
import type { KbDocType, KbStatus } from "@/lib/api/knowledge-schemas";
import type { DocPatch, KbChunkRow, KbDocRow, KbStore, NewChunk, NewDoc, SearchChunk } from "@/lib/api/mock/knowledge-store";
import { db, requestUser } from "./db";
import { collegePublic, collegeUuid } from "./lookups";

/*
 * Knowledge Base on PostgreSQL. Row-level security (db/migrations/0005_knowledge_base.sql) already limits every
 * query to the signed-in college, so `scope` is only used to resolve the college when creating a document.
 */

const MAX_SEARCH_CHUNKS = 4000;

async function toRow(r: KnowledgeDocument): Promise<KbDocRow> {
  return {
    id: r.publicId,
    collegeId: await collegePublic(r.collegeId),
    title: r.title,
    type: r.docType as KbDocType,
    owner: r.owner,
    scope: r.scope,
    description: r.description,
    fileName: r.fileName,
    mime: r.mime,
    sizeBytes: r.sizeBytes,
    status: r.status as KbStatus,
    embedModel: r.embedModel,
    chunkCount: r.chunkCount,
    embeddedCount: r.embeddedCount,
    uploadedBy: r.uploadedBy,
    approvedBy: r.approvedBy,
    approvedAt: r.approvedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export const postgresKnowledge: KbStore = {
  async list() {
    const rows = await db().knowledgeDocument.findMany({ orderBy: { createdAt: "desc" }, take: 500 });
    return Promise.all(rows.map(toRow));
  },
  async get(_scope, id) {
    const r = await db().knowledgeDocument.findUnique({ where: { publicId: id } });
    return r ? toRow(r) : undefined;
  },
  async findByTitle(_scope, title) {
    const r = await db().knowledgeDocument.findFirst({ where: { title: { equals: title.trim(), mode: "insensitive" }, status: { not: "Archived" } } });
    return r ? toRow(r) : undefined;
  },
  async create(collegeId: string, doc: NewDoc, chunks: NewChunk[]) {
    const college = await collegeUuid(collegeId);
    const row = await db().knowledgeDocument.create({
      data: {
        collegeId: college,
        title: doc.title,
        docType: doc.type,
        owner: doc.owner,
        scope: doc.scope,
        description: doc.description,
        fileName: doc.fileName,
        mime: doc.mime,
        sizeBytes: doc.sizeBytes,
        status: doc.status,
        embedModel: doc.embedModel,
        chunkCount: chunks.length,
        embeddedCount: chunks.filter((c) => c.embedding).length,
        uploadedById: requestUser(),
        uploadedBy: doc.uploadedBy,
        approvedBy: doc.approvedBy,
        approvedAt: doc.status === "Approved" ? new Date() : null,
      },
    });
    for (let i = 0; i < chunks.length; i += 200) {
      await db().knowledgeChunk.createMany({
        data: chunks.slice(i, i + 200).map((c, j) => ({
          documentId: row.id,
          collegeId: college,
          chunkIndex: i + j,
          section: c.section,
          content: c.content,
          tokens: c.tokens,
          page: c.page,
          embedding: c.embedding ?? [],
        })),
      });
    }
    return toRow(row);
  },
  async update(_scope, id, patch: DocPatch) {
    const current = await db().knowledgeDocument.findUnique({ where: { publicId: id } });
    if (!current) return undefined;
    const approving = patch.status === "Approved" && current.status !== "Approved";
    const r = await db().knowledgeDocument.update({
      where: { id: current.id },
      data: {
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.type !== undefined ? { docType: patch.type } : {}),
        ...(patch.owner !== undefined ? { owner: patch.owner } : {}),
        ...(patch.scope !== undefined ? { scope: patch.scope } : {}),
        ...(patch.description !== undefined ? { description: patch.description } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.approvedBy !== undefined ? { approvedBy: patch.approvedBy } : {}),
        ...(approving ? { approvedAt: new Date() } : {}),
        version: { increment: 1 },
        updatedAt: new Date(),
      },
    });
    return toRow(r);
  },
  async remove(_scope, id) {
    const r = await db().knowledgeDocument.deleteMany({ where: { publicId: id } });
    return r.count > 0;
  },
  async chunks(_scope, id, limit): Promise<KbChunkRow[]> {
    const rows = await db().knowledgeChunk.findMany({
      where: { document: { publicId: id } },
      orderBy: { chunkIndex: "asc" },
      take: limit,
      select: { id: true, chunkIndex: true, section: true, content: true, tokens: true, page: true, embedding: true },
    });
    return rows.map((c) => ({ id: c.id, index: c.chunkIndex + 1, section: c.section, content: c.content, tokens: c.tokens, page: c.page, embedded: c.embedding.length > 0 }));
  },
  async chunkTexts(_scope, id) {
    const d = await db().knowledgeDocument.findUnique({ where: { publicId: id }, select: { id: true, title: true } });
    if (!d) return undefined;
    const rows = await db().knowledgeChunk.findMany({ where: { documentId: d.id }, orderBy: { chunkIndex: "asc" }, select: { section: true, content: true } });
    return { title: d.title, items: rows };
  },
  async setEmbeddings(_scope, id, vectors, model) {
    const d = await db().knowledgeDocument.findUnique({ where: { publicId: id } });
    if (!d || d.chunkCount !== vectors.length) return undefined;
    for (let i = 0; i < vectors.length; i += 25) {
      await Promise.all(vectors.slice(i, i + 25).map((v, j) => db().knowledgeChunk.updateMany({ where: { documentId: d.id, chunkIndex: i + j }, data: { embedding: v } })));
    }
    const r = await db().knowledgeDocument.update({ where: { id: d.id }, data: { embedModel: model, embeddedCount: vectors.length, version: { increment: 1 }, updatedAt: new Date() } });
    return toRow(r);
  },
  async searchable(): Promise<SearchChunk[]> {
    const rows = await db().knowledgeChunk.findMany({
      where: { document: { status: "Approved" } },
      orderBy: [{ createdAt: "desc" }, { chunkIndex: "asc" }],
      take: MAX_SEARCH_CHUNKS,
      select: { section: true, content: true, page: true, embedding: true, document: { select: { publicId: true, title: true } } },
    });
    return rows.map((c) => ({ docId: c.document.publicId, docTitle: c.document.title, section: c.section, content: c.content, page: c.page, embedding: c.embedding.length > 0 ? c.embedding : null }));
  },
};

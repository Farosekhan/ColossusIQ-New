import { z } from "zod";

/* Shared (browser + server) contract for the Institutional Knowledge Base. */

export const KB_DOC_TYPES = ["Regulation", "Calendar", "Handbook", "Policy", "Guideline", "Lab manual", "Circular", "Syllabus", "Accreditation Evidence"] as const;
export const KB_STATUSES = ["Approved", "Pending approval", "Archived"] as const;
export const KB_SCOPES = ["Institution-wide", "Faculty & staff", "Students", "Department"] as const;
/** Suggestions for the owner field; any office name is accepted. */
export const KB_OWNER_SUGGESTIONS = ["Registrar", "Controller of Examinations", "IQAC", "Principal's Office", "Training & Placement", "Library", "Department"] as const;
export const KB_CHUNK_SIZES = [256, 512, 1024] as const;

export const KB_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const KB_MAX_TEXT_CHARS = 400_000;
export const KB_MAX_CHUNKS = 800;
/** Request-body ceiling for knowledge routes: a 5 MB file as base64 plus the envelope. */
export const KB_MAX_BODY_BYTES = Math.ceil((KB_MAX_FILE_BYTES * 4) / 3) + 64 * 1024;

export type KbDocType = (typeof KB_DOC_TYPES)[number];
export type KbStatus = (typeof KB_STATUSES)[number];

export const KbDocSchema = z.object({
  id: z.string(),
  collegeId: z.string(),
  title: z.string(),
  type: z.enum(KB_DOC_TYPES),
  owner: z.string(),
  scope: z.string(),
  description: z.string(),
  fileName: z.string(),
  mime: z.string(),
  sizeBytes: z.number(),
  status: z.enum(KB_STATUSES),
  chunks: z.number(),
  embeddedChunks: z.number(),
  /** semantic = every passage has an embedding; partial / keyword = some / none do. */
  indexing: z.enum(["semantic", "partial", "keyword"]),
  embedModel: z.string().nullable(),
  uploadedBy: z.string(),
  approvedBy: z.string().nullable(),
  approvedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KbDoc = z.infer<typeof KbDocSchema>;

export const KbChunkSchema = z.object({
  id: z.string(),
  index: z.number(),
  section: z.string(),
  content: z.string(),
  tokens: z.number(),
  page: z.number().nullable(),
  embedded: z.boolean(),
});
export type KbChunk = z.infer<typeof KbChunkSchema>;

export const KbAiSchema = z.object({
  /** True when a Gemini key is configured: answers are written by the model and passages are embedded. */
  enabled: z.boolean(),
  model: z.string().nullable(),
  embedModel: z.string().nullable(),
  dims: z.number().nullable(),
});

export const KbOverviewSchema = z.object({
  documents: z.array(KbDocSchema),
  stats: z.object({
    documents: z.number(),
    approved: z.number(),
    pending: z.number(),
    archived: z.number(),
    chunks: z.number(),
    embeddedChunks: z.number(),
    categories: z.number(),
    lastIndexedAt: z.string().nullable(),
  }),
  ai: KbAiSchema,
  /** Documents the principal may want to ask about first (titles of approved documents). */
  suggestions: z.array(z.string()),
});
export type KbOverview = z.infer<typeof KbOverviewSchema>;

export const KbDetailSchema = z.object({ document: KbDocSchema, chunks: z.array(KbChunkSchema), truncated: z.boolean() });
export type KbDetail = z.infer<typeof KbDetailSchema>;

export const KbCreatedSchema = z.object({ document: KbDocSchema, notes: z.array(z.string()) });

const UploadShape = z
  .object({
    title: z.string().trim().min(3, "Enter a title of at least 3 characters").max(140),
    type: z.enum(KB_DOC_TYPES),
    owner: z.string().trim().min(2, "Enter the issuing office").max(60),
    scope: z.enum(KB_SCOPES),
    description: z.string().trim().max(400).default(""),
    fileName: z.string().trim().max(160).default(""),
    mime: z.string().trim().max(80).default(""),
    /** Pasted text (or the content of a small text file). */
    text: z.string().max(KB_MAX_TEXT_CHARS).optional(),
    /** A .pdf / .txt / .md / .csv file as base64. */
    dataBase64: z.string().max(KB_MAX_BODY_BYTES).optional(),
    chunkTokens: z.number().int().refine((n) => (KB_CHUNK_SIZES as readonly number[]).includes(n), "Choose 256, 512 or 1024").default(512),
    /** Approve straight away so the document starts grounding AI answers. */
    approve: z.boolean().default(false),
  })
  .strict();
export const KbUploadBody = UploadShape.refine((b) => (b.text?.trim().length ?? 0) >= 40 || Boolean(b.dataBase64), {
  message: "Attach a file or paste at least a few sentences of text",
  path: ["text"],
});
export type KbUploadInput = z.infer<typeof KbUploadBody>;

export const KbPatchBody = z
  .object({
    status: z.enum(KB_STATUSES),
    title: z.string().trim().min(3).max(140),
    type: z.enum(KB_DOC_TYPES),
    owner: z.string().trim().min(2).max(60),
    scope: z.enum(KB_SCOPES),
    description: z.string().trim().max(400),
  })
  .partial()
  .strict()
  .refine((b) => Object.keys(b).length > 0, "Nothing to change");

export const KbAskBody = z.object({ question: z.string().trim().min(3, "Ask a full question").max(500) }).strict();

export const KbCitationSchema = z.object({
  n: z.number(),
  docId: z.string(),
  docTitle: z.string(),
  section: z.string(),
  page: z.number().nullable(),
  /** Cosine similarity (semantic) or the share of question words found (keyword). */
  similarity: z.number(),
  basis: z.enum(["semantic", "keyword"]),
  snippet: z.string(),
  /** Whether the answer actually cites this passage. */
  cited: z.boolean(),
});
export const KbAnswerSchema = z.object({
  question: z.string(),
  answer: z.string(),
  /** False when the approved documents do not contain an answer. */
  grounded: z.boolean(),
  mode: z.enum(["ai", "extract", "none"]),
  citations: z.array(KbCitationSchema),
  searched: z.object({ documents: z.number(), passages: z.number() }),
});
export type KbAnswer = z.infer<typeof KbAnswerSchema>;

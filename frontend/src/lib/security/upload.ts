export type UploadKind = "answer-sheet" | "resume" | "document" | "image";

interface TypeSpec {
  ext: string[];
  magic: number[][];
  /** Additional signature bytes at an offset (e.g. "WEBP" at byte 8 of a RIFF container). */
  extra?: { offset: number; bytes: number[] };
}

interface Rule {
  maxBytes: number;
  types: Record<string, TypeSpec>;
}

const PDF: TypeSpec = { ext: [".pdf"], magic: [[0x25, 0x50, 0x44, 0x46]] }; // %PDF
const PNG: TypeSpec = { ext: [".png"], magic: [[0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]] };
const JPG: TypeSpec = { ext: [".jpg", ".jpeg"], magic: [[0xff, 0xd8, 0xff]] };
const WEBP: TypeSpec = { ext: [".webp"], magic: [[0x52, 0x49, 0x46, 0x46]], extra: { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] } }; // RIFF....WEBP
const DOCX: TypeSpec = { ext: [".docx"], magic: [[0x50, 0x4b, 0x03, 0x04]] }; // zip container

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export const UPLOAD_RULES: Record<UploadKind, Rule> = {
  "answer-sheet": {
    maxBytes: 15 * 1024 * 1024,
    types: { "application/pdf": PDF, "image/png": PNG, "image/jpeg": JPG },
  },
  resume: {
    maxBytes: 5 * 1024 * 1024,
    types: { "application/pdf": PDF, [DOCX_MIME]: DOCX },
  },
  // Website / gallery images. SVG is deliberately NOT allowed: it can carry script.
  image: {
    maxBytes: 2 * 1024 * 1024,
    types: { "image/png": PNG, "image/jpeg": JPG, "image/webp": WEBP },
  },
  document: {
    maxBytes: 20 * 1024 * 1024,
    types: { "application/pdf": PDF, "image/png": PNG, "image/jpeg": JPG, [DOCX_MIME]: DOCX },
  },
};

export function acceptAttr(kind: UploadKind): string {
  const rule = UPLOAD_RULES[kind];
  return [...Object.keys(rule.types), ...Object.values(rule.types).flatMap((t) => t.ext)].join(",");
}

export type UploadCheck = { ok: true } | { ok: false; reason: string };

interface FileLike {
  name: string;
  type: string;
  size: number;
  slice: (start: number, end: number) => { arrayBuffer: () => Promise<ArrayBuffer> };
}

/**
 * Client-side upload validation: allow-listed MIME type, matching extension, size limit and a
 * file-signature ("magic bytes") check so a renamed executable is rejected before upload.
 * The server must repeat these checks and malware-scan files.
 */
export async function validateUpload(file: FileLike, kind: UploadKind): Promise<UploadCheck> {
  const rule = UPLOAD_RULES[kind];
  const spec = rule.types[file.type];
  if (!spec) return { ok: false, reason: "This file type is not allowed." };
  if (file.size === 0) return { ok: false, reason: "The file is empty." };
  if (file.size > rule.maxBytes) {
    return { ok: false, reason: `File is larger than ${Math.round(rule.maxBytes / 1024 / 1024)} MB.` };
  }
  const name = file.name.toLowerCase();
  if (name.length > 180 || /[\\/]/.test(name)) return { ok: false, reason: "Invalid file name." };
  if (!spec.ext.some((e) => name.endsWith(e))) {
    return { ok: false, reason: "File extension does not match its type." };
  }
  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  const matches =
    spec.magic.some((sig) => sig.every((byte, i) => head[i] === byte)) &&
    (!spec.extra || spec.extra.bytes.every((byte, i) => head[spec.extra!.offset + i] === byte));
  if (!matches) return { ok: false, reason: "File content does not match its extension." };
  return { ok: true };
}

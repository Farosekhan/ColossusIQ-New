import "server-only";
import { validateUpload } from "@/lib/security/upload";
import { getStore } from "@/lib/data";
import type { MediaItem } from "@/lib/data/store";

/*
 * Uploaded images for college websites, galleries and lessons.
 * - PNG / JPEG / WebP only (SVG is refused: it can contain script), max 2 MB.
 * - The file signature is re-checked on the server; the client-supplied name is discarded.
 * - Ids are 96 random bits, so media cannot be enumerated.
 */
const EXT: Record<MediaItem["contentType"], string> = { "image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp" };

export async function saveMedia(
  contentType: string,
  base64: string,
  collegeId: string | null,
  uploadedBy: string,
): Promise<{ ok: true; id: string } | { ok: false; reason: string }> {
  if (!(contentType in EXT)) return { ok: false, reason: "Only PNG, JPEG or WebP images are allowed." };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) return { ok: false, reason: "Invalid image data." };
  const bytes = Uint8Array.from(Buffer.from(base64, "base64"));
  const type = contentType as MediaItem["contentType"];
  const check = await validateUpload(
    { name: `upload${EXT[type]}`, type, size: bytes.byteLength, slice: (s, e) => ({ arrayBuffer: async () => bytes.slice(s, e).buffer }) },
    "image",
  );
  if (!check.ok) return { ok: false, reason: check.reason };
  const id = await getStore().media.save({ contentType: type, bytes, collegeId, uploadedBy });
  return { ok: true, id };
}

export async function getMedia(id: string): Promise<MediaItem | undefined> {
  return /^MED-[a-f0-9]{24}$/.test(id) ? getStore().media.get(id) : undefined;
}

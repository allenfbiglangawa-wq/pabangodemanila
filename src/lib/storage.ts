import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomToken } from "./crypto";

/**
 * Local-disk storage for uploaded media (public/uploads). For production on
 * serverless hosting, replace these two functions with an object-storage
 * client (S3, Cloudflare R2, Supabase Storage…) — callers only use the URL.
 */
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean; kind: "image" | "video" }> = {
  "image/jpeg": { ext: "jpg", kind: "image", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/png": { ext: "png", kind: "image", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  "image/webp": { ext: "webp", kind: "image", magic: (b) => b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP" },
  "image/avif": { ext: "avif", kind: "image", magic: (b) => b.toString("ascii", 4, 12).startsWith("ftypavi") },
  "video/mp4": { ext: "mp4", kind: "video", magic: (b) => b.toString("ascii", 4, 8) === "ftyp" },
  "video/webm": { ext: "webm", kind: "video", magic: (b) => b.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3])) },
};

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

export class UploadError extends Error {}

export async function saveUpload(file: File, allow: ("image" | "video")[] = ["image"]) {
  const t = TYPES[file.type];
  if (!t || !allow.includes(t.kind)) throw new UploadError(`Unsupported file type. Allowed: ${allow.join(", ")} (JPG, PNG, WebP, AVIF${allow.includes("video") ? ", MP4, WebM" : ""}).`);
  const limit = t.kind === "image" ? MAX_IMAGE_BYTES : MAX_VIDEO_BYTES;
  if (file.size > limit) throw new UploadError(`File is too large (max ${Math.round(limit / 1024 / 1024)} MB).`);
  const buf = Buffer.from(await file.arrayBuffer());
  if (!t.magic(buf)) throw new UploadError("The file contents do not match its type.");
  await mkdir(UPLOAD_DIR, { recursive: true });
  const name = `${Date.now()}-${randomToken(9)}.${t.ext}`;
  await writeFile(path.join(UPLOAD_DIR, name), buf);
  return { url: `/uploads/${name}`, mimeType: file.type, sizeBytes: file.size, kind: t.kind };
}

export async function deleteUpload(url: string) {
  if (!url.startsWith("/uploads/")) return;
  const name = path.basename(url);
  await unlink(path.join(UPLOAD_DIR, name)).catch(() => undefined);
}

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { env } from "./env";

/**
 * File storage.
 * - Production (Vercel): files go straight from the browser to Vercel Blob (see /api/uploads),
 *   so they never pass through a serverless function (4.5 MB request limit).
 * - Development (no BLOB_READ_WRITE_TOKEN): files are posted to /api/uploads and saved under ./uploads.
 * Server actions only ever receive URLs, which are checked with assertOwnUploadUrl().
 */

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export type UploadFolder = "events" | "organizers" | "docs";

const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const ALLOWED_TYPES: Record<UploadFolder, string[]> = {
  events: IMAGE_TYPES,
  organizers: IMAGE_TYPES,
  docs: [...IMAGE_TYPES, "application/pdf"],
};

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export class UploadError extends Error {}

export const blobEnabled = () => !!process.env.BLOB_READ_WRITE_TOKEN;

export function isUploadFolder(v: unknown): v is UploadFolder {
  return v === "events" || v === "organizers" || v === "docs";
}

/** Store id is embedded in the read-write token: vercel_blob_rw_<storeId>_<secret> */
function blobStoreId(): string | null {
  const m = (process.env.BLOB_READ_WRITE_TOKEN || "").match(/^vercel_blob_rw_([a-z0-9]+)_/i);
  return m ? m[1].toLowerCase() : null;
}

/** Save a file on local disk (development) and return its URL. */
export async function saveLocalUpload(file: File, folder: UploadFolder) {
  if (!ALLOWED_TYPES[folder].includes(file.type)) throw new UploadError("INVALID_FILE_TYPE");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("FILE_TOO_LARGE");
  const key = `${folder}/${randomUUID()}.${EXT[file.type]}`;
  const full = path.join(UPLOAD_DIR, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, Buffer.from(await file.arrayBuffer()));
  return `${env.appUrl}/api/files/${key}`;
}

/** Throw unless `url` points at a file we stored in the given folder. */
export function assertOwnUploadUrl(url: string, folder: UploadFolder): string {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new UploadError("INVALID_FILE_URL");
  }
  if (blobEnabled()) {
    const store = blobStoreId();
    const hostOk = store
      ? u.hostname === `${store}.public.blob.vercel-storage.com`
      : u.hostname.endsWith(".public.blob.vercel-storage.com");
    if (u.protocol !== "https:" || !hostOk || !u.pathname.startsWith(`/${folder}/`)) {
      throw new UploadError("INVALID_FILE_URL");
    }
    return u.toString();
  }
  if (!url.startsWith(`${env.appUrl}/api/files/${folder}/`) || u.pathname.includes("..") || u.search) {
    throw new UploadError("INVALID_FILE_URL");
  }
  return u.toString();
}

/** Read an optional single URL field from a form. */
export function formUploadUrl(fd: FormData, name: string, folder: UploadFolder): string | null {
  const v = String(fd.get(name) ?? "").trim();
  return v ? assertOwnUploadUrl(v, folder) : null;
}

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { env } from "./env";

export const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export class UploadError extends Error {}

/** Store an uploaded file and return its public URL. */
export async function saveUpload(file: File, folder: "events" | "organizers" | "docs", allowPdf = false) {
  const ext = ALLOWED[file.type];
  if (!ext || (ext === "pdf" && !allowPdf)) throw new UploadError("INVALID_FILE_TYPE");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("FILE_TOO_LARGE");
  const key = `${folder}/${randomUUID()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());

  if (process.env.S3_BUCKET) {
    const client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined,
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
      },
    });
    await client.send(
      new PutObjectCommand({ Bucket: process.env.S3_BUCKET, Key: key, Body: body, ContentType: file.type }),
    );
    return `${(process.env.S3_PUBLIC_URL || "").replace(/\/$/, "")}/${key}`;
  }

  const full = path.join(UPLOAD_DIR, key);
  await mkdir(path.dirname(full), { recursive: true });
  await writeFile(full, body);
  return `${env.appUrl}/api/files/${key}`;
}

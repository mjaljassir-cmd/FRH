import { NextResponse } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { prisma } from "@events/db";
import { getCurrentUser } from "@/lib/auth";
import {
  ALLOWED_TYPES,
  MAX_UPLOAD_BYTES,
  UploadError,
  blobEnabled,
  isUploadFolder,
  saveLocalUpload,
  type UploadFolder,
} from "@/lib/storage";

/**
 * Who may upload what:
 * - events: approved organizers only
 * - organizers (logo) / docs (commercial registration): organizers, or anonymous visitors
 *   filling in the organizer registration form
 */
async function checkPermission(folder: UploadFolder) {
  const user = await getCurrentUser();
  if (user?.role === "ADMIN") return;
  if (folder === "events") {
    if (user?.role !== "ORGANIZER") throw new UploadError("FORBIDDEN");
    const org = await prisma.organizer.findUnique({ where: { ownerId: user.id } });
    if (org?.status !== "APPROVED") throw new UploadError("FORBIDDEN");
    return;
  }
  if (user && user.role !== "ORGANIZER") throw new UploadError("FORBIDDEN");
}

export async function POST(req: Request) {
  try {
    if (blobEnabled()) {
      // Vercel Blob client upload: issue a short-lived token, the browser uploads directly.
      const body = (await req.json()) as HandleUploadBody;
      const result = await handleUpload({
        body,
        request: req,
        onBeforeGenerateToken: async (pathname) => {
          const folder = pathname.split("/")[0];
          if (!isUploadFolder(folder)) throw new UploadError("INVALID_FILE_TYPE");
          await checkPermission(folder);
          return {
            allowedContentTypes: ALLOWED_TYPES[folder],
            maximumSizeInBytes: MAX_UPLOAD_BYTES,
            addRandomSuffix: true,
          };
        },
      });
      return NextResponse.json(result);
    }

    // Local development: multipart upload to disk
    const fd = await req.formData();
    const folder = fd.get("folder");
    const file = fd.get("file");
    if (!isUploadFolder(folder) || !(file instanceof File)) throw new UploadError("INVALID_FILE_TYPE");
    await checkPermission(folder);
    return NextResponse.json({ url: await saveLocalUpload(file, folder) });
  } catch (err) {
    const code = err instanceof UploadError ? err.message : "UPLOAD_FAILED";
    if (!(err instanceof UploadError)) console.error("[upload]", err);
    return NextResponse.json({ error: code }, { status: code === "FORBIDDEN" ? 403 : 400 });
  }
}

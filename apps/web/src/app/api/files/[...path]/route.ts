import { readFile } from "node:fs/promises";
import path from "node:path";
import { UPLOAD_DIR } from "@/lib/storage";
import { getCurrentUser } from "@/lib/auth";

const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", pdf: "application/pdf" };

/** Serves locally stored uploads (used only when S3 is not configured). */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const parts = (await params).path;
  const full = path.join(UPLOAD_DIR, ...parts);
  if (!full.startsWith(UPLOAD_DIR + path.sep) || parts.some((p) => p.includes(".."))) {
    return new Response("Not found", { status: 404 });
  }
  // Commercial registration documents are visible to admins only
  if (parts[0] === "docs") {
    const user = await getCurrentUser();
    if (user?.role !== "ADMIN") return new Response("Not found", { status: 404 });
  }
  try {
    const data = await readFile(full);
    const ext = full.split(".").pop() ?? "";
    return new Response(data, {
      headers: { "Content-Type": TYPES[ext] ?? "application/octet-stream", "Cache-Control": parts[0] === "docs" ? "private, no-store" : "public, max-age=31536000, immutable" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}

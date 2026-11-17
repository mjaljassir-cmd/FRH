"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { upload } from "@vercel/blob/client";

const MAX_BYTES = 5 * 1024 * 1024;
const BLOB_MODE = process.env.NEXT_PUBLIC_UPLOAD_MODE === "blob";

type Folder = "events" | "organizers" | "docs";

/**
 * File picker that uploads immediately (directly to Vercel Blob in production, to /api/uploads
 * locally) and submits the resulting URL(s) as hidden inputs named `name`.
 */
export function FileUpload({
  name,
  folder,
  accept,
  multiple = false,
  initial = [],
  max = 10,
  testId,
}: {
  name: string;
  folder: Folder;
  accept: string;
  multiple?: boolean;
  initial?: string[];
  max?: number;
  testId?: string;
}) {
  const t = useTranslations("upload");
  const te = useTranslations("errors");
  const [urls, setUrls] = useState<string[]>(initial);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File): Promise<string> {
    if (file.size > MAX_BYTES) throw new Error("FILE_TOO_LARGE");
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
    if (BLOB_MODE) {
      const blob = await upload(`${folder}/file.${ext}`, file, {
        access: "public",
        handleUploadUrl: "/api/uploads",
        contentType: file.type,
      });
      return blob.url;
    }
    const fd = new FormData();
    fd.append("folder", folder);
    fd.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: fd });
    const json = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
    if (!res.ok || !json.url) throw new Error(json.error || "UPLOAD_FAILED");
    return json.url;
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setError(null);
    const room = multiple ? max - urls.length : 1;
    if (files.length > room) {
      setError("TOO_MANY_IMAGES");
      return;
    }
    setBusy((b) => b + files.length);
    for (const f of files) {
      try {
        const url = await uploadOne(f);
        setUrls((prev) => (multiple ? [...prev, url] : [url]));
      } catch (err) {
        const code = err instanceof Error ? err.message : "UPLOAD_FAILED";
        setError(te.has(code) ? code : "UPLOAD_FAILED");
      } finally {
        setBusy((b) => b - 1);
      }
    }
  }

  const isImage = (u: string) => !/\.pdf($|\?)/i.test(u);

  return (
    <div data-testid={testId} data-uploading={busy > 0 ? "1" : "0"} data-count={urls.length}>
      {urls.map((u) => (
        <input key={u} type="hidden" name={name} value={u} />
      ))}
      <input type="file" accept={accept} multiple={multiple} onChange={onChange} className="input" disabled={busy > 0} />
      {busy > 0 && <p className="mt-1 text-xs text-brand-600">{t("uploading")}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{te(error)}</p>}
      {urls.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {urls.map((u) => (
            <div key={u} className="relative">
              {isImage(u) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={u} alt="" className="h-20 w-28 rounded object-cover" />
              ) : (
                <a href={u} target="_blank" rel="noreferrer" className="block rounded border px-3 py-6 text-xs text-brand-600">
                  PDF
                </a>
              )}
              <button
                type="button"
                className="absolute -top-2 end-0 rounded-full bg-white px-1.5 text-xs shadow"
                onClick={() => setUrls((prev) => prev.filter((x) => x !== u))}
                aria-label={t("remove")}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

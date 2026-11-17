import { afterEach, describe, expect, it } from "vitest";
import { assertOwnUploadUrl } from "./storage";

const env = { ...process.env };
afterEach(() => {
  process.env = { ...env };
});

describe("assertOwnUploadUrl", () => {
  it("accepts only our local upload URLs in development", () => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
    process.env.APP_URL = "http://localhost:3000";
    expect(assertOwnUploadUrl("http://localhost:3000/api/files/events/a.png", "events")).toContain("/events/a.png");
    expect(() => assertOwnUploadUrl("http://localhost:3000/api/files/docs/a.pdf", "events")).toThrow();
    expect(() => assertOwnUploadUrl("https://evil.example.com/api/files/events/a.png", "events")).toThrow();
    expect(() => assertOwnUploadUrl("not a url", "events")).toThrow();
  });

  it("accepts only our Blob store in production", () => {
    process.env.BLOB_READ_WRITE_TOKEN = "vercel_blob_rw_AbC123_secret";
    expect(assertOwnUploadUrl("https://abc123.public.blob.vercel-storage.com/events/file-x.png", "events")).toBeTruthy();
    expect(() => assertOwnUploadUrl("https://other.public.blob.vercel-storage.com/events/x.png", "events")).toThrow();
    expect(() => assertOwnUploadUrl("https://abc123.public.blob.vercel-storage.com/docs/x.pdf", "events")).toThrow();
    expect(() => assertOwnUploadUrl("http://abc123.public.blob.vercel-storage.com/events/x.png", "events")).toThrow();
  });
});

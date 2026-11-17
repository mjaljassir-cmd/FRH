import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  transpilePackages: ["@events/shared", "@events/db"],
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // Include files from the monorepo root (e.g. the generated Prisma client) in serverless bundles
  outputFileTracingRoot: path.join(__dirname, "../../"),
  env: {
    // Tells the browser whether to upload straight to Vercel Blob or to the local /api/uploads route
    NEXT_PUBLIC_UPLOAD_MODE: process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local",
  },
};

export default withNextIntl(nextConfig);

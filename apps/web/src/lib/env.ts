function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name}`);
  return v;
}

export const env = {
  get appUrl() {
    return (process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
  },
  get jwtSecret() {
    return new TextEncoder().encode(required("JWT_SECRET"));
  },
  get qrSecret() {
    return required("QR_SECRET");
  },
  get cronSecret() {
    return required("CRON_SECRET");
  },
  moyasar: {
    get publishableKey() {
      return process.env.MOYASAR_PUBLISHABLE_KEY || "";
    },
    get secretKey() {
      return process.env.MOYASAR_SECRET_KEY || "";
    },
    get webhookSecret() {
      return process.env.MOYASAR_WEBHOOK_SECRET || "";
    },
    /**
     * Mock payments (no real charge). Active only when no Moyasar secret key is set, and either in
     * development or when MOYASAR_MOCK=1 is set explicitly (for automated tests). Never set it in production.
     */
    get mock() {
      return !process.env.MOYASAR_SECRET_KEY && (process.env.NODE_ENV !== "production" || process.env.MOYASAR_MOCK === "1");
    },
  },
};

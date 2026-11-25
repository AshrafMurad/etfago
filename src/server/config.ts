import path from "node:path";

export function validateProductionEnvironment(
  env: Record<string, string | undefined> = process.env
): void {
  const url = new URL(env.APP_URL || "http://invalid");
  if (url.protocol !== "https:" || url.hostname === "localhost" || url.origin !== env.APP_URL?.replace(/\/$/, "")) {
    throw new Error("APP_URL must use a public HTTPS origin without a path");
  }
  for (const name of ["AUTH_SECRET", "CRON_SECRET"] as const) {
    const value = env[name] || "";
    if (value.length < 32 || /replace|placeholder|dev-secret/i.test(value)) {
      throw new Error(`${name} must be a strong production secret`);
    }
  }
  if (!env.RESEND_API_KEY || /replace|placeholder/i.test(env.RESEND_API_KEY)) {
    throw new Error("Configure a real RESEND_API_KEY");
  }
  if (!env.EMAIL_FROM || /example\.com|your-verified-domain/i.test(env.EMAIL_FROM)) {
    throw new Error("Configure a verified EMAIL_FROM sender");
  }
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL is required");
  if (!env.STORAGE_ROOT || !path.isAbsolute(env.STORAGE_ROOT)) {
    throw new Error("STORAGE_ROOT must be an absolute persistent path");
  }
}

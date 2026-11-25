import assert from "node:assert/strict";
import crypto from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { spawn } from "node:child_process";
import { loadEnvConfig } from "@next/env";
import { PrismaClient } from "@prisma/client";

// Exercise the built production server and actual Auth.js HTTP/CSRF/cookie flow.
// No external email is sent; the controlled mailbox token is seeded into the test DB.
async function main() {
loadEnvConfig(process.cwd());
const db = new PrismaClient();
const port = Number(process.env.HTTP_SMOKE_PORT || "3108");
const origin = `http://127.0.0.1:${port}`;
const email = `http-smoke-${crypto.randomUUID()}@example.com`;
const rawToken = crypto.randomBytes(32).toString("hex");
const storageRoot = path.resolve("scratch", `http-smoke-${crypto.randomUUID()}`);
const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-p", String(port), "--hostname", "127.0.0.1"], {
  env: {
    ...process.env, NODE_ENV: "production", APP_URL: "https://etfago.test", AUTH_URL: "https://etfago.test",
    AUTH_SECRET: crypto.randomBytes(32).toString("hex"), CRON_SECRET: crypto.randomBytes(32).toString("hex"),
    RESEND_API_KEY: "re_http_smoke", EMAIL_FROM: "Etfago <mail@etfago.test>", STORAGE_ROOT: storageRoot,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
let serverOutput = "";
server.stdout.on("data", (chunk: Buffer) => { serverOutput += chunk.toString(); });
server.stderr.on("data", (chunk: Buffer) => { serverOutput += chunk.toString(); });
const cookies = new Map<string, string>();
function collect(response: Response) {
  for (const value of response.headers.getSetCookie()) {
    const pair = value.split(";", 1)[0];
    const separator = pair.indexOf("=");
    cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}
function cookieHeader() { return [...cookies].map(([key, value]) => `${key}=${value}`).join("; "); }

try {
  let healthy = false;
  for (let i = 0; i < 60; i++) {
    if (server.exitCode !== null) throw new Error(`Server exited during startup: ${serverOutput}`);
    try { if ((await fetch(`${origin}/api/health`)).ok) { healthy = true; break; } } catch { /* wait for startup */ }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  assert(healthy, `Production health never became ready: ${serverOutput}`);
  for (const locale of ["ar", "en"]) {
    const page = await fetch(`${origin}/${locale}/auth/signin`);
    assert.equal(page.status, 200);
    assert.equal(page.headers.get("referrer-policy"), "no-referrer");
  }
  assert.equal((await fetch(`${origin}/api/cron/reminders`, { method: "POST" })).status, 401);
  const user = await db.user.create({ data: { emailNormalized: email } });
  await db.verificationToken.create({ data: {
    identifier: email, token: crypto.createHash("sha256").update(rawToken).digest("hex"), expires: new Date(Date.now() + 900000),
  } });
  const preview = await fetch(`${origin}/en/auth/verify?email=${encodeURIComponent(email)}&token=${rawToken}`);
  assert.equal(preview.status, 200);
  assert.equal(await db.verificationToken.count({ where: { identifier: email } }), 1, "GET must not consume sign-in links");
  const csrfResponse = await fetch(`${origin}/api/auth/csrf`);
  collect(csrfResponse);
  const { csrfToken } = await csrfResponse.json() as { csrfToken: string };
  const login = async (token?: string) => {
    const body = new URLSearchParams({ email, csrfToken, callbackUrl: "https://etfago.test/en/workspaces" });
    if (token) body.set("token", token);
    const response = await fetch(`${origin}/api/auth/callback/credentials`, {
      method: "POST", redirect: "manual", headers: {
        Cookie: cookieHeader(), "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1", "X-Real-IP": "127.0.0.1",
      }, body,
    });
    collect(response);
    return response;
  };
  await login();
  assert(![...cookies].some(([key, value]) => key.includes("session-token") && value), "Email-only login must not issue a session");
  const signedIn = await login(rawToken);
  assert.equal(signedIn.status, 200);
  const sessionResponse = await fetch(`${origin}/api/auth/session`, { headers: { Cookie: cookieHeader() } });
  const session = await sessionResponse.json() as { user?: { id: string } };
  assert.equal(session.user?.id, user.id, "A valid email token must issue a real Auth.js session");
  const workspacePage = await fetch(`${origin}/en/workspaces`, { redirect: "manual", headers: { Cookie: cookieHeader() } });
  assert.equal(workspacePage.status, 200, "Authenticated workspaces must render dynamically rather than cache the anonymous redirect");
  assert([...cookies].some(([key, value]) => key.startsWith("__Secure-") && key.includes("session-token") && value), "Production session cookie must use a secure prefix");
  assert.equal(await db.verificationToken.count({ where: { identifier: email } }), 0);
  cookies.clear();
  const newCsrfResponse = await fetch(`${origin}/api/auth/csrf`);
  collect(newCsrfResponse);
  const newCsrf = await newCsrfResponse.json() as { csrfToken: string };
  const replay = await fetch(`${origin}/api/auth/callback/credentials`, {
    method: "POST", redirect: "manual", headers: { Cookie: cookieHeader(), "Content-Type": "application/x-www-form-urlencoded", "X-Auth-Return-Redirect": "1" },
    body: new URLSearchParams({ email, token: rawToken, csrfToken: newCsrf.csrfToken }),
  });
  collect(replay);
  assert(![...cookies].some(([key, value]) => key.includes("session-token") && value), "Replayed token must not issue a session");
  console.log("Production HTTP smoke passed: AR/EN pages, readiness, cron auth, non-consuming GET, email-only rejection, secure-cookie login, and replay denial.");
} finally {
  server.kill();
  await new Promise<void>((resolve) => { if (server.exitCode !== null) resolve(); else server.once("exit", () => resolve()); });
  await db.verificationToken.deleteMany({ where: { identifier: email } });
  await db.user.deleteMany({ where: { emailNormalized: email } });
  for (const ip of ["127.0.0.1", "unknown"]) {
    const key = crypto.createHash("sha256").update(`verify-ip:${ip}`).digest("hex");
    await db.authRateLimit.deleteMany({ where: { key } });
  }
  await db.$disconnect();
  await fs.rm(storageRoot, { recursive: true, force: true });
}
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });

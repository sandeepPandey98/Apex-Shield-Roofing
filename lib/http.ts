import { hasAdminSession } from "./admin-session";
import { timingSafeEqual } from "node:crypto";
import { ZodError } from "zod";
import { ApiError } from "./whop";
export function jsonError(error: unknown) {
  return Response.json(
    {
      error:
        error instanceof ZodError
          ? "Please check the required fields and values."
          : error instanceof ApiError
            ? error.message
            : "Unable to complete the request.",
    },
    {
      status:
        error instanceof ZodError
          ? 400
          : error instanceof ApiError
            ? error.status
            : 500,
    },
  );
}
export async function readBody(req: Request) {
  if (Number(req.headers.get("content-length") || 0) > 16384)
    throw new ApiError("Request too large.", 413);
  const text = await req.text();
  if (text.length > 16384) throw new ApiError("Request too large.", 413);
  try {
    return JSON.parse(text);
  } catch {
    throw new ApiError("Invalid JSON.", 400);
  }
}
export function checkOrigin(req: Request) {
  const origin = req.headers.get("origin");
  const expected = new URL(process.env.APP_URL || req.url).origin;
  if (origin && origin !== expected && origin !== new URL(req.url).origin)
    throw new ApiError("Request origin not allowed.", 403);
}
export function requireAdmin(req: Request) {
  if (!req.headers.has("authorization") && hasAdminSession(req)) return;
  const secret = process.env.CONTRACTOR_ADMIN_TOKEN;
  const token = req.headers.get("authorization")?.replace(/^Bearer /, "") || "";
  if (
    !secret ||
    secret.length < 24 ||
    Buffer.byteLength(token) !== Buffer.byteLength(secret) ||
    !timingSafeEqual(Buffer.from(token), Buffer.from(secret))
  )
    throw new ApiError("Contractor authentication required.", 401);
}
export function requestKey(req: Request) {
  const key = req.headers.get("idempotency-key");
  if (!key || !/^[a-zA-Z0-9-]{16,100}$/.test(key))
    throw new ApiError("A valid idempotency key is required.", 400);
  return key;
}
// Per-process guard for a single instance. Use a shared rate limiter when scaling.
const requests = new Map<string, { count: number; expires: number }>();
export function limitLeads(req: Request) {
  const now = Date.now();
  for (const [key, value] of requests)
    if (value.expires < now) requests.delete(key);
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "local";
  const value = requests.get(ip) || { count: 0, expires: now + 60000 };
  if (++value.count > 10)
    throw new ApiError("Too many requests. Please wait a minute.", 429);
  requests.set(ip, value);
}

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export const ADMIN_COOKIE = "roofing_contractor_session";
export const ADMIN_EMBED_COOKIE = "__Host-roofing_contractor_embed";
export const ADMIN_SESSION_SECONDS = 4 * 60 * 60;
function sign(payload: string, secret: string) {
  return createHmac("sha256", secret).update(`contractor-session:v1:${payload}`).digest("base64url");
}
export function createAdminSession() {
  const secret = process.env.CONTRACTOR_ADMIN_TOKEN;
  if (!secret || secret.length < 24) throw new Error("Contractor authentication is not configured.");
  const payload = `${Date.now() + ADMIN_SESSION_SECONDS * 1000}.${randomBytes(16).toString("hex")}`;
  return `${payload}.${sign(payload, secret)}`;
}
export function hasAdminSession(req: Request) {
  const secret = process.env.CONTRACTOR_ADMIN_TOKEN;
  if (!secret || secret.length < 24) return false;
  const cookies = req.headers.get("cookie")?.split(";").map((v) => v.trim()) || [];
  return [ADMIN_COOKIE, ADMIN_EMBED_COOKIE].some((name) => validSession(cookies.find((v) => v.startsWith(`${name}=`))?.slice(name.length + 1), secret));
}
function validSession(value: string | undefined, secret: string) {
  if (!value || value.length > 256) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || !/^\d{13}$/.test(parts[0]) || !/^[a-f0-9]{32}$/.test(parts[1])) return false;
  const expires = Number(parts[0]);
  if (expires <= Date.now() || expires > Date.now() + ADMIN_SESSION_SECONDS * 1000) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`, secret);
  return Buffer.byteLength(parts[2]) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected));
}
export function adminCookie(req: Request, value: string, clear = false) {
  if (req.headers.get("x-contractor-embed") === "1" && new URL(req.url).protocol === "https:")
    return `${ADMIN_EMBED_COOKIE}=${value}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${clear ? 0 : ADMIN_SESSION_SECONDS}`;
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : ADMIN_SESSION_SECONDS}${secure}`;
}

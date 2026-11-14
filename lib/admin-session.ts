import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
export const ADMIN_COOKIE = "roofing_contractor_session";
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
  const value = req.headers.get("cookie")?.split(";").map((v) => v.trim()).find((v) => v.startsWith(`${ADMIN_COOKIE}=`))?.slice(ADMIN_COOKIE.length + 1);
  if (!value || value.length > 256) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || !/^\d{13}$/.test(parts[0]) || !/^[a-f0-9]{32}$/.test(parts[1])) return false;
  const expires = Number(parts[0]);
  if (expires <= Date.now() || expires > Date.now() + ADMIN_SESSION_SECONDS * 1000) return false;
  const expected = sign(`${parts[0]}.${parts[1]}`, secret);
  return Buffer.byteLength(parts[2]) === Buffer.byteLength(expected) && timingSafeEqual(Buffer.from(parts[2]), Buffer.from(expected));
}
export function adminCookie(req: Request, value: string, clear = false) {
  const secure = new URL(req.url).protocol === "https:" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${value}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${clear ? 0 : ADMIN_SESSION_SECONDS}${secure}`;
}

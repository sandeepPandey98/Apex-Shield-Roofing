import { checkOrigin, jsonError, requireAdmin } from "@/lib/http";
import { adminCookie, createAdminSession } from "@/lib/admin-session";
import { ApiError } from "@/lib/whop";
const headers = {"Cache-Control": "private, no-store", Vary: "Cookie, Authorization"};
export async function GET(req: Request) {
  try { requireAdmin(req); return Response.json({authenticated: true}, {headers}); }
  catch { return Response.json({authenticated: false}, {status: 401, headers}); }
}
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (!req.headers.get("authorization")?.startsWith("Bearer ")) throw new ApiError("Contractor access token required.", 401);
    requireAdmin(req);
    return Response.json({authenticated: true}, {headers: {...headers, "Set-Cookie": adminCookie(req, createAdminSession())}});
  } catch (error) { const response = jsonError(error); response.headers.set("Cache-Control", "no-store"); return response; }
}
export async function DELETE(req: Request) {
  try {
    checkOrigin(req);
    return Response.json({authenticated: false}, {headers: {...headers, "Set-Cookie": adminCookie(req, "", true)}});
  } catch (error) {return jsonError(error);}
}

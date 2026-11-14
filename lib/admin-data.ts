import { checkOrigin, jsonError, requireAdmin } from "./http";
import { ApiError, whopAccount, whopRequest } from "./whop";

type Row = Record<string, any>;
function text(value: unknown, fallback = "") { return typeof value === "string" ? value : fallback; }
function safeLink(value: unknown) {
  if (typeof value !== "string") return null;
  try { const u = new URL(value); return u.protocol === "https:" && (u.hostname === "whop.com" || u.hostname.endsWith(".whop.com") || u.hostname.endsWith(".whop.app") || u.hostname.endsWith(".whop.site")) ? u.href : null; } catch { return null; }
}
export async function adminList(req: Request, kind: "tracking" | "leads" | "invoices") {
  try {
    checkOrigin(req);
    requireAdmin(req);
    const incoming = new URL(req.url).searchParams;
    const after = incoming.get("after");
    if (after && after.length > 2048) throw new ApiError("Invalid pagination cursor.", 400);
    const params = new URLSearchParams({ account_id: whopAccount(), first: "100" });
    if (after) params.set("after", after);
    if (kind === "tracking") {
      // Keep the original window when moving between pages.
      const requestedTo = incoming.get("to");
      const to = requestedTo ? new Date(requestedTo) : new Date();
      if (!Number.isFinite(to.getTime()) || to.getTime() > Date.now() + 60000 || to.getTime() < Date.now() - 2 * 86400000)
        throw new ApiError("Invalid event window. Refresh to start again.", 400);
      params.set("to", to.toISOString());
      params.set("from", new Date(to.getTime() - 86400000).toISOString());
      params.set("direction", "desc");
    }
    const result = await whopRequest<{data: Row[]; page_info: Row}>(`/${kind === "tracking" ? "events" : kind === "leads" ? "members" : kind}?${params}`);
    if (!Array.isArray(result.data)) throw new ApiError("Whop returned an unreadable list.");
    const records = kind === "leads" ? result.data.filter((r) => r.metadata?.roofing_source === "whop_roofing_website") : result.data;
    const rows = records.map((r) => kind === "tracking" ? {
      id: r.id, time: r.event_time, event: text(r.custom_name) || text(r.event_name, "Unknown event"),
      page: text(r.path, "/"), value: r.value ?? r.total_usd_amount ?? null,
      currency: r.currency || "usd",
    } : kind === "leads" ? {
      id: r.id, time: text(r.metadata?.roofing_requested_at, r.created_at),
      name: text(r.metadata?.roofing_full_name, "Homeowner"),
      email: text(r.metadata?.roofing_email),
      phone: text(r.metadata?.roofing_phone), address: text(r.metadata?.roofing_address),
      service: text(r.metadata?.roofing_service, "Estimate"),
      notes: [1,2,3,4].map((i) => text(r.metadata?.[`roofing_notes_${i}`])).join(""),
      source: "Whop member · website estimate",
    } : {
      id: r.id, time: r.created_at, number: r.number, email: r.email_address || r.recipient_emails?.[0] || "",
      status: r.status, amount: r.amount_due?.amount, currency: r.amount_due?.currency || "usd",
      link: safeLink(r.checkout_link),
    });
    if (kind === "leads") rows.sort((a,b) => Date.parse(b.time) - Date.parse(a.time));
    return Response.json({source: "whop", scope: "account", environment: process.env.WHOP_ENVIRONMENT || "sandbox", data: rows,
      nextCursor: result.page_info?.has_next_page ? result.page_info.end_cursor : null,
      ...(kind === "tracking" ? {to: params.get("to"), from: params.get("from")} : {}),
    }, {headers: {"Cache-Control": "private, no-store", "Vary": "Cookie, Authorization"}});
  } catch (error) {
    if (error instanceof ApiError && (error.upstreamStatus === 401 || error.upstreamStatus === 403))
      return Response.json({error: `Whop denied ${kind} access. Check the API key’s read permissions in the business dashboard.`}, {status: 503, headers: {"Cache-Control": "no-store"}});
    const response = jsonError(error);
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}

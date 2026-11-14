import { GET as sessionStatus, POST as sessionLogin, DELETE as sessionLogout } from "../app/api/admin/session/route";
import { GET as tracking } from "../app/api/tracking/route";
import { GET as listLeads } from "../app/api/leads/route";
import { GET as listInvoices } from "../app/api/invoices/route";
import { POST as leads } from "../app/api/leads/route";
import { POST as payments } from "../app/api/payments/route";
import { POST as invoices } from "../app/api/invoices/route";
import { POST as verify } from "../app/api/verify/route";
import { POST as setupIntent } from "../app/api/setup-intents/route";
import { POST as verifySetupIntent } from "../app/api/setup-intents/verify/route";
const routes: Record<string, (request: Request) => Promise<Response>> = {
  "/api/leads": leads,
  "/api/payments": payments,
  "/api/invoices": invoices,
  "/api/verify": verify,
  "/api/setup-intents": setupIntent,
  "/api/setup-intents/verify": verifySetupIntent,
};
export default {
  async fetch(
    request: Request,
    env: { ASSETS: { fetch(request: Request): Promise<Response> } },
  ) {
    const url = new URL(request.url);
    if (url.pathname === "/api/admin/session") {
      const handler = request.method === "GET" ? sessionStatus : request.method === "POST" ? sessionLogin : request.method === "DELETE" ? sessionLogout : null;
      return handler ? handler(request) : Response.json({error: "Method not allowed"}, {status: 405, headers: {Allow: "GET, POST, DELETE"}});
    }
    const reads: Record<string, (request: Request) => Promise<Response>> = {"/api/tracking": tracking, "/api/leads": listLeads, "/api/invoices": listInvoices};
    if (request.method === "GET" && reads[url.pathname]) return reads[url.pathname](request);
    if (url.pathname === "/api/tracking") return Response.json({error: "Method not allowed"}, {status: 405, headers: {Allow: "GET"}});
    const route = routes[url.pathname];
    if (route) {
      if (request.method !== "POST")
        return Response.json(
          { error: "Method not allowed" },
          { status: 405, headers: { Allow: "POST" } },
        );
      return route(request);
    }
    if (url.pathname.startsWith("/api/"))
      return Response.json({ error: "Not found" }, { status: 404 });
    if (url.pathname === "/checkout/complete" || /^\/admin\/(tracking|leads|invoices)\/?$/.test(url.pathname))
      return env.ASSETS.fetch(new Request(new URL("/", url), request));
    return env.ASSETS.fetch(request);
  },
};

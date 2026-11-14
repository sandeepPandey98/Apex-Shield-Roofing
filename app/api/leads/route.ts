import { createHash } from "node:crypto";
import { adminList } from "@/lib/admin-data";
import { DEMO_MODE, SITE_CONFIG } from "@/config/site";
import { leadSchema } from "@/lib/validation";
import { ApiError, whopAccount, whopRequest } from "@/lib/whop";
import { sendEstimateConfirmation } from "@/lib/estimate-email";
import {
  checkOrigin,
  jsonError,
  limitLeads,
  readBody,
  requestKey,
} from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    limitLeads(req);
    const input = leadSchema.parse(await readBody(req));
    if (!SITE_CONFIG.serviceArea.zipCodes.includes(input.zipCode))
      throw new ApiError(
        "This ZIP is outside our listed service area. Please call us to discuss your property.",
        422,
      );
    if (DEMO_MODE)
      return Response.json({
        success: true,
        demo: true,
        message: "Demo request validated. No lead was sent or saved.",
      });
    const key = `roofing-estimate-${createHash("sha256").update(requestKey(req) + JSON.stringify(input)).digest("hex").slice(0, 40)}`;
    const accountId = whopAccount();
    // A company credential has no buyer identity. Resolve the email through
    // Whop's member API before creating the lead; metadata alone is insufficient.
    let stage = "resolve_customer";
    try {
      const member = await whopRequest<{
        id: string;
        account_id: string;
        user: { id: string } | null;
      }>(
        "/members",
        { account_id: accountId, email: input.email, name: input.fullName },
        `${key}-member`,
      );
      if (
        !/^mber_[A-Za-z0-9]+$/.test(member.id) ||
        member.account_id !== accountId ||
        !member.user?.id ||
        !/^user_[A-Za-z0-9]+$/.test(member.user.id)
      ) {
        throw new ApiError(
          "We could not verify your contact record. Please call us to request an estimate.",
          502,
        );
      }
      // Whop retired POST /leads (HTTP 410). Keep each request in an
      // immutable member note; metadata indexes the latest request for our UI.
      stage = "save_estimate";
      const note = await whopRequest<{id: string; member_id: string; created_at: string}>(
        `/members/${member.id}/notes`,
        {content: "Roofing estimate request\n" + JSON.stringify({
          full_name: input.fullName, email: input.email, phone: input.phone,
          property_address: input.address, zip_code: input.zipCode,
          service_requested: input.serviceType, project_notes: input.notes,
          contact_consent: true, lead_source: "whop_roofing_website",
        })},
        `${key}-note`,
      );
      if (!note.id?.startsWith("note_") || note.member_id !== member.id || !Number.isFinite(Date.parse(note.created_at)))
        throw new ApiError("We could not confirm your estimate request. Please retry or call us.", 502);
      stage = "index_estimate";
      const current = await whopRequest<{account_id: string; metadata: Record<string, string | number | boolean | null> | null}>(`/members/${member.id}`);
      if (current.account_id !== accountId) throw new ApiError("We could not verify your contact record. Please call us.", 502);
      const metadata = {
        ...current.metadata,
        roofing_source: "whop_roofing_website", roofing_request_id: note.id,
        roofing_requested_at: note.created_at, roofing_full_name: input.fullName,
        roofing_email: input.email, roofing_phone: input.phone,
        roofing_address: input.address, roofing_zip: input.zipCode,
        roofing_service: input.serviceType, roofing_contact_consent: true,
        ...Object.fromEntries([0,1,2,3].map((i) => [`roofing_notes_${i+1}`, input.notes.slice(i*500, (i+1)*500)])),
      };
      if (Object.keys(metadata).length > 50) throw new ApiError("We could not finish saving your request. Please call us and we’ll help with your project.", 503);
      await whopRequest(`/members/${member.id}`, {metadata}, `${key}-index`, "PATCH");
      const emailStatus = await sendEstimateConfirmation(input,note.id);
      return Response.json({success: true, demo: false, requestId: note.id, storage: "whop_members", emailStatus});
    } catch (error) {
      if (
        error instanceof ApiError &&
        [401, 403].includes(error.upstreamStatus || 0)
      ) {
        // Do not log homeowner details, API keys, or the provider response body.
        console.warn("[estimate configuration]", {
          stage,
          upstreamStatus: error.upstreamStatus,
        });
        throw new ApiError(
          "Estimate requests are temporarily unavailable. Please call us and we’ll help with your project.",
          503,
        );
      }
      throw error;
    }
  } catch (error) {
    return jsonError(error);
  }
}

export async function GET(req: Request) {
  return adminList(req, "leads");
}

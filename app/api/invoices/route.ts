import { createHash } from "node:crypto";
import { adminList } from "@/lib/admin-data";
import { DEMO_MODE } from "@/config/site";
import { balanceCents, invoiceSchema } from "@/lib/validation";
import { ApiError, whopAccount, whopRequest } from "@/lib/whop";
import {
  checkOrigin,
  jsonError,
  readBody,
  requestKey,
  requireAdmin,
} from "@/lib/http";
export async function POST(req: Request) {
  let draftId: string | undefined;
  try {
    checkOrigin(req);
    if (!DEMO_MODE) requireAdmin(req);
    const input = invoiceSchema.parse(await readBody(req));
    const balanceDue =
      balanceCents(input.totalJobAmount, input.depositPaid) / 100;
    if (DEMO_MODE)
      return Response.json({
        success: true,
        demo: true,
        balanceDue,
        message:
          "Demo balance calculated. No invoice was created, sent, or charged.",
      });
    const key = requestKey(req);
    const fingerprint = createHash("sha256").update(JSON.stringify({
      account: whopAccount(), email: input.customerEmail.toLowerCase(),
      total: input.totalJobAmount, deposit: input.depositPaid, description: input.description,
      charge: input.chargeStoredCard, member: input.memberId, method: input.paymentMethodId,
      authorized: input.authorizationConfirmed,
    })).digest("hex");
    const existing = input.invoiceId ? await whopRequest<{
      id: string; account_id: string; status: string; metadata: Record<string,string>; checkout_link?: string;
    }>(`/invoices/${input.invoiceId}`) : null;
    if (existing && (existing.account_id !== whopAccount() || existing.metadata?.roofing_fingerprint !== fingerprint))
      throw new ApiError("The saved draft does not match these billing details. Restore the original details or create a new invoice.", 409);
    if (existing && existing.status !== "draft") {
      if (!["open","paid","pending","authorized"].includes(existing.status))
        throw new ApiError("This invoice can no longer be sent. Check its status in Whop.", 409);
      return Response.json({success:true,demo:false,invoice:existing,balanceDue,alreadyIssued:true});
    }
    const draft = existing || await whopRequest<{ id: string }>(
      "/invoices",
      {
        account_id: whopAccount(),
        ...(input.memberId
          ? { member_id: input.memberId }
          : { email_address: input.customerEmail }),
        recipient_emails: [input.customerEmail],
        items: [
          {
            variant: {
              currency: "usd",
              billing_type: "one_time",
              initial_price: balanceDue,
              title: "Roofing final balance",
            },
            quantity: 1,
            description: input.description,
          },
        ],
        memo: `${input.description} — $${input.totalJobAmount} total less $${input.depositPaid} deposit.`,
        ...(input.chargeStoredCard
          ? { payment_method_id: input.paymentMethodId }
          : {
              due_at: new Date(
                new Date(input.requestedAt).getTime() + 7 * 86400000,
              ).toISOString(),
            }),
        metadata: {
          authorization_confirmed: String(input.authorizationConfirmed),
          roofing_fingerprint: fingerprint,
        },
      },
      `${key}-create`,
    );
    draftId = draft.id;
    const invoice = await whopRequest<{
      id: string;
      status: string;
      checkout_link?: string;
    }>(
      `/invoices/${draft.id}/${input.chargeStoredCard ? "issue" : "send"}`,
      {},
      `${key}-issue`,
    );
    return Response.json({ success: true, demo: false, invoice, balanceDue });
  } catch (error) {
    if (error instanceof ApiError && error.providerCode === "invoice_account_verification_required") {
      return Response.json({
        error: draftId ? "Whop requires business verification before this invoice can be sent. Your draft is saved. Complete verification in the issuing business’s Whop dashboard, then retry this draft." : "Whop requires business verification before an invoice can be issued. Complete verification in the issuing business’s Whop dashboard.",
        code: "invoice_account_verification_required", invoiceId: draftId, invoiceStatus: "draft",
      }, {status:409, headers:{"Cache-Control":"private, no-store"}});
    }
    const response = jsonError(error);
    if (draftId) {
      const body = await response.json();
      return Response.json({...body, invoiceId:draftId, message:"Draft saved. Retry to check and send this same invoice."}, {status:response.status,headers:{"Cache-Control":"private, no-store"}});
    }
    return response;
  }
}

export async function GET(req: Request) {
  return adminList(req, "invoices");
}

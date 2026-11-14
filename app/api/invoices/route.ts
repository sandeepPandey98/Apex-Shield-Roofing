import { adminList } from "@/lib/admin-data";
import { DEMO_MODE } from "@/config/site";
import { balanceCents, invoiceSchema } from "@/lib/validation";
import { whopAccount, whopRequest } from "@/lib/whop";
import {
  checkOrigin,
  jsonError,
  readBody,
  requestKey,
  requireAdmin,
} from "@/lib/http";
export async function POST(req: Request) {
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
    const draft = await whopRequest<{ id: string }>(
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
        },
      },
      `${key}-create`,
    );
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
    return jsonError(error);
  }
}

export async function GET(req: Request) {
  return adminList(req, "invoices");
}

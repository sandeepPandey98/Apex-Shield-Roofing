import { DEMO_MODE } from "@/config/site";
import { checkOrigin, jsonError, readBody } from "@/lib/http";
import { depositSetupSchema } from "@/lib/validation";
import { ApiError, whopAccount, whopRequest } from "@/lib/whop";
import {
  assertSetupMatches,
  DepositSetup,
  requireDepositProof,
  verifiedDeposit,
} from "@/lib/deposit-setup";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (DEMO_MODE)
      throw new ApiError("Card setup is unavailable in demo mode.", 503);
    const input = depositSetupSchema.parse(await readBody(req));
    requireDepositProof(input.paymentId, input.verificationToken);
    const { payment, service } = await verifiedDeposit(input.paymentId);
    // Existing-method setup: Whop re-verifies and saves it without taking another payment.
    // Never accept a member or payment-method ID supplied by the browser.
    const setup = await whopRequest<DepositSetup>(
      "/setup_intents",
      {
        account_id: whopAccount(),
        payment_method_id: payment.payment_method_id,
        currency: "usd",
        metadata: {
          deposit_payment_id: payment.id,
          service_id: service.id,
          card_save_consent: "true",
        },
      },
      `roofing-deposit-setup-${payment.id}`,
    );
    assertSetupMatches(setup, payment, service.id);
    return Response.json({
      setupIntentId: setup.id,
      clientSecret: setup.client_secret,
      status: setup.status,
    });
  } catch (error) {
    return jsonError(error);
  }
}

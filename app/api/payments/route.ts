import { DEMO_MODE, SITE_CONFIG } from "@/config/site";
import { createDepositProof } from "@/lib/deposit-setup";
import { paymentSchema } from "@/lib/validation";
import { ApiError, whopAccount, whopRequest } from "@/lib/whop";
import { checkOrigin, jsonError, readBody, requestKey } from "@/lib/http";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (DEMO_MODE)
      throw new ApiError("Payments are disabled in demo mode.", 503);
    const input = paymentSchema.parse(await readBody(req));
    const service = SITE_CONFIG.services.find((s) => s.id === input.serviceId);
    if (!service?.planId)
      throw new ApiError("Service checkout is not configured.", 400);
    if (service.isDeposit && !input.saveCardConsent)
      throw new ApiError(
        "Please authorize saving your payment method for the final balance.",
        400,
      );
    // Fail before charging if the proof-signing secret is missing.
    if (service.isDeposit) createDepositProof("configuration-check");
    const payment = await whopRequest<{
      id: string;
      client_secret: string;
      status: string;
    }>(
      "/payments",
      {
        account_id: whopAccount(),
        variant_id: service.planId,
        confirmation_token: input.confirmationToken,
        email: input.email,
        ...(service.isDeposit ? { setup_future_usage: "off_session" } : {}),
        metadata: {
          service_id: service.id,
          card_save_consent: String(input.saveCardConsent),
        },
      },
      requestKey(req),
    );
    return Response.json({
      paymentId: payment.id,
      clientSecret: payment.client_secret,
      status: payment.status,
      ...(service.isDeposit
        ? { verificationToken: createDepositProof(payment.id) }
        : {}),
    });
  } catch (error) {
    return jsonError(error);
  }
}

import { paymentState } from "@/lib/payment-state";
import {
  assertSetupMatches,
  type DepositSetup,
  verifiedDeposit,
} from "@/lib/deposit-setup";
import { SITE_CONFIG, DEMO_MODE } from "@/config/site";
import { checkOrigin, jsonError, readBody } from "@/lib/http";
import { ApiError, whopAccount, whopRequest } from "@/lib/whop";
export async function POST(req: Request) {
  try {
    checkOrigin(req);
    if (DEMO_MODE)
      throw new ApiError(
        "Payment verification is unavailable in demo mode.",
        503,
      );
    const { paymentId, setupIntentId } = await readBody(req);
    if (
      setupIntentId !== undefined &&
      (typeof setupIntentId !== "string" ||
        !/^sint_[A-Za-z0-9]+$/.test(setupIntentId))
    )
      throw new ApiError("Invalid payment verification.", 400);
    if (typeof paymentId !== "string" || !/^pay_[A-Za-z0-9]+$/.test(paymentId))
      throw new ApiError("Invalid payment reference.", 400);
    const payment = await whopRequest<{
      status: string;
      substatus?: string;
      failure_message?: string | null;
      account_id: string;
      variant_id: string;
      line_items: { variant_id: string }[];
    }>(`/payments/${paymentId}`);
    const service = SITE_CONFIG.services.find(
      (s) =>
        s.planId &&
        (s.planId === payment.variant_id ||
          payment.line_items?.some((item) => item.variant_id === s.planId)),
    );
    if (payment.account_id !== whopAccount() || !service)
      throw new ApiError(
        "Payment does not match this contractor's services.",
        422,
      );
    const state = paymentState(payment);
    let setupVerified = false;
    if (state.paid && service.isDeposit && setupIntentId) {
      const { payment: deposit, service: depositService } =
        await verifiedDeposit(paymentId);
      const setup = await whopRequest<DepositSetup>(
        `/setup_intents/${setupIntentId}`,
      );
      assertSetupMatches(setup, deposit, depositService.id);
      setupVerified = setup.status === "succeeded" && !!setup.payment_method_id;
    }
    return Response.json({
      ...state,
      setupVerified,
      paymentId,
      requiresSetup: service.isDeposit,
    });
  } catch (error) {
    return jsonError(error);
  }
}

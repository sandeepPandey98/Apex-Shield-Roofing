import { DEMO_MODE } from "@/config/site";
import { checkOrigin, jsonError, readBody } from "@/lib/http";
import { depositSetupVerificationSchema } from "@/lib/validation";
import { ApiError, whopRequest } from "@/lib/whop";
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
      throw new ApiError(
        "Card setup verification is unavailable in demo mode.",
        503,
      );
    const input = depositSetupVerificationSchema.parse(await readBody(req));
    requireDepositProof(input.paymentId, input.verificationToken);
    const { payment, service } = await verifiedDeposit(input.paymentId);
    const setup = await whopRequest<DepositSetup>(
      `/setup_intents/${input.setupIntentId}`,
    );
    assertSetupMatches(setup, payment, service.id);
    const saved = setup.status === "succeeded" && !!setup.payment_method_id;
    // Customer-facing response deliberately excludes member/method IDs and client secrets.
    return Response.json({ saved, status: setup.status });
  } catch (error) {
    return jsonError(error);
  }
}

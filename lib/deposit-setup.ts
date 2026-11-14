import { createHmac, timingSafeEqual } from "node:crypto";
import { SITE_CONFIG } from "@/config/site";
import { ApiError, whopAccount, whopRequest } from "./whop";

// A buyer may only set up the method from the deposit this server created for them.
// Purpose separation prevents these proofs being used as contractor credentials.
function signingKey() {
  const key = process.env.CONTRACTOR_ADMIN_TOKEN;
  if (!key || key.length < 24)
    throw new ApiError("Secure deposit checkout is not configured.", 503);
  return key;
}
export function createDepositProof(paymentId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      paymentId,
      accountId: whopAccount(),
      expires: Date.now() + 86400000,
    }),
  ).toString("base64url");
  const signature = createHmac("sha256", signingKey())
    .update(`deposit-setup:v1:${payload}`)
    .digest("base64url");
  return `${payload}.${signature}`;
}
export function requireDepositProof(paymentId: string, proof: string) {
  const [payload, supplied, extra] = proof.split(".");
  if (!payload || !supplied || extra)
    throw new ApiError(
      "Invalid deposit verification. Please contact the team.",
      403,
    );
  const expected = createHmac("sha256", signingKey())
    .update(`deposit-setup:v1:${payload}`)
    .digest();
  const actual = Buffer.from(supplied, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected))
    throw new ApiError(
      "Invalid deposit verification. Please contact the team.",
      403,
    );
  let data: { paymentId: string; accountId: string; expires: number };
  try {
    data = JSON.parse(Buffer.from(payload, "base64url").toString());
  } catch {
    throw new ApiError("Invalid deposit verification.", 403);
  }
  if (
    data.paymentId !== paymentId ||
    data.accountId !== whopAccount() ||
    !Number.isFinite(data.expires) ||
    data.expires < Date.now()
  )
    throw new ApiError(
      "Deposit verification expired or does not match. Please contact the team.",
      403,
    );
}
export interface DepositPayment {
  id: string;
  status: string;
  substatus?: string;
  account_id: string;
  variant_id: string;
  line_items?: { variant_id: string }[];
  member_id?: string | null;
  payment_method_id?: string | null;
  metadata?: Record<string, string>;
}
export interface DepositSetup {
  id: string;
  status: "processing" | "succeeded" | "canceled" | "requires_action";
  account_id: string | null;
  member_id: string | null;
  payment_method_id: string | null;
  client_secret: string | null;
  metadata: Record<string, string> | null;
}
export async function verifiedDeposit(paymentId: string) {
  const payment = await whopRequest<DepositPayment>(`/payments/${paymentId}`);
  const service = SITE_CONFIG.services.find(
    (s) =>
      s.isDeposit &&
      s.planId &&
      (payment.variant_id === s.planId ||
        payment.line_items?.some((item) => item.variant_id === s.planId)),
  );
  if (
    payment.id !== paymentId ||
    payment.account_id !== whopAccount() ||
    !service
  )
    throw new ApiError(
      "Deposit does not match this contractor's replacement service.",
      422,
    );
  if (
    payment.status !== "paid" ||
    /refund|dispute|resolution/.test(payment.substatus || "")
  )
    throw new ApiError(
      "The deposit has not settled. Check your receipt before trying again.",
      409,
    );
  if (payment.metadata?.card_save_consent !== "true")
    throw new ApiError(
      "Card-saving authorization is missing. Please contact the team.",
      422,
    );
  if (!payment.member_id || !payment.payment_method_id)
    throw new ApiError(
      "Your deposit is paid, but this method is not available for saved-card billing. Please contact the team; do not pay again.",
      422,
    );
  return { payment, service };
}
export function assertSetupMatches(
  setup: DepositSetup,
  payment: DepositPayment,
  serviceId: string,
) {
  if (
    setup.account_id !== whopAccount() ||
    (setup.member_id !== null && setup.member_id !== payment.member_id) ||
    (setup.status === "succeeded" &&
      (!setup.member_id || !setup.payment_method_id)) ||
    (setup.payment_method_id !== null &&
      setup.payment_method_id !== payment.payment_method_id) ||
    setup.metadata?.deposit_payment_id !== payment.id ||
    setup.metadata?.service_id !== serviceId
  ) {
    throw new ApiError(
      "Saved-method verification does not match this deposit.",
      422,
    );
  }
}

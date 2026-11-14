export interface PaymentStateInput {
  status: string;
  substatus?: string;
  failure_message?: string | null;
}
// An open receipt can already have a failed collection attempt. Do not label it
// merely pending, or keep retrying the same rejected billing details.
export function paymentState(payment: PaymentStateInput) {
  const status = payment.substatus || payment.status;
  const adverse = /refund|dispute|resolution/.test(status);
  const paid = payment.status === "paid" && !adverse;
  const retryAllowed =
    !paid &&
    !adverse &&
    (["void", "uncollectible"].includes(payment.status) ||
      [
        "failed",
        "blocked",
        "canceled",
        "price_too_low",
        "uncollectible",
      ].includes(status));
  const billingMismatch =
    retryAllowed &&
    /(?:ZIP|postal).*(?:state|province)|(?:state|province).*(?:ZIP|postal)/i.test(
      payment.failure_message || "",
    );
  return {
    paid,
    status,
    retryAllowed,
    failureCode: retryAllowed
      ? billingMismatch
        ? "billing_address_mismatch"
        : "payment_failed"
      : null,
    // Never expose the provider's raw message, which can contain billing details.
    message: retryAllowed
      ? billingMismatch
        ? "Your billing state and ZIP code do not match. Please correct your billing address and try again."
        : "This payment attempt did not complete. Please review your payment details and try again."
      : paid
        ? "Payment confirmed."
        : adverse
          ? "This payment needs review. Please contact the team before making another payment."
          : "Your payment is still being verified. Check its status again; do not make another payment yet.",
  };
}

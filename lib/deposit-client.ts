// Browser-only recovery state. Contains no card data and is never shown as customer copy.
export interface PendingDeposit {
  paymentId: string;
  verificationToken: string;
}
const storageKey = "roofing.pending-deposit.v1";
export function rememberDeposit(deposit: PendingDeposit) {
  sessionStorage.setItem(storageKey, JSON.stringify(deposit));
}
export function pendingDeposit(): PendingDeposit | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    return value &&
      /^pay_[A-Za-z0-9]+$/.test(value.paymentId) &&
      typeof value.verificationToken === "string"
      ? value
      : null;
  } catch {
    return null;
  }
}
export function clearDeposit() {
  sessionStorage.removeItem(storageKey);
}
export interface ConfirmedBooking {
  paymentId: string;
  setupIntentId?: string;
}
const confirmedKey = "roofing.confirmed-booking.v1";
export function rememberConfirmedBooking(booking: ConfirmedBooking) {
  try {
    sessionStorage.setItem(confirmedKey, JSON.stringify(booking));
  } catch {
    /* Confirmation still works when storage is unavailable. */
  }
}
export function confirmedBooking(): ConfirmedBooking | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(confirmedKey) || "null");
    return value &&
      /^pay_[A-Za-z0-9]+$/.test(value.paymentId) &&
      (!value.setupIntentId || /^sint_[A-Za-z0-9]+$/.test(value.setupIntentId))
      ? value
      : null;
  } catch {
    return null;
  }
}
async function post(path: string, body: unknown) {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      data.error ||
        "Unable to verify your payment method. Please contact the team.",
    );
  return data;
}
export class PaymentVerificationError extends Error {
  constructor(
    message: string,
    public retryAllowed: boolean,
  ) {
    super(message);
  }
}
export async function verifyPaymentReceipt(
  paymentId: string,
  setupIntentId?: string,
) {
  const payment = await post("/api/verify", {
    paymentId,
    ...(setupIntentId ? { setupIntentId } : {}),
  });
  if (!payment.paid) {
    throw new PaymentVerificationError(
      payment.message ||
        "Your payment is still being verified. Check its status again before making another payment.",
      payment.retryAllowed === true,
    );
  }
  return payment;
}
export async function finishDeposit(
  deposit: PendingDeposit,
  handleNextAction: (input: {
    clientSecret: string;
    returnUrl: string;
  }) => Promise<{ redirected: boolean }>,
  onPaid: () => void = () => {},
) {
  try {
    await verifyPaymentReceipt(deposit.paymentId);
  } catch (error) {
    // A confirmed failure permits correcting the billing form. An uncertain or
    // paid outcome must retain its recovery state to prevent a second charge.
    if (error instanceof PaymentVerificationError && error.retryAllowed)
      clearDeposit();
    throw error;
  }
  onPaid();
  // This endpoint never creates a payment; retries reuse the same Whop setup intent.
  const setup = await post("/api/setup-intents", deposit);
  if (setup.status === "canceled")
    throw new Error(
      "Your deposit is paid, but payment-method setup was canceled. Contact the team; do not pay again.",
    );
  if (setup.status !== "succeeded" && setup.clientSecret) {
    const action = await handleNextAction({
      clientSecret: setup.clientSecret,
      returnUrl: `${location.origin}/checkout/complete?flow=deposit`,
    });
    if (action.redirected) return false;
  }
  const verified = await post("/api/setup-intents/verify", {
    ...deposit,
    setupIntentId: setup.setupIntentId,
  });
  if (!verified.saved)
    throw new Error(
      verified.status === "canceled"
        ? "Your deposit is paid, but payment-method setup was canceled. Contact the team; do not pay again."
        : "Your deposit is paid. Payment-method setup is still pending. Retry this step to check again; your deposit will not be charged again.",
    );
  rememberConfirmedBooking({
    paymentId: deposit.paymentId,
    setupIntentId: setup.setupIntentId,
  });
  clearDeposit();
  return true;
}

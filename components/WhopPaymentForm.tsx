"use client";
import { useRef, useState } from "react";
import { loadWhop } from "@whop/elements";
import {
  WhopElements,
  useWhop,
  Payments,
  PaymentElement,
  EmailElement,
  BrandingElement,
  usePayments,
  Checkout,
  ExpressCheckoutElement,
} from "@whop/elements-react";
import {
  finishDeposit,
  pendingDeposit,
  rememberDeposit,
  verifyPaymentReceipt,
  PaymentVerificationError,
  rememberConfirmedBooking,
} from "@/lib/deposit-client";
import { ServiceItem } from "@/config/site";
const elements = loadWhop();
function PaymentFields({
  service,
  onSuccess,
}: {
  service: ServiceItem;
  onSuccess: (id: string) => void;
}) {
  const payments = usePayments();
  const whop = useWhop();
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [complete, setComplete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [depositPaid, setDepositPaid] = useState(false);
  const existingDeposit = useRef(service.isDeposit ? pendingDeposit() : null);
  const [recovering, setRecovering] = useState(() => !!existingDeposit.current);
  const paymentResult = useRef<{
    paymentId: string;
    clientSecret?: string;
    verificationToken?: string;
  } | null>(existingDeposit.current);
  const [error, setError] = useState("");
  const key = useRef(crypto.randomUUID());
  const attempt = useRef<{
    confirmationToken: string;
    email: string;
    consent: boolean;
  } | null>(null);
  async function pay() {
    if (!payments || !whop) return;
    setBusy(true);
    setError("");
    try {
      if (!paymentResult.current) {
        if (!attempt.current) {
          const { confirmationToken } = await payments.createConfirmationToken({
            billingDetails: { email },
          });
          attempt.current = { confirmationToken, email, consent };
        }
        const attemptData = attempt.current;
        const response = await fetch("/api/payments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": key.current,
          },
          body: JSON.stringify({
            serviceId: service.id,
            confirmationToken: attemptData.confirmationToken,
            email: attemptData.email,
            saveCardConsent: attemptData.consent,
          }),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        paymentResult.current = result;
      }
      const result = paymentResult.current!;
      if (service.isDeposit) {
        if (!result.verificationToken)
          throw new Error(
            "Your deposit needs additional verification. Please contact the team before paying again.",
          );
        rememberDeposit({
          paymentId: result.paymentId,
          verificationToken: result.verificationToken,
        });
      }
      if (result.clientSecret && !depositPaid) {
        const action = await whop.payments.handleNextAction({
          clientSecret: result.clientSecret,
          returnUrl: `${location.origin}/checkout/complete${service.isDeposit ? "?flow=deposit" : ""}`,
        });
        if (action.redirected) return;
      }
      if (service.isDeposit) {
        const complete = await finishDeposit(
          {
            paymentId: result.paymentId,
            verificationToken: result.verificationToken!,
          },
          (input) => whop.payments.handleNextAction(input),
          () => setDepositPaid(true),
        );
        if (complete) onSuccess(result.paymentId);
        return;
      }
      await verifyPaymentReceipt(result.paymentId);
      rememberConfirmedBooking({ paymentId: result.paymentId });
      onSuccess(result.paymentId);
    } catch (e) {
      if (e instanceof PaymentVerificationError && e.retryAllowed) {
        paymentResult.current = null;
        attempt.current = null;
        existingDeposit.current = null;
        key.current = crypto.randomUUID();
        setRecovering(false);
        setDepositPaid(false);
      }
      setError(e instanceof Error ? e.message : "Checkout could not complete.");
    } finally {
      setBusy(false);
    }
  }
  const verifyingExisting = depositPaid || recovering;
  return (
    <div className="payment-fields">
      {/* Whop elements occupy exclusive SDK slots. Keep their identity and order
          stable while the async payment/setup phases change. */}
      <div hidden={verifyingExisting} className="payment-fields">
        <EmailElement onChange={(event) => setEmail(event.email)} />
        <PaymentElement
          onChange={(event) => setComplete(event.complete)}
          onError={(event) => setError(event.message)}
        />
        {service.isDeposit && (
          <label className="check-label">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
              required
            />
            <span>
              I authorize Whop to save my eligible payment method for the agreed
              final balance after the completed project walkthrough.
            </span>
          </label>
        )}
      </div>
      {verifyingExisting && (
        <p role="status" className="notice">
          {depositPaid
            ? "Your deposit is paid. We’re confirming the saved payment method for your agreed final balance."
            : "We found an unfinished deposit checkout. Verify its status before making another payment."}
        </p>
      )}
      <BrandingElement />
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        className="button primary full"
        disabled={
          busy ||
          !payments ||
          !whop ||
          (!verifyingExisting &&
            (!complete || !email || (service.isDeposit && !consent)))
        }
        onClick={pay}
      >
        {busy
          ? "Verifying your booking…"
          : verifyingExisting
            ? depositPaid
              ? "Finish payment-method setup"
              : "Verify existing deposit"
            : `Pay $${service.price}${service.isDeposit ? " deposit" : ""}`}
      </button>
    </div>
  );
}
export default function WhopPaymentForm({
  service,
  onSuccess,
}: {
  service: ServiceItem;
  onSuccess: (id: string) => void;
}) {
  const [error, setError] = useState("");
  const returnUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/checkout/complete`;
  const verify = async (paymentId: string) => {
    try {
      const res = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId }),
      });
      const data = await res.json();
      if (!res.ok || !data.paid)
        throw new Error(data.error || "Payment is pending verification.");
      rememberConfirmedBooking({ paymentId });
      onSuccess(paymentId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to verify payment.");
    }
  };
  return (
    <WhopElements
      elements={elements}
      environment={
        process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "production"
          ? "production"
          : "sandbox"
      }
      onLoadError={(e) => setError(e.message)}
    >
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!service.isDeposit && (
        <Checkout
          plan={service.planId}
          returnUrl={returnUrl}
          onComplete={(result) => {
            if (result.result === "payment") void verify(result.paymentId);
          }}
        >
          <ExpressCheckoutElement />
          <p className="divider-label">or choose a payment method</p>
        </Checkout>
      )}
      <Payments
        accountId={process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID || ""}
        plan={service.planId}
        returnUrl={returnUrl}
        setupFutureUsage={service.isDeposit ? "off_session" : undefined}
      >
        <PaymentFields service={service} onSuccess={onSuccess} />
      </Payments>
    </WhopElements>
  );
}

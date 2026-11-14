"use client";
import { useEffect, useRef, useState } from "react";
import {
  finishDeposit,
  pendingDeposit,
  verifyPaymentReceipt,
  PaymentVerificationError,
  confirmedBooking,
  rememberConfirmedBooking,
} from "@/lib/deposit-client";
import { SITE_CONFIG } from "@/config/site";

export function Receipt() {
  const [message, setMessage] = useState("Verifying your payment with Whop…");
  const [retry, setRetry] = useState(0);
  const [canRetry, setCanRetry] = useState(false);
  const running = useRef(false);
  useEffect(() => {
    if (running.current) return;
    running.current = true;
    const verify = async () => {
      setCanRetry(false);
      const params = new URLSearchParams(location.search);
      const pending = pendingDeposit();
      const completed = confirmedBooking();
      const paymentId =
        params.get("payment") || (!pending ? completed?.paymentId : null);
      const setupIntentId =
        params.get("setup") ||
        (completed && completed.paymentId === paymentId
          ? completed.setupIntentId
          : undefined);
      if (paymentId && setupIntentId && !pending) {
        const verified = await verifyPaymentReceipt(paymentId, setupIntentId);
        if (!verified.setupVerified)
          throw new Error(
            "Your deposit is paid. Your saved payment method still needs verification; please contact the team before paying again.",
          );
        rememberConfirmedBooking({ paymentId, setupIntentId });
        history.replaceState(null, "", location.pathname);
        setMessage(
          "Your deposit is confirmed and your payment method is securely saved with Whop. Our team will contact you to arrange your project.",
        );
        return;
      }
      // A pending flow can also be resumed after a page refresh without query parameters.
      if (
        params.get("flow") === "deposit" ||
        (pending && !params.get("payment"))
      ) {
        if (
          !pending ||
          (params.get("payment") && params.get("payment") !== pending.paymentId)
        )
          throw new Error(
            "Please contact the team to finish deposit verification. Check your receipt before paying again.",
          );
        const { loadWhop } = await import("@whop/elements");
        const Constructor = await loadWhop();
        const whop = Constructor({
          environment:
            process.env.NEXT_PUBLIC_WHOP_ENVIRONMENT === "production"
              ? "production"
              : "sandbox",
        });
        const finished = await finishDeposit(
          pending,
          (input) => whop.payments.handleNextAction(input),
          () =>
            setMessage(
              "Your deposit is paid. Verifying your saved payment method…",
            ),
        );
        if (finished) {
          history.replaceState(null, "", location.pathname);
          setMessage(
            "Your deposit is confirmed and your payment method is securely saved with Whop. Our team will contact you to arrange your project.",
          );
        }
        return;
      }
      if (!paymentId)
        throw new Error(
          "No payment was provided to verify. Please check your Whop receipt or contact the team.",
        );
      const data = await verifyPaymentReceipt(paymentId);
      if (data.requiresSetup)
        throw new Error(
          "Your deposit is paid. Please contact the team to finish saved-payment verification; do not pay again.",
        );
      rememberConfirmedBooking({ paymentId });
      history.replaceState(null, "", location.pathname);
      setMessage(
        "Payment confirmed. Our team will contact you to arrange your service.",
      );
    };
    verify()
      .catch((error) => {
        setMessage(
          error instanceof Error
            ? error.message
            : "Unable to verify your booking yet. Please check your receipt before paying again.",
        );
        setCanRetry(
          !(error instanceof PaymentVerificationError && error.retryAllowed),
        );
      })
      .finally(() => {
        running.current = false;
      });
  }, [retry]);
  return (
    <main className="receipt-page">
      <span className="eyebrow">{SITE_CONFIG.shortName} / WHOP</span>
      <h1>Your booking</h1>
      <p role="status">{message}</p>
      {canRetry && (
        <button
          className="button outline"
          onClick={() => setRetry((value) => value + 1)}
        >
          Retry verification
        </button>
      )}
      <a className="button primary" href="/">
        Return to the website
      </a>
    </main>
  );
}
export default function Complete() {
  return <Receipt />;
}

"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import { Check, LockKeyhole, ArrowUpRight } from "lucide-react";
import { DEMO_MODE, ServiceItem } from "@/config/site";
import { CheckoutErrorBoundary } from "./CheckoutErrorBoundary";
import { Modal } from "./Modal";
const PaymentForm = lazy(() => import("./WhopPaymentForm"));
export function WhopCheckoutModal({
  service,
  onClose,
}: {
  service: ServiceItem;
  onClose: () => void;
}) {
  const [receipt, setReceipt] = useState("");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return (
    <Modal
      title={receipt ? "Payment confirmed" : "A good roof starts here."}
      onClose={onClose}
    >
      {receipt && (
        <div className="success-box">
          <Check />
          <h3>Your payment is confirmed.</h3>
          <p>
            {service.isDeposit
              ? "Your deposit is confirmed and your payment method is securely saved with Whop. Our team will contact you to arrange your project."
              : "Our team will contact you to arrange your visit."}
          </p>
        </div>
      )}
      <div hidden={!!receipt}>
        <span className="eyebrow">{service.category}</span>
        <div className="order-summary">
          <h3>{service.title}</h3>
          <strong>
            ${service.price}
            <small>{service.isDeposit ? "deposit" : "one time"}</small>
          </strong>
        </div>
        <ul className="feature-list">
          {service.features.map((x) => (
            <li key={x}>
              <Check size={16} />
              {x}
            </li>
          ))}
        </ul>
        {service.isDeposit && (
          <p className="notice">
            Your $500 deposit is credited to the project. An eligible payment
            method is verified and saved by Whop after payment for your agreed
            final balance. Financing methods may require a separate payment.
          </p>
        )}
        {DEMO_MODE ? (
          <div className="demo-checkout">
            <LockKeyhole size={28} />
            <h3>Checkout preview</h3>
            <p>
              This template is in demo mode. No payment is collected. Configure
              Whop sandbox credentials and plan IDs to enable secure payment
              elements.
            </p>
            <div className="demo-total">
              <span>
                {service.isDeposit
                  ? "Deposit due at checkout"
                  : "Service price"}
              </span>
              <strong>${service.price}.00</strong>
            </div>
            <a
              className="button primary full"
              href="#estimate"
              onClick={onClose}
            >
              Request an estimate instead <ArrowUpRight size={17} />
            </a>
          </div>
        ) : service.planId && process.env.NEXT_PUBLIC_WHOP_ACCOUNT_ID ? (
          mounted ? (
            <Suspense fallback={<p>Loading secure Whop checkout…</p>}>
              <CheckoutErrorBoundary>
                <PaymentForm service={service} onSuccess={setReceipt} />
              </CheckoutErrorBoundary>
            </Suspense>
          ) : (
            <p>Loading secure Whop checkout…</p>
          )
        ) : (
          <p className="form-error">
            This checkout is not configured yet. Please contact the contractor.
          </p>
        )}
        <p className="secure-note">
          <LockKeyhole size={13} /> Secure payments powered by Whop
        </p>
      </div>
    </Modal>
  );
}

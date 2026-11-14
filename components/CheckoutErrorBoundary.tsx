"use client";
import { Component, type ErrorInfo, type ReactNode } from "react";
export class CheckoutErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Never log payment payloads or billing fields.
    console.warn("The secure checkout display encountered an error.");
  }
  render() {
    if (this.state.failed)
      return (
        <div role="alert" className="notice">
          <h3>Let’s check your booking.</h3>
          <p>
            The payment form could not be displayed. If you already paid, verify
            your booking before starting another payment.
          </p>
          <a className="button primary full" href="/checkout/complete">
            Verify my booking
          </a>
          <a className="text-link" href="/#services">
            Return to services
          </a>
        </div>
      );
    return this.props.children;
  }
}

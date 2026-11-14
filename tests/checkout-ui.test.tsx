import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React, { act, useEffect, useLayoutEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { WhopCheckoutModal } from "../components/WhopCheckoutModal";
import { CheckoutErrorBoundary } from "../components/CheckoutErrorBoundary";
const sdk = vi.hoisted(() => ({
  slots: new Set<string>(),
  mounts: {} as Record<string, number>,
  finish: vi.fn(),
  handleNextAction: vi.fn(),
  createToken: vi.fn(),
}));
vi.mock("@whop/elements", () => ({
  loadWhop: () => Promise.resolve(() => ({})),
}));
vi.mock("@whop/elements-react", () => {
  function Exclusive({
    kind,
    onChange,
  }: {
    kind: string;
    onChange?: (event: unknown) => void;
  }) {
    const mounted = useRef(false);
    if (!mounted.current) {
      if (sdk.slots.has(kind))
        throw new Error(
          `Exclusive Whop slot ${kind} was remounted before cleanup`,
        );
      sdk.slots.add(kind);
      sdk.mounts[kind] = (sdk.mounts[kind] || 0) + 1;
      mounted.current = true;
    }
    useLayoutEffect(
      () => () => {
        sdk.slots.delete(kind);
      },
      [],
    );
    useEffect(() => {
      onChange?.(
        kind === "email" ? { email: "test@example.com" } : { complete: true },
      );
    }, []);
    return <div data-widget={kind}>{kind}</div>;
  }
  return {
    WhopElements: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    Payments: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    Checkout: ({ children }: { children: React.ReactNode }) => <>{children}</>,
    PaymentElement: (props: { onChange: (event: unknown) => void }) => (
      <Exclusive kind="payment" {...props} />
    ),
    EmailElement: (props: { onChange: (event: unknown) => void }) => (
      <Exclusive kind="email" {...props} />
    ),
    BrandingElement: () => <Exclusive kind="branding" />,
    ExpressCheckoutElement: () => <div>Express checkout</div>,
    usePayments: () => ({ createConfirmationToken: sdk.createToken }),
    useWhop: () => ({ payments: { handleNextAction: sdk.handleNextAction } }),
  };
});
vi.mock("../lib/deposit-client", () => ({
  finishDeposit: sdk.finish,
  pendingDeposit: () => null,
  rememberDeposit: vi.fn(),
  rememberConfirmedBooking: vi.fn(),
  verifyPaymentReceipt: vi.fn(),
  PaymentVerificationError: class extends Error {
    retryAllowed = false;
  },
}));
const service = {
  id: "replacement-deposit",
  category: "Replacement" as const,
  title: "Your next roof starts here.",
  price: 500,
  priceLabel: "$500 deposit",
  planId: "plan_deposit",
  description: "Replacement",
  features: ["Applied to final balance"],
  isDeposit: true,
};
let root: Root;
let container: HTMLDivElement;
async function until(check: () => boolean) {
  for (let i = 0; i < 60; i++) {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
    });
    if (check()) return;
  }
  throw new Error("Expected checkout state did not render");
}
beforeEach(() => {
  (
    globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
  ).IS_REACT_ACT_ENVIRONMENT = true;
  sdk.slots.clear();
  sdk.mounts = {};
  sdk.finish.mockReset();
  sdk.handleNextAction.mockResolvedValue({ redirected: false });
  sdk.createToken.mockResolvedValue({ confirmationToken: "ctok_test" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        paymentId: "pay_test",
        verificationToken: "test-signed-deposit-proof",
      }),
    ),
  );
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
describe("checkout SDK lifecycle", () => {
  it("keeps hosted widgets mounted while deposit verification and success replace the visible UI", async () => {
    let finish!: () => void;
    sdk.finish.mockImplementation(async (_deposit, _action, onPaid) => {
      onPaid();
      await new Promise<void>((resolve) => {
        finish = resolve;
      });
      return true;
    });
    await act(async () =>
      root.render(<WhopCheckoutModal service={service} onClose={() => {}} />),
    );
    await until(() => !!container.querySelector('[data-widget="email"]'));
    const consent = container.querySelector(
      'input[type="checkbox"]',
    ) as HTMLInputElement;
    await act(async () => consent.click());
    const pay = Array.from(container.querySelectorAll("button")).find(
      (button) => button.textContent?.includes("Pay $500"),
    )!;
    expect(pay.disabled).toBe(false);
    await act(async () => pay.click());
    await until(() => container.textContent!.includes("Your deposit is paid."));
    expect(sdk.mounts).toEqual({ email: 1, payment: 1, branding: 1 });
    expect(sdk.slots.size).toBe(3);
    expect(
      container.querySelector('[data-widget="email"]')!.closest("[hidden]"),
    ).not.toBeNull();
    await act(async () => finish());
    await until(() =>
      container.textContent!.includes("Your payment is confirmed."),
    );
    const confirmation = container.querySelector(".success-box")!;
    expect(confirmation.textContent).toContain("securely saved with Whop");
    expect(confirmation.textContent).not.toMatch(/pay_|sint_|ctok_/);
    expect(sdk.mounts).toEqual({ email: 1, payment: 1, branding: 1 });
    expect(sdk.slots.size).toBe(3);
    expect(
      container.querySelector('[data-widget="branding"]')!.closest("[hidden]"),
    ).not.toBeNull();
  });
  it("contains a widget crash and presents booking verification instead of a blank website", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    function BrokenWidget(): React.ReactNode {
      throw new Error("Simulated SDK rendering failure");
    }
    await act(async () =>
      root.render(
        <>
          <h1>Roofing website</h1>
          <CheckoutErrorBoundary>
            <BrokenWidget />
          </CheckoutErrorBoundary>
        </>,
      ),
    );
    expect(container.textContent).toContain("Roofing website");
    expect(container.textContent).toContain("Let’s check your booking.");
    expect(container.querySelector("a")?.getAttribute("href")).toBe(
      "/checkout/complete",
    );
  });
});
